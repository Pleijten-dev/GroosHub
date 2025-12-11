/**
 * Multi-Hop Retrieval for Legal Documents
 *
 * Phase 3: Follow Cross-References Automatically
 *
 * PROBLEM: "Artikel 4.164 verwijst naar tabel 4.162" - single-shot retrieval
 *          only finds the article, not the table it references.
 *
 * SOLUTION: Iterative retrieval that follows references:
 *           1. Initial search finds Artikel 4.164
 *           2. Detect reference to "tabel 4.162"
 *           3. Execute second search for that table
 *           4. Combine all results
 *
 * Based on 2024 research:
 * - MultiHop-RAG (COLM 2024): https://arxiv.org/abs/2401.15391
 * - HopRAG (2025): https://arxiv.org/html/2502.12442v1
 * - Microsoft GraphRAG: https://github.com/microsoft/graphrag
 */

import { findRelevantContent, type RetrievedChunk } from './retriever';

export interface MultiHopResult {
  allChunks: RetrievedChunk[];
  hops: Array<{
    hopNumber: number;
    query: string;
    retrievedChunks: RetrievedChunk[];
    detectedReferences: string[];
  }>;
  totalHops: number;
  executionTimeMs: number;
}

export interface MultiHopOptions {
  projectId: string;
  initialQuery: string;
  maxHops?: number;              // Default: 3
  minSimilarity?: number;        // Default: 0.3
  topKPerHop?: number;           // Default: 5
  followTableReferences?: boolean; // Default: true
  followArticleReferences?: boolean; // Default: true
}

export class MultiHopRetriever {
  private readonly MAX_HOPS = 3;
  private readonly TOP_K_PER_HOP = 5;

  /**
   * Extract references from retrieved chunks
   * Looks for: "zie artikel X", "tabel Y", "bedoeld in artikel Z"
   */
  private extractReferences(chunks: RetrievedChunk[]): {
    articleRefs: Set<string>;
    tableRefs: Set<string>;
  } {
    const articleRefs = new Set<string>();
    const tableRefs = new Set<string>();

    for (const chunk of chunks) {
      const text = chunk.text;

      // Extract article references
      const articlePattern = /\b(?:artikel|art\.)\s+(\d+\.\d+)/gi;
      let match;
      while ((match = articlePattern.exec(text)) !== null) {
        articleRefs.add(match[1]);
      }

      // Extract table references
      const tablePattern = /\btabel\s+(\d+\.\d+)/gi;
      while ((match = tablePattern.exec(text)) !== null) {
        tableRefs.add(match[1]);
      }
    }

    return { articleRefs, tableRefs };
  }

  /**
   * Check if we already have a reference in our retrieved chunks
   */
  private alreadyHaveReference(
    reference: string,
    existingChunks: RetrievedChunk[]
  ): boolean {
    const refPattern = new RegExp(`\\b${reference}\\b`, 'i');

    return existingChunks.some(chunk =>
      refPattern.test(chunk.text) ||
      refPattern.test(chunk.sourceFile)
    );
  }

  /**
   * Generate follow-up queries for references
   */
  private generateFollowUpQueries(
    articleRefs: Set<string>,
    tableRefs: Set<string>,
    existingChunks: RetrievedChunk[],
    options: MultiHopOptions
  ): string[] {
    const queries: string[] = [];

    // Generate queries for table references
    if (options.followTableReferences !== false) {
      for (const tableRef of tableRefs) {
        // Skip if we already have this table
        if (this.alreadyHaveReference(`Tabel ${tableRef}`, existingChunks)) {
          console.log(`[Multi-Hop] Already have Tabel ${tableRef}, skipping`);
          continue;
        }

        queries.push(`Tabel ${tableRef}`);
      }
    }

    // Generate queries for article references
    if (options.followArticleReferences !== false) {
      for (const articleRef of articleRefs) {
        // Skip if we already have this article
        if (this.alreadyHaveReference(`Artikel ${articleRef}`, existingChunks)) {
          console.log(`[Multi-Hop] Already have Artikel ${articleRef}, skipping`);
          continue;
        }

        queries.push(`Artikel ${articleRef}`);
      }
    }

    return queries;
  }

