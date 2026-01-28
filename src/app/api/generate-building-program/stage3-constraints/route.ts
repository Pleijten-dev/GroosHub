/**
 * Stage 3: Building Constraints (NEW)
 *
 * Input: Stage 1+2 outputs + environmental data + amenity gaps
 * Output: Design constraints, recommendations, and amenity opportunities
 *
 * Token usage: ~5KB input → ~2KB output
 * Purpose: Derive building design requirements from environmental data
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import type { Stage1Output } from '../stage1/route';
import type { Stage2Output } from '../stage2/route';
import type { Stage1Input } from '@/features/location/utils/stagedGenerationData';

export const maxDuration = 90;

// Input type for Stage 3
interface Stage3Input {
  locationSummary: Stage1Output;
  scenarioAnalysis: Stage2Output;
  environmental?: Stage1Input['environmental'];
  amenityGaps: string[];
  missingAmenities: string[];
  targetPersonas: string[];
}

// Output schema for Stage 3
const BuildingConstraintSchema = z.object({
  category: z.enum(['noise', 'air_quality', 'climate', 'green_space', 'amenity_gap']).describe('Category of the constraint'),
  severity: z.enum(['critical', 'important', 'recommended']).describe('How urgent this constraint is'),
  constraint: z.string().describe('Description of the constraint'),
  designImplication: z.string().describe('What this means for building design'),
  affectedAreas: z.array(z.string()).describe('Which building areas are affected (e.g., facades, ventilation, outdoor_spaces)'),
});

const AmenityOpportunitySchema = z.object({
  type: z.string().describe('Type of amenity that could be included in the building'),
  rationale: z.string().describe('Why this amenity should be included based on gaps'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level'),
  suggestedSize: z.string().describe('Suggested size range (e.g., "50-100m²")'),
});

const DesignRecommendationsSchema = z.object({
  facade: z.array(z.string()).describe('Recommendations for facade design'),
  ventilation: z.array(z.string()).describe('Recommendations for ventilation systems'),
  acoustics: z.array(z.string()).describe('Recommendations for acoustic insulation'),
  outdoor_spaces: z.array(z.string()).describe('Recommendations for outdoor/communal spaces'),
  green_integration: z.array(z.string()).describe('Recommendations for integrating greenery'),
  climate_adaptation: z.array(z.string()).describe('Recommendations for climate adaptation'),
});

const Stage3OutputSchema = z.object({
  constraints: z.array(BuildingConstraintSchema).describe('Building design constraints derived from environmental analysis'),
  designRecommendations: DesignRecommendationsSchema.describe('Categorized design recommendations'),
  amenityOpportunities: z.array(AmenityOpportunitySchema).describe('Amenities the building could provide to fill local gaps'),
  constraintsSummary: z.string().describe('Summary of key constraints for the rapport (2-3 sentences)'),
  opportunitiesSummary: z.string().describe('Summary of key opportunities for the rapport (2-3 sentences)'),
});

export type Stage3Output = z.infer<typeof Stage3OutputSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stageData, locale = 'nl' } = body as { stageData: Stage3Input; locale: 'nl' | 'en' };

    if (!stageData || !stageData.locationSummary || !stageData.scenarioAnalysis) {
      return new Response(
        JSON.stringify({ error: 'Stage 3 data with Stage 1+2 outputs is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build environmental section for prompt
    const envSection = stageData.environmental ? `
# OMGEVINGSDATA
## Luchtkwaliteit
${stageData.environmental.airQuality.summary}
${stageData.environmental.airQuality.no2 ? `- NO2: ${stageData.environmental.airQuality.no2.pointValue} µg/m³` : ''}
${stageData.environmental.airQuality.pm10 ? `- PM10: ${stageData.environmental.airQuality.pm10.pointValue} µg/m³` : ''}

## Geluid
${stageData.environmental.noise.summary}
${stageData.environmental.noise.roadTraffic ? `- Wegverkeer: ${stageData.environmental.noise.roadTraffic.pointValue} dB` : ''}

## Groen
${stageData.environmental.greenSpace.summary}
${stageData.environmental.greenSpace.trees ? `- Boombedekking: ${stageData.environmental.greenSpace.trees.pointValue}%` : ''}

## Klimaat
${stageData.environmental.climate.summary}
${stageData.environmental.climate.heatStress ? `- Hittestress: ${stageData.environmental.climate.heatStress.averageValue}` : ''}

## Algemene beoordeling
${stageData.environmental.overallAssessment}
` : '# OMGEVINGSDATA\nGeen WMS data beschikbaar - baseer aanbevelingen op locatieanalyse.';

    const prompt = locale === 'nl' ? `
Je bent een bouwkundig adviseur gespecialiseerd in duurzaam en klimaatadaptief ontwerp. Analyseer de omgevingsdata en voorzieningengaps om ontwerpbeperkingen en kansen te identificeren.

# LOCATIESAMENVATTING
${stageData.locationSummary.location_summary}

## Omgevings-highlights
${stageData.locationSummary.environmental_highlights || 'Geen specifieke highlights'}

## Cross-correlaties
${stageData.locationSummary.cross_correlations?.join('\n') || 'Geen'}

${envSection}

# ONTBREKENDE VOORZIENINGEN
${stageData.missingAmenities.length > 0 ? stageData.missingAmenities.join(', ') : 'Geen ontbrekende voorzieningen'}

# VOORZIENINGEN KNELPUNTEN
${stageData.amenityGaps.length > 0 ? stageData.amenityGaps.join('\n') : 'Geen significante knelpunten'}

# DOELGROEPEN
${stageData.targetPersonas.join(', ')}

# BOUWKUNDIGE RICHTLIJNEN
## Geluidsisolatie (Bouwbesluit)
- <50 dB: Standaard isolatie voldoende
- 50-60 dB: Verhoogde geluidsisolatie aanbevolen
- 60-70 dB: Extra geluidsisolatie vereist (GA 30-35 dB)
- >70 dB: Maximale geluidsisolatie + dove gevels overwegen

## Luchtkwaliteit (WHO richtlijnen)
- NO2 <25 µg/m³: Standaard ventilatie
- NO2 25-40 µg/m³: Mechanische ventilatie met filtratie aanbevolen
- NO2 >40 µg/m³: Geavanceerde luchtfiltratie vereist

## Hittestress
- Index <0.4: Standaard zonwering
- Index 0.4-0.7: Extra zonwering + groene gevels aanbevolen
- Index >0.7: Koeling, schaduwstructuren en groene daken essentieel

## Groencompensatie
- <15% boombedekking: Groene daken, binnentuinen en gevelgroen aanbevolen
- 15-30%: Groene elementen gewenst maar niet kritiek
- >30%: Voldoende groen in omgeving

# OPDRACHT
Lever:
1. BEPERKINGEN: Identificeer alle ontwerpbeperkingen op basis van omgevingsdata
   - Categoriseer als: noise, air_quality, climate, green_space, amenity_gap
   - Geef ernst aan: critical (moet), important (moet eigenlijk), recommended (nice to have)
   - Beschrijf de ontwerpimplicatie en getroffen gebieden

2. ONTWERPAANBEVELINGEN: Geef concrete aanbevelingen per categorie:
   - Gevel: materiaal, orientatie, openingen
   - Ventilatie: type systeem, filtratie
   - Akoestiek: isolatie, dove gevels, buffers
   - Buitenruimtes: orientatie, beschutting, groen
   - Groenintegratie: daken, gevels, binnentuinen
   - Klimaatadaptatie: zonwering, koeling, waterberging

3. VOORZIENINGEN KANSEN: Welke voorzieningen kan het gebouw bieden om lokale gaps te vullen?
   - Prioriteit hoog: essentiële voorzieningen die ontbreken
   - Prioriteit medium: wenselijke voorzieningen
   - Prioriteit laag: extra comfort

4. SAMENVATTINGEN: Korte samenvattingen (2-3 zinnen) voor het rapport
` : `
You are a building consultant specialized in sustainable and climate-adaptive design. Analyze the environmental data and amenity gaps to identify design constraints and opportunities.

# LOCATION SUMMARY
${stageData.locationSummary.location_summary}

## Environmental highlights
${stageData.locationSummary.environmental_highlights || 'No specific highlights'}

## Cross-correlations
${stageData.locationSummary.cross_correlations?.join('\n') || 'None'}

${envSection}

# MISSING AMENITIES
${stageData.missingAmenities.length > 0 ? stageData.missingAmenities.join(', ') : 'No missing amenities'}

# AMENITY GAPS
${stageData.amenityGaps.length > 0 ? stageData.amenityGaps.join('\n') : 'No significant gaps'}

# TARGET GROUPS
${stageData.targetPersonas.join(', ')}

# BUILDING GUIDELINES
## Sound Insulation
- <50 dB: Standard insulation sufficient
- 50-60 dB: Enhanced sound insulation recommended
- 60-70 dB: Extra sound insulation required
- >70 dB: Maximum sound insulation + consider deaf facades

## Air Quality (WHO guidelines)
- NO2 <25 µg/m³: Standard ventilation
- NO2 25-40 µg/m³: Mechanical ventilation with filtration recommended
- NO2 >40 µg/m³: Advanced air filtration required

## Heat Stress
- Index <0.4: Standard sun shading
- Index 0.4-0.7: Extra shading + green facades recommended
- Index >0.7: Cooling, shade structures and green roofs essential

## Green Compensation
- <15% tree coverage: Green roofs, courtyards and facade greenery recommended
- 15-30%: Green elements desired but not critical
- >30%: Sufficient green in surroundings

# TASK
Provide:
1. CONSTRAINTS: Identify all design constraints based on environmental data
   - Categorize as: noise, air_quality, climate, green_space, amenity_gap
   - Indicate severity: critical (must), important (should), recommended (nice to have)
   - Describe design implication and affected areas

2. DESIGN RECOMMENDATIONS: Give concrete recommendations per category:
   - Facade: material, orientation, openings
   - Ventilation: system type, filtration
   - Acoustics: insulation, deaf facades, buffers
   - Outdoor spaces: orientation, shelter, greenery
   - Green integration: roofs, facades, courtyards
   - Climate adaptation: sun shading, cooling, water retention

3. AMENITY OPPORTUNITIES: What amenities can the building provide to fill local gaps?
   - High priority: essential missing amenities
   - Medium priority: desirable amenities
   - Low priority: extra comfort

4. SUMMARIES: Brief summaries (2-3 sentences) for the report
`;

    const result = await streamObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: Stage3OutputSchema,
      schemaName: 'Stage3BuildingConstraints',
      schemaDescription: locale === 'nl'
        ? 'Bouwkundige beperkingen en ontwerpkansen gebaseerd op omgevingsanalyse'
        : 'Building constraints and design opportunities based on environmental analysis',
      prompt,
      temperature: 0.5, // Lower for more consistent technical recommendations
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
    console.error('Stage 3 (Constraints) error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate building constraints',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
