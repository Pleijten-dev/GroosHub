/**
 * RAG Table Formatter
 *
 * Transforms raw machine-readable table data from RAG chunks
 * into human-readable formats.
 *
 * Input formats handled:
 * 1. "--- Tabel Details ---" sections with pipe-separated tables
 * 2. "--- Tabel Samenvatting (Semantisch Verrijkt) ---" sections
 * 3. Raw table data with embedded column structures
 *
 * Output:
 * - HTML tables for UI display (formatRAGSourceText)
 * - Markdown for LLM context (formatRAGTableContent)
 */

export interface FormattedRAGContent {
  formattedText: string;
  hasTable: boolean;
  tableSummaries: string[];
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/**
 * Parse pipe-separated table content into structured data
 * Handles both multi-line tables and flattened single-line tables
 */
function parsePipeTable(tableContent: string): ParsedTable | null {
  let content = tableContent.trim();

  if (!content) return null;

  // Check if content has newlines (proper multi-line format)
  const hasNewlines = content.includes('\n') && content.split('\n').filter(l => l.trim()).length > 1;

  if (hasNewlines) {
    // Standard multi-line table parsing
    return parseMultiLineTable(content);
  }

  // Single-line flattened table - need smarter parsing
  // Look for the separator pattern to determine column structure
  const separatorMatch = content.match(/\|\s*---[\s|:-]*---\s*\|/);

  if (separatorMatch) {
    // Count columns from separator (number of --- segments)
    const sepPart = separatorMatch[0];
    const colCount = (sepPart.match(/---/g) || []).length;

    if (colCount > 0) {
      return parseFlattenedTableWithColumnCount(content, colCount);
    }
  }

  // Fallback: try to parse as-is
  return parseMultiLineTable(content);
}

/**
 * Parse a flattened single-line table knowing the header column count
 */
function parseFlattenedTableWithColumnCount(content: string, headerColCount: number): ParsedTable | null {
  // Split by | and filter out empty strings from start/end
  const allCells = content.split('|').map(c => c.trim());

  // Remove empty first/last elements (from leading/trailing pipes)
  if (allCells[0] === '') allCells.shift();
  if (allCells[allCells.length - 1] === '') allCells.pop();

  // Find the separator row (all --- cells)
  let separatorIndex = -1;
  for (let i = 0; i < allCells.length; i++) {
    if (allCells[i].match(/^-+$/)) {
      // Check if this starts a separator row (next headerColCount-1 cells are also ---)
      let isSeparator = true;
      for (let j = 0; j < headerColCount - 1 && i + j + 1 < allCells.length; j++) {
        if (!allCells[i + j + 1].match(/^-+$/)) {
          isSeparator = false;
          break;
        }
      }
      if (isSeparator) {
        separatorIndex = i;
        break;
      }
    }
  }

  if (separatorIndex === -1 || separatorIndex < headerColCount) {
    // No valid separator found, can't parse
    return parseMultiLineTable(content);
  }

  // Header is cells before separator
  const headers = allCells.slice(separatorIndex - headerColCount, separatorIndex);

  // Data cells are after separator
  const dataCells = allCells.slice(separatorIndex + headerColCount);

  if (dataCells.length === 0) {
    return { headers, rows: [] };
  }

  // Detect actual row length from data
  // Try to find the best divisor that's >= headerColCount
  const actualRowLength = detectRowLength(dataCells, headerColCount);

  // Group data cells into rows using detected row length
  const rows: string[][] = [];
  for (let i = 0; i < dataCells.length; i += actualRowLength) {
    const row = dataCells.slice(i, i + actualRowLength);
    // Pad row if needed
    while (row.length < actualRowLength) {
      row.push('');
    }
    if (row.some(c => c.length > 0)) {
      rows.push(row);
    }
  }

  if (headers.length === 0) return null;

  // If actual row length differs from header, normalize the table
  if (actualRowLength !== headerColCount) {
    // Extend headers to match data columns
    const extendedHeaders = [...headers];
    while (extendedHeaders.length < actualRowLength) {
      extendedHeaders.push('');
    }
    return { headers: extendedHeaders, rows };
  }

  return { headers, rows };
}

/**
 * Detect the actual row length in flattened table data
 * by finding the best divisor of the cell count
 */
function detectRowLength(dataCells: string[], minLength: number): number {
  const totalCells = dataCells.length;

  // Try divisors from largest to smallest that are >= minLength
  // and result in at least 2 rows (to detect patterns)
  for (let rowLen = Math.floor(totalCells / 2); rowLen >= minLength; rowLen--) {
    if (totalCells % rowLen === 0) {
      // Check if this creates sensible rows (similar structure)
      const numRows = totalCells / rowLen;
      if (numRows >= 2) {
        return rowLen;
      }
    }
  }

  // Fallback to minimum length
  return minLength;
}

/**
 * Parse standard multi-line table
 */
function parseMultiLineTable(content: string): ParsedTable | null {
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) return null;