  /**
   * Execute multi-hop retrieval
   */
  async retrieve(options: MultiHopOptions): Promise<MultiHopResult> {
    const startTime = Date.now();
    const maxHops = options.maxHops || this.MAX_HOPS;
    const topK = options.topKPerHop || this.TOP_K_PER_HOP;

    const allChunks: RetrievedChunk[] = [];
    const hops: MultiHopResult['hops'] = [];

    console.log(`[Multi-Hop] Starting retrieval for: "${options.initialQuery}"`);
    console.log(`[Multi-Hop] Max hops: ${maxHops}, Top-K per hop: ${topK}`);

    // Hop 0: Initial query
    const initialResults = await findRelevantContent({
      projectId: options.projectId,
      query: options.initialQuery,
      topK,
      similarityThreshold: options.minSimilarity || 0.3,
      useHybridSearch: true
    });

    console.log(`[Multi-Hop] Hop 0: Retrieved ${initialResults.length} chunks`);

    allChunks.push(...initialResults);

    const { articleRefs, tableRefs } = this.extractReferences(initialResults);
    console.log(`[Multi-Hop] Hop 0: Found ${articleRefs.size} article refs, ${tableRefs.size} table refs`);

    hops.push({
      hopNumber: 0,
      query: options.initialQuery,
      retrievedChunks: initialResults,
      detectedReferences: [
        ...Array.from(articleRefs).map(r => `Artikel ${r}`),
        ...Array.from(tableRefs).map(r => `Tabel ${r}`)
      ]
    });

    // Multi-hop iterations
    let currentArticleRefs = articleRefs;
    let currentTableRefs = tableRefs;

    for (let hopNum = 1; hopNum < maxHops; hopNum++) {
      // Generate follow-up queries
      const followUpQueries = this.generateFollowUpQueries(
        currentArticleRefs,
        currentTableRefs,
        allChunks,
        options
      );

      if (followUpQueries.length === 0) {
        console.log(`[Multi-Hop] Hop ${hopNum}: No more references to follow, stopping`);
        break;
      }

      console.log(`[Multi-Hop] Hop ${hopNum}: Following ${followUpQueries.length} references`);

      // Execute follow-up queries
      const hopResults: RetrievedChunk[] = [];

      for (const query of followUpQueries) {
        console.log(`[Multi-Hop] Hop ${hopNum}: Searching for "${query}"`);

        const results = await findRelevantContent({
          projectId: options.projectId,
          query,
          topK: 3, // Fewer results for follow-up queries
          similarityThreshold: options.minSimilarity || 0.3,
          useHybridSearch: true
        });

        hopResults.push(...results);
      }

      // Deduplicate by chunk ID
      const newChunks = hopResults.filter(chunk =>
        !allChunks.some(existing => existing.id === chunk.id)
      );

      console.log(`[Multi-Hop] Hop ${hopNum}: Retrieved ${newChunks.length} new chunks (${hopResults.length - newChunks.length} duplicates)`);

      if (newChunks.length === 0) {
        console.log(`[Multi-Hop] Hop ${hopNum}: No new chunks found, stopping`);
        break;
      }

      allChunks.push(...newChunks);

      // Extract references from new chunks for next iteration
      const newRefs = this.extractReferences(newChunks);
      currentArticleRefs = newRefs.articleRefs;
      currentTableRefs = newRefs.tableRefs;

      hops.push({
        hopNumber: hopNum,
        query: followUpQueries.join(', '),
        retrievedChunks: newChunks,
        detectedReferences: [
          ...Array.from(currentArticleRefs).map(r => `Artikel ${r}`),
          ...Array.from(currentTableRefs).map(r => `Tabel ${r}`)
        ]
      });
    }

    const executionTime = Date.now() - startTime;

    console.log(`[Multi-Hop] Complete: ${allChunks.length} total chunks in ${hops.length} hops (${executionTime}ms)`);

    return {
      allChunks,
      hops,
      totalHops: hops.length,
      executionTimeMs: executionTime
    };
  }

  /**
   * Rerank chunks after multi-hop retrieval
   * Prioritize chunks that are directly relevant to original query
   */
  rerank(
    result: MultiHopResult,
    originalQuery: string
  ): RetrievedChunk[] {
    console.log(`[Multi-Hop] Reranking ${result.allChunks.length} chunks`);

    // Assign hop penalty: later hops get lower scores
    const rankedChunks = result.allChunks.map(chunk => {
      // Find which hop this chunk came from
      let hopNumber = 0;
      for (const hop of result.hops) {
        if (hop.retrievedChunks.some(c => c.id === chunk.id)) {
          hopNumber = hop.hopNumber;
          break;
        }
      }

      // Apply hop penalty (later hops are less important)
      const hopPenalty = 1.0 / (1 + hopNumber * 0.3);
      const adjustedScore = chunk.similarity * hopPenalty;

      return {
        ...chunk,
        similarity: adjustedScore,
        metadata: {
          ...chunk.metadata,
          hopNumber
        }
      };
    });

    // Sort by adjusted similarity
    rankedChunks.sort((a, b) => b.similarity - a.similarity);

    console.log(`[Multi-Hop] Top 3 after reranking:`);
    for (let i = 0; i < Math.min(3, rankedChunks.length); i++) {
      const chunk = rankedChunks[i];
      console.log(`  [${i}] ${chunk.sourceFile} (hop ${chunk.metadata?.hopNumber}, score: ${chunk.similarity.toFixed(3)})`);
    }

    return rankedChunks;
  }
}

/**
 * Convenience function for single-call multi-hop retrieval
 */
export async function multiHopRetrieve(
  options: MultiHopOptions
): Promise<RetrievedChunk[]> {
  const retriever = new MultiHopRetriever();
  const result = await retriever.retrieve(options);
  const reranked = retriever.rerank(result, options.initialQuery);

  return reranked;
}
