/**
 * RAG Processing Pipeline
 *
 * Full end-to-end pipeline for processing documents for RAG:
 * File → Extract → Chunk → Embed → Store
 *
 * FLOW:
 * 1. Download file from R2 storage
 * 2. Extract text (PDF/TXT/MD)
 * 3. Chunk text (512 tokens, 100 overlap - 2024 best practices)
 * 4. Generate embeddings (OpenAI text-embedding-3-small)
 * 5. Store chunks in PostgreSQL with pgvector
 * 6. Update file status
 *
 * USAGE:
 * const pipeline = new ProcessingPipeline();
 * await pipeline.processFile({
 *   fileId: 'uuid',
 *   filePath: 'path/in/r2',
 *   filename: 'document.pdf',
 *   mimeType: 'application/pdf',
 *   projectId: 'project-uuid',
 *   onProgress: (step, progress) => console.log(step, progress)
 * });
 *
 * EMBEDDING MODEL:
 * - OpenAI text-embedding-3-small (1536 dimensions)
 * - If quality insufficient, upgrade to text-embedding-3-large
 */

import { DocumentProcessor } from '@/lib/ai/document-processing/document-processor';
import { LegalDocumentEnhancer } from '@/lib/ai/document-processing/legal-enhancer';
import { generateEmbeddingsWithProgress } from '@/lib/ai/embeddings/embedder';
import { insertChunks, type ChunkInsert, updateFileEmbeddingStatus } from '@/lib/db/queries/project-doc-chunks';
import { getDbConnection } from '@/lib/db/connection';

export interface ProcessFileOptions {
  fileId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  projectId: string;
  onProgress?: (step: string, progress: number) => void;
}

export interface ProcessingResult {
  success: boolean;
  fileId: string;
  chunkCount: number;
  totalTokens: number;
  warnings?: string[];
  error?: string;
}

/**
 * Full processing pipeline: file → extract → chunk → embed → store
 * This is the main entry point for processing documents for RAG
 *
 * @param options Processing configuration
 * @returns Processing result with statistics
 */