  // Find lines that contain pipe characters (table rows)
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length === 0) return null;

  // Normalize the table structure
  const allRows: string[][] = [];

  for (const line of tableLines) {
    // Skip separator lines (only dashes and pipes)
    if (/^[\s|:-]+$/.test(line)) continue;

    // Split by pipe and clean up cells
    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, index, arr) => {
        // Remove empty cells at start/end (from leading/trailing pipes)
        if (index === 0 && !cell) return false;
        if (index === arr.length - 1 && !cell) return false;
        return true;
      });

    if (cells.length > 0 && cells.some(c => c.length > 0)) {
      allRows.push(cells);
    }
  }

  if (allRows.length === 0) return null;

  // Determine max columns
  const maxCols = Math.max(...allRows.map(row => row.length));

  // Normalize all rows to have same number of columns
  const normalizedRows = allRows.map(row => {
    while (row.length < maxCols) {
      row.push('');
    }
    return row;
  });

  // First row is headers, rest are data
  return {
    headers: normalizedRows[0] || [],
    rows: normalizedRows.slice(1),
  };
}

/**
 * Filter out completely empty columns from a table
 */
function filterEmptyColumns(table: ParsedTable): ParsedTable {
  const allRows = [table.headers, ...table.rows];
  const numCols = table.headers.length;

  // Find columns that have at least one non-empty cell
  const nonEmptyColIndices: number[] = [];
  for (let col = 0; col < numCols; col++) {
    const hasContent = allRows.some(row => row[col] && row[col].trim().length > 0);
    if (hasContent) {
      nonEmptyColIndices.push(col);
    }
  }

  // If no columns were filtered, return as-is
  if (nonEmptyColIndices.length === numCols) {
    return table;
  }

  // Filter columns
  return {
    headers: nonEmptyColIndices.map(i => table.headers[i] || ''),
    rows: table.rows.map(row => nonEmptyColIndices.map(i => row[i] || '')),
  };
}

/**
 * Convert parsed table to HTML table element with inline styles
 */
function tableToHTML(table: ParsedTable): string {
  // Filter out completely empty columns
  const filteredTable = filterEmptyColumns(table);

  const escapeHTML = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  // Table styles
  const tableStyle = 'width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 0.5rem 0;';
  const thStyle = 'background-color: #f3f4f6; padding: 0.5rem; text-align: left; font-weight: 600; border: 1px solid #d1d5db;';
  const tdStyle = 'padding: 0.5rem; border: 1px solid #e5e7eb;';

  let html = `<table style="${tableStyle}">\n`;

  // Header row
  if (filteredTable.headers.length > 0) {
    html += '  <thead>\n    <tr>\n';
    for (const header of filteredTable.headers) {
      html += `      <th style="${thStyle}">${escapeHTML(header)}</th>\n`;
    }
    html += '    </tr>\n  </thead>\n';
  }

  // Data rows
  if (filteredTable.rows.length > 0) {
    html += '  <tbody>\n';
    for (let i = 0; i < filteredTable.rows.length; i++) {
      const row = filteredTable.rows[i];
      const rowBg = i % 2 === 1 ? ' background-color: #fafafa;' : '';
      html += `    <tr style="${rowBg}">\n`;
      for (const cell of row) {
        html += `      <td style="${tdStyle}">${escapeHTML(cell)}</td>\n`;
      }
      html += '    </tr>\n';
    }
    html += '  </tbody>\n';
  }

  html += '</table>';
  return html;
}

