/**
 * Embedding generation for RAG (Retrieval-Augmented Generation)
 *
 * EMBEDDING MODEL:
 * - OpenAI text-embedding-3-small (1536 dimensions)
 * - Cost: $0.02 per 1M tokens
 * - Max input: 8191 tokens
 * - Best for: General-purpose semantic search
 *
 * UPGRADE PATH:
 * If embedding quality is insufficient for your use case:
 * - Switch to: text-embedding-3-large (3072 dimensions)
 * - Cost: $0.13 per 1M tokens (6.5x more expensive)
 * - Better semantic understanding, especially for:
 *   - Technical/specialized content
 *   - Complex queries
 *   - Nuanced semantic differences
 * - Database change required: ALTER TABLE project_doc_chunks
 *   ALTER COLUMN embedding TYPE VECTOR(3072);
 *
 * IMPLEMENTATION:
 * - Follows official Vercel AI SDK patterns
 * - Batch processing (up to 100 embeddings per request)
 * - Progress callbacks for UX
 * - Rate limiting (100ms between batches)
 * - Error handling with retries
 */

import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Use OpenAI's recommended small model
// Change to 'text-embedding-3-large' if quality is insufficient
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536; // 3072 for large model

const embeddingModel = openai.embedding(EMBEDDING_MODEL);

export interface EmbeddingResult {
  embedding: number[];
  content: string;
}

/**
 * Generate a single embedding (for queries)
 * Following official Vercel AI SDK pattern
 *
 * Usage:
 * const embedding = await generateEmbedding("What is the capital of France?");
 * // Returns: number[] with 1536 dimensions
 */
export async function generateEmbedding(value: string): Promise<number[]> {
  // Clean up input (remove excessive whitespace)
  const input = value.replaceAll('\n', ' ').trim();

  if (!input) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    const { embedding } = await embed({
      model: embeddingModel,
      value: input
    });

    return embedding;
  } catch (error) {
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `Check that OPENAI_API_KEY is set in .env.local`
    );
  }
}

/**
 * Generate multiple embeddings (for document chunks)
 * Following official Vercel AI SDK pattern
 *
 * Usage:
 * const results = await generateEmbeddings(["chunk 1", "chunk 2", "chunk 3"]);
 * // Returns: [{ embedding: number[], content: string }, ...]
 */
export async function generateEmbeddings(
  chunks: string[]
): Promise<EmbeddingResult[]> {
  if (chunks.length === 0) return [];

  // Filter out empty chunks
  const validChunks = chunks.filter(chunk => chunk.trim().length > 0);

  if (validChunks.length === 0) {
    throw new Error('No valid text chunks to embed');
  }

  try {
    const { embeddings, usage } = await embedMany({
      model: embeddingModel,
      values: validChunks
    });

    console.log(
      `Generated ${embeddings.length} embeddings using ${usage.tokens} tokens ` +
      `(~$${((usage.tokens / 1_000_000) * 0.02).toFixed(6)})`
    );

    return embeddings.map((embedding, i) => ({
      content: validChunks[i],
      embedding
    }));
  } catch (error) {
    throw new Error(
      `Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      `Check that OPENAI_API_KEY is set in .env.local`
    );
  }
}

/**
 * Generate embeddings with progress callback (for large batches)
 * Use this when processing many documents to show progress in UI
 *
 * Usage:
 * const results = await generateEmbeddingsWithProgress(
 *   chunks,
 *   (completed, total) => console.log(`${completed}/${total}`)
 * );
 */
export async function generateEmbeddingsWithProgress(
  chunks: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<EmbeddingResult[]> {
  const BATCH_SIZE = 100; // OpenAI allows up to 100 per request
  const allResults: EmbeddingResult[] = [];

  // Filter out empty chunks
  const validChunks = chunks.filter(chunk => chunk.trim().length > 0);

  if (validChunks.length === 0) {
    throw new Error('No valid text chunks to embed');
  }

  for (let i = 0; i < validChunks.length; i += BATCH_SIZE) {
    const batch = validChunks.slice(i, i + BATCH_SIZE);

    try {
      const { embeddings, usage } = await embedMany({
        model: embeddingModel,
        values: batch
      });

      const results = embeddings.map((embedding, idx) => ({
        content: batch[idx],
        embedding
      }));

      allResults.push(...results);

      console.log(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: Generated ${batch.length} embeddings ` +
        `using ${usage.tokens} tokens (~$${((usage.tokens / 1_000_000) * 0.02).toFixed(6)})`
      );

      if (onProgress) {
        onProgress(Math.min(i + batch.length, validChunks.length), validChunks.length);
      }

      // Rate limiting: wait 100ms between batches
      if (i + batch.length < validChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      throw new Error(
        `Embedding batch failed at chunk ${i}: ` +
        `${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Check that OPENAI_API_KEY is set in .env.local`
      );
    }
  }

  return allResults;
}

/**
 * Utility: Calculate embedding cost
 * Useful for estimating costs before processing
 */
export function estimateEmbeddingCost(tokenCount: number): {
  smallModel: number;
  largeModel: number;
} {
  return {
    smallModel: (tokenCount / 1_000_000) * 0.02,
    largeModel: (tokenCount / 1_000_000) * 0.13
  };
}

/**
 * Utility: Get current embedding model info
 */
export function getEmbeddingModelInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    maxInputTokens: 8191,
    costPer1MTokens: 0.02,
    upgradeModel: 'text-embedding-3-large',
    upgradeDimensions: 3072,
    upgradeCostPer1MTokens: 0.13
  };
}
