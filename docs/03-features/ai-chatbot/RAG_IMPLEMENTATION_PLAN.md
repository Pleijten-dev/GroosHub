# RAG System Implementation Plan

> **Status**: Planning Phase
> **Created**: 2025-12-10
> **Feature**: Project-based Retrieval-Augmented Generation (RAG)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema Fixes](#database-schema-fixes)
4. [Document Processing Pipeline](#document-processing-pipeline)
5. [Embedding System](#embedding-system)
6. [Retrieval System](#retrieval-system)
7. [Chat Integration](#chat-integration)
8. [UI Components](#ui-components)
9. [Implementation Phases](#implementation-phases)
10. [Code Examples](#code-examples)

---

## Overview

### Goal
Enable users to upload documents (PDF, TXT, CSV, images) to projects and ask questions about them through the AI chat. The system will:

1. **Extract text** from uploaded documents
2. **Chunk text** into semantic segments
3. **Generate embeddings** using OpenAI
4. **Store vectors** in PostgreSQL with pgvector
5. **Retrieve relevant chunks** when user asks questions
6. **Generate answers** with LLM + include verbatim source quotes
7. **Display citations** so users can verify accuracy

### Supported File Types

| Type | Extensions | Processing Method |
|------|-----------|-------------------|
| **PDF** | .pdf | pdf-parse (text extraction) + OCR fallback |
| **Text** | .txt, .md | Direct read |
| **CSV** | .csv | Papa Parse → structured text |
| **Images** | .png, .jpg, .webp, .gif | Vision LLM → text description |

### Key Features

- ✅ **Semantic search**: Vector similarity (cosine distance)
- ✅ **Hybrid search**: Vector + full-text search (BM25)
- ✅ **Multimodal**: Process images with vision models
- ✅ **Citations**: Show source file, page number, verbatim text
- ✅ **Verification**: Display original text alongside AI summary
- ✅ **Access control**: Only retrieve from user's project documents

---

## Architecture

### Data Flow

```
┌─────────────┐
│ User Uploads│
│   File to   │
│   Project   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Document Processing Pipeline   │
│                                 │
│  1. Extract text (PDF/TXT/CSV)  │
│  2. Chunk text (500-1000 tokens)│
│  3. Generate embeddings         │
│  4. Store in project_doc_chunks │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│     PostgreSQL + pgvector       │
│   project_doc_chunks table      │
│   • chunk_text                  │
│   • embedding (vector)          │
│   • source metadata             │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│        User Asks Question       │
│     in Project Chat             │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│    RAG Retrieval System         │
│                                 │
│  1. Embed user query            │
│  2. Vector similarity search    │
│  3. Full-text keyword search    │
│  4. Merge & rank results        │
│  5. Filter by relevance (>0.7)  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│     Inject into LLM Context     │
│                                 │
│  System Prompt:                 │
│  "Answer using ONLY the context │
│   provided. Quote sources."     │
│                                 │
│  Context: [chunk1, chunk2, ...]│
│  Question: [user query]         │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│     LLM Response                │
│                                 │
│  • Summary answer               │
│  • Verbatim quotes              │
│  • Source citations             │
│    (file, page, chunk ID)       │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│    UI Display                   │
│                                 │
│  [AI Summary]                   │
│                                 │
│  Sources:                       │
│  📄 document.pdf (p.3)          │
│    "Original text here..."      │
│                                 │
│  📄 notes.txt                   │
│    "Another quote..."           │
└─────────────────────────────────┘
```

---

## Database Schema Fixes

### Issue: Wrong Foreign Key Reference

The current `project_doc_chunks` table references `lca_projects`, but the new unified table is `project_projects`.

**Location**: `/home/user/GroosHub/src/lib/db/migrations/006_chatbot_rebuild_schema.sql:119`

```sql
-- CURRENT (INCORRECT)
CREATE TABLE IF NOT EXISTS project_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES lca_projects(id) ON DELETE CASCADE,
  ...
);
```

### Fix Required

Create a new migration to update the foreign key:

**File**: `src/lib/db/migrations/007_fix_project_doc_chunks_fk.sql`

```sql
-- ============================================
-- FIX PROJECT_DOC_CHUNKS FOREIGN KEY
-- ============================================
-- Changes project_id to reference project_projects instead of lca_projects
-- Created: 2025-12-10

-- Drop existing foreign key constraint
ALTER TABLE project_doc_chunks
DROP CONSTRAINT IF EXISTS project_doc_chunks_project_id_fkey;

-- Add new foreign key to project_projects
ALTER TABLE project_doc_chunks
ADD CONSTRAINT project_doc_chunks_project_id_fkey
FOREIGN KEY (project_id)
REFERENCES project_projects(id)
ON DELETE CASCADE;

-- Add file_id to link chunks to source files
ALTER TABLE project_doc_chunks
ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE;

-- Add index for file_id lookups
CREATE INDEX IF NOT EXISTS idx_project_doc_chunks_file_id
ON project_doc_chunks(file_id);

-- Add processing status tracking
ALTER TABLE file_uploads
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS embedding_error TEXT,
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMP;

-- Add index for finding files that need processing
CREATE INDEX IF NOT EXISTS idx_file_uploads_embedding_status
ON file_uploads(embedding_status, project_id);

COMMENT ON COLUMN file_uploads.embedding_status IS 'RAG processing status: pending, processing, completed, failed, skipped';
COMMENT ON COLUMN file_uploads.chunk_count IS 'Number of chunks generated from this file';
COMMENT ON COLUMN project_doc_chunks.file_id IS 'Source file that this chunk came from';
```

---

## Document Processing Pipeline

### 1. Text Extraction

Create utilities to extract text from different file types.

**File**: `src/lib/ai/document-processing/text-extractor.ts`

```typescript
import { readFile } from 'fs/promises';
import pdf from 'pdf-parse';
import Papa from 'papaparse';

export interface ExtractedText {
  text: string;
  pageCount?: number;
  metadata: {
    pages?: Array<{ pageNumber: number; text: string }>;
    rows?: number;
    columns?: string[];
  };
}

export class TextExtractor {
  /**
   * Extract text from PDF
   */
  async extractFromPDF(buffer: Buffer): Promise<ExtractedText> {
    try {
      const data = await pdf(buffer);

      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          pages: data.text.split('\f').map((pageText, i) => ({
            pageNumber: i + 1,
            text: pageText.trim()
          }))
        }
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text file
   */
  async extractFromText(buffer: Buffer): Promise<ExtractedText> {
    const text = buffer.toString('utf-8');

    return {
      text,
      metadata: {}
    };
  }

  /**
   * Extract text from CSV (convert to readable format)
   */
  async extractFromCSV(buffer: Buffer): Promise<ExtractedText> {
    const csvString = buffer.toString('utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        complete: (results) => {
          // Convert CSV to text format: "Column1: value1, Column2: value2"
          const rows = results.data.map((row: any) => {
            return Object.entries(row)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ');
          });

          const text = rows.join('\n');

          resolve({
            text,
            metadata: {
              rows: results.data.length,
              columns: results.meta.fields || []
            }
          });
        },
        error: (error) => reject(error)
      });
    });
  }

  /**
   * Extract text from image using vision LLM
   */
  async extractFromImage(
    imageUrl: string,
    mimeType: string
  ): Promise<ExtractedText> {
    // This will be called via chat API with vision model
    // For now, return placeholder that triggers vision processing
    return {
      text: `[IMAGE: ${imageUrl}]`,
      metadata: {
        isImage: true,
        mimeType,
        requiresVisionModel: true
      }
    };
  }

  /**
   * Main extraction router
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<ExtractedText> {
    // Route to appropriate extractor based on MIME type
    if (mimeType === 'application/pdf') {
      return this.extractFromPDF(buffer);
    }

    if (mimeType === 'text/plain' || filename.endsWith('.md')) {
      return this.extractFromText(buffer);
    }

    if (mimeType === 'text/csv') {
      return this.extractFromCSV(buffer);
    }

    if (mimeType.startsWith('image/')) {
      // Images need vision model processing - skip for now
      throw new Error('Image processing requires vision model - use multimodal chat');
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
```

### 2. Text Chunking

Create smart chunking that respects semantic boundaries.

**File**: `src/lib/ai/document-processing/text-chunker.ts`

```typescript
import { encode } from 'gpt-tokenizer';

export interface TextChunk {
  text: string;
  index: number;
  tokenCount: number;
  startChar: number;
  endChar: number;
  metadata?: {
    pageNumber?: number;
    sectionTitle?: string;
  };
}

export interface ChunkingOptions {
  maxTokens: number;          // Default: 800
  overlapTokens: number;      // Default: 100
  respectSentences: boolean;  // Default: true
  respectParagraphs: boolean; // Default: true
}

export class TextChunker {
  private defaultOptions: ChunkingOptions = {
    maxTokens: 800,
    overlapTokens: 100,
    respectSentences: true,
    respectParagraphs: true
  };

  /**
   * Chunk text into overlapping segments
   */
  chunk(text: string, options?: Partial<ChunkingOptions>): TextChunk[] {
    const opts = { ...this.defaultOptions, ...options };

    // Split into paragraphs first if respect option is on
    const paragraphs = opts.respectParagraphs
      ? text.split(/\n\n+/)
      : [text];

    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let charOffset = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);

      // If paragraph is too long, split into sentences
      if (paragraphTokens > opts.maxTokens) {
        const sentences = this.splitIntoSentences(paragraph);

        for (const sentence of sentences) {
          const sentenceTokens = this.countTokens(sentence);

          // If adding sentence exceeds limit, save current chunk
          if (currentTokens + sentenceTokens > opts.maxTokens && currentChunk) {
            chunks.push({
              text: currentChunk.trim(),
              index: chunkIndex++,
              tokenCount: currentTokens,
              startChar: charOffset,
              endChar: charOffset + currentChunk.length
            });

            // Start new chunk with overlap
            const overlapText = this.getOverlapText(currentChunk, opts.overlapTokens);
            currentChunk = overlapText + ' ' + sentence;
            currentTokens = this.countTokens(currentChunk);
            charOffset += currentChunk.length - overlapText.length;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else {
        // Paragraph fits, check if it fits in current chunk
        if (currentTokens + paragraphTokens > opts.maxTokens && currentChunk) {
          // Save current chunk
          chunks.push({
            text: currentChunk.trim(),
            index: chunkIndex++,
            tokenCount: currentTokens,
            startChar: charOffset,
            endChar: charOffset + currentChunk.length
          });

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk, opts.overlapTokens);
          currentChunk = overlapText + '\n\n' + paragraph;
          currentTokens = this.countTokens(currentChunk);
          charOffset += currentChunk.length - overlapText.length;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokens += paragraphTokens;
        }
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: currentTokens,
        startChar: charOffset,
        endChar: charOffset + currentChunk.length
      });
    }

    return chunks;
  }

  /**
   * Chunk PDF with page metadata
   */
  chunkPDF(
    pages: Array<{ pageNumber: number; text: string }>,
    options?: Partial<ChunkingOptions>
  ): TextChunk[] {
    const allChunks: TextChunk[] = [];

    for (const page of pages) {
      const chunks = this.chunk(page.text, options);

      // Add page metadata to each chunk
      chunks.forEach(chunk => {
        chunk.metadata = {
          ...chunk.metadata,
          pageNumber: page.pageNumber
        };
      });

      allChunks.push(...chunks);
    }

    // Reindex all chunks
    return allChunks.map((chunk, index) => ({
      ...chunk,
      index
    }));
  }

  /**
   * Count tokens using GPT tokenizer
   */
  private countTokens(text: string): number {
    return encode(text).length;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitter (can be improved with NLP library)
    return text
      .split(/([.!?]+\s+)/)
      .reduce((acc, part, i, arr) => {
        if (i % 2 === 0) {
          acc.push(part + (arr[i + 1] || ''));
        }
        return acc;
      }, [] as string[])
      .filter(s => s.trim());
  }

  /**
   * Get last N tokens from text for overlap
   */
  private getOverlapText(text: string, targetTokens: number): string {
    const sentences = this.splitIntoSentences(text);
    let overlapText = '';
    let tokens = 0;

    // Add sentences from the end until we reach target tokens
    for (let i = sentences.length - 1; i >= 0 && tokens < targetTokens; i--) {
      const sentence = sentences[i];
      const sentenceTokens = this.countTokens(sentence);

      if (tokens + sentenceTokens <= targetTokens) {
        overlapText = sentence + ' ' + overlapText;
        tokens += sentenceTokens;
      } else {
        break;
      }
    }

    return overlapText.trim();
  }
}
```

### 3. Document Processor (Orchestrator)

Combine extraction and chunking.

**File**: `src/lib/ai/document-processing/document-processor.ts`

```typescript
import { TextExtractor } from './text-extractor';
import { TextChunker, type TextChunk } from './text-chunker';
import { R2Client } from '@/lib/storage/r2-client';

export interface ProcessedDocument {
  fileId: string;
  filename: string;
  chunks: TextChunk[];
  metadata: {
    pageCount?: number;
    totalTokens: number;
    chunkCount: number;
  };
}

export class DocumentProcessor {
  private extractor = new TextExtractor();
  private chunker = new TextChunker();
  private r2Client = new R2Client();

  /**
   * Process a file: extract text → chunk → return chunks
   */
  async processFile(
    fileId: string,
    filePath: string,
    filename: string,
    mimeType: string
  ): Promise<ProcessedDocument> {
    try {
      // 1. Download file from R2
      const buffer = await this.r2Client.getFileBuffer(filePath);

      // 2. Extract text
      const extracted = await this.extractor.extract(buffer, mimeType, filename);

      // 3. Chunk text
      let chunks: TextChunk[];

      if (extracted.metadata.pages) {
        // PDF with page metadata
        chunks = this.chunker.chunkPDF(extracted.metadata.pages);
      } else {
        // Regular text
        chunks = this.chunker.chunk(extracted.text);
      }

      // 4. Calculate total tokens
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

      return {
        fileId,
        filename,
        chunks,
        metadata: {
          pageCount: extracted.pageCount,
          totalTokens,
          chunkCount: chunks.length
        }
      };
    } catch (error) {
      throw new Error(`Document processing failed for ${filename}: ${error.message}`);
    }
  }
}
```

---

## Embedding System

### OpenAI Embeddings with Batch Support (Following Vercel AI SDK Patterns)

**File**: `src/lib/ai/embeddings/embedder.ts`

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Use OpenAI's recommended model
const embeddingModel = openai.embedding('text-embedding-3-small');

export interface EmbeddingResult {
  embedding: number[];
  content: string;
}

/**
 * Generate a single embedding (for queries)
 * Following official Vercel AI SDK pattern
 */
export async function generateEmbedding(value: string): Promise<number[]> {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input
  });
  return embedding;
}

/**
 * Generate multiple embeddings (for document chunks)
 * Following official Vercel AI SDK pattern
 */
export async function generateEmbeddings(
  chunks: string[]
): Promise<EmbeddingResult[]> {
  if (chunks.length === 0) return [];

  const { embeddings, usage } = await embedMany({
    model: embeddingModel,
    values: chunks
  });

  return embeddings.map((embedding, i) => ({
    content: chunks[i],
    embedding
  }));
}

/**
 * Generate embeddings with progress callback (for large batches)
 */
export async function generateEmbeddingsWithProgress(
  chunks: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<EmbeddingResult[]> {
  const BATCH_SIZE = 100; // OpenAI allows up to 100 per request
  const allResults: EmbeddingResult[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    try {
      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: batch
      });

      const results = embeddings.map((embedding, idx) => ({
        content: batch[idx],
        embedding
      }));

      allResults.push(...results);

      if (onProgress) {
        onProgress(Math.min(i + batch.length, chunks.length), chunks.length);
      }

      // Rate limiting: wait 100ms between batches
      if (i + batch.length < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      throw new Error(`Embedding batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return allResults;
}
```

### Database Operations for Chunks

**File**: `src/lib/db/queries/project-doc-chunks.ts`

```typescript
import { sql } from '@/lib/db';
import type { TextChunk } from '@/lib/ai/document-processing/text-chunker';

export interface ChunkInsert {
  projectId: string;
  fileId: string;
  chunkText: string;
  chunkIndex: number;
  embedding: number[];
  sourceFile: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
  metadata?: Record<string, any>;
}

export async function insertChunks(chunks: ChunkInsert[]): Promise<void> {
  if (chunks.length === 0) return;

  // Build multi-row insert
  const values = chunks.map(chunk => ({
    id: crypto.randomUUID(),
    project_id: chunk.projectId,
    file_id: chunk.fileId,
    chunk_text: chunk.chunkText,
    chunk_index: chunk.chunkIndex,
    embedding: JSON.stringify(chunk.embedding), // pgvector format
    source_file: chunk.sourceFile,
    page_number: chunk.pageNumber,
    section_title: chunk.sectionTitle,
    token_count: chunk.tokenCount,
    metadata: chunk.metadata || {},
    embedding_model: 'text-embedding-3-small',
    created_at: new Date(),
    updated_at: new Date()
  }));

  await sql`
    INSERT INTO project_doc_chunks ${sql(values)}
  `;
}

export async function deleteChunksByFileId(fileId: string): Promise<void> {
  await sql`
    DELETE FROM project_doc_chunks
    WHERE file_id = ${fileId}
  `;
}

export async function getChunkCountByProjectId(projectId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*)::int as count
    FROM project_doc_chunks
    WHERE project_id = ${projectId}
  `;

  return result[0]?.count || 0;
}

export async function getChunkCountByFileId(fileId: string): Promise<number> {
  const result = await sql`
    SELECT COUNT(*)::int as count
    FROM project_doc_chunks
    WHERE file_id = ${fileId}
  `;

  return result[0]?.count || 0;
}
```

### Processing Pipeline (Full Flow)

**File**: `src/lib/ai/rag/processing-pipeline.ts`

```typescript
import { DocumentProcessor } from '@/lib/ai/document-processing/document-processor';
import { generateEmbeddingsWithProgress } from '@/lib/ai/embeddings/embedder';
import { insertChunks, type ChunkInsert } from '@/lib/db/queries/project-doc-chunks';
import { sql } from '@/lib/db';

export interface ProcessFileOptions {
  fileId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  projectId: string;
  onProgress?: (step: string, progress: number) => void;
}

/**
 * Full pipeline: process file → chunk → embed → store
 * Following Vercel AI SDK patterns
 */
export async function processFile(options: ProcessFileOptions): Promise<void> {
  const { fileId, filePath, filename, mimeType, projectId, onProgress } = options;

  try {
    // Update status to processing
    await sql`
      UPDATE file_uploads
      SET embedding_status = 'processing'
      WHERE id = ${fileId}
    `;

    // Step 1: Process document (extract + chunk)
    onProgress?.('Processing document', 0.2);
    const processor = new DocumentProcessor();
    const processed = await processor.processFile(
      fileId,
      filePath,
      filename,
      mimeType
    );

    // Step 2: Generate embeddings using Vercel AI SDK
    onProgress?.('Generating embeddings', 0.5);
    const chunkTexts = processed.chunks.map(c => c.text);
    const embeddingResults = await generateEmbeddingsWithProgress(
      chunkTexts,
      (completed, total) => {
        const progress = 0.5 + (completed / total) * 0.3;
        onProgress?.('Generating embeddings', progress);
      }
    );

    // Step 3: Prepare chunks for database
    onProgress?.('Storing chunks', 0.8);
    const chunksToInsert: ChunkInsert[] = processed.chunks.map((chunk, i) => ({
      projectId,
      fileId,
      chunkText: chunk.text,
      chunkIndex: chunk.index,
      embedding: embeddingResults[i].embedding,
      sourceFile: filename,
      pageNumber: chunk.metadata?.pageNumber,
      sectionTitle: chunk.metadata?.sectionTitle,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata
    }));

    // Step 4: Insert into database
    await insertChunks(chunksToInsert);

    // Step 5: Update file upload record
    await sql`
      UPDATE file_uploads
      SET
        embedding_status = 'completed',
        chunk_count = ${processed.chunks.length},
        embedded_at = NOW(),
        updated_at = NOW()
      WHERE id = ${fileId}
    `;

    onProgress?.('Complete', 1.0);
  } catch (error) {
    // Update status to failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await sql`
      UPDATE file_uploads
      SET
        embedding_status = 'failed',
        embedding_error = ${errorMessage},
        updated_at = NOW()
      WHERE id = ${fileId}
    `;

    throw error;
  }
}
```

---

## Retrieval System

### RAG Retrieval with Hybrid Search (Following Vercel AI SDK Patterns)

**File**: `src/lib/ai/rag/retriever.ts`

```typescript
import { sql } from '@/lib/db';
import { generateEmbedding } from '@/lib/ai/embeddings/embedder';

export interface RetrievedChunk {
  id: string;
  chunkText: string;
  chunkIndex: number;
  sourceFile: string;
  pageNumber?: number;
  sectionTitle?: string;
  similarity: number;
  fileId: string;
}

export interface RetrievalOptions {
  projectId: string;
  query: string;
  topK?: number;              // Default: 5
  similarityThreshold?: number; // Default: 0.7
  useHybridSearch?: boolean;   // Default: true
}

/**
 * Find relevant content from project documents
 * Following official Vercel AI SDK RAG pattern
 */
export async function findRelevantContent(
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  const {
    projectId,
    query,
    topK = 5,
    similarityThreshold = 0.7,
    useHybridSearch = true
  } = options;

  // 1. Generate embedding for the user's query
  const userQueryEmbedding = await generateEmbedding(query);

  if (useHybridSearch) {
    return hybridSearch(
      projectId,
      query,
      userQueryEmbedding,
      topK,
      similarityThreshold
    );
  } else {
    return vectorSearch(
      projectId,
      userQueryEmbedding,
      topK,
      similarityThreshold
    );
  }
}

/**
 * Vector similarity search using cosine distance
 * Pattern based on Vercel AI SDK RAG guide
 */
async function vectorSearch(
  projectId: string,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedChunk[]> {
  // Using PostgreSQL pgvector's cosine distance operator (<=>)
  // Similarity = 1 - cosine_distance
  const result = await sql`
    SELECT
      id,
      chunk_text,
      chunk_index,
      source_file,
      page_number,
      section_title,
      file_id,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM project_doc_chunks
    WHERE
      project_id = ${projectId}
      AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${threshold}
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${topK}
  `;

  return result.map(row => ({
    id: row.id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    sourceFile: row.source_file,
    pageNumber: row.page_number,
    sectionTitle: row.section_title,
    similarity: row.similarity,
    fileId: row.file_id
  }));
}

/**
 * Hybrid search: vector + full-text (BM25)
 * Combines semantic and keyword search for better results
 */
async function hybridSearch(
    projectId: string,
    query: string,
    queryEmbedding: number[],
    topK: number,
    threshold: number
  ): Promise<RetrievedChunk[]> {
    // Get vector results
    const vectorResults = await sql`
      SELECT
        id,
        chunk_text,
        chunk_index,
        source_file,
        page_number,
        section_title,
        file_id,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as vector_score
      FROM project_doc_chunks
      WHERE project_id = ${projectId}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${topK * 2}
    `;

    // Get full-text search results
    const textResults = await sql`
      SELECT
        id,
        chunk_text,
        chunk_index,
        source_file,
        page_number,
        section_title,
        file_id,
        ts_rank(
          to_tsvector('english', chunk_text),
          plainto_tsquery('english', ${query})
        ) as text_score
      FROM project_doc_chunks
      WHERE
        project_id = ${projectId}
        AND to_tsvector('english', chunk_text) @@ plainto_tsquery('english', ${query})
      ORDER BY text_score DESC
      LIMIT ${topK * 2}
    `;

    // Merge results using Reciprocal Rank Fusion (RRF)
    const merged = mergeResults(vectorResults, textResults, topK, threshold);

    return merged;
  }
}

/**
 * Merge vector and text results using Reciprocal Rank Fusion (RRF)
 */
function mergeResults(
    vectorResults: any[],
    textResults: any[],
    topK: number,
    threshold: number
  ): RetrievedChunk[] {
    const k = 60; // RRF constant
    const scores = new Map<string, number>();
    const chunks = new Map<string, any>();

    // Add vector scores
    vectorResults.forEach((row, rank) => {
      const rrf = 1 / (k + rank + 1);
      scores.set(row.id, (scores.get(row.id) || 0) + rrf);
      chunks.set(row.id, row);
    });

    // Add text scores
    textResults.forEach((row, rank) => {
      const rrf = 1 / (k + rank + 1);
      scores.set(row.id, (scores.get(row.id) || 0) + rrf);
      if (!chunks.has(row.id)) {
        chunks.set(row.id, row);
      }
    });

    // Sort by combined score
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    // Filter by threshold and format
    return sorted
      .map(([id, score]) => {
        const chunk = chunks.get(id);
        return {
          id: chunk.id,
          chunkText: chunk.chunk_text,
          chunkIndex: chunk.chunk_index,
          sourceFile: chunk.source_file,
          pageNumber: chunk.page_number,
          sectionTitle: chunk.section_title,
          similarity: chunk.vector_score || score, // Use vector score if available
          fileId: chunk.file_id
        };
      })
      .filter(chunk => chunk.similarity >= threshold);
  }
}
```

---

## Chat Integration

### Update Chat API to Support RAG

**File**: `src/app/api/chat/route.ts` (modifications)

Add RAG retrieval before LLM call:

```typescript
// Add imports (following Vercel AI SDK patterns)
import { findRelevantContent } from '@/lib/ai/rag/retriever';
import { getChunkCountByProjectId } from '@/lib/db/queries/project-doc-chunks';

// Inside POST handler, before streamText call:

// Check if chat has a project_id
const projectId = conversation.project_id;
let ragContext = '';
let retrievedChunks: RetrievedChunk[] = [];

if (projectId) {
  // Check if project has any document chunks
  const chunkCount = await getChunkCountByProjectId(projectId);

  if (chunkCount > 0) {
    // Retrieve relevant chunks using RAG system
    // Following the official Vercel AI SDK pattern
    retrievedChunks = await findRelevantContent({
      projectId,
      query: lastUserMessage,
      topK: 5,
      similarityThreshold: 0.7,
      useHybridSearch: true
    });

    if (retrievedChunks.length > 0) {
      // Build context string for the LLM
      ragContext = '\n\n---\n\nRELEVANT CONTEXT FROM PROJECT DOCUMENTS:\n\n';

      retrievedChunks.forEach((chunk, i) => {
        ragContext += `[Source ${i + 1}: ${chunk.sourceFile}`;
        if (chunk.pageNumber) ragContext += `, Page ${chunk.pageNumber}`;
        ragContext += `]\n${chunk.chunkText}\n\n`;
      });

      ragContext += '---\n\n';
      ragContext += 'INSTRUCTIONS:\n';
      ragContext += '- Answer the user\'s question using ONLY the context provided above\n';
      ragContext += '- Quote relevant sections verbatim and cite the source number (e.g., [Source 1])\n';
      ragContext += '- If the context does not contain enough information to answer, say "I don\'t have enough information in the project documents to answer this question."\n';
      ragContext += '- Always provide both a summary AND the exact quotes from sources\n\n';
    }
  }
}

// Modify system prompt to include RAG instructions
const enhancedSystemPrompt = ragContext
  ? ragContext + systemPrompt
  : systemPrompt;

// Pass to streamText
const result = streamText({
  model: selectedModel,
  system: enhancedSystemPrompt,
  messages: conversationMessages,
  // ... rest of options
});

// After streaming, save metadata about retrieved chunks
if (retrievedChunks.length > 0) {
  await sql`
    UPDATE chats_messages
    SET metadata = metadata || ${JSON.stringify({
      ragChunks: retrievedChunks.map(c => ({
        id: c.id,
        sourceFile: c.sourceFile,
        pageNumber: c.pageNumber,
        similarity: c.similarity
      }))
    })}::jsonb
    WHERE id = ${assistantMessageId}
  `;
}
```

### Citation Parsing

**File**: `src/lib/ai/rag/citation-parser.ts`

```typescript
export interface Citation {
  sourceNumber: number;
  sourceFile: string;
  pageNumber?: number;
  quote: string;
  chunkId: string;
}

export function parseCitations(
  responseText: string,
  retrievedChunks: RetrievedChunk[]
): Citation[] {
  const citations: Citation[] = [];

  // Match patterns like [Source 1] or (Source 2)
  const pattern = /\[Source (\d+)\]|\(Source (\d+)\)/g;
  let match;

  while ((match = pattern.exec(responseText)) !== null) {
    const sourceNum = parseInt(match[1] || match[2]);
    const chunk = retrievedChunks[sourceNum - 1];

    if (chunk) {
      // Try to extract the quote (text between quotes after the citation)
      const afterCitation = responseText.slice(match.index + match[0].length);
      const quoteMatch = afterCitation.match(/"([^"]+)"/);

      citations.push({
        sourceNumber: sourceNum,
        sourceFile: chunk.sourceFile,
        pageNumber: chunk.pageNumber,
        quote: quoteMatch ? quoteMatch[1] : chunk.chunkText.slice(0, 200),
        chunkId: chunk.id
      });
    }
  }

  return citations;
}
```

---

## UI Components

### Source Display Component

**File**: `src/features/chat/components/MessageSources.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

export interface MessageSource {
  id: string;
  sourceFile: string;
  pageNumber?: number;
  chunkText: string;
  similarity: number;
}

export interface MessageSourcesProps {
  sources: MessageSource[];
  locale: 'nl' | 'en';
}

export function MessageSources({ sources, locale }: MessageSourcesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sources.length === 0) return null;

  const t = {
    title: locale === 'nl' ? 'Bronnen' : 'Sources',
    showOriginal: locale === 'nl' ? 'Toon originele tekst' : 'Show original text',
    hideOriginal: locale === 'nl' ? 'Verberg' : 'Hide',
    relevance: locale === 'nl' ? 'Relevantie' : 'Relevance',
    page: locale === 'nl' ? 'Pagina' : 'Page'
  };

  return (
    <div className="mt-base border-t border-gray-200 pt-base">
      <h4 className="text-sm font-semibold text-gray-700 mb-sm">
        {t.title}
      </h4>

      <div className="space-y-sm">
        {sources.map((source, i) => (
          <Card key={source.id} className="p-sm bg-gray-50">
            <div className="flex items-start justify-between gap-sm">
              <div className="flex-1">
                <div className="flex items-center gap-sm text-sm">
                  <span className="font-mono text-xs bg-primary text-white px-xs py-0 rounded">
                    {i + 1}
                  </span>
                  <span className="font-medium">📄 {source.sourceFile}</span>
                  {source.pageNumber && (
                    <span className="text-gray-500">
                      {t.page} {source.pageNumber}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {t.relevance}: {(source.similarity * 100).toFixed(0)}%
                  </span>
                </div>

                {expandedId === source.id && (
                  <div className="mt-sm p-sm bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {source.chunkText}
                    </p>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
              >
                {expandedId === source.id ? t.hideOriginal : t.showOriginal}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Update Chat Message Component

**File**: `src/features/chat/components/ChatMessages.tsx` (modification)

Add MessageSources component to assistant messages:

```typescript
import { MessageSources } from './MessageSources';

// Inside message rendering:
{message.role === 'assistant' && message.metadata?.ragChunks && (
  <MessageSources
    sources={message.metadata.ragChunks}
    locale={locale}
  />
)}
```

---

## Implementation Phases

### Phase 1: Database & Core Infrastructure (Week 1)

**Tasks:**
1. ✅ Run migration to fix `project_doc_chunks` foreign key
2. ✅ Add `file_id` column to link chunks to files
3. ✅ Add `embedding_status` to `file_uploads`
4. ✅ Install dependencies: `pdf-parse`, `papaparse`, `gpt-tokenizer`
5. ✅ Create folder structure: `src/lib/ai/{document-processing,embeddings,rag}/`

**Deliverables:**
- Updated database schema
- Empty module files ready for implementation

---

### Phase 2: Document Processing (Week 1-2)

**Tasks:**
1. ✅ Implement `TextExtractor` (PDF, TXT, CSV)
2. ✅ Implement `TextChunker` with semantic splitting
3. ✅ Implement `DocumentProcessor` orchestrator
4. ✅ Add unit tests for chunking logic
5. ✅ Create API endpoint `/api/files/process` for manual triggering

**Deliverables:**
- Document processing pipeline working
- Ability to extract and chunk documents

---

### Phase 3: Embedding Pipeline (Week 2)

**Tasks:**
1. ✅ Implement `Embedder` with OpenAI batch support
2. ✅ Create database queries for chunk insertion
3. ✅ Implement `ProcessingPipeline` (full flow)
4. ✅ Create background job script `scripts/embed-project-docs.ts`
5. ✅ Add progress tracking and error handling

**Deliverables:**
- Ability to generate embeddings for uploaded files
- Chunks stored in database with vectors

---

### Phase 4: Retrieval System (Week 3)

**Tasks:**
1. ✅ Implement `RAGRetriever` with vector search
2. ✅ Add hybrid search (vector + full-text)
3. ✅ Implement RRF merging algorithm
4. ✅ Create test API endpoint `/api/rag/search`
5. ✅ Tune similarity threshold and topK values

**Deliverables:**
- Working retrieval system
- API for testing retrieval quality

---

### Phase 5: Chat Integration (Week 3-4)

**Tasks:**
1. ✅ Update `/api/chat` to retrieve context for project chats
2. ✅ Inject retrieved chunks into system prompt
3. ✅ Implement citation parsing
4. ✅ Save retrieved chunks to message metadata
5. ✅ Add prompt engineering for RAG responses

**Deliverables:**
- Chat can answer questions about project documents
- Citations tracked in database

---

### Phase 6: UI Components (Week 4)

**Tasks:**
1. ✅ Create `MessageSources` component
2. ✅ Update `ChatMessages` to display sources
3. ✅ Add "View original text" expandable sections
4. ✅ Show processing status on file upload
5. ✅ Add "Re-embed" button for files

**Deliverables:**
- Beautiful UI for viewing sources
- Users can verify AI responses

---

### Phase 7: Background Processing & Polish (Week 5)

**Tasks:**
1. ✅ Auto-trigger embedding on file upload
2. ✅ Add webhook/queue system for async processing
3. ✅ Create admin dashboard for RAG stats
4. ✅ Add analytics (chunk usage, retrieval accuracy)
5. ✅ Performance optimization (caching, indexing)

**Deliverables:**
- Seamless user experience
- Automatic processing of uploads
- Monitoring and analytics

---

## Next Steps

### Immediate Actions (This Week)

1. **Run database migration** to fix foreign keys
2. **Install NPM packages**:
   ```bash
   npm install pdf-parse papaparse gpt-tokenizer
   npm install --save-dev @types/pdf-parse @types/papaparse
   ```
3. **Create folder structure**
4. **Implement Phase 1** (Database & Infrastructure)

### Questions to Resolve

1. **Embedding model**: Use `text-embedding-3-small` (1536 dims, $0.02/1M tokens) or `text-embedding-3-large` (3072 dims, $0.13/1M tokens)?
   - Recommendation: Start with small, upgrade if needed

2. **Processing trigger**: Auto-process on upload or manual trigger?
   - Recommendation: Auto-process in background

3. **Image handling**: Process images with vision model during RAG or only on demand?
   - Recommendation: On-demand only (expensive)

4. **Chunk size**: 800 tokens (default) or custom per file type?
   - Recommendation: 800 for text, 400 for CSVs

5. **Hybrid search**: Always on or user configurable?
   - Recommendation: Always on, better results

---

## Cost Estimation

### Per File Processing

**Example: 100-page PDF**

- Text extraction: Free
- Chunking: Free
- Embedding (100 chunks × 800 tokens = 80,000 tokens): **$0.0016**
- Storage (100 chunks): Negligible
- **Total per file: ~$0.002**

### Per Query

**Example: User asks a question**

- Query embedding (20 tokens): **$0.0000004**
- Vector search: Free (database operation)
- LLM response (500 tokens output): **~$0.03** (varies by model)
- **Total per query: ~$0.03**

### Monthly Estimate (100 Users)

- 10 files per user per month = 1,000 files × $0.002 = **$2**
- 100 questions per user per month = 10,000 queries × $0.03 = **$300**
- **Total: ~$302/month**

---

## Success Metrics

1. **Accuracy**: >90% of responses cite relevant sources
2. **Relevance**: >0.7 similarity score for retrieved chunks
3. **Performance**: <2s for retrieval + LLM response
4. **User satisfaction**: Users verify sources >50% of the time
5. **Cost**: <$5 per 100 queries (embedding + LLM)

---

## Conclusion

This RAG system will transform your AI assistant into a powerful document Q&A tool. The implementation is well-scoped, follows best practices, and leverages your existing infrastructure (pgvector, R2, Vercel AI SDK).

**Start with Phase 1** and build incrementally. Each phase delivers value independently, allowing for user feedback and iteration.

**Key Success Factors:**
- Semantic chunking (respect paragraphs)
- Hybrid search (vector + text)
- Clear citations (source + page + quote)
- Verification UI (show original text)
- Background processing (seamless UX)

Ready to implement? Let's start with the database migration! 🚀