/**
 * Convert parsed table to markdown
 */
function tableToMarkdown(table: ParsedTable): string {
  const allRows = [table.headers, ...table.rows];

  // Calculate column widths
  const colWidths = table.headers.map((_, colIndex) => {
    return Math.max(
      3,
      ...allRows.map(row => (row[colIndex] || '').length)
    );
  });

  const formatRow = (row: string[]) =>
    '| ' + row.map((cell, i) => (cell || '').padEnd(colWidths[i] || 3)).join(' | ') + ' |';

  const headerSeparator =
    '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';

  const result: string[] = [];
  result.push(formatRow(table.headers));
  result.push(headerSeparator);

  for (const row of table.rows) {
    result.push(formatRow(row));
  }

  return result.join('\n');
}

/**
 * Extract semantic summaries from text
 * Handles both multi-line format and single-line format
 */
function extractSummaries(text: string): { summaries: string[]; cleanedText: string } {
  const summaries: string[] = [];
  let cleanedText = text;

  const summaryMatch = text.match(
    /---\s*Tabel Samenvatting\s*\(Semantisch Verrijkt\)\s*---\s*([\s\S]*?)(?=---|$)/i
  );

  if (summaryMatch) {
    const summarySection = summaryMatch[1];

    // Try multi-line format first: each quoted sentence on its own line
    let sentences = summarySection
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('"') && line.endsWith('"'))
      .map(line => line.slice(1, -1));

    // If no sentences found, try single-line format: "sentence1" "sentence2" "sentence3"
    if (sentences.length === 0) {
      // Match all quoted strings in the section
      const quotedMatches = summarySection.match(/"[^"]+"/g);
      if (quotedMatches) {
        sentences = quotedMatches.map(s => s.slice(1, -1));
      }
    }

    summaries.push(...sentences);
    cleanedText = cleanedText.replace(summaryMatch[0], '');
  }

  return { summaries, cleanedText };
}

/**
 * Extract table details section
 */
function extractTableDetails(text: string): { table: ParsedTable | null; cleanedText: string } {
  let cleanedText = text;

  const tableDetailsMatch = text.match(
    /---\s*Tabel Details\s*---\s*([\s\S]*?)(?=---\s*Tabel Samenvatting|---|$)/i
  );

  if (tableDetailsMatch) {
    const tableSection = tableDetailsMatch[1];
    const table = parsePipeTable(tableSection);
    cleanedText = cleanedText.replace(tableDetailsMatch[0], '');
    return { table, cleanedText };
  }

  return { table: null, cleanedText };
}

/**
 * Find inline pipe tables in text
 */
