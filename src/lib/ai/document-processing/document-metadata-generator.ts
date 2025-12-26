/**
 * Document Metadata Generator
 *
 * Generates rich metadata about document contents during processing:
 * - Document summary
 * - Key topics/themes
 * - Document type classification
 * - Key concepts/terms
 *
 * This metadata helps the query classifier make better decisions about
 * whether a user's question relates to the document.
 */

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { TextChunk } from './text-chunker';

export interface DocumentMetadata {
  summary: string;
  topics: string[];
  documentType: string;
  keyConcepts: string[];
  language: 'nl' | 'en';
  generatedAt: string;
}

export class DocumentMetadataGenerator {
  /**
   * Generate metadata by analyzing document chunks
   * Uses cheap GPT-4o-mini model for cost efficiency
   *
   * @param filename - Original filename
   * @param chunks - Document chunks (we'll sample from these)
   * @param maxChunksToAnalyze - Max chunks to analyze (default 10)
   */
  async generate(
    filename: string,
    chunks: TextChunk[],
    maxChunksToAnalyze: number = 10
  ): Promise<DocumentMetadata> {
    try {
      // Sample chunks for analysis (beginning, middle, end)
      const sampledChunks = this.sampleChunks(chunks, maxChunksToAnalyze);

      // Build content sample (max 8000 characters)
      const contentSample = sampledChunks
        .map((chunk, i) => `[Chunk ${i + 1}]\n${chunk.text}`)
        .join('\n\n---\n\n')
        .substring(0, 8000);

      console.log(`[Metadata Generator] Analyzing ${filename} (${sampledChunks.length} chunks sampled)`);

      // Use cheap model to generate metadata
      const result = await generateText({
        model: openai('gpt-4o-mini'),
        temperature: 0.3,
        system: `Je bent een document metadata generator. Analyseer documentinhoud en genereer gestructureerde metadata.

TAAK: Genereer metadata voor dit document op basis van de content samples.

OUTPUT FORMAT (JSON):
{
  "summary": "1-2 zinnen samenvatting van wat het document behandelt",
  "topics": ["topic 1", "topic 2", "topic 3"],
  "documentType": "type document (bv: 'Bouwregelgeving', 'Parkeernorm', 'Beeldkwaliteitsplan', 'Stedenbouwkundig plan', 'Technische rapportage', etc.)",
  "keyConcepts": ["concept 1", "concept 2", "concept 3", "concept 4", "concept 5"],
  "language": "nl" of "en"
}

RICHTLIJNEN:
- summary: Wees specifiek over wat het document behandelt
- topics: Max 5 hoofdthema's
- documentType: Classificeer het documenttype zo specifiek mogelijk
- keyConcepts: Belangrijke termen, normen, artikelnummers, technische concepten
- language: Detecteer de hoofdtaal van het document`,
        prompt: `Analyseer dit document en genereer metadata:

FILENAME: ${filename}

CONTENT SAMPLES:
${contentSample}

Geef je antwoord in JSON formaat.`,
      });

      // Parse result
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in metadata generation response');
      }

      const metadata = JSON.parse(jsonMatch[0]) as DocumentMetadata;
      metadata.generatedAt = new Date().toISOString();

      console.log(`[Metadata Generator] Generated metadata for ${filename}:`);
      console.log(`  Type: ${metadata.documentType}`);
      console.log(`  Topics: ${metadata.topics.join(', ')}`);
      console.log(`  Language: ${metadata.language}`);

      return metadata;

    } catch (error) {
      console.error(`[Metadata Generator] Failed to generate metadata for ${filename}:`, error);

      // Return minimal metadata on error
      return {
        summary: `Document: ${filename}`,
        topics: [],
        documentType: 'Unknown',
        keyConcepts: [],
        language: 'nl',
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Sample chunks strategically:
   * - First few chunks (intro/table of contents)
   * - Some middle chunks (body)
   * - Last few chunks (conclusion/appendix)
   */
  private sampleChunks(chunks: TextChunk[], maxSamples: number): TextChunk[] {
    if (chunks.length <= maxSamples) {
      return chunks;
    }

    const samples: TextChunk[] = [];
    const totalChunks = chunks.length;

    // Take first 3 chunks
    samples.push(...chunks.slice(0, Math.min(3, totalChunks)));

    // Take some middle chunks
    const middleStart = Math.floor(totalChunks / 3);
    const middleCount = Math.min(3, maxSamples - 6);
    samples.push(...chunks.slice(middleStart, middleStart + middleCount));

    // Take last 3 chunks
    samples.push(...chunks.slice(Math.max(0, totalChunks - 3)));

    // Deduplicate and limit
    const uniqueSamples = Array.from(new Set(samples));
    return uniqueSamples.slice(0, maxSamples);
  }
}
