/**
 * LLM-Based Table Enrichment
 *
 * Uses LLM to generate natural language descriptions of table content.
 * This is FAR superior to hard-coded parsing because:
 * - Works for ANY table structure
 * - Understands semantic meaning of columns
 * - Generates context-aware sentences
 * - Adapts to different table types
 *
 * Based on 2024-2025 research:
 * - Elastic Labs: Table-to-text for RAG
 * - AI21: Structured data in RAG systems
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ParsedTable } from './xml-table-parser';

export interface EnrichedTable {
  originalTable: ParsedTable;
  syntheticSentences: string[];
  structuredData: any;
  markdown: string;
}

export class LLMTableEnricher {
  private model = 'gpt-4o-mini';  // Fast and cheap for table parsing

  /**
   * Generate synthetic sentences from a parsed table using LLM
   * This is the KEY innovation - let the LLM understand the table!
   */
  async enrichTable(table: ParsedTable): Promise<EnrichedTable> {
    console.log(`[LLM Enricher] Enriching table: ${table.title}`);

    // Convert table to markdown for LLM
    const markdown = this.tableToMarkdown(table);

    // Create prompt for LLM
    const prompt = this.createEnrichmentPrompt(table, markdown);

    try {
      // Ask LLM to generate synthetic sentences
      const { text } = await generateText({
        model: openai(this.model),
        messages: [
          {
            role: 'system',
            content: 'Je bent een expert in het analyseren van tabellen uit het Bouwbesluit 2012. ' +
                     'Je taak is om elke rij van een tabel om te zetten naar natuurlijke Nederlandse zinnen ' +
                     'die gemakkelijk te doorzoeken zijn.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1  // Low temperature for consistent output
      });

      // Parse LLM response into sentences
      const syntheticSentences = this.parseLLMResponse(text);

      console.log(`[LLM Enricher] Generated ${syntheticSentences.length} synthetic sentences`);

      return {
        originalTable: table,
        syntheticSentences,
        structuredData: this.tableToStructuredJSON(table),
        markdown
      };
    } catch (error) {
      console.error('[LLM Enricher] Error generating synthetic sentences:', error);

      // Fallback: basic sentence generation
      const fallbackSentences = this.generateFallbackSentences(table);

      return {
        originalTable: table,
        syntheticSentences: fallbackSentences,
        structuredData: this.tableToStructuredJSON(table),
        markdown
      };
    }
  }

  /**
   * Create enrichment prompt for LLM
   */
  private createEnrichmentPrompt(table: ParsedTable, markdown: string): string {
    return `Analyseer de volgende tabel uit het Bouwbesluit en genereer voor ELKE RIJ een volledige Nederlandse zin die de informatie beschrijft.

TABEL:
${markdown}

INSTRUCTIES:
1. Maak voor elke data-rij (niet de headers) één volledige zin
2. Noem altijd expliciet:
   - De gebruiksfunctie of categorie
   - Het tabelnummer (${table.tableNumber || 'deze tabel'})
   - De specifieke waardes met hun eenheden
   - Het type eis (hoogte, oppervlakte, etc.)

3. Gebruik deze structuur:
   "Voor de gebruiksfunctie [FUNCTIE] geldt volgens ${table.tableNumber || 'deze tabel'} [BESCHRIJVING VAN EISEN]."

VOORBEELD (voor Tabel 4.162):
- Input rij: woonwagen | 18 | 2,2
- Output: "Voor de gebruiksfunctie woonwagen geldt volgens Tabel 4.162 een minimale vloeroppervlakte van 18 m² en een minimale hoogte van 2,2 meter voor verblijfsgebied en verblijfsruimte."

Genereer nu de zinnen, één per regel:`;
  }

  /**
   * Parse LLM response into individual sentences
   */
  private parseLLMResponse(response: string): string[] {
    const sentences = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Filter out empty lines and markdown artifacts
        return line.length > 10 &&
               !line.startsWith('#') &&
               !line.startsWith('-') &&
               !line.startsWith('*');
      })
      .map(line => {
        // Clean up numbering (1., 2., etc.)
        return line.replace(/^\d+\.\s*/, '').trim();
      })
      .filter(line => line.length > 0);

    return sentences;
  }

  /**
   * Fallback: Generate basic sentences without LLM
   * Used if LLM call fails
   */
  private generateFallbackSentences(table: ParsedTable): string[] {
    const sentences: string[] = [];

    // Simple fallback: just list the row data
    table.dataRows.forEach(row => {
      const values = row.cells
        .map(c => c.value)
        .filter(v => v.trim().length > 0)
        .join(', ');

      if (values) {
        sentences.push(
          `${table.tableNumber || 'Deze tabel'} bevat de volgende informatie: ${values}.`
        );
      }
    });

    return sentences;
  }

  /**
   * Convert table to markdown
   */
  private tableToMarkdown(table: ParsedTable): string {
    let markdown = '';

    // Headers
    if (table.headers.length > 0) {
      const headerRow = table.headers[0];
      markdown += '| ' + headerRow.cells.map(c => c.value || '').join(' | ') + ' |\n';
      markdown += '| ' + headerRow.cells.map(() => '---').join(' | ') + ' |\n';
    }

    // Data rows
    table.dataRows.forEach(row => {
      markdown += '| ' + row.cells.map(c => c.value || '').join(' | ') + ' |\n';
    });

    return markdown;
  }

  /**
   * Convert table to structured JSON
   */
  private tableToStructuredJSON(table: ParsedTable): any {
    const columnMap: Record<number, string> = {};

    // Extract column names from last header row (usually contains column names)
    const lastHeader = table.headers[table.headers.length - 1];
    if (lastHeader) {
      lastHeader.cells.forEach(cell => {
        if (cell.value.trim()) {
          columnMap[cell.colIndex] = cell.value.trim();
        }
      });
    }

    // Build structured rows
    const rows = table.dataRows.map(row => {
      const rowData: Record<string, any> = {};
      row.cells.forEach(cell => {
        const columnName = columnMap[cell.colIndex] || `col_${cell.colIndex}`;
        rowData[columnName] = cell.value;
      });
      return rowData;
    });

    return {
      table: table.tableNumber || table.title,
      columns: Object.values(columnMap),
      rows,
      metadata: table.metadata
    };
  }

  /**
   * Batch enrich multiple tables
   * More efficient for documents with many tables
   */
  async enrichTables(tables: ParsedTable[]): Promise<EnrichedTable[]> {
    console.log(`[LLM Enricher] Enriching ${tables.length} tables...`);

    const enriched: EnrichedTable[] = [];

    for (const table of tables) {
      const enrichedTable = await this.enrichTable(table);
      enriched.push(enrichedTable);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[LLM Enricher] Complete: ${enriched.length} tables enriched`);

    return enriched;
  }
}
