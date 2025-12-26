/**
 * Database queries for project_doc_chunks table
 *
 * This handles all operations for storing and retrieving RAG document chunks:
 * - Insert chunks with embeddings
 * - Retrieve chunks for specific projects/files
 * - Delete chunks when files are removed
 * - Get statistics for monitoring
 */

import { getDbConnection } from '../connection';
import type { TextChunk } from '@/lib/ai/document-processing/text-chunker';

export interface ProjectDocChunk {
  id: string;
  project_id: string;
  file_id: string;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
  source_file: string;
  source_url: string | null;
  page_number: number | null;
  section_title: string | null;
  metadata: Record<string, unknown>;
  token_count: number | null;
  embedding_model: string;
  created_at: Date;
  updated_at: Date;
}

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
  metadata?: Record<string, unknown>;
}

/**
 * Insert multiple chunks into the database
 * Used after processing and embedding a document
 */
export async function insertChunks(chunks: ChunkInsert[]): Promise<void> {
  if (chunks.length === 0) return;

  const db = getDbConnection();

  // Build multi-row insert
  for (const chunk of chunks) {
    await db`
      INSERT INTO project_doc_chunks (
        id,
        project_id,
        file_id,
        chunk_text,
        chunk_index,
        embedding,
        source_file,
        page_number,
        section_title,
        token_count,
        metadata,
        embedding_model,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        ${chunk.projectId},
        ${chunk.fileId},
        ${chunk.chunkText},
        ${chunk.chunkIndex},
        ${`[${chunk.embedding.join(',')}]`}::vector,
        ${chunk.sourceFile},
        ${chunk.pageNumber || null},
        ${chunk.sectionTitle || null},
        ${chunk.tokenCount},
        ${JSON.stringify(chunk.metadata || {})}::jsonb,
        'text-embedding-3-small',
        NOW(),
        NOW()
      )
    `;
  }

  console.log(`Inserted ${chunks.length} chunks into database`);
}

/**
 * Delete all chunks associated with a file
 * Used when a file is deleted or needs to be reprocessed
 */
export async function deleteChunksByFileId(fileId: string): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    DELETE FROM project_doc_chunks
    WHERE file_id = ${fileId}
    RETURNING id
  `;

  console.log(`Deleted ${result.length} chunks for file ${fileId}`);
  return result.length;
}

/**
 * Delete all chunks associated with a project
 * Used when a project is deleted
 */
export async function deleteChunksByProjectId(projectId: string): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    DELETE FROM project_doc_chunks
    WHERE project_id = ${projectId}
    RETURNING id
  `;

  console.log(`Deleted ${result.length} chunks for project ${projectId}`);
  return result.length;
}

/**
 * Get chunk count for a project
 * Used to check if RAG is available for a project
 */
export async function getChunkCountByProjectId(projectId: string): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    SELECT COUNT(*)::int as count
    FROM project_doc_chunks
    WHERE project_id = ${projectId}
  `;

  return result[0]?.count || 0;
}

/**
 * Get chunk count for a file
 * Used for monitoring and debugging
 */
export async function getChunkCountByFileId(fileId: string): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    SELECT COUNT(*)::int as count
    FROM project_doc_chunks
    WHERE file_id = ${fileId}
  `;

  return result[0]?.count || 0;
}

/**
 * Get all chunks for a file
 * Used for debugging or displaying file details
 */
