/**
 * Text chunking for RAG (Retrieval-Augmented Generation)
 *
 * CHUNKING STRATEGY:
 * - Target: 800 tokens per chunk (sweet spot for embeddings)
 * - Overlap: 100 tokens between chunks (preserve context at boundaries)
 * - Semantic boundaries: Respects paragraphs and sentences when possible
 * - Page tracking: Maintains source page numbers for PDFs
 *
 * WHY THESE SIZES?
 * - 800 tokens ≈ 600 words ≈ 2-3 paragraphs
 * - Large enough: Meaningful semantic units
 * - Small enough: Focused retrieval, not too expensive
 * - Overlap: Prevents losing context at chunk boundaries
 *
 * EMBEDDING MODEL USED:
 * - OpenAI text-embedding-3-small (1536 dimensions)
 * - Max input: 8191 tokens (we use 800 for quality)
 * - Cost: $0.02 per 1M tokens
 *
 * UPGRADE PATH:
 * If embedding quality is insufficient, upgrade to:
 * - OpenAI text-embedding-3-large (3072 dimensions)
 * - Cost: $0.13 per 1M tokens (6.5x more expensive)
 * - Better semantic understanding, especially for technical content
 * - Change database schema: embedding VECTOR(3072)
 */

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
   * Main entry point for text-based documents (.txt, .md)
   */
  chunk(text: string, options?: Partial<ChunkingOptions>): TextChunk[] {
    const opts = { ...this.defaultOptions, ...options };

    // Split into paragraphs first if respect option is on
    const paragraphs = opts.respectParagraphs
      ? this.splitIntoParagraphs(text)
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
            chunks.push(this.createChunk(
              currentChunk,
              chunkIndex++,
              currentTokens,
              charOffset,
              charOffset + currentChunk.length
            ));

            // Start new chunk with overlap
            if (opts.overlapTokens > 0) {
              const overlapText = this.getOverlapText(currentChunk, opts.overlapTokens);
              currentChunk = overlapText + ' ' + sentence;
              currentTokens = this.countTokens(currentChunk);
              charOffset += currentChunk.length - overlapText.length;
            } else {
              currentChunk = sentence;
              currentTokens = sentenceTokens;
              charOffset += currentChunk.length;
            }
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
            currentTokens += sentenceTokens;
          }
        }
      } else {
        // Paragraph fits, check if it fits in current chunk
        if (currentTokens + paragraphTokens > opts.maxTokens && currentChunk) {
          // Save current chunk
          chunks.push(this.createChunk(
            currentChunk,
            chunkIndex++,
            currentTokens,
            charOffset,
            charOffset + currentChunk.length
          ));

          // Start new chunk with overlap
          if (opts.overlapTokens > 0) {
            const overlapText = this.getOverlapText(currentChunk, opts.overlapTokens);
            currentChunk = overlapText + '\n\n' + paragraph;
            currentTokens = this.countTokens(currentChunk);
            charOffset += currentChunk.length - overlapText.length;
          } else {
            currentChunk = paragraph;
            currentTokens = paragraphTokens;
            charOffset += currentChunk.length;
          }
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokens += paragraphTokens;
        }
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        currentChunk,
        chunkIndex,
        currentTokens,
        charOffset,
        charOffset + currentChunk.length
      ));
    }

    return chunks;
  }

  /**
   * Chunk PDF with page metadata
   * Preserves page numbers for citation purposes
   */
  chunkPDF(
    pages: Array<{ pageNumber: number; text: string }>,
    options?: Partial<ChunkingOptions>
  ): TextChunk[] {
    const allChunks: TextChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      // Skip empty pages
      if (!page.text.trim()) continue;

      const pageChunks = this.chunk(page.text, options);

      // Add page metadata to each chunk
      pageChunks.forEach(chunk => {
        allChunks.push({
          ...chunk,
          index: globalChunkIndex++,
          metadata: {
            ...chunk.metadata,
            pageNumber: page.pageNumber
          }
        });
      });
    }

    return allChunks;
  }

  /**
   * Create a chunk object with all metadata
   */
  private createChunk(
    text: string,
    index: number,
    tokenCount: number,
    startChar: number,
    endChar: number
  ): TextChunk {
    return {
      text: text.trim(),
      index,
      tokenCount,
      startChar,
      endChar
    };
  }

  /**
   * Count tokens using GPT tokenizer
   * Matches OpenAI's token counting for accurate cost estimation
   */
  private countTokens(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    return encode(text).length;
  }

  /**
   * Split text into paragraphs
   * Respects blank lines as paragraph separators
   */
  private splitIntoParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n+/)  // Split on blank lines (one or more)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Split text into sentences
   * Simple sentence splitter - handles most common cases
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by space
    const sentences = text
      .split(/([.!?]+)\s+/)
      .reduce((acc, part, i, arr) => {
        if (i % 2 === 0) {
          acc.push(part + (arr[i + 1] || ''));
        }
        return acc;
      }, [] as string[])
      .filter(s => s.trim().length > 0);

    return sentences;
  }

  /**
   * Get last N tokens from text for overlap
   * Ensures context is preserved across chunk boundaries
   */
  private getOverlapText(text: string, targetTokens: number): string {
    // Try to get full sentences for overlap
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
        // If we can't fit a full sentence, just break
        // Better to have slightly less overlap than break mid-sentence
        break;
      }
    }

    return overlapText.trim();
  }

  /**
   * Utility: Estimate chunk count for a text
   * Useful for UI progress indicators
   */
  estimateChunkCount(text: string, options?: Partial<ChunkingOptions>): number {
    const opts = { ...this.defaultOptions, ...options };
    const totalTokens = this.countTokens(text);
    const effectiveChunkSize = opts.maxTokens - opts.overlapTokens;
    return Math.ceil(totalTokens / effectiveChunkSize);
  }

  /**
   * Utility: Get chunking statistics
   * Useful for debugging and optimization
   */
  getChunkingStats(chunks: TextChunk[]): {
    totalChunks: number;
    totalTokens: number;
    avgTokensPerChunk: number;
    minTokens: number;
    maxTokens: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        totalTokens: 0,
        avgTokensPerChunk: 0,
        minTokens: 0,
        maxTokens: 0
      };
    }

    const tokenCounts = chunks.map(c => c.tokenCount);
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

    return {
      totalChunks: chunks.length,
      totalTokens,
      avgTokensPerChunk: Math.round(totalTokens / chunks.length),
      minTokens: Math.min(...tokenCounts),
      maxTokens: Math.max(...tokenCounts)
    };
  }
}
