/**
 * Legal Document Enhancer
 *
 * Phase 1 Quick Win: Table-to-Text Enrichment
 *
 * PROBLEM: Tables in Bouwbesluit lose structure when embedded as plain text.
 * SOLUTION: Detect tables, generate synthetic sentences describing each row.
 *
 * EXAMPLE:
 * Input (table):  "1 Woonfunctie a woonwagen 1 2 ... 2,2"
 * Output (enriched): "Voor de gebruiksfunctie woonfunctie (type: andere woonfunctie)
 *                     geldt volgens Tabel 4.162 een minimale hoogte van 2,6 meter
 *                     voor verblijfsgebied en verblijfsruimte."
 *
 * IMPACT: Vector search can now match semantic queries like "minimale hoogte woning"
 *
 * Based on 2024 research:
 * - AI21 RAG for Structured Data: https://www.ai21.com/knowledge/rag-for-structured-data/
 * - Elastic Labs: https://www.elastic.co/search-labs/blog/alternative-approach-for-parsing-pdfs-in-rag
 */

import { encode } from 'gpt-tokenizer';

export interface TableDetectionResult {
  isTable: boolean;
  tableName?: string;        // e.g., "Tabel 4.162"
  confidence: number;         // 0-1
  startIndex: number;
  endIndex: number;
}

export interface EnrichedChunk {
  originalText: string;
  enrichedText: string;       // Original + synthetic sentences
  metadata: {
    hasTable: boolean;
    tableName?: string;
    syntheticSentences?: string[];
    articleNumbers?: string[];  // e.g., ["4.162", "4.164"]
  };
}

export class LegalDocumentEnhancer {
  /**
   * Detect tables in Bouwbesluit text
   * Heuristics for ASCII tables:
   * 1. "Tabel X.Y" header
   * 2. Horizontal lines (----, ====)
   * 3. Column alignment (lots of whitespace)
   * 4. Vertical bars (|)
   */
  detectTables(text: string): TableDetectionResult[] {
    const tables: TableDetectionResult[] = [];

    // Regex: "Tabel" followed by number pattern
    const tableHeaderRegex = /Tabel\s+(\d+\.\d+)/gi;
    let match;

    while ((match = tableHeaderRegex.exec(text)) !== null) {
      const tableName = match[0]; // "Tabel 4.162"
      const startIndex = match.index;

      // Find end of table (next article or double newline)
      const afterTable = text.slice(startIndex);
      const endMatch = afterTable.search(/\n\n(Artikel|\n\n)/);
      const endIndex = endMatch !== -1
        ? startIndex + endMatch
        : Math.min(startIndex + 3000, text.length); // Max 3000 chars

      // Confidence based on table indicators
      const tableText = text.slice(startIndex, endIndex);
      let confidence = 0.5; // Base confidence for "Tabel" keyword

      if (/-{3,}/.test(tableText)) confidence += 0.2; // Has horizontal lines
      if (/\|/.test(tableText)) confidence += 0.2;    // Has vertical bars
      if (/\s{5,}/.test(tableText)) confidence += 0.1; // Column spacing

      tables.push({
        isTable: true,
        tableName,
        confidence: Math.min(confidence, 1.0),
        startIndex,
        endIndex
      });
    }

    return tables;
  }

  /**
   * Extract article numbers from text
   * Used for metadata and cross-reference tracking
   */
  extractArticleNumbers(text: string): string[] {
    const articles = new Set<string>();
    const regex = /Artikel\s+(\d+\.\d+)/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
      articles.add(match[1]); // Just the number: "4.162"
    }

