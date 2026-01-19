/**
 * Text extraction from various file formats
 *
 * CURRENT STATUS:
 * ✅ Phase 1: TXT/MD files - Perfect quality
 * ✅ Phase 2: PDF with pdf-parse - BASIC quality (see limitations below)
 * ✅ Phase 3: XML with LLM enrichment - EXCELLENT quality for legal docs
 * ✅ Phase 4: CSV with PapaParse - GOOD quality (converts to natural language)
 * ✅ Phase 5: Images with GPT-4V - EXCELLENT quality (vision model descriptions)
 *
 * PDF EXTRACTION LIMITATIONS (pdf-parse):
 * ⚠️ Tables: Column structure is lost, data appears as plain text
 * ⚠️ Formatting: No preservation of layout, headers, or styling
 * ⚠️ Scanned PDFs: Cannot extract text from images (no OCR)
 * ⚠️ Complex layouts: Multi-column text may be jumbled
 *
 * XML EXTRACTION (NEW - Phase 1 Legal RAG):
 * ✅ Preserves table structure perfectly
 * ✅ LLM-generated synthetic sentences for better retrieval
 * ✅ Ideal for legal documents like Bouwbesluit
 * ℹ️ Returns enriched chunks directly (skips regular chunking)
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

import type { EnrichedXMLChunk } from './xml-document-processor';

export interface ExtractedText {
  text: string;
  pageCount?: number;
  metadata: {
    pages?: Array<{ pageNumber: number; text: string }>;
    rows?: number;
    columns?: string[];
    extractionMethod?: string; // Track which method was used
    warnings?: string[];       // Any quality warnings
    enrichedChunks?: EnrichedXMLChunk[]; // For XML: pre-chunked with enrichment
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
      const pdfParseModule = await import('pdf-parse');
      // @ts-ignore - pdf-parse has CommonJS exports that TypeScript doesn't recognize
      const pdfParse = pdfParseModule.default || pdfParseModule;
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
   * Extract text from XML with LLM-based table enrichment
   * ✅ EXCELLENT quality for legal documents (Bouwbesluit)
   *
   * This method:
   * 1. Parses XML structure (articles, tables)
   * 2. Uses LLM (GPT-4o-mini) to generate natural language descriptions of tables
   * 3. Returns PRE-CHUNKED content with synthetic sentences appended
   *
   * IMPORTANT: This returns enriched chunks directly, skipping regular chunking.
   * The pipeline should detect this and skip the chunking step.
   */
  async extractFromXML(buffer: Buffer, filename: string): Promise<ExtractedText> {
    try {
      // Dynamic import to avoid circular dependencies
      const { XMLDocumentProcessor } = await import('./xml-document-processor');

      const xmlContent = buffer.toString('utf-8');
      const processor = new XMLDocumentProcessor();

      console.log(`[XML Extractor] Processing XML file: ${filename}`);

      // Process XML with LLM enrichment
      const enrichedChunks = await processor.processXML(xmlContent, filename);

      console.log(
        `[XML Extractor] Created ${enrichedChunks.length} enriched chunks ` +
        `(${enrichedChunks.filter(c => c.metadata.hasTable).length} with tables)`
      );

      // Combine all chunks into single text for fallback
      const combinedText = enrichedChunks
        .map(chunk => chunk.text)
        .join('\n\n---\n\n');

      return {
        text: combinedText,
        metadata: {
          extractionMethod: 'xml-llm-enriched',
          enrichedChunks, // Pass enriched chunks to pipeline
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(
        `XML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `The XML may be malformed or use an unsupported structure.`
      );
    }
  }

  /**
   * Extract text from CSV with PapaParse
   * ✅ Converts CSV data to natural language sentences for better RAG retrieval
   *
   * Example: "Name: John, Age: 25, City: Amsterdam"
   * This format allows semantic search to find relevant rows
   */
  async extractFromCSV(buffer: Buffer): Promise<ExtractedText> {
    try {
      const Papa = await import('papaparse');
      const csvString = buffer.toString('utf-8');

      return new Promise((resolve, reject) => {
        Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, any>[];
            const columns = results.meta.fields || [];

            // Convert each row to a natural language sentence
            const rows = data.map((row, index) => {
              const rowNumber = index + 1;
              const fields = Object.entries(row)
                .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');

              return `Row ${rowNumber}: ${fields}`;
            });

            // Add header info at the beginning for context
            const headerInfo = `CSV with ${data.length} rows and ${columns.length} columns: ${columns.join(', ')}`;
            const fullText = [headerInfo, '', ...rows].join('\n');

            console.log(`[CSV Extractor] Parsed ${data.length} rows with ${columns.length} columns`);

            resolve({
              text: fullText,
              metadata: {
                rows: data.length,
                columns: columns,
                extractionMethod: 'papaparse-csv',
                warnings: []
              }
            });
          },
          error: (error: Error) => reject(new Error(`CSV parsing failed: ${error.message}`))
        });
      });
    } catch (error) {
      throw new Error(
        `CSV extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `The CSV may be malformed or use an unsupported encoding.`
      );
    }
  }

  /**
   * Extract text from images using GPT-4V (Vision)
   * ✅ EXCELLENT quality - Rich semantic descriptions for RAG
   *
   * Uses GPT-4o's vision capabilities to generate detailed descriptions
   * that can be embedded and searched semantically. Perfect for:
   * - Architectural blueprints and diagrams
   * - Photos of buildings/locations
   * - Charts and infographics
   * - Scanned documents with images
   *
   * Cost: ~$0.01 per image (GPT-4V pricing)
   */
  async extractFromImage(buffer: Buffer, filename: string): Promise<ExtractedText> {
    try {
      console.log(`[Image Extractor] Processing image: ${filename} (${buffer.length} bytes)`);

      // Dynamic import to avoid circular dependencies
      const { generateText } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');

      // Use GPT-4o (vision) to describe the image
      const result = await generateText({
        model: openai('gpt-4o'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at describing images for document search and retrieval.
Provide a comprehensive, detailed description of this image that will be used for semantic search.

Include:
- What type of image this is (photo, diagram, blueprint, chart, etc.)
- Main subjects, objects, or elements visible
- Any text, labels, or annotations present
- Technical details if it's a diagram or blueprint (dimensions, measurements, annotations)
- Context and purpose if apparent (architectural drawing, product photo, etc.)
- Colors, layout, and composition
- Any other relevant details that would help someone find this image through search

Be thorough and factual. This description will be embedded and used for RAG retrieval.`
              },
              {
                type: 'image',
                image: buffer
              }
            ]
          }
        ]
      });

      const description = result.text;

      console.log(
        `[Image Extractor] Generated description (${description.length} chars): ` +
        `${description.substring(0, 100)}...`
      );

      // Add header with filename for context
      const fullText = `IMAGE: ${filename}\n\nDESCRIPTION:\n${description}`;

      return {
        text: fullText,
        metadata: {
          extractionMethod: 'gpt-4v-vision',
          warnings: []
        }
      };
    } catch (error) {
      throw new Error(
        `Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `The image may be corrupted or use an unsupported format.`
      );
    }
  }

  /**
   * Main extraction router
   * Supports: TXT, MD, CSV, PDF (basic quality), XML (excellent quality for legal docs), Images (vision descriptions)
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

    // XML files - Excellent quality for legal documents (with LLM enrichment)
    if (mimeType === 'application/xml' || mimeType === 'text/xml' || filename.endsWith('.xml')) {
      return this.extractFromXML(buffer, filename);
    }

    // PDF files - Basic quality (see header for limitations)
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      return this.extractFromPDF(buffer);
    }

    // CSV - Fully supported with PapaParse
    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      return this.extractFromCSV(buffer);
    }

    // Images - Fully supported with GPT-4V vision descriptions
    if (mimeType.startsWith('image/')) {
      return this.extractFromImage(buffer, filename);
    }

    throw new Error(
      `Unsupported file type: ${mimeType} (${filename}). ` +
      `Currently supported: .txt, .md, .csv, .xml (legal docs), .pdf (basic quality), images (vision descriptions).`
    );
  }
}
