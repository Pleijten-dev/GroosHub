/**
 * Legal Document Structure-Aware Chunker
 *
 * Phase 2: Respect Legal Document Structure
 *
 * PROBLEM: Standard chunking breaks at token limits, splitting articles from
 *          their tables and breaking cross-references.
 *
 * SOLUTION: Chunk by legal structure (Hoofdstuk → Afdeling → Artikel → Tabel)
 *           and keep related elements together.
 *
 * FEATURES:
 * 1. Detect document structure (articles, tables, paragraphs)
 * 2. Keep article + its table in same chunk
 * 3. Add contextual metadata (parent sections)
 * 4. Larger chunks for legal docs (up to 1500 tokens)
 *
 * Based on 2024 research:
 * - MultiHop-RAG (COLM 2024): https://github.com/yixuantt/MultiHop-RAG
 * - Legal RAG best practices: https://www.astera.com/type/blog/rag-driven-legal-data-extraction-for-faster-case-management/
 */

import { encode } from 'gpt-tokenizer';

export interface LegalStructureElement {
  type: 'hoofdstuk' | 'afdeling' | 'paragraaf' | 'artikel' | 'lid' | 'tabel' | 'text';
  content: string;
  identifier?: string;  // e.g., "4.162", "Tabel 4.162"
  startIndex: number;
  endIndex: number;
  level: number;        // Hierarchy depth (0 = hoofdstuk, 1 = afdeling, etc.)
}

export interface LegalChunk {
  text: string;
  index: number;
  tokenCount: number;
  metadata: {
    articleNumbers: string[];     // All articles in this chunk
    tableNames: string[];          // All tables in this chunk
    parentSection?: string;        // e.g., "Afdeling 4.1 Verblijfsgebied"
    hasTable: boolean;
    hasCrossReference: boolean;   // Contains "zie artikel/tabel"
    structureLevel: string;        // 'article', 'section', 'chapter'
  };
}

export class LegalDocumentChunker {
  // Legal documents need larger chunks to preserve context
  private readonly MAX_TOKENS = 1500;
  private readonly MIN_TOKENS = 300;

  /**
   * Parse document structure
   * Detects: Hoofdstuk, Afdeling, Paragraaf, Artikel, Tabel
   */
  parseStructure(text: string): LegalStructureElement[] {
    const elements: LegalStructureElement[] = [];

    // Pattern matching for Bouwbesluit structure
    const patterns = [
      {
        type: 'hoofdstuk' as const,
        regex: /^(Hoofdstuk\s+\d+[\s\S]*?)(?=\n(?:Hoofdstuk|Afdeling|\Z))/gim,
        level: 0
      },
      {
        type: 'afdeling' as const,
        regex: /^(Afdeling\s+\d+\.\d+[\s\S]*?)(?=\n(?:Hoofdstuk|Afdeling|Artikel|\Z))/gim,
        level: 1
      },
      {
        type: 'artikel' as const,
        regex: /^(Artikel\s+(\d+\.\d+)\.?[\s\S]*?)(?=\n(?:Artikel|Afdeling|Hoofdstuk|\Z))/gim,
        level: 2
      },
      {
        type: 'tabel' as const,
        regex: /(Tabel\s+(\d+\.\d+)[\s\S]*?)(?=\n\n(?:Artikel|Afdeling|\Z))/gim,
        level: 3
      }
    ];

    // Extract all structure elements
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex);

