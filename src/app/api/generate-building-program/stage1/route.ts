/**
 * Stage 1: Location Analysis (Enhanced)
 *
 * Input: health, safety, livability, WMS environmental data, full amenities
 * Output: location_summary, key_insights, highlights, environmental analysis, cross-correlations
 *
 * Token usage: ~22KB input → ~1KB output
 * Purpose: Generate holistic understanding of location with cross-dataset insights
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import type { Stage1Input } from '@/features/location/utils/stagedGenerationData';

export const maxDuration = 90; // Increased for more comprehensive analysis

// Output schema for Stage 1 (Enhanced)
const Stage1OutputSchema = z.object({
  location_summary: z.string().describe('Comprehensive summary of the location based on all available data including environmental factors. Should be 2-3 paragraphs covering the key characteristics.'),
  key_location_insights: z.array(z.string()).describe('5-7 key insights about the location that should inform building program decisions'),
  health_highlights: z.string().describe('Summary of notable health indicators - both positive and concerning aspects'),
  safety_highlights: z.string().describe('Summary of safety situation - crime rates, feeling of safety, street lighting'),
  livability_highlights: z.string().describe('Summary of livability factors - social cohesion, maintenance, youth facilities'),
  // NEW: Environmental analysis
  environmental_highlights: z.string().describe('Summary of environmental conditions - air quality, noise levels, green space, climate risks. Include specific measurements where available.'),
  // NEW: Full amenity analysis
  amenity_analysis: z.string().describe('Comprehensive analysis of amenities - what is available and close by, what is missing or far away, and implications for residents. Mention specific distances.'),
  // NEW: Cross-correlations between datasets
  cross_correlations: z.array(z.string()).describe('3-5 insights that connect multiple datasets. E.g., "High noise levels (58dB) combined with limited green space may explain elevated stress levels" or "Strong amenity access validates high livability score"'),
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

    // Build environmental section for prompt
    const envSection = stageData.environmental ? `
# OMGEVINGSDATA (WMS Kaartlagen)
## Luchtkwaliteit
${stageData.environmental.airQuality.no2 ? `- NO2: ${stageData.environmental.airQuality.no2.pointValue} µg/m³` : ''}
${stageData.environmental.airQuality.pm10 ? `- PM10: ${stageData.environmental.airQuality.pm10.pointValue} µg/m³` : ''}
${stageData.environmental.airQuality.pm25 ? `- PM2.5: ${stageData.environmental.airQuality.pm25.pointValue} µg/m³` : ''}
Beoordeling: ${stageData.environmental.airQuality.summary}

## Geluidsniveau
${stageData.environmental.noise.roadTraffic ? `- Wegverkeer: ${stageData.environmental.noise.roadTraffic.pointValue} dB` : ''}
Beoordeling: ${stageData.environmental.noise.summary}

## Groenvoorziening
${stageData.environmental.greenSpace.trees ? `- Boombedekking: ${stageData.environmental.greenSpace.trees.pointValue}%` : ''}
${stageData.environmental.greenSpace.grass ? `- Gras index: ${stageData.environmental.greenSpace.grass.pointValue}` : ''}
Beoordeling: ${stageData.environmental.greenSpace.summary}

## Klimaat
${stageData.environmental.climate.heatStress ? `- Hittestress index: ${stageData.environmental.climate.heatStress.averageValue}` : ''}
Beoordeling: ${stageData.environmental.climate.summary}

## Algemene Omgevingsbeoordeling
${stageData.environmental.overallAssessment}
` : '# OMGEVINGSDATA\nGeen WMS omgevingsdata beschikbaar.';

    // Build full amenities section
    const amenitiesSection = `
# VOORZIENINGEN (Volledig overzicht met afstanden)
${stageData.amenities.summary}

## Alle voorzieningen:
${stageData.amenities.items.map(a =>
  `- ${a.name}: ${a.count} aanwezig${a.closestDistance ? `, dichtstbij ${a.closestDistance}m` : ''}${a.averageDistance ? `, gemiddeld ${a.averageDistance}m` : ''} (score: ${a.countScore})`
).join('\n')}

## Ontbrekende voorzieningen:
${stageData.amenities.missingAmenities.length > 0 ? stageData.amenities.missingAmenities.join(', ') : 'Alle gangbare voorzieningen aanwezig'}

## Belangrijke knelpunten (ontbrekend of ver weg):
${stageData.amenities.amenityGaps.length > 0 ? stageData.amenities.amenityGaps.join('\n') : 'Geen significante knelpunten'}
`;

    // Format health data with context
    const formatHealthData = (health: typeof stageData.health) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${health.description}`);
      if (health.items && health.items.length > 0) {
        lines.push('## Indicatoren (hoger % = meer rapporteren probleem, referentie is nationaal gemiddelde):');
        for (const item of health.items) {
          const buurtVal = parseFloat(item.neighborhood) || 0;
          const gemVal = parseFloat(item.municipality) || 0;
          const comparison = buurtVal > gemVal ? '↑ hoger dan gemeente' : buurtVal < gemVal ? '↓ lager dan gemeente' : '= gelijk aan gemeente';
          lines.push(`- ${item.name}: Buurt ${item.neighborhood}, Gemeente ${item.municipality} (${comparison})`);
        }
      }
      return lines.join('\n');
    };

    // Format safety data with context
    const formatSafetyData = (safety: typeof stageData.safety) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${safety.description}`);
      if (safety.items && safety.items.length > 0) {
        lines.push('## Indicatoren (lagere criminaliteit = beter, hoger veiligheidsgevoel = beter):');
        for (const item of safety.items) {
          lines.push(`- ${item.name}: Buurt ${item.neighborhood}, Gemeente ${item.municipality}`);
          if (item.description) lines.push(`  ${item.description}`);
        }
      }
      return lines.join('\n');
    };

    // Format livability data with context
    const formatLivabilityData = (livability: typeof stageData.livability) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${livability.description}`);
      if (livability.items && livability.items.length > 0) {
        lines.push('## Indicatoren (hogere scores = betere leefbaarheid):');
        for (const item of livability.items) {
          lines.push(`- ${item.name}: Buurt ${item.neighborhood}, Gemeente ${item.municipality}`);
          if (item.description) lines.push(`  ${item.description}`);
        }
      }
      return lines.join('\n');
    };

    const prompt = locale === 'nl' ? `
Je bent een expert in stedelijke analyse en vastgoedontwikkeling. Analyseer de volgende locatiegegevens en maak een uitgebreide samenvatting.

BELANGRIJK: Zoek naar verbanden tussen de datasets. Bijvoorbeeld:
- Hoge NO2-waarden kunnen samenhangen met gezondheidsklachten
- Gebrek aan groen kan bijdragen aan hittestress en lagere leefbaarheid
- Geluidsniveaus beïnvloeden wooncomfort en doelgroepkeuze
- Ontbrekende voorzieningen bepalen wat het gebouw zelf moet bieden

# LOCATIE
${stageData.metadata.location}
Gemeente: ${stageData.metadata.municipality || 'Onbekend'}
Wijk: ${stageData.metadata.district || 'Onbekend'}
Buurt: ${stageData.metadata.neighborhood || 'Onbekend'}
${stageData.metadata.coordinates ? `Coördinaten: ${stageData.metadata.coordinates.lat}, ${stageData.metadata.coordinates.lon}` : ''}

# GEZONDHEIDSGEGEVENS (CBS data - percentage dat problemen rapporteert)
${formatHealthData(stageData.health)}

# VEILIGHEIDSGEGEVENS (CBS/Politie data)
${formatSafetyData(stageData.safety)}

# LEEFBAARHEIDSGEGEVENS (Leefbaarometer scores)
${formatLivabilityData(stageData.livability)}

${envSection}

${amenitiesSection}

# OPDRACHT
Analyseer deze gegevens en lever:
1. Een uitgebreide locatiesamenvatting (2-3 paragrafen) die de belangrijkste kenmerken van de locatie beschrijft, inclusief omgevingsfactoren
2. 5-7 kernpunten die relevant zijn voor vastgoedontwikkeling
3. Gezondheids-highlights: wat valt op, positief én zorgelijk
4. Veiligheids-highlights: criminaliteit, veiligheidsgevoel, straatverlichting
5. Leefbaarheids-highlights: sociale cohesie, onderhoud, voorzieningen voor jongeren
6. Omgevings-highlights: luchtkwaliteit, geluid, groen, klimaatrisico's - noem specifieke waarden
7. Voorzieningen-analyse: wat is goed bereikbaar, wat ontbreekt of is ver weg, implicaties voor bewoners
8. 3-5 cross-correlaties: verbanden tussen datasets die inzicht geven (bijv. "hoog NO2 + laag groen = gezondheidsrisico")

Focus op aspecten die relevant zijn voor het ontwerp van een nieuw woongebouw. Wees objectief en noem zowel positieve als negatieve aspecten.
` : `
You are an expert in urban analysis and real estate development. Analyze the following location data and create a comprehensive summary.

IMPORTANT: Look for connections between datasets. For example:
- High NO2 levels may correlate with health complaints
- Lack of green space can contribute to heat stress and lower livability
- Noise levels affect living comfort and target group selection
- Missing amenities determine what the building itself should provide

# LOCATION
${stageData.metadata.location}
Municipality: ${stageData.metadata.municipality || 'Unknown'}
District: ${stageData.metadata.district || 'Unknown'}
Neighborhood: ${stageData.metadata.neighborhood || 'Unknown'}
${stageData.metadata.coordinates ? `Coordinates: ${stageData.metadata.coordinates.lat}, ${stageData.metadata.coordinates.lon}` : ''}

# HEALTH DATA (CBS data - percentage reporting issues)
${formatHealthData(stageData.health)}

# SAFETY DATA (CBS/Police data)
${formatSafetyData(stageData.safety)}

# LIVABILITY DATA (Leefbaarometer scores)
${formatLivabilityData(stageData.livability)}

${envSection}

${amenitiesSection}

# TASK
Analyze this data and provide:
1. A comprehensive location summary (2-3 paragraphs) describing the key characteristics, including environmental factors
2. 5-7 key insights relevant for real estate development
3. Health highlights: notable aspects, both positive and concerning
4. Safety highlights: crime rates, feeling of safety, street lighting
5. Livability highlights: social cohesion, maintenance, youth facilities
6. Environmental highlights: air quality, noise, green space, climate risks - mention specific values
7. Amenities analysis: what is well accessible, what is missing or far away, implications for residents
8. 3-5 cross-correlations: connections between datasets that provide insight (e.g., "high NO2 + low green = health risk")

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
