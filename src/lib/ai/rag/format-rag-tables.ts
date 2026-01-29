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
  let content = tableContent;

  // Detect if this is a flattened single-line table
  // Pattern: "| col1 | col2 | | val1 | val2 |" where "| |" indicates row boundary
  // Also handle: "| --- | --- | |" separator pattern
  if (!content.includes('\n') || content.split('\n').filter(l => l.trim()).length <= 1) {
    // Try to unflatten by detecting row boundaries
    // Row boundary pattern: "| |" or "| | ---" (end of row, start of separator or next row)
    content = content
      // First, normalize separator rows: "| --- | --- |" should stay together
      .replace(/\|\s*---\s*\|/g, '|---|')
      // Split on "| |" pattern (row boundaries)
      .replace(/\|\s*\|/g, '|\n|')
      // Restore separator formatting
      .replace(/\|---\|/g, '| --- |');
  }

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
 * Convert parsed table to HTML table element with inline styles
 */
function tableToHTML(table: ParsedTable): string {
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
  const trHoverStyle = 'background-color: #f9fafb;';

  let html = `<table style="${tableStyle}">\n`;

  // Header row
  if (table.headers.length > 0) {
    html += '  <thead>\n    <tr>\n';
    for (const header of table.headers) {
      html += `      <th style="${thStyle}">${escapeHTML(header)}</th>\n`;
    }
    html += '    </tr>\n  </thead>\n';
  }

  // Data rows
  if (table.rows.length > 0) {
    html += '  <tbody>\n';
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
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
  const allTables: ParsedTable[] = [];

  // 1. Extract summaries
  const { summaries, cleanedText: textAfterSummary } = extractSummaries(text);
  text = textAfterSummary;

  // 2. Extract table details
  const { table: detailsTable, cleanedText: textAfterDetails } = extractTableDetails(text);
  if (detailsTable) allTables.push(detailsTable);
  text = textAfterDetails;

  // 3. Extract inline tables
  const { tables: inlineTables, cleanedText: textAfterInline } = extractInlineTables(text);
  text = textAfterInline;

  // 4. Clean up artifacts
  text = cleanupArtifacts(text);

  // 5. Format structural elements
  text = formatStructuralElements(text);

  // 6. Build HTML output
  let result = '';

  // Summaries as styled list
  if (summaries.length > 0) {
    result += '<div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 0.75rem; margin-bottom: 1rem; border-radius: 0.25rem;">\n';
    result += '<strong style="color: #065f46;">Samenvatting:</strong>\n';
    result += '<ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem;">\n';
    for (const s of summaries) {
      result += `<li style="margin-bottom: 0.25rem; color: #064e3b;">${s}</li>\n`;
    }
    result += '</ul>\n</div>\n\n';
  }

  // Main table from details section
  if (detailsTable) {
    result += '<div class="rag-table-wrapper">\n';
    result += tableToHTML(detailsTable);
    result += '\n</div>\n\n';
  }

  // Replace placeholders with inline HTML tables
  let tableIndex = 0;
  text = text.replace(/\{\{TABLE_PLACEHOLDER\}\}/g, () => {
    const table = inlineTables[tableIndex++];
    if (table) {
      return '\n<div class="rag-table-wrapper">\n' + tableToHTML(table) + '\n</div>\n';
    }
    return '';
  });

  // Add remaining text (preserve line breaks)
  const remainingText = text.trim();
  if (remainingText) {
    result += remainingText;
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
