/**
 * Text extraction from various file formats
 *
 * CURRENT STATUS:
 * ✅ Phase 1: TXT/MD files - Perfect quality
 * ✅ Phase 2: PDF with pdf-parse - BASIC quality (see limitations below)
 * 🚧 Phase 3: CSV with PapaParse - TODO
 * 🚧 Phase 4: Images with vision models - TODO
 *
 * PDF EXTRACTION LIMITATIONS (pdf-parse):
 * ⚠️ Tables: Column structure is lost, data appears as plain text
 * ⚠️ Formatting: No preservation of layout, headers, or styling
 * ⚠️ Scanned PDFs: Cannot extract text from images (no OCR)
 * ⚠️ Complex layouts: Multi-column text may be jumbled
 *
 * FUTURE UPGRADES FOR PDF QUALITY:
 * - LlamaParse API ($0.003/page) - Excellent table extraction
 * - PyMuPDF/Camelot - Good quality, requires Python backend
 * - Unstructured.io - ML-based, handles complex layouts
 *
 * For now, pdf-parse is good enough for:
 * - Text-heavy documents (reports, articles)
 * - Code documentation
 * - Notes and simple PDFs
 * - ~70% of typical use cases
 */

export interface ExtractedText {
  text: string;
  pageCount?: number;
  metadata: {
    pages?: Array<{ pageNumber: number; text: string }>;
    rows?: number;
    columns?: string[];
    extractionMethod?: string; // Track which method was used
    warnings?: string[];       // Any quality warnings
  };
}

export class TextExtractor {
  /**
   * Extract text from plain text file
   * ✅ Perfect quality, no limitations
   */
  async extractFromText(buffer: Buffer): Promise<ExtractedText> {
    const text = buffer.toString('utf-8');

    return {
      text,
      metadata: {
        extractionMethod: 'plain-text',
        warnings: []
      }
    };
  }

  /**
   * Extract text from PDF using pdf-parse
   * ⚠️ BASIC QUALITY - Tables will lose structure, formatting is lost
   * See header comments for upgrade options if quality is insufficient
   */
  async extractFromPDF(buffer: Buffer): Promise<ExtractedText> {
    try {
      // Dynamic import for pdf-parse (CommonJS module)
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);

      // Split text by form feed character (page separator)
      const pageTexts = data.text.split('\f');
      const pages = pageTexts.map((pageText: string, i: number) => ({
        pageNumber: i + 1,
        text: pageText.trim()
      }));

      // Detect potential quality issues
      const warnings: string[] = [];

      // Check if PDF might contain tables (heuristic: lots of spaces/tabs)
      const hasLotsOfWhitespace = /\s{3,}/.test(data.text);
      if (hasLotsOfWhitespace) {
        warnings.push(
          'Potential table detected - column structure may be lost. ' +
          'Consider upgrading to LlamaParse for better table extraction.'
        );
      }

      // Check if PDF is very short (might be scanned/image-based)
      if (data.text.length < 100 && data.numpages > 0) {
        warnings.push(
          'Very little text extracted - PDF may contain scanned images. ' +
          'OCR support is not available with pdf-parse.'
        );
      }

      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          pages,
          extractionMethod: 'pdf-parse',
          warnings
        }
      };
    } catch (error) {
      throw new Error(
        `PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `The PDF may be corrupted, password-protected, or use an unsupported format.`
      );
    }
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
   * Supports: TXT, MD, PDF (basic quality)
   * Coming soon: CSV, Images
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<ExtractedText> {
    // Text files - Perfect quality
    if (mimeType === 'text/plain' || filename.endsWith('.txt') || filename.endsWith('.md')) {
      return this.extractFromText(buffer);
    }

    // PDF files - Basic quality (see header for limitations)
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      return this.extractFromPDF(buffer);
    }

    // CSV - Coming soon
    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      throw new Error(
        'CSV extraction not yet implemented. ' +
        'Please convert to .txt format or wait for CSV support.'
      );
    }

    // Images - Coming soon
    if (mimeType.startsWith('image/')) {
      throw new Error(
        'Image extraction not yet implemented. ' +
        'For now, you can ask questions about images directly in chat using multimodal models.'
      );
    }

    throw new Error(
      `Unsupported file type: ${mimeType} (${filename}). ` +
      `Currently supported: .txt, .md, .pdf (basic quality). ` +
      `Coming soon: .csv, images.`
    );
  }
}