export async function processFile(options: ProcessFileOptions): Promise<ProcessingResult> {
  const { fileId, filePath, filename, mimeType, projectId, onProgress } = options;

  console.log(`[Pipeline] Step 1: Starting RAG processing for ${filename} (${mimeType})`);
  console.log(`[Pipeline] Step 2: File path = ${filePath}, Project = ${projectId}`);

  try {
    // Update status to processing
    console.log(`[Pipeline] Step 3: Updating file status to processing`);
    await updateFileEmbeddingStatus(fileId, 'processing');
    console.log(`[Pipeline] Step 4: Status updated successfully`);

    // Step 1: Process document (extract + chunk)
    console.log(`[Pipeline] Step 5: About to process document`);
    onProgress?.('Processing document', 0.2);
    const processor = new DocumentProcessor();
    console.log(`[Pipeline] Step 6: DocumentProcessor created, calling processFile`);
    const processed = await processor.processFile(
      fileId,
      filePath,
      filename,
      mimeType
    );
    console.log(`[Pipeline] Step 7: Document processed successfully`);

    console.log(
      `Processed ${filename}: ${processed.chunks.length} chunks, ` +
      `${processed.metadata.totalTokens} tokens`
    );

    // Step 1.5: Enrich chunks with synthetic sentences (Phase 1: Legal RAG)
    // Skip for XML files - they're already enriched by XMLDocumentProcessor!
    let enrichedChunks;
    const isXML = mimeType === 'application/xml' || mimeType === 'text/xml' || filename.endsWith('.xml');

    if (isXML) {
      console.log(`[Pipeline] Step 7.5: XML file detected - using pre-enriched chunks (skipping hard-coded enhancer)`);
      enrichedChunks = processed.chunks;

      // Log enrichment stats
      const tablesCount = enrichedChunks.filter(c => (c.metadata as any)?.hasTable).length;
      const llmEnrichedCount = enrichedChunks.filter(c => (c.metadata as any)?.enrichedByLLM).length;
      console.log(`[Pipeline] XML enrichment stats: ${tablesCount} table chunks, ${llmEnrichedCount} LLM-enriched`);

    } else {
      console.log(`[Pipeline] Step 7.5: Enriching chunks with hard-coded legal enhancer (for .txt files)`);
      const enhancer = new LegalDocumentEnhancer();
      enrichedChunks = [];

      for (let i = 0; i < processed.chunks.length; i++) {
        const chunk = processed.chunks[i];
        const enriched = await enhancer.enrichChunk(chunk.text);

        // Log if table was detected
        if (enriched.metadata.hasTable) {
          console.log(`[Pipeline] Chunk ${i}: Detected ${enriched.metadata.tableName}, added ${enriched.metadata.syntheticSentences?.length || 0} synthetic sentences`);
        }

        enrichedChunks.push({
          ...chunk,
          text: enriched.enrichedText,  // Use enriched text for embedding
          metadata: {
            ...chunk.metadata,
            ...enriched.metadata,
            originalText: enriched.originalText
          }
        });
      }

      console.log(`[Pipeline] Enrichment complete: ${enrichedChunks.filter(c => c.metadata.hasTable).length}/${enrichedChunks.length} chunks contain tables`);
    }

    // Step 2: Generate embeddings using Vercel AI SDK
    const chunkTexts = enrichedChunks.map(c => c.text);  // Use enriched texts
    console.log(`[Pipeline] Step 8: About to generate embeddings for ${chunkTexts.length} chunks`);
    onProgress?.('Generating embeddings', 0.5);
    const embeddingResults = await generateEmbeddingsWithProgress(
      chunkTexts,
      (completed, total) => {
        const progress = 0.5 + (completed / total) * 0.3;
        onProgress?.('Generating embeddings', progress);
      }
    );

    console.log(`Generated ${embeddingResults.length} embeddings`);

    // Step 3: Prepare chunks for database
    onProgress?.('Storing chunks', 0.8);
    const chunksToInsert: ChunkInsert[] = enrichedChunks.map((chunk, i) => ({
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
    const db = getDbConnection();
    await db`
      UPDATE file_uploads
      SET
        embedding_status = 'completed',
        chunk_count = ${processed.chunks.length},
        embedded_at = NOW(),
        updated_at = NOW()
      WHERE id = ${fileId}
    `;

    await updateFileEmbeddingStatus(fileId, 'completed');

    onProgress?.('Complete', 1.0);

    console.log(
      `✅ Successfully processed ${filename}: ` +
      `${processed.chunks.length} chunks, ` +
      `${processed.metadata.totalTokens} tokens`
    );

    return {
      success: true,
      fileId,
      chunkCount: processed.chunks.length,
      totalTokens: processed.metadata.totalTokens,
      warnings: processed.metadata.warnings
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Pipeline] ❌ FAILED at some step while processing ${filename}`);
    console.error(`[Pipeline] Error message: ${errorMessage}`);
    console.error(`[Pipeline] Full error:`, error);
    if (error instanceof Error && error.stack) {
      console.error(`[Pipeline] Stack trace:`, error.stack);
    }

    // Update status to failed
    console.log(`[Pipeline] Updating file status to failed`);
    await updateFileEmbeddingStatus(fileId, 'failed', errorMessage);

    return {
      success: false,
      fileId,
      chunkCount: 0,
      totalTokens: 0,
      error: errorMessage
    };
  }
}

/**
 * Process multiple files in batch
 * Useful for background processing
 *
 * @param files Array of files to process
 * @param onFileComplete Callback after each file completes
 * @returns Array of processing results
 */
export async function processFilesBatch(
  files: ProcessFileOptions[],
  onFileComplete?: (result: ProcessingResult, index: number, total: number) => void
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  console.log(`Processing batch of ${files.length} files`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\nProcessing file ${i + 1}/${files.length}: ${file.filename}`);

    const result = await processFile(file);
    results.push(result);

    if (onFileComplete) {
      onFileComplete(result, i + 1, files.length);
    }

    // Brief delay between files to avoid overwhelming the system
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(
    `\n✅ Batch processing complete: ${successCount}/${files.length} files successful`
  );

  return results;
}

/**
 * Re-process a file (deletes existing chunks first)
 * Useful when file is updated or embeddings need to be regenerated
 *
 * @param options Processing configuration
 * @returns Processing result
 */
export async function reprocessFile(options: ProcessFileOptions): Promise<ProcessingResult> {
  const { fileId, filename } = options;

  console.log(`Re-processing ${filename} (deleting existing chunks)`);

  // Delete existing chunks
  const db = getDbConnection();
  await db`
    DELETE FROM project_doc_chunks
    WHERE file_id = ${fileId}
  `;

  console.log(`Deleted existing chunks for ${filename}`);

  // Process as normal
  return processFile(options);
}

/**
 * Get processing statistics
 * Useful for monitoring and debugging
 *
 * @param projectId Project to get stats for
 * @returns Processing statistics
 */
export async function getProcessingStats(projectId: string): Promise<{
  totalFiles: number;
  processedFiles: number;
  pendingFiles: number;
  failedFiles: number;
  totalChunks: number;
  totalTokens: number;
}> {
  const db = getDbConnection();

  const fileStats = await db`
    SELECT
      COUNT(*)::int as total_files,
      COUNT(*) FILTER (WHERE embedding_status = 'completed')::int as processed_files,
      COUNT(*) FILTER (WHERE embedding_status = 'pending')::int as pending_files,
      COUNT(*) FILTER (WHERE embedding_status = 'failed')::int as failed_files
    FROM file_uploads
    WHERE project_id = ${projectId}
      AND deleted_at IS NULL
  `;

  const chunkStats = await db`
    SELECT
      COUNT(*)::int as total_chunks,
      COALESCE(SUM(token_count), 0)::int as total_tokens
    FROM project_doc_chunks
    WHERE project_id = ${projectId}
  `;

  return {
    totalFiles: fileStats[0]?.total_files || 0,
    processedFiles: fileStats[0]?.processed_files || 0,
    pendingFiles: fileStats[0]?.pending_files || 0,
    failedFiles: fileStats[0]?.failed_files || 0,
    totalChunks: chunkStats[0]?.total_chunks || 0,
    totalTokens: chunkStats[0]?.total_tokens || 0
  };
}
