/**
 * Text extraction from various file formats
 * Phase 1: TXT only (simplest start)
 * Phase 2: PDF with pdf-parse (basic quality)
 * Phase 3: Images with vision models (later)
 */

export interface ExtractedText {
  text: string;
  pageCount?: number;
  metadata: {
    pages?: Array<{ pageNumber: number; text: string }>;
    rows?: number;
    columns?: string[];
  };
}

export class TextExtractor {
  /**
   * Extract text from plain text file
   * Phase 1: Start here - simplest case
   */
  async extractFromText(buffer: Buffer): Promise<ExtractedText> {
    const text = buffer.toString('utf-8');

    return {
      text,
      metadata: {}
    };
  }

  /**
   * Extract text from PDF
   * Phase 2: Add after .txt works
   * TODO: Install pdf-parse library first
   */
  async extractFromPDF(buffer: Buffer): Promise<ExtractedText> {
    throw new Error('PDF extraction not yet implemented. Install pdf-parse library first.');

    // Phase 2 implementation:
    // const pdf = require('pdf-parse');
    // const data = await pdf(buffer);
    // return {
    //   text: data.text,
    //   pageCount: data.numpages,
    //   metadata: {
    //     pages: data.text.split('\f').map((pageText, i) => ({
    //       pageNumber: i + 1,
    //       text: pageText.trim()
    //     }))
    //   }
    // };
  }

  /**
   * Extract text from CSV
   * Phase 2: Add after .txt works
   * TODO: Install papaparse library first
   */
  async extractFromCSV(buffer: Buffer): Promise<ExtractedText> {
    throw new Error('CSV extraction not yet implemented. Install papaparse library first.');

    // Phase 2 implementation:
    // const Papa = require('papaparse');
    // const csvString = buffer.toString('utf-8');
    // return new Promise((resolve, reject) => {
    //   Papa.parse(csvString, {
    //     header: true,
    //     complete: (results) => {
    //       const rows = results.data.map((row: any) => {
    //         return Object.entries(row)
    //           .map(([key, value]) => `${key}: ${value}`)
    //           .join(', ');
    //       });
    //       resolve({
    //         text: rows.join('\n'),
    //         metadata: {
    //           rows: results.data.length,
    //           columns: results.meta.fields || []
    //         }
    //       });
    //     },
    //     error: (error) => reject(error)
    //   });
    // });
  }

  /**
   * Main extraction router
   * Start with .txt only, expand later
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<ExtractedText> {
    // Phase 1: Only support .txt files
    if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return this.extractFromText(buffer);
    }

    // Phase 2: Uncomment when ready
    // if (mimeType === 'application/pdf') {
    //   return this.extractFromPDF(buffer);
    // }

    // if (mimeType === 'text/csv') {
    //   return this.extractFromCSV(buffer);
    // }

    throw new Error(
      `Unsupported file type: ${mimeType}. ` +
      `Currently only .txt and .md files are supported. ` +
      `PDF and CSV support coming soon.`
    );
  }
}