function extractInlineTables(text: string): { tables: ParsedTable[]; cleanedText: string } {
  const lines = text.split('\n');
  const result: string[] = [];
  const tables: ParsedTable[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isPipeRow = trimmedLine.includes('|') && !trimmedLine.startsWith('**') && !trimmedLine.startsWith('<');

    if (isPipeRow) {
      if (!inTable) {
        inTable = true;
      }
      tableBuffer.push(trimmedLine);
    } else {
      if (inTable && tableBuffer.length >= 2) {
        const table = parsePipeTable(tableBuffer.join('\n'));
        if (table) {
          tables.push(table);
          result.push('{{TABLE_PLACEHOLDER}}');
        } else {
          result.push(...tableBuffer);
        }
      } else if (inTable) {
        result.push(...tableBuffer);
      }
      tableBuffer = [];
      inTable = false;
      result.push(line);
    }
  }

  // Handle remaining table buffer
  if (tableBuffer.length >= 2) {
    const table = parsePipeTable(tableBuffer.join('\n'));
    if (table) {
      tables.push(table);
      result.push('{{TABLE_PLACEHOLDER}}');
    } else {
      result.push(...tableBuffer);
    }
  } else if (tableBuffer.length > 0) {
    result.push(...tableBuffer);
  }

  return { tables, cleanedText: result.join('\n') };
}

/**
 * Clean up common artifacts from raw table data
 */
function cleanupArtifacts(text: string): string {
  // Remove date/version artifact sequences like "2018 291 31-08-2018 03-07-2018"
  let cleaned = text.replace(
    /\d{4}\s+\d+\s+\d{2}-\d{2}-\d{4}\s+\d{2}-\d{2}-\d{4}(?:\s+\d{2}-\d{2}-\d{4})?/g,
    ''
  );

  // Remove orphaned measurement units like "[m 2 ]" or "[m]"
  cleaned = cleaned.replace(/\[\s*m\s*(?:\d*)?\s*\]/g, '');

  // Normalize multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove lines that are just numbers (often row indices)
  cleaned = cleaned
    .split('\n')
    .filter(line => !/^\s*\d+\s*$/.test(line))
    .join('\n');

  return cleaned;
}

/**
 * Format article headers and table references
 */
function formatStructuralElements(text: string): string {
  // Look for the article/table header pattern
  const articleMatch = text.match(
    /Artikel\s+(\d+\.\d+)\s*\([^)]+\)\s*(?:\d\s+)?([\s\S]+?)(?=Tabel|$)/
  );

  if (articleMatch) {
    const articleNum = articleMatch[1];
    const articleText = articleMatch[2].trim();
    text = text.replace(
      articleMatch[0],
      `\n<strong>Artikel ${articleNum}</strong>\n${articleText}\n`
    );
  }

  // Format table references
  text = text.replace(/Tabel\s+(\d+\.\d+)/g, '<strong>Tabel $1</strong>');

  return text;
}

/**
 * Main function to format RAG chunk text for LLM context (markdown output)
 */
export function formatRAGTableContent(rawText: string): FormattedRAGContent {
  if (!rawText || typeof rawText !== 'string') {
    return { formattedText: rawText || '', hasTable: false, tableSummaries: [] };
  }

  let text = rawText;
  const tableSummaries: string[] = [];
  let hasTable = false;

  // 1. Extract summaries
  const { summaries, cleanedText: textAfterSummary } = extractSummaries(text);
  tableSummaries.push(...summaries);
  text = textAfterSummary;

  // 2. Extract table details
  const { table: detailsTable, cleanedText: textAfterDetails } = extractTableDetails(text);
  if (detailsTable) hasTable = true;
  text = textAfterDetails;

  // 3. Extract inline tables
  const { tables: inlineTables, cleanedText: textAfterInline } = extractInlineTables(text);
  if (inlineTables.length > 0) hasTable = true;
  text = textAfterInline;

  // 4. Clean up artifacts
  text = cleanupArtifacts(text);

  // 5. Build output with markdown tables
  let result = '';

  if (summaries.length > 0) {
    result += '**Samenvatting:**\n';
    result += summaries.map(s => `- ${s}`).join('\n');
    result += '\n\n';
  }

  if (detailsTable) {
    result += '**Tabel:**\n';
    result += tableToMarkdown(detailsTable);
    result += '\n\n';
  }

  // Replace placeholders with inline tables
  let tableIndex = 0;
  text = text.replace(/\{\{TABLE_PLACEHOLDER\}\}/g, () => {
    const table = inlineTables[tableIndex++];
    if (table) {
      return '\n' + tableToMarkdown(table) + '\n';
    }
    return '';
  });

  result += text.trim();

  return {
    formattedText: result.trim(),
    hasTable,
    tableSummaries,
  };
}