export async function getChunksByFileId(fileId: string): Promise<ProjectDocChunk[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      project_id,
      file_id,
      chunk_text,
      chunk_index,
      embedding,
      source_file,
      source_url,
      page_number,
      section_title,
      metadata,
      token_count,
      embedding_model,
      created_at,
      updated_at
    FROM project_doc_chunks
    WHERE file_id = ${fileId}
    ORDER BY chunk_index ASC
  `;

  return result as ProjectDocChunk[];
}

/**
 * Get RAG statistics for a project
 * Used for admin dashboard and monitoring
 */
export async function getProjectRAGStats(projectId: string): Promise<{
  totalChunks: number;
  totalFiles: number;
  totalTokens: number;
  avgChunksPerFile: number;
  embeddingModel: string;
}> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      COUNT(*)::int as total_chunks,
      COUNT(DISTINCT file_id)::int as total_files,
      COALESCE(SUM(token_count), 0)::int as total_tokens,
      COALESCE(AVG(token_count), 0)::int as avg_tokens_per_chunk,
      embedding_model
    FROM project_doc_chunks
    WHERE project_id = ${projectId}
    GROUP BY embedding_model
  `;

  if (result.length === 0) {
    return {
      totalChunks: 0,
      totalFiles: 0,
      totalTokens: 0,
      avgChunksPerFile: 0,
      embeddingModel: 'text-embedding-3-small'
    };
  }

  const stats = result[0];
  const avgChunksPerFile = stats.total_files > 0
    ? Math.round(stats.total_chunks / stats.total_files)
    : 0;

  return {
    totalChunks: stats.total_chunks,
    totalFiles: stats.total_files,
    totalTokens: stats.total_tokens,
    avgChunksPerFile,
    embeddingModel: stats.embedding_model || 'text-embedding-3-small'
  };
}

/**
 * Get files that need embedding (for background processing)
 * Returns files where embedding_status is 'pending'
 */
export async function getFilesNeedingEmbedding(limit: number = 10): Promise<Array<{
  id: string;
  project_id: string;
  filename: string;
  file_path: string;
  mime_type: string;
}>> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id,
      project_id,
      filename,
      file_path,
      mime_type
    FROM file_uploads
    WHERE embedding_status = 'pending'
      AND deleted_at IS NULL
      AND project_id IS NOT NULL
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;

  return result as Array<{
    id: string;
    project_id: string;
    filename: string;
    file_path: string;
    mime_type: string;
  }>;
}

/**
 * Update file embedding status
 * Used to track processing progress
 */
export async function updateFileEmbeddingStatus(
  fileId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string
): Promise<void> {
  const db = getDbConnection();

  if (error) {
    await db`
      UPDATE file_uploads
      SET
        embedding_status = ${status},
        embedding_error = ${error},
        updated_at = NOW()
      WHERE id = ${fileId}
    `;
  } else {
    await db`
      UPDATE file_uploads
      SET
        embedding_status = ${status},
        embedding_error = NULL,
        updated_at = NOW()
      WHERE id = ${fileId}
    `;
  }
}

/**
 * Get list of unique source files for a project with rich metadata
 * Used by query classifier to understand what documents are available
 */
export async function getProjectSourceFiles(projectId: string): Promise<Array<{
  sourceFile: string;
  chunkCount: number;
  summary?: string;
  topics?: string[];
  documentType?: string;
  keyConcepts?: string[];
}>> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      c.source_file as "sourceFile",
      COUNT(*)::int as "chunkCount",
      f.metadata->>'summary' as "summary",
      f.metadata->'topics' as "topics",
      f.metadata->>'documentType' as "documentType",
      f.metadata->'keyConcepts' as "keyConcepts"
    FROM project_doc_chunks c
    LEFT JOIN file_uploads f ON f.filename = c.source_file AND f.project_id = c.project_id
    WHERE c.project_id = ${projectId}
    GROUP BY c.source_file, f.metadata
    ORDER BY c.source_file ASC
  `;

  // Parse JSON fields
  return result.map((row: any) => ({
    sourceFile: row.sourceFile,
    chunkCount: row.chunkCount,
    summary: row.summary || undefined,
    topics: row.topics ? JSON.parse(row.topics) : undefined,
    documentType: row.documentType || undefined,
    keyConcepts: row.keyConcepts ? JSON.parse(row.keyConcepts) : undefined,
  })) as Array<{
    sourceFile: string;
    chunkCount: number;
    summary?: string;
    topics?: string[];
    documentType?: string;
    keyConcepts?: string[];
  }>;
}
