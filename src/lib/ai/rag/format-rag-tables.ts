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
 * Detects if table starts with separator (no headers) and returns empty headers in that case
 */
function parseMultiLineTable(content: string): ParsedTable | null {
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) return null;

  // Find lines that contain pipe characters (table rows)
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length === 0) return null;

  // Check if the first line is a separator row (starts with separator)
  const firstLine = tableLines[0].trim();
  const startsWithSeparator = /^[\s|:-]+$/.test(firstLine);

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

  // If table started with separator, ALL rows are data (empty headers)
  if (startsWithSeparator) {
    const emptyHeaders = new Array(maxCols).fill('');
    return {
      headers: emptyHeaders,
      rows: normalizedRows,
    };
  }

  // Otherwise, first row is headers, rest are data
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
  const numCols = Math.max(table.headers.length, ...table.rows.map(r => r.length));

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
 * Condense table rows to match header column count
 * Merges adjacent cells that appear to be parts of the same value (e.g., "a" + "woonwagen")
 */
function condenseToHeaderCount(table: ParsedTable): ParsedTable {
  const headerCount = table.headers.filter(h => h.trim().length > 0).length;
  if (headerCount === 0) return table;

  // First, filter empty columns
  const filtered = filterEmptyColumns(table);

  // If we already have the right number of columns or fewer, return as-is
  if (filtered.headers.length <= headerCount) {
    // Pad headers if needed
    const paddedHeaders = [...filtered.headers];
    while (paddedHeaders.length < headerCount) {
      paddedHeaders.push('');
    }
    return {
      headers: paddedHeaders,
      rows: filtered.rows.map(row => {
        const paddedRow = [...row];
        while (paddedRow.length < headerCount) {
          paddedRow.push('');
        }
        return paddedRow;
      })
    };
  }

  // We have more data columns than headers - need to condense
  // Strategy: merge adjacent columns from the left until we reach headerCount
  const condensedRows = filtered.rows.map(row => {
    if (row.length <= headerCount) {
      const padded = [...row];
      while (padded.length < headerCount) padded.push('');
      return padded;
    }

    // Merge columns from the left to form the first column
    // Keep the last column as the last data column (usually "waarden")
    const colsToMerge = row.length - headerCount + 1;
    const firstColParts = row.slice(0, colsToMerge).filter(c => c.trim().length > 0);
    const firstCol = firstColParts.join(' ');

    // Middle columns (if any)
    const middleCols = row.slice(colsToMerge, row.length - 1);

    // Last column
    const lastCol = row[row.length - 1] || '';

    // Build condensed row
    const condensedRow = [firstCol, ...middleCols, lastCol];

    // Ensure we have exactly headerCount columns
    while (condensedRow.length < headerCount) {
      condensedRow.splice(1, 0, ''); // Insert empty in middle
    }
    while (condensedRow.length > headerCount) {
      // Merge middle columns if still too many
      if (condensedRow.length > 2) {
        condensedRow.splice(1, 2, (condensedRow[1] + ' ' + condensedRow[2]).trim());
      } else {
        break;
      }
    }

    return condensedRow.slice(0, headerCount);
  });

  return {
    headers: filtered.headers.slice(0, headerCount),
    rows: condensedRows
  };
}

/**
 * Convert parsed table to HTML table element with inline styles
 */
function tableToHTML(table: ParsedTable): string {
  // Condense table to match header column count (filters empty columns + merges adjacent cells)
  const filteredTable = condenseToHeaderCount(table);

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
 * Handles multiple formats:
 * 1. Full marker: "--- Tabel Samenvatting (Semantisch Verrijkt) ---"
 * 2. Simple marker: "Samenvatting:" followed by sentences
 */
function extractSummaries(text: string): { summaries: string[]; cleanedText: string } {
  const summaries: string[] = [];
  let cleanedText = text;

  // Try full marker format first
  const fullMarkerMatch = text.match(
    /---\s*Tabel Samenvatting\s*\(Semantisch Verrijkt\)\s*---\s*([\s\S]*?)(?=---|$)/i
  );

  if (fullMarkerMatch) {
    const summarySection = fullMarkerMatch[1];
    let sentences = summarySection
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('"') && line.endsWith('"'))
      .map(line => line.slice(1, -1));

    if (sentences.length === 0) {
      const quotedMatches = summarySection.match(/"[^"]+"/g);
      if (quotedMatches) {
        sentences = quotedMatches.map(s => s.slice(1, -1));
      }
    }

    summaries.push(...sentences);
    cleanedText = cleanedText.replace(fullMarkerMatch[0], '');
    return { summaries, cleanedText };
  }

  // Try simple "Samenvatting:" format
  const simpleMarkerMatch = text.match(
    /Samenvatting:\s*\n([\s\S]*?)$/i
  );

  if (simpleMarkerMatch) {
    const summarySection = simpleMarkerMatch[1];
    // Each line that starts with "Voor" or similar is a summary sentence
    const sentences = summarySection
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 20); // Filter out short/empty lines

    summaries.push(...sentences);
    cleanedText = cleanedText.replace(simpleMarkerMatch[0], '');
  }

  return { summaries, cleanedText };
}

