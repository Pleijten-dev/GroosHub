/**
 * Stage 1: Location Analysis
 *
 * Input: health, safety, livability, amenities summary
 * Output: location_summary, key_insights, highlights
 *
 * Token usage: ~15KB input → ~500 tokens output
 * Purpose: Generate LLM's understanding of the location context
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import type { Stage1Input } from '@/features/location/utils/stagedGenerationData';

export const maxDuration = 60; // Stage 1 is fast - 60 seconds max

// Output schema for Stage 1
const Stage1OutputSchema = z.object({
  location_summary: z.string().describe('Comprehensive summary of the location based on health, safety, and livability data. Should be 2-3 paragraphs covering the key characteristics.'),
  key_location_insights: z.array(z.string()).describe('5-7 key insights about the location that should inform building program decisions'),
  health_highlights: z.string().describe('Summary of notable health indicators - both positive and concerning aspects'),
  safety_highlights: z.string().describe('Summary of safety situation - crime rates, feeling of safety, street lighting'),
  livability_highlights: z.string().describe('Summary of livability factors - social cohesion, maintenance, youth facilities'),
});

export type Stage1Output = z.infer<typeof Stage1OutputSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stageData, locale = 'nl' } = body as { stageData: Stage1Input; locale: 'nl' | 'en' };

    if (!stageData) {
      return new Response(
        JSON.stringify({ error: 'Stage 1 data is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = locale === 'nl' ? `
Je bent een expert in stedelijke analyse en vastgoedontwikkeling. Analyseer de volgende locatiegegevens en maak een samenvatting.

# LOCATIE
${stageData.metadata.location}
Gemeente: ${stageData.metadata.municipality || 'Onbekend'}
Wijk: ${stageData.metadata.district || 'Onbekend'}
Buurt: ${stageData.metadata.neighborhood || 'Onbekend'}

# GEZONDHEIDSGEGEVENS
${JSON.stringify(stageData.health, null, 2)}

# VEILIGHEIDSGEGEVENS
${JSON.stringify(stageData.safety, null, 2)}

# LEEFBAARHEIDSGEGEVENS
${JSON.stringify(stageData.livability, null, 2)}

# VOORZIENINGEN SAMENVATTING
${stageData.amenities.summary}
Top voorzieningen: ${stageData.amenities.topAmenities.map(a => `${a.name} (${a.count}${a.closestDistance ? `, ${a.closestDistance}m` : ''})`).join(', ')}
${stageData.amenities.missingAmenities.length > 0 ? `Ontbrekende voorzieningen: ${stageData.amenities.missingAmenities.join(', ')}` : ''}

# OPDRACHT
Analyseer deze gegevens en lever:
1. Een uitgebreide locatiesamenvatting (2-3 paragrafen) die de belangrijkste kenmerken van de locatie beschrijft
2. 5-7 kernpunten die relevant zijn voor vastgoedontwikkeling
3. Gezondheids-highlights: wat valt op, positief én zorgelijk
4. Veiligheids-highlights: criminaliteit, veiligheidsgevoel, straatverlichting
5. Leefbaarheids-highlights: sociale cohesie, onderhoud, voorzieningen voor jongeren

Focus op aspecten die relevant zijn voor het ontwerp van een nieuw woongebouw. Wees objectief en noem zowel positieve als negatieve aspecten.
` : `
You are an expert in urban analysis and real estate development. Analyze the following location data and create a summary.

# LOCATION
${stageData.metadata.location}
Municipality: ${stageData.metadata.municipality || 'Unknown'}
District: ${stageData.metadata.district || 'Unknown'}
Neighborhood: ${stageData.metadata.neighborhood || 'Unknown'}

# HEALTH DATA
${JSON.stringify(stageData.health, null, 2)}

# SAFETY DATA
${JSON.stringify(stageData.safety, null, 2)}

# LIVABILITY DATA
${JSON.stringify(stageData.livability, null, 2)}

# AMENITIES SUMMARY
${stageData.amenities.summary}
Top amenities: ${stageData.amenities.topAmenities.map(a => `${a.name} (${a.count}${a.closestDistance ? `, ${a.closestDistance}m` : ''})`).join(', ')}
${stageData.amenities.missingAmenities.length > 0 ? `Missing amenities: ${stageData.amenities.missingAmenities.join(', ')}` : ''}

# TASK
Analyze this data and provide:
1. A comprehensive location summary (2-3 paragraphs) describing the key characteristics
2. 5-7 key insights relevant for real estate development
3. Health highlights: notable aspects, both positive and concerning
4. Safety highlights: crime rates, feeling of safety, street lighting
5. Livability highlights: social cohesion, maintenance, youth facilities

Focus on aspects relevant for designing a new residential building. Be objective and mention both positive and negative aspects.
`;

    const result = await streamObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: Stage1OutputSchema,
      schemaName: 'Stage1LocationAnalysis',
      schemaDescription: locale === 'nl'
        ? 'Locatieanalyse gebaseerd op gezondheids-, veiligheids- en leefbaarheidsgegevens'
        : 'Location analysis based on health, safety, and livability data',
      prompt,
      temperature: 0.5, // Lower temperature for factual analysis
    });

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const partialObject of result.partialObjectStream) {
            const json = JSON.stringify(partialObject);
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stage 1 error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate location analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
