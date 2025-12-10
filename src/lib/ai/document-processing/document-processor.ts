/**
 * Document Processor - Orchestrates text extraction and chunking
 *
 * This is the main entry point for processing documents for RAG.
 * It combines:
 * 1. TextExtractor - Extracts text from various file formats
 * 2. TextChunker - Splits text into semantic chunks
 *
 * Flow: File → Extract → Chunk → Return chunks (ready for embedding)
 */

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
    extractionMethod?: string;
    warnings?: string[];
  };
}

export class DocumentProcessor {
  private extractor = new TextExtractor();
  private chunker = new TextChunker();
  private r2Client = new R2Client();

  /**
   * Process a file: download → extract text → chunk → return chunks
   *
   * This is the main entry point for document processing.
   * Use this when you have a file in R2 storage that needs to be
   * prepared for embedding and RAG.
   *
   * @param fileId - UUID of the file in file_uploads table
   * @param filePath - R2 storage path (from file_uploads.file_path)
   * @param filename - Original filename (for error messages)
   * @param mimeType - MIME type (determines extraction method)
   * @returns Processed document with chunks ready for embedding
   */
  async processFile(
    fileId: string,
    filePath: string,
    filename: string,
    mimeType: string
  ): Promise<ProcessedDocument> {
    try {
      // Step 1: Download file from R2
      console.log(`Processing file: ${filename} (${mimeType})`);
      const buffer = await this.r2Client.getFileBuffer(filePath);

      // Step 2: Extract text
      const extracted = await this.extractor.extract(buffer, mimeType, filename);

      console.log(
        `Extracted ${extracted.text.length} characters ` +
        `using ${extracted.metadata.extractionMethod} ` +
        (extracted.pageCount ? `(${extracted.pageCount} pages)` : '')
      );

      // Log any extraction warnings
      if (extracted.metadata.warnings && extracted.metadata.warnings.length > 0) {
        console.warn(`Extraction warnings for ${filename}:`, extracted.metadata.warnings);
      }

      // Step 3: Chunk text
      let chunks: TextChunk[];

      if (extracted.metadata.pages) {
        // PDF with page metadata
        chunks = this.chunker.chunkPDF(extracted.metadata.pages);
      } else {
        // Regular text
        chunks = this.chunker.chunk(extracted.text);
      }

      // Step 4: Calculate statistics
      const stats = this.chunker.getChunkingStats(chunks);

      console.log(
        `Created ${chunks.length} chunks ` +
        `(avg ${stats.avgTokensPerChunk} tokens, ` +
        `min ${stats.minTokens}, max ${stats.maxTokens})`
      );

      return {
        fileId,
        filename,
        chunks,
        metadata: {
          pageCount: extracted.pageCount,
          totalTokens: stats.totalTokens,
          chunkCount: chunks.length,
          extractionMethod: extracted.metadata.extractionMethod,
          warnings: extracted.metadata.warnings
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Document processing failed for ${filename}:`, errorMessage);
      throw new Error(`Failed to process ${filename}: ${errorMessage}`);
    }
  }

  /**
   * Process text directly (without file upload)
   * Useful for testing or processing text from other sources
   */
  async processText(
    text: string,
    options?: {
      fileId?: string;
      filename?: string;
    }
  ): Promise<ProcessedDocument> {
    const fileId = options?.fileId || 'test-' + Date.now();
    const filename = options?.filename || 'direct-text-input.txt';

    console.log(`Processing direct text input (${text.length} characters)`);

    // Chunk the text
    const chunks = this.chunker.chunk(text);
    const stats = this.chunker.getChunkingStats(chunks);

    console.log(
      `Created ${chunks.length} chunks ` +
      `(avg ${stats.avgTokensPerChunk} tokens)`
    );

    return {
      fileId,
      filename,
      chunks,
      metadata: {
        totalTokens: stats.totalTokens,
        chunkCount: chunks.length,
        extractionMethod: 'plain-text'
      }
    };
  }

  /**
   * Estimate processing cost before actually processing
   * Useful for showing cost estimates in UI
   */
  async estimateProcessingCost(
    filePath: string,
    mimeType: string
  ): Promise<{
    estimatedChunks: number;
    estimatedTokens: number;
    estimatedCost: number;
  }> {
    try {
      // Download and extract (but don't chunk yet)
      const buffer = await this.r2Client.getFileBuffer(filePath);
      const extracted = await this.extractor.extract(buffer, mimeType, 'estimate');

      // Estimate chunks
      const estimatedChunks = this.chunker.estimateChunkCount(extracted.text);
      const estimatedTokens = estimatedChunks * 800; // Avg chunk size

      // Embedding cost (text-embedding-3-small: $0.02 per 1M tokens)
      const estimatedCost = (estimatedTokens / 1_000_000) * 0.02;

      return {
        estimatedChunks,
        estimatedTokens,
        estimatedCost
      };
    } catch (error) {
      throw new Error(`Cost estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