/**
 * Extract table details section
 * Note: The lookahead must avoid matching `---` inside table separator rows like `| --- | --- |`
 * We look for `--- ` followed by a word (section marker) or end of string
 */
function extractTableDetails(text: string): { table: ParsedTable | null; cleanedText: string } {
  let cleanedText = text;

  // Match from "--- Tabel Details ---" until "--- Tabel Samenvatting" or "--- [other section]" or end
  // The key is: section markers have "--- " followed by a letter, not by pipe or dash
  const tableDetailsMatch = text.match(
    /---\s*Tabel Details\s*---\s*([\s\S]*?)(?=---\s*Tabel Samenvatting|---\s+[A-Za-z]|$)/i
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
 * Extract tab-separated header line (like "col1\tcol2\tcol3")
 */
function extractTabSeparatedHeaders(text: string): { headers: string[] | null; cleanedText: string } {
  const lines = text.split('\n');
  const result: string[] = [];
  let foundHeaders: string[] | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Check if line contains tabs and looks like headers (no pipes, multiple tab-separated words)
    if (trimmedLine.includes('\t') && !trimmedLine.includes('|')) {
      const parts = trimmedLine.split('\t').map(p => p.trim()).filter(p => p.length > 0);
      // If we have 2-5 tab-separated parts that look like headers, extract them
      if (parts.length >= 2 && parts.length <= 5 && parts.every(p => p.length < 50)) {
        foundHeaders = parts;
        // Don't add this line to result (remove it)
        continue;
      }
    }
    result.push(line);
  }

  return { headers: foundHeaders, cleanedText: result.join('\n') };
}

/**
 * Find inline pipe tables in text
 * Also handles tables that start with separator row (no inline headers)
 */
function extractInlineTables(text: string, externalHeaders?: string[]): { tables: ParsedTable[]; cleanedText: string } {
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
        const table = parsePipeTableWithExternalHeaders(tableBuffer.join('\n'), externalHeaders);
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
    const table = parsePipeTableWithExternalHeaders(tableBuffer.join('\n'), externalHeaders);
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
 * Parse pipe table, using external headers if the table starts with separator
 */
function parsePipeTableWithExternalHeaders(content: string, externalHeaders?: string[]): ParsedTable | null {
  const table = parsePipeTable(content);
  if (!table) return null;

  // Check if the table has no real headers (first row was separator or all empty)
  const hasEmptyHeaders = table.headers.every(h => !h || h.match(/^-+$/));

  if (hasEmptyHeaders && externalHeaders && externalHeaders.length > 0) {
    // Use external headers
    // Normalize column count
    const maxCols = Math.max(externalHeaders.length, ...table.rows.map(r => r.length));
    const normalizedHeaders = [...externalHeaders];
    while (normalizedHeaders.length < maxCols) {
      normalizedHeaders.push('');
    }

    return {
      headers: normalizedHeaders,
      rows: table.rows.map(row => {
        const normalizedRow = [...row];
        while (normalizedRow.length < maxCols) {
          normalizedRow.push('');
        }
        return normalizedRow;
      })
    };
  }

  return table;
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

  // 2. Extract table details section
  const { table: detailsTable, cleanedText: textAfterDetails } = extractTableDetails(text);
  text = textAfterDetails;

  // 3. Extract tab-separated headers (these may be the headers for a separator-first table)
  const { headers: tabHeaders, cleanedText: textAfterTabHeaders } = extractTabSeparatedHeaders(text);
  text = textAfterTabHeaders;

  // 4. Only extract inline tables if we DON'T have a details table
  // (to avoid creating duplicate tables from the same data)
  // Pass tab headers for tables that start with separator
  let inlineTables: ParsedTable[] = [];
  if (!detailsTable) {
    const inlineResult = extractInlineTables(text, tabHeaders || undefined);
    inlineTables = inlineResult.tables;
    text = inlineResult.cleanedText;
  }

  // 5. Clean up artifacts (date sequences, etc.)
  text = cleanupArtifacts(text);

  // 6. Remove excessive whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // 7. Format structural elements (article headers)
  text = formatStructuralElements(text);

  // 8. Build HTML output - Text first, then table, then summary at the end
  let result = '';

  // Replace placeholders with inline HTML tables (only if no details table)
  if (inlineTables.length > 0) {
    let tableIndex = 0;
    text = text.replace(/\{\{TABLE_PLACEHOLDER\}\}/g, () => {
      const table = inlineTables[tableIndex++];
      if (table) {
        return '\n<div class="rag-table-wrapper" style="margin: 0.75rem 0;">\n' + tableToHTML(table) + '\n</div>\n';
      }
      return '';
    });
  }

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