/**
 * Format RAG content for UI display with HTML tables
 * Used by MessageSources component
 */
export function formatRAGSourceText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return rawText || '';
  }

  let text = rawText;

  // 1. Extract summaries (will be placed at the end)
  const { summaries, cleanedText: textAfterSummary } = extractSummaries(text);
  text = textAfterSummary;

  // 2. Extract table details
  const { table: detailsTable, cleanedText: textAfterDetails } = extractTableDetails(text);
  text = textAfterDetails;

  // 3. Extract inline tables from remaining text
  const { tables: inlineTables, cleanedText: textAfterInline } = extractInlineTables(text);
  text = textAfterInline;

  // 4. Clean up artifacts (date sequences, etc.)
  text = cleanupArtifacts(text);

  // 5. Format structural elements (article headers)
  text = formatStructuralElements(text);

  // 6. Build HTML output - Text first, then table, then summary at the end
  let result = '';

  // Replace placeholders with inline HTML tables
  let tableIndex = 0;
  text = text.replace(/\{\{TABLE_PLACEHOLDER\}\}/g, () => {
    const table = inlineTables[tableIndex++];
    if (table) {
      return '\n<div class="rag-table-wrapper" style="margin: 0.75rem 0;">\n' + tableToHTML(table) + '\n</div>\n';
    }
    return '';
  });

  // Add remaining text (the article content)
  const remainingText = text.trim();
  if (remainingText) {
    // Convert newlines to <br> for HTML display
    const htmlText = remainingText
      .replace(/\n\n/g, '</p><p style="margin: 0.5rem 0;">')
      .replace(/\n/g, '<br>');
    result += `<p style="margin: 0 0 0.75rem 0;">${htmlText}</p>\n`;
  }

  // Main table from details section
  if (detailsTable) {
    result += '<div class="rag-table-wrapper" style="margin: 0.75rem 0;">\n';
    result += tableToHTML(detailsTable);
    result += '\n</div>\n';
  }

  // Summaries at the BOTTOM with simple white/gray styling
  if (summaries.length > 0) {
    result += '<div style="background-color: #f9fafb; padding: 0.75rem; margin-top: 0.75rem; border-radius: 0.5rem; border: 1px solid #e5e7eb;">\n';
    result += '<strong style="color: #374151; font-size: 0.875rem;">Samenvatting:</strong>\n';
    result += '<ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem; font-size: 0.875rem;">\n';
    for (const s of summaries) {
      result += `<li style="margin-bottom: 0.25rem; color: #4b5563;">${s}</li>\n`;
    }
    result += '</ul>\n</div>\n';
  }

  return result.trim();
}

/**
 * Format multiple RAG sources for system prompt injection
 * Combines and deduplicates table summaries (markdown output for LLM)
 */
export function formatRAGContextForPrompt(
  sources: Array<{ text: string; file?: string }>
): string {
  const formattedSources: string[] = [];
  const allSummaries: string[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const { formattedText, tableSummaries } = formatRAGTableContent(source.text);

    formattedSources.push(`[Source ${i + 1}: ${source.file || 'Unknown'}]\n${formattedText}`);
    allSummaries.push(...tableSummaries);
  }

  let result = '';

  if (allSummaries.length > 0) {
    const uniqueSummaries = [...new Set(allSummaries)];
    result += '**Key Information from Tables:**\n';
    result += uniqueSummaries.map(s => `• ${s}`).join('\n');
    result += '\n\n---\n\n';
  }

  result += formattedSources.join('\n\n');

  return result;
}

export default formatRAGTableContent;
