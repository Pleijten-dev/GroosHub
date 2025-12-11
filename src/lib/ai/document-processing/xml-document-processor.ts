/**
 * XML Document Processor for Legal Documents
 *
 * Specialized processor for XML legal documents (like Bouwbesluit)
 * that properly handles:
 * - Document structure (articles, paragraphs, sections)
 * - Tables with complex layouts
 * - Cross-references between articles
 * - Metadata (effective dates, source publications)
 *
 * Flow:
 * 1. Parse XML structure
 * 2. Extract articles and tables separately
 * 3. Use LLM to enrich tables with synthetic sentences
 * 4. Combine into searchable chunks
 */

import { XMLTableParser, type ParsedTable } from './xml-table-parser';
import { LLMTableEnricher, type EnrichedTable } from './llm-table-enricher';
import type { TextChunk } from './text-chunker';
import { encode } from 'gpt-tokenizer';

export interface XMLArticle {
  number: string;           // e.g., "4.162"
  title: string;            // e.g., "(aansturingsartikel)"
  content: string;          // Full article text
  tables: ParsedTable[];    // Tables within this article
  references: string[];     // Referenced articles/tables
}

export interface EnrichedXMLChunk extends TextChunk {
  metadata: {
    // Base TextChunk metadata
    pageNumber?: number;
    sectionTitle?: string;
    // XML-specific metadata
    articleNumber?: string;
    tableName?: string;
    hasTable?: boolean;
    hasSyntheticSentences?: boolean;
    syntheticSentences?: string[];
    articleReferences?: string[];
    enrichedByLLM?: boolean;
  };
}

export class XMLDocumentProcessor {
  private tableParser = new XMLTableParser();
  private tableEnricher = new LLMTableEnricher();

  /**
   * Process XML legal document
   * Main entry point for Bouwbesluit XML files
   */
  async processXML(xmlContent: string, filename: string): Promise<EnrichedXMLChunk[]> {
    console.log(`[XML Processor] Processing ${filename}...`);

    // Step 1: Parse XML to extract articles and tables
    const articles = this.extractArticles(xmlContent);
    const tables = this.tableParser.parseXML(xmlContent);

    console.log(`[XML Processor] Found ${articles.length} articles, ${tables.length} tables`);

    // Step 2: Enrich tables with LLM-generated sentences
    const enrichedTables = await this.tableEnricher.enrichTables(tables);

    console.log(`[XML Processor] Enriched ${enrichedTables.length} tables with synthetic sentences`);

    // Step 3: Create chunks
    const chunks = await this.createEnrichedChunks(articles, enrichedTables);

    console.log(`[XML Processor] Created ${chunks.length} enriched chunks`);

    return chunks;
  }

  /**
   * Extract articles from XML
   * Simplified extraction - in production, use proper XML parsing
   */
  private extractArticles(xmlContent: string): XMLArticle[] {
    const articles: XMLArticle[] = [];

    // Regex to find article elements
    const articleRegex = /<artikel[^>]*>[\s\S]*?<\/artikel>/g;
    const matches = xmlContent.match(articleRegex);

    if (!matches) return articles;

    for (const articleXML of matches) {
      // Extract article number
      const numberMatch = articleXML.match(/<nr[^>]*>([\d.]+)<\/nr>/);
      const number = numberMatch ? numberMatch[1] : '';

      // Extract title
      const titleMatch = articleXML.match(/<titel[^>]*>(.*?)<\/titel>/);
      const title = titleMatch ? titleMatch[1] : '';

      // Extract text content (simplified - remove all XML tags)
      const content = articleXML
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Find tables in this article
      const tableMatches = articleXML.match(/<table[\s\S]*?<\/table>/g);
      const tables = tableMatches
        ? this.tableParser.parseXML(articleXML)
        : [];

      // Extract references
      const refMatches = content.match(/\b\d+\.\d+\b/g);
      const references = refMatches ? Array.from(new Set(refMatches)) : [];

      articles.push({
        number,
        title,
        content,
        tables,
        references
      });
    }

    return articles;
  }

  /**
   * Create enriched chunks from articles and enriched tables
   */
  private async createEnrichedChunks(
    articles: XMLArticle[],
    enrichedTables: EnrichedTable[]
  ): Promise<EnrichedXMLChunk[]> {
    const chunks: EnrichedXMLChunk[] = [];
    let chunkIndex = 0;

    // Create a map of enriched tables by table number
    const tableMap = new Map<string, EnrichedTable>();
    enrichedTables.forEach(et => {
      if (et.originalTable.tableNumber) {
        tableMap.set(et.originalTable.tableNumber, et);
      }
    });

    // Process each article
    for (const article of articles) {
      // Find enriched tables for this article
      const articleTables = article.tables
        .map(t => t.tableNumber ? tableMap.get(t.tableNumber) : undefined)
        .filter((t): t is EnrichedTable => t !== undefined);

      if (articleTables.length > 0) {
        // Article contains tables - create enriched chunk
        for (const enrichedTable of articleTables) {
          const chunkText = this.buildEnrichedChunkText(
            article,
            enrichedTable
          );

          chunks.push({
            text: chunkText,
            index: chunkIndex++,
            tokenCount: this.countTokens(chunkText),
            startChar: 0,
            endChar: chunkText.length,
            metadata: {
              articleNumber: article.number,
              tableName: enrichedTable.originalTable.tableNumber,
              hasTable: true,
              hasSyntheticSentences: true,
              syntheticSentences: enrichedTable.syntheticSentences,
              articleReferences: article.references,
              enrichedByLLM: true
            }
          });
        }
      } else {
        // Regular article without tables
        chunks.push({
          text: article.content,
          index: chunkIndex++,
          tokenCount: this.countTokens(article.content),
          startChar: 0,
          endChar: article.content.length,
          metadata: {
            articleNumber: article.number,
            hasTable: false,
            hasSyntheticSentences: false,
            articleReferences: article.references,
            enrichedByLLM: false
          }
        });
      }
    }

    return chunks;
  }

  /**
   * Build enriched chunk text
   * Combines original article + table + synthetic sentences
   */
  private buildEnrichedChunkText(
    article: XMLArticle,
    enrichedTable: EnrichedTable
  ): string {
    const parts: string[] = [];

    // Article content
    parts.push(article.content);

    // Table in markdown format
    parts.push('\n\n--- Tabel Details ---');
    parts.push(enrichedTable.markdown);

    // LLM-generated synthetic sentences
    if (enrichedTable.syntheticSentences.length > 0) {
      parts.push('\n\n--- Tabel Samenvatting (Semantisch Verrijkt) ---');
      parts.push(enrichedTable.syntheticSentences.join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Count tokens
   */
  private countTokens(text: string): number {
    return encode(text).length;
  }

  /**
   * Detect if file is XML
   */
  static isXMLFile(filename: string, mimeType?: string): boolean {
    return (
      filename.toLowerCase().endsWith('.xml') ||
      mimeType === 'application/xml' ||
      mimeType === 'text/xml'
    );
  }
}
