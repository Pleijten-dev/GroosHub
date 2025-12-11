/**
 * XML Table Parser for Bouwbesluit
 *
 * Parses structured XML tables from legal documents and extracts:
 * - Table metadata (title, number)
 * - Column headers
 * - Row data with proper structure
 * - Cell values with context
 *
 * Works with the official Bouwbesluit XML format from overheid.nl
 */

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
  /**
   * Parse XML document and extract all tables
   */
  parseXML(xmlContent: string): ParsedTable[] {
    // Use DOMParser for browser or xml2js for Node
    const parser = typeof DOMParser !== 'undefined'
      ? new DOMParser()
      : this.getNodeXMLParser();

    const xmlDoc = typeof DOMParser !== 'undefined'
      ? parser.parseFromString(xmlContent, 'text/xml')
      : this.parseNodeXML(xmlContent);

    const tables: ParsedTable[] = [];
    const tableElements = this.getElementsByTagName(xmlDoc, 'table');

    for (const tableEl of tableElements) {
      const parsedTable = this.parseTable(tableEl);
      if (parsedTable) {
        tables.push(parsedTable);
      }
    }

    return tables;
  }

  /**
   * Parse a single table element
   */
  private parseTable(tableElement: any): ParsedTable | null {
    try {
      // Extract title
      const titleEl = this.getFirstElement(tableElement, 'title');
      const title = titleEl ? this.getTextContent(titleEl) : '';

      // Extract table number from title (e.g., "Tabel 4.162")
      const tableNumberMatch = title.match(/\d+\.\d+/);
      const tableNumber = tableNumberMatch ? tableNumberMatch[0] : undefined;

      // Find tgroup element (contains table structure)
      const tgroup = this.getFirstElement(tableElement, 'tgroup');
      if (!tgroup) return null;

      const totalColumns = parseInt(tgroup.getAttribute?.('cols') || '0', 10);

      // Parse thead (header rows)
      const thead = this.getFirstElement(tgroup, 'thead');
      const headers: TableRow[] = [];
      const columns: string[] = [];
      const articleReferences: string[] = [];

      if (thead) {
        const headerRows = this.getElementsByTagName(thead, 'row');
        headerRows.forEach((row, rowIndex) => {
          const cells = this.parseRowCells(row, rowIndex, true);
          headers.push({
            cells,
            rowIndex,
            isHeader: true
          });

          // Extract column names from first header row
          if (rowIndex === 0) {
            cells.forEach(cell => {
              if (cell.value.trim()) {
                columns.push(cell.value.trim());
              }
            });
          }

          // Extract article references
          cells.forEach(cell => {
            const articleMatch = cell.value.match(/\d+\.\d+/g);
            if (articleMatch) {
              articleReferences.push(...articleMatch);
            }
          });
        });
      }

      // Parse tbody (data rows)
      const tbody = this.getFirstElement(tgroup, 'tbody');
      const dataRows: TableRow[] = [];

      if (tbody) {
        const bodyRows = this.getElementsByTagName(tbody, 'row');
        bodyRows.forEach((row, rowIndex) => {
          const cells = this.parseRowCells(row, rowIndex, false);
          dataRows.push({
            cells,
            rowIndex,
            isHeader: false
          });
        });
      }

      return {
        title,
        tableNumber,
        columns,
        headers,
        dataRows,
        metadata: {
          totalColumns,
          totalRows: headers.length + dataRows.length,
          articleReferences: Array.from(new Set(articleReferences))
        }
      };
    } catch (error) {
      console.error('[XMLTableParser] Error parsing table:', error);
      return null;
    }
  }

  /**
   * Parse cells in a row
   */
  private parseRowCells(rowElement: any, rowIndex: number, isHeader: boolean): TableCell[] {
    const cells: TableCell[] = [];
    const entryElements = this.getElementsByTagName(rowElement, 'entry');

    entryElements.forEach((entry, colIndex) => {
      const value = this.getTextContent(entry).trim();
      const colspan = parseInt(entry.getAttribute?.('nameend') ? '2' : '1', 10);
      const rowspan = parseInt(entry.getAttribute?.('morerows') ? String(parseInt(entry.getAttribute('morerows')) + 1) : '1', 10);

      cells.push({
        value,
        colIndex,
        rowIndex,
        colspan: colspan > 1 ? colspan : undefined,
        rowspan: rowspan > 1 ? rowspan : undefined
      });
    });

    return cells;
  }

  /**
   * Helper: Get text content from element
   */
  private getTextContent(element: any): string {
    if (typeof element.textContent !== 'undefined') {
      return element.textContent;
    }
    // For xml2js style objects
    if (typeof element === 'string') return element;
    if (element._) return element._;
    if (element.$t) return element.$t;
    return '';
  }

  /**
   * Helper: Get elements by tag name (works for both browser and Node)
   */
  private getElementsByTagName(element: any, tagName: string): any[] {
    if (element.getElementsByTagName) {
      return Array.from(element.getElementsByTagName(tagName));
    }
    // For xml2js
    if (element[tagName]) {
      return Array.isArray(element[tagName]) ? element[tagName] : [element[tagName]];
    }
    return [];
  }

  /**
   * Helper: Get first element by tag name
   */
  private getFirstElement(element: any, tagName: string): any | null {
    const elements = this.getElementsByTagName(element, tagName);
    return elements.length > 0 ? elements[0] : null;
  }

  /**
   * Helper: Get XML parser for Node.js environment
   */
  private getNodeXMLParser(): any {
    // Will be dynamically imported if needed
    return null;
  }

  /**
   * Helper: Parse XML in Node.js
   */
  private parseNodeXML(xmlContent: string): any {
    // Fallback: simple regex-based parsing for Node environment
    // In production, use xml2js or fast-xml-parser
    return xmlContent;
  }

  /**
   * Convert parsed table to markdown format
   * Useful for debugging and LLM consumption
   */
  tableToMarkdown(table: ParsedTable): string {
    let markdown = `# ${table.title}\n\n`;

    // Build header
    const headerRow = table.headers[0];
    if (headerRow) {
      markdown += '| ' + headerRow.cells.map(c => c.value || '').join(' | ') + ' |\n';
      markdown += '| ' + headerRow.cells.map(() => '---').join(' | ') + ' |\n';
    }

    // Build data rows
    table.dataRows.forEach(row => {
      markdown += '| ' + row.cells.map(c => c.value || '').join(' | ') + ' |\n';
    });

    return markdown;
  }

  /**
   * Convert parsed table to structured JSON
   * Best for LLM consumption
   */
  tableToStructuredJSON(table: ParsedTable): any {
    // Map column headers
    const columnMap: Record<number, string> = {};
    table.headers.forEach(header => {
      header.cells.forEach(cell => {
        if (cell.value.trim()) {
          columnMap[cell.colIndex] = cell.value.trim();
        }
      });
    });

    // Build structured rows
    const rows = table.dataRows.map(row => {
      const rowData: Record<string, any> = {};
      row.cells.forEach(cell => {
        const columnName = columnMap[cell.colIndex] || `column_${cell.colIndex}`;
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
}