    return Array.from(articles);
  }

  /**
   * Generate synthetic sentences for a Bouwbesluit table
   * This is the key enrichment step
   *
   * Strategy: Parse table structure and convert rows to natural language
   */
  async generateSyntheticSentences(
    tableText: string,
    tableName: string
  ): Promise<string[]> {
    const sentences: string[] = [];

    // For Tabel 4.162 (gebruiksfuncties), we know the structure:
    // Columns: gebruiksfunctie, leden, afmetingen, waarden

    if (tableName.includes('4.162')) {
      // Parse known structure for Tabel 4.162
      const lines = tableText.split('\n');

      // Look for data rows (heuristic: lines with numbers and "m" or "m²")
      for (const line of lines) {
        // Match pattern: "woonfunctie" ... "2,6" or "2.6"
        const heightMatch = line.match(/(\d+[.,]\d+)\s*$/); // Number at end

        if (heightMatch) {
          const height = heightMatch[1].replace(',', '.');

          // Determine function type
          let functionType = 'woonfunctie';
          if (/woonwagen/i.test(line)) functionType = 'woonwagen';
          else if (/studenten/i.test(line)) functionType = 'woonfunctie voor studenten';
          else if (/andere/i.test(line)) functionType = 'andere woonfunctie';

          // Generate synthetic sentence
          const sentence = `Voor de gebruiksfunctie ${functionType} geldt volgens ${tableName} een minimale hoogte van ${height} meter voor verblijfsgebied en verblijfsruimte.`;
          sentences.push(sentence);
        }
      }
    }

    // Fallback: generic table description
    if (sentences.length === 0) {
      sentences.push(
        `${tableName} bevat normwaarden en afmetingen die gelden voor de in deze tabel genoemde gebruiksfuncties.`
      );
    }

    return sentences;
  }

  /**
   * Main enrichment function
   * Adds synthetic sentences to chunks containing tables
   */
  async enrichChunk(originalText: string): Promise<EnrichedChunk> {
    const tables = this.detectTables(originalText);
    const articles = this.extractArticleNumbers(originalText);

    if (tables.length === 0) {
      // No table, return as-is
      return {
        originalText,
        enrichedText: originalText,
        metadata: {
          hasTable: false,
          articleNumbers: articles.length > 0 ? articles : undefined
        }
      };
    }

    // Has table(s) - enrich with synthetic sentences
    const allSyntheticSentences: string[] = [];

    for (const table of tables) {
      const tableText = originalText.slice(table.startIndex, table.endIndex);
      const sentences = await this.generateSyntheticSentences(
        tableText,
        table.tableName || 'Tabel'
      );
      allSyntheticSentences.push(...sentences);
    }

    // Append synthetic sentences to original text
    const enrichedText = [
      originalText,
      '\n\n--- Tabel Samenvatting ---',
      ...allSyntheticSentences
    ].join('\n');

    return {
      originalText,
      enrichedText,
      metadata: {
        hasTable: true,
        tableName: tables[0].tableName,
        syntheticSentences: allSyntheticSentences,
        articleNumbers: articles.length > 0 ? articles : undefined
      }
    };
  }

  /**
   * Query expansion for legal queries
   * Expands user query with related legal terms
   *
   * EXAMPLE:
   * Input: "wat is de minimale vrije verdiepingshoogte?"
   * Output: [
   *   "minimale hoogte verblijfsgebied verblijfsruimte",
   *   "hoogte boven de vloer woonfunctie",
   *   "tabel 4.162 hoogtemaat woning"
   * ]
   */
  expandLegalQuery(query: string): string[] {
    const expanded: string[] = [query]; // Keep original

    const lowerQuery = query.toLowerCase();

    // Map common concepts to legal terms
    if (lowerQuery.includes('verdiepingshoogte') || lowerQuery.includes('hoogte')) {
      expanded.push('hoogte verblijfsgebied verblijfsruimte');
      expanded.push('hoogte boven de vloer');
      expanded.push('tabel 4.162 hoogtemaat');
    }

    if (lowerQuery.includes('woning') || lowerQuery.includes('woonfunctie')) {
      expanded.push('woonfunctie verblijfsgebied');
      expanded.push('andere woonfunctie artikel 4.162');
    }

    if (lowerQuery.includes('minimale') || lowerQuery.includes('minimum')) {
      expanded.push('ten minste afmeting');
      expanded.push('minimale afmeting norm');
    }

    return expanded;
  }

  /**
   * Boost score for chunks with relevant structure
   * Use in reranking step
   */
  calculateStructuralBoost(
    query: string,
    chunkMetadata: EnrichedChunk['metadata']
  ): number {
    let boost = 1.0; // Neutral

    const lowerQuery = query.toLowerCase();

    // Boost if query asks for measurement and chunk has table
    const isMeasurementQuery = /hoogte|breedte|oppervlakte|m²|meter/i.test(query);
    if (isMeasurementQuery && chunkMetadata.hasTable) {
      boost *= 1.5; // 50% boost
    }

    // Boost if query mentions article number in chunk
    if (chunkMetadata.articleNumbers) {
      for (const article of chunkMetadata.articleNumbers) {
        if (query.includes(article)) {
          boost *= 1.3;
        }
      }
    }

    return boost;
  }
}
