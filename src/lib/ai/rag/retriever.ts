/**
 * RAG Retrieval System
 *
 * RETRIEVAL STRATEGY:
 * - Vector similarity search (cosine distance with pgvector)
 * - Full-text search (PostgreSQL BM25)
 * - Hybrid search (combines both using Reciprocal Rank Fusion)
 *
 * QUALITY SETTINGS:
 * - topK: 5 chunks (configurable)
 * - Similarity threshold: 0.7 (70% match required)
 * - Hybrid search: Enabled by default (better results)
 *
 * EMBEDDING MODEL:
 * - OpenAI text-embedding-3-small (1536 dimensions)
 * - If quality insufficient, upgrade to text-embedding-3-large
 *
 * Following official Vercel AI SDK RAG patterns
 */

import { getDbConnection } from '@/lib/db/connection';
import { generateEmbedding } from '@/lib/ai/embeddings/embedder';

export interface RetrievedChunk {
  id: string;
  chunkText: string;
  chunkIndex: number;
  sourceFile: string;
  pageNumber?: number | null;
  sectionTitle?: string | null;
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
 * Main entry point for RAG retrieval
 *
 * Usage:
 * const chunks = await findRelevantContent({
 *   projectId: 'uuid',
 *   query: 'What is the capital of France?',
 *   topK: 5,
 *   similarityThreshold: 0.7
 * });
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

  console.log(`[Retriever] Retrieving content for query: "${query}" (projectId: ${projectId})`);
  console.log(`[Retriever] topK=${topK}, threshold=${similarityThreshold}, hybrid=${useHybridSearch}`);

  // First, let's check what embeddings are in the database
  const db = getDbConnection();
  const sampleCheck = await db`
    SELECT
      id,
      source_file,
      chunk_text,
      chunk_index,
      array_length(embedding::real[], 1) as embed_dims,
      (SELECT string_agg(val::text, ', ') FROM unnest(embedding::real[1:5]) as val) as first_5_vals
    FROM project_doc_chunks
    WHERE project_id = ${projectId}
    LIMIT 3
  `;
  console.log(`[Retriever] Database has ${sampleCheck.length} sample chunks:`);
  sampleCheck.forEach((row, i) => {
    console.log(`  [${i}] File: ${row.source_file}, Index: ${row.chunk_index}, Dims: ${row.embed_dims}, First 5: [${row.first_5_vals}]`);
    console.log(`      Text preview: "${row.chunk_text.substring(0, 80)}..."`);
  });

  // 1. Generate embedding for the user's query
  console.log(`[Retriever] Generating query embedding...`);
  const userQueryEmbedding = await generateEmbedding(query);
  console.log(`[Retriever] Query embedding: ${userQueryEmbedding.length} dimensions`);

  // 2. Search strategy
  let results: RetrievedChunk[];

  if (useHybridSearch) {
    results = await hybridSearch(
      projectId,
      query,
      userQueryEmbedding,
      topK,
      similarityThreshold
    );
  } else {
    results = await vectorSearch(
      projectId,
      userQueryEmbedding,
      topK,
      similarityThreshold
    );
  }

  console.log(`Retrieved ${results.length} chunks with avg similarity ${
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.similarity, 0) / results.length).toFixed(3)
      : '0'
  }`);

  return results;
}

/**
 * Vector similarity search using cosine distance
 * Pattern based on Vercel AI SDK RAG guide
 *
 * Uses pgvector's <=> operator for cosine distance
 * Similarity = 1 - cosine_distance
 */
async function vectorSearch(
  projectId: string,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedChunk[]> {
  const db = getDbConnection();

  // Using PostgreSQL pgvector's cosine distance operator (<=>)
  // Similarity = 1 - cosine_distance
  const result = await db`
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
    similarity: Number(row.similarity),
    fileId: row.file_id
  }));
}

/**
 * Hybrid search: vector + full-text (BM25)
 * Combines semantic and keyword search for better results
 *
 * Strategy:
 * 1. Get top N*2 results from vector search
 * 2. Get top N*2 results from full-text search
 * 3. Merge using Reciprocal Rank Fusion (RRF)
 * 4. Return top N results
 */
async function hybridSearch(
  projectId: string,
  query: string,
  queryEmbedding: number[],
  topK: number,
  threshold: number
): Promise<RetrievedChunk[]> {
  const db = getDbConnection();

  // Get vector results (semantic search)
  const vectorResults = await db`
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

  // Get full-text search results (keyword search)
  const textResults = await db`
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

/**
 * Merge vector and text results using Reciprocal Rank Fusion (RRF)
 *
 * RRF formula: score(d) = Σ 1 / (k + rank(d))
 * where k = 60 (standard constant)
 *
 * This gives more weight to documents that appear high in multiple rankings
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

  // Add vector scores (using ranks)
  vectorResults.forEach((row, rank) => {
    const rrf = 1 / (k + rank + 1);
    scores.set(row.id, (scores.get(row.id) || 0) + rrf);
    chunks.set(row.id, row);
  });

  // Add text scores (using ranks)
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

  // Convert to RetrievedChunk format
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
    .filter(chunk => chunk.similarity >= threshold); // Filter by threshold
}

/**
 * Get similar chunks (for "related documents" feature)
 * Finds chunks similar to a given chunk
 */
export async function findSimilarChunks(
  chunkId: string,
  topK: number = 3
): Promise<RetrievedChunk[]> {
  const db = getDbConnection();

  // Get the embedding of the source chunk
  const sourceResult = await db`
    SELECT embedding, project_id
    FROM project_doc_chunks
    WHERE id = ${chunkId}
    LIMIT 1
  `;

  if (sourceResult.length === 0) {
    return [];
  }

  const sourceEmbedding = sourceResult[0].embedding;
  const projectId = sourceResult[0].project_id;

  // Find similar chunks
  const result = await db`
    SELECT
      id,
      chunk_text,
      chunk_index,
      source_file,
      page_number,
      section_title,
      file_id,
      1 - (embedding <=> ${sourceEmbedding}::vector) as similarity
    FROM project_doc_chunks
    WHERE
      project_id = ${projectId}
      AND id != ${chunkId}
    ORDER BY embedding <=> ${sourceEmbedding}::vector
    LIMIT ${topK}
  `;

  return result.map(row => ({
    id: row.id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    sourceFile: row.source_file,
    pageNumber: row.page_number,
    sectionTitle: row.section_title,
    similarity: Number(row.similarity),
    fileId: row.file_id
  }));
}
