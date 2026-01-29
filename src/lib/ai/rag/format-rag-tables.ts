/**
 * RAG Table Formatter
 *
 * Transforms raw machine-readable table data from RAG chunks
 * into human-readable markdown tables.
 *
 * Input formats handled:
 * 1. "--- Tabel Details ---" sections with pipe-separated tables
 * 2. "--- Tabel Samenvatting (Semantisch Verrijkt) ---" sections
 * 3. Raw table data with embedded column structures
 *
 * Output: Clean markdown with properly formatted tables and summaries
 */

export interface FormattedRAGContent {
  formattedText: string;
  hasTable: boolean;
  tableSummaries: string[];
}

/**
 * Main function to format RAG chunk text for human readability
 */
export function formatRAGTableContent(rawText: string): FormattedRAGContent {
  if (!rawText || typeof rawText !== 'string') {
    return { formattedText: rawText || '', hasTable: false, tableSummaries: [] };
  }

  let formattedText = rawText;
  const tableSummaries: string[] = [];
  let hasTable = false;

  // 1. Extract and format "Tabel Samenvatting" (semantic summaries)
  const summaryMatch = formattedText.match(
    /---\s*Tabel Samenvatting\s*\(Semantisch Verrijkt\)\s*---\s*([\s\S]*?)(?=---|$)/i
  );

  if (summaryMatch) {
    hasTable = true;
    const summarySection = summaryMatch[1];

    // Extract quoted sentences
    const sentences = summarySection
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('"') && line.endsWith('"'))
      .map(line => line.slice(1, -1)); // Remove quotes

    tableSummaries.push(...sentences);

    // Format the summary section nicely
    if (sentences.length > 0) {
      const formattedSummary = `\n\n**Samenvatting van tabel:**\n${sentences.map(s => `- ${s}`).join('\n')}\n`;
      formattedText = formattedText.replace(summaryMatch[0], formattedSummary);
    }
  }

  // 2. Extract and format "Tabel Details" sections
  const tableDetailsMatch = formattedText.match(
    /---\s*Tabel Details\s*---\s*([\s\S]*?)(?=---\s*Tabel Samenvatting|---|$)/i
  );

  if (tableDetailsMatch) {
    hasTable = true;
    const tableSection = tableDetailsMatch[1];
    const formattedTable = formatPipeTable(tableSection);

    if (formattedTable) {
      formattedText = formattedText.replace(
        tableDetailsMatch[0],
        `\n\n**Tabel:**\n${formattedTable}\n`
      );
    }
  }

  // 3. Handle inline raw tables (pipe-separated without markers)
  formattedText = formatInlinePipeTables(formattedText);

  // 4. Clean up date/version artifacts that often appear in raw data
  formattedText = cleanupArtifacts(formattedText);

  // 5. Format any remaining raw table structures
  formattedText = formatRawTableStructures(formattedText);

  return {
    formattedText: formattedText.trim(),
    hasTable,
    tableSummaries,
  };
}

/**
 * Format pipe-separated table content into proper markdown
 */
function formatPipeTable(tableContent: string): string | null {
  const lines = tableContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) return null;

  // Find lines that contain pipe characters (table rows)
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length === 0) return null;

  // Normalize the table structure
  const rows: string[][] = [];

  for (const line of tableLines) {
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

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return null;

  // Determine max columns
  const maxCols = Math.max(...rows.map(row => row.length));

  // Normalize all rows to have same number of columns
  const normalizedRows = rows.map(row => {
    while (row.length < maxCols) {
      row.push('');
    }
    return row;
  });

  // Calculate column widths
  const colWidths = Array(maxCols).fill(0);
  for (const row of normalizedRows) {
    for (let i = 0; i < row.length; i++) {
      colWidths[i] = Math.max(colWidths[i], row[i].length, 3);
    }
  }

  // Build markdown table
  const formatRow = (row: string[]) =>
    '| ' + row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |';

  const headerSeparator =
    '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';

  const result: string[] = [];

  // First row as header
  if (normalizedRows.length > 0) {
    result.push(formatRow(normalizedRows[0]));
    result.push(headerSeparator);

    // Remaining rows as data
    for (let i = 1; i < normalizedRows.length; i++) {
      result.push(formatRow(normalizedRows[i]));
    }
  }

  return result.join('\n');
}

/**
 * Find and format inline pipe tables that aren't wrapped in markers
 */
function formatInlinePipeTables(text: string): string {
  // Look for sequences of lines that look like table rows
  const lines = text.split('\n');
  const result: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isPipeRow = trimmedLine.includes('|') && !trimmedLine.startsWith('**');

    if (isPipeRow) {
      if (!inTable) {
        inTable = true;
      }
      tableBuffer.push(trimmedLine);
    } else {
      if (inTable && tableBuffer.length >= 2) {
        // We have a table to format
        const formattedTable = formatPipeTable(tableBuffer.join('\n'));
        if (formattedTable) {
          result.push('');
          result.push(formattedTable);
          result.push('');
        } else {
          result.push(...tableBuffer);
        }
      } else if (inTable) {
        // Not enough rows for a table, add as-is
        result.push(...tableBuffer);
      }
      tableBuffer = [];
      inTable = false;
      result.push(line);
    }
  }

  // Handle remaining table buffer
  if (tableBuffer.length >= 2) {
    const formattedTable = formatPipeTable(tableBuffer.join('\n'));
    if (formattedTable) {
      result.push('');
      result.push(formattedTable);
    } else {
      result.push(...tableBuffer);
    }
  } else if (tableBuffer.length > 0) {
    result.push(...tableBuffer);
  }

  return result.join('\n');
}

/**
 * Clean up common artifacts from raw table data
 */
function cleanupArtifacts(text: string): string {
  // Remove date/version artifact sequences like "2018 291 31-08-2018 03-07-2018"
  // These often appear at the end of legal document tables
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
 * Format raw table structures that appear as space-separated columns
 */
function formatRawTableStructures(text: string): string {
  // Detect patterns like "gebruiksfunctie leden van toepassing waarden"
  // followed by data rows

  // Look for the article/table header pattern
  const articleMatch = text.match(
    /Artikel\s+(\d+\.\d+)\s*\([^)]+\)\s*(?:\d\s+)?(.+?)(?=Tabel|$)/s
  );

  if (articleMatch) {
    const articleNum = articleMatch[1];
    const articleText = articleMatch[2].trim();

    // Format the article header nicely
    text = text.replace(
      articleMatch[0],
      `\n**Artikel ${articleNum}**\n${articleText}\n`
    );
  }

  // Look for "Tabel X.XXX" references and format them
  text = text.replace(/Tabel\s+(\d+\.\d+)/g, '**Tabel $1**');

  return text;
}

/**
 * Format RAG content specifically for display in MessageSources
 * This is a simpler version that preserves more structure
 */
export function formatRAGSourceText(rawText: string): string {
  const { formattedText, tableSummaries } = formatRAGTableContent(rawText);

  // If we have summaries, prioritize showing those first
  if (tableSummaries.length > 0) {
    const summaryText = tableSummaries.map(s => `• ${s}`).join('\n');
    return `${summaryText}\n\n---\n\n${formattedText}`;
  }

  return formattedText;
}

/**
 * Format multiple RAG sources for system prompt injection
 * Combines and deduplicates table summaries
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

  // If we have summaries, add a combined summary section at the top
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