      while ((match = regex.exec(text)) !== null) {
        const content = match[1].trim();
        const identifier = match[2]; // Capture group for number

        elements.push({
          type: pattern.type,
          content,
          identifier,
          startIndex: match.index,
          endIndex: match.index + content.length,
          level: pattern.level
        });
      }
    }

    // Sort by position in document
    elements.sort((a, b) => a.startIndex - b.startIndex);

    return elements;
  }

  /**
   * Detect cross-references in text
   * e.g., "zie artikel 4.162", "bedoeld in tabel 4.162"
   */
  detectCrossReferences(text: string): {
    hasReferences: boolean;
    articleRefs: string[];
    tableRefs: string[];
  } {
    const articleRefs = new Set<string>();
    const tableRefs = new Set<string>();

    // Match: "artikel X.Y", "art. X.Y", "artikelen X.Y"
    const articlePattern = /\b(?:artikel|art\.)\s+(\d+\.\d+)/gi;
    let match;
    while ((match = articlePattern.exec(text)) !== null) {
      articleRefs.add(match[1]);
    }

    // Match: "tabel X.Y"
    const tablePattern = /\btabel\s+(\d+\.\d+)/gi;
    while ((match = tablePattern.exec(text)) !== null) {
      tableRefs.add(match[1]);
    }

    return {
      hasReferences: articleRefs.size > 0 || tableRefs.size > 0,
      articleRefs: Array.from(articleRefs),
      tableRefs: Array.from(tableRefs)
    };
  }

  /**
   * Find table associated with an article
   * Tables often appear right after their defining article
   */
  findAssociatedTable(
    articleElement: LegalStructureElement,
    allElements: LegalStructureElement[]
  ): LegalStructureElement | null {
    // Look for table immediately after this article
    const articleIndex = allElements.indexOf(articleElement);

    for (let i = articleIndex + 1; i < allElements.length; i++) {
      const next = allElements[i];

      // If we hit another article, stop searching
      if (next.type === 'artikel') break;

      // Found a table!
      if (next.type === 'tabel') {
        // Check if table number matches article (e.g., Artikel 4.162 → Tabel 4.162)
        if (articleElement.identifier && next.identifier) {
          if (articleElement.identifier === next.identifier) {
            return next;
          }
        }
        // Or if table is just "nearby"
        return next;
      }
    }

    return null;
  }

  /**
   * Group elements into chunks
   * Strategy: Keep article + table together
   */
  createChunks(elements: LegalStructureElement[]): LegalChunk[] {
    const chunks: LegalChunk[] = [];
    let chunkIndex = 0;

    // Track current section context
    let currentSection: string | undefined;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      // Update section context
      if (element.type === 'afdeling') {
        currentSection = element.content.split('\n')[0]; // First line = section title
      }

      // Start building a chunk
      let chunkText = element.content;
      let tokenCount = this.countTokens(chunkText);

      // If this is an article, check for associated table
      if (element.type === 'artikel') {
        const table = this.findAssociatedTable(element, elements);

        if (table) {
          // Add table to chunk
          chunkText += '\n\n' + table.content;
          tokenCount = this.countTokens(chunkText);
          i++; // Skip the table element in next iteration
        }
      }

      // If chunk is too small, try to merge with next elements
      if (tokenCount < this.MIN_TOKENS && i < elements.length - 1) {
        let nextElement = elements[i + 1];

        // Only merge if it's a related element (not jumping to new section)
        if (nextElement.type !== 'afdeling' && nextElement.type !== 'hoofdstuk') {
          const combined = chunkText + '\n\n' + nextElement.content;
          const combinedTokens = this.countTokens(combined);

          if (combinedTokens <= this.MAX_TOKENS) {
            chunkText = combined;
            tokenCount = combinedTokens;
            i++; // Skip next element
          }
        }
      }

      // Extract metadata
      const articleNumbers = this.extractArticleNumbers(chunkText);
      const tableNames = this.extractTableNames(chunkText);
      const crossRefs = this.detectCrossReferences(chunkText);

      chunks.push({
        text: chunkText,
        index: chunkIndex++,
        tokenCount,
        metadata: {
          articleNumbers,
          tableNames,
          parentSection: currentSection,
          hasTable: tableNames.length > 0,
          hasCrossReference: crossRefs.hasReferences,
          structureLevel: element.type === 'artikel' ? 'article' :
                         element.type === 'afdeling' ? 'section' : 'chapter'
        }
      });
    }

    return chunks;
  }

  /**
   * Main chunking entry point
   */
  chunk(text: string): LegalChunk[] {
    // Parse structure
    const elements = this.parseStructure(text);

    if (elements.length === 0) {
      // Fallback: no structure detected, use simple chunking
      console.warn('No legal structure detected, falling back to simple chunking');
      return this.fallbackChunk(text);
    }

    // Create structure-aware chunks
    return this.createChunks(elements);
  }

  /**
   * Fallback chunker if structure detection fails
   */
  private fallbackChunk(text: string): LegalChunk[] {
    // Simple paragraph-based chunking
    const paragraphs = text.split(/\n\n+/);
    const chunks: LegalChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + para;
      const tokens = this.countTokens(testChunk);

      if (tokens > this.MAX_TOKENS && currentChunk) {
        // Save current chunk
        chunks.push(this.createSimpleChunk(currentChunk, chunkIndex++));
        currentChunk = para;
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk) {
      chunks.push(this.createSimpleChunk(currentChunk, chunkIndex));
    }

    return chunks;
  }

  private createSimpleChunk(text: string, index: number): LegalChunk {
    return {
      text,
      index,
      tokenCount: this.countTokens(text),
      metadata: {
        articleNumbers: this.extractArticleNumbers(text),
        tableNames: this.extractTableNames(text),
        hasTable: /tabel\s+\d+\.\d+/i.test(text),
        hasCrossReference: /zie artikel|bedoeld in/i.test(text),
        structureLevel: 'text'
      }
    };
  }

  private countTokens(text: string): number {
    return encode(text).length;
  }

  private extractArticleNumbers(text: string): string[] {
    const numbers = new Set<string>();
    const regex = /Artikel\s+(\d+\.\d+)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      numbers.add(match[1]);
    }

    return Array.from(numbers);
  }

  private extractTableNames(text: string): string[] {
    const names = new Set<string>();
    const regex = /(Tabel\s+\d+\.\d+)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      names.add(match[1]);
    }

    return Array.from(names);
  }
}
