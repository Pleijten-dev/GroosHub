/**
 * XML Table Parser using fast-xml-parser
 *
 * Parses structured XML tables from legal documents and extracts:
 * - Table metadata (title, number)
 * - Column headers
 * - Row data with proper structure
 * - Cell values with context
 *
 * Uses fast-xml-parser for robust, production-ready XML parsing.
 * Works with various XML formats, not just Bouwbesluit.
 */

import { XMLParser } from 'fast-xml-parser';

export interface TableCell {
  value: string;
  colIndex: number;
  rowIndex: number;
  colspan?: number;
  rowspan?: number;
}

export interface TableRow {
  cells: TableCell[];
  rowIndex: number;
  isHeader: boolean;
}

export interface ParsedTable {
  title: string;
  tableNumber?: string;  // e.g., "4.162"
  columns: string[];     // Column headers
  headers: TableRow[];   // Header rows
  dataRows: TableRow[];  // Data rows
  metadata: {
    totalColumns: number;
    totalRows: number;
    articleReferences: string[];  // Referenced articles (e.g., "4.163", "4.164")
  };
}

export class XMLTableParser {
  private parser: XMLParser;

  constructor() {
    // Configure fast-xml-parser with options for legal documents
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
      parseTrueNumberOnly: false,
      // Preserve tag order for proper table structure
      preserveOrder: false,
      // Always return arrays for repeated elements
      isArray: (name) => ['row', 'entry', 'table'].includes(name)
    });
  }

  /**
   * Parse XML document and extract all tables
   */
  parseXML(xmlContent: string): ParsedTable[] {
    try {
      const parsed = this.parser.parse(xmlContent);
      const tables: ParsedTable[] = [];

      // Recursively find all table elements
      this.findTables(parsed, tables);

      console.log(`[XML Parser] Found ${tables.length} tables`);
      return tables;
    } catch (error) {
      console.error('[XML Parser] Failed to parse XML:', error);
      return [];
    }
  }

  /**
   * Recursively find table elements in parsed XML
   */
  private findTables(obj: any, tables: ParsedTable[]): void {
    if (!obj || typeof obj !== 'object') return;

    // Check if current object has table(s)
    if (obj.table) {
      const tableArray = Array.isArray(obj.table) ? obj.table : [obj.table];
      for (const tableData of tableArray) {
        const parsed = this.parseTable(tableData);
        if (parsed) {
          tables.push(parsed);
        }
      }
    }

    // Recursively search in all nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        this.findTables(obj[key], tables);
      }
    }
  }

  /**
   * Parse a single table element
   */
  private parseTable(tableData: any): ParsedTable | null {
    try {
      // Extract title
      const title = this.extractText(tableData.title) || 'Untitled Table';

      // Extract table number from title (e.g., "Tabel 4.162")
      const tableNumberMatch = title.match(/\d+\.\d+/);
      const tableNumber = tableNumberMatch ? tableNumberMatch[0] : undefined;

      // Find tgroup (contains table structure in Bouwbesluit format)
      const tgroup = tableData.tgroup || tableData;
      const totalColumns = parseInt(tgroup['@_cols'] || '0', 10) || this.guessColumnCount(tgroup);

      // Parse thead (header rows)
      const headers: TableRow[] = [];
      const columns: string[] = [];
      const articleReferences = new Set<string>();

      if (tgroup.thead) {
        const headerRows = this.ensureArray(tgroup.thead.row);
        headerRows.forEach((row: any, rowIndex: number) => {
          const cells = this.parseRowCells(row, rowIndex, true);
          headers.push({
            cells,
            rowIndex,
            isHeader: true
          });

          // First header row becomes column names
          if (rowIndex === 0) {
            cells.forEach(cell => {
              const colName = cell.value.trim();
              if (colName) {
                columns.push(colName);
              }
            });
          }
        });
      }

      // Parse tbody (data rows)
      const dataRows: TableRow[] = [];
      if (tgroup.tbody) {
        const bodyRows = this.ensureArray(tgroup.tbody.row);
        bodyRows.forEach((row: any, rowIndex: number) => {
          const cells = this.parseRowCells(row, rowIndex + headers.length, false);
          dataRows.push({
            cells,
            rowIndex: rowIndex + headers.length,
            isHeader: false
          });

          // Extract article references from data cells
          cells.forEach(cell => {
            const refs = cell.value.match(/\b\d+\.\d+\b/g);
            if (refs) {
              refs.forEach(ref => articleReferences.add(ref));
            }
          });
        });
      }

      return {
        title,
        tableNumber,
        columns: columns.length > 0 ? columns : this.generateColumnNames(totalColumns),
        headers,
        dataRows,
        metadata: {
          totalColumns: totalColumns || columns.length || this.guessColumnCount(tgroup),
          totalRows: headers.length + dataRows.length,
          articleReferences: Array.from(articleReferences)
        }
      };
    } catch (error) {
      console.error('[XML Parser] Failed to parse table:', error);
      return null;
    }
  }

  /**
   * Parse cells from a row element
   */
  private parseRowCells(row: any, rowIndex: number, isHeader: boolean): TableCell[] {
    const cells: TableCell[] = [];

    const entries = this.ensureArray(row.entry);
    entries.forEach((entry: any, colIndex: number) => {
      const value = this.extractText(entry);
      const colspan = parseInt(entry['@_namest'] && entry['@_nameend']
        ? this.calculateColspan(entry['@_namest'], entry['@_nameend'])
        : '1', 10);
      const rowspan = parseInt(entry['@_morerows'] || '1', 10);

      cells.push({
        value: value.trim(),
        colIndex,
        rowIndex,
        colspan: colspan > 1 ? colspan : undefined,
        rowspan: rowspan > 1 ? rowspan : undefined
      });
    });

    return cells;
  }

  /**
   * Extract text content from XML element
   */
  private extractText(element: any): string {
    if (!element) return '';
    if (typeof element === 'string') return element;
    if (element['#text']) return String(element['#text']);

    // Recursively extract text from nested elements
    let text = '';
    for (const key in element) {
      if (key !== '@_' && key.startsWith('@_') === false) {
        const childText = this.extractText(element[key]);
        if (childText) {
          text += (text ? ' ' : '') + childText;
        }
      }
    }

    return text.trim();
  }

  /**
   * Ensure value is an array
   */
  private ensureArray(value: any): any[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Calculate colspan from namest/nameend attributes
   */
  private calculateColspan(namest: string, nameend: string): string {
    // Extract column numbers from names like "c1", "c3"
    const start = parseInt(namest.replace(/\D/g, ''), 10) || 1;
    const end = parseInt(nameend.replace(/\D/g, ''), 10) || 1;
    return String(end - start + 1);
  }

  /**
   * Guess column count from table structure
   */
  private guessColumnCount(tgroup: any): number {
    // Try to count from first row
    if (tgroup.thead?.row) {
      const firstRow = Array.isArray(tgroup.thead.row) ? tgroup.thead.row[0] : tgroup.thead.row;
      if (firstRow?.entry) {
        const entries = Array.isArray(firstRow.entry) ? firstRow.entry : [firstRow.entry];
        return entries.length;
      }
    }

    if (tgroup.tbody?.row) {
      const firstRow = Array.isArray(tgroup.tbody.row) ? tgroup.tbody.row[0] : tgroup.tbody.row;
      if (firstRow?.entry) {
        const entries = Array.isArray(firstRow.entry) ? firstRow.entry : [firstRow.entry];
        return entries.length;
      }
    }

    return 0;
  }

  /**
   * Generate default column names
   */
  private generateColumnNames(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
  }

  /**
   * Convert parsed table to markdown format
   */
  tableToMarkdown(table: ParsedTable): string {
    const lines: string[] = [];

    // Title
    if (table.title) {
      lines.push(`# ${table.title}`);
      lines.push('');
    }

    // Headers
    if (table.headers.length > 0) {
      for (const header of table.headers) {
        const row = header.cells.map(c => c.value || '').join(' | ');
        lines.push(`| ${row} |`);
      }

      // Separator
      const separator = table.columns.map(() => '---').join(' | ');
      lines.push(`| ${separator} |`);
    }

    // Data rows
    for (const row of table.dataRows) {
      const rowData = row.cells.map(c => c.value || '').join(' | ');
      lines.push(`| ${rowData} |`);
    }

    return lines.join('\n');
  }
}
