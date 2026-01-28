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

// Output schema for Stage 1 (Enhanced with detailed descriptions per Anthropic best practices)
const Stage1OutputSchema = z.object({
  location_summary: z.string().describe(
    'Comprehensive 2-3 paragraph summary of the location. Start with the overall character (urban/suburban, residential/mixed). ' +
    'Include key strengths (e.g., "excellent transit access", "low crime"). Address concerns (e.g., "elevated noise from nearby highway"). ' +
    'End with implications for residential development. Be specific - cite actual values when available.'
  ),
  key_location_insights: z.array(z.string()).describe(
    '5-7 actionable insights for building program decisions. Each insight should be specific and data-backed. ' +
    'Good: "NO2 at 32µg/m³ exceeds WHO guideline (25µg/m³) - recommend mechanical ventilation with filtration". ' +
    'Bad: "Air quality could be better". Format: "[Category] Specific finding - implication".'
  ),
  health_highlights: z.string().describe(
    '2-3 sentences on health indicators. Compare neighborhood to municipality averages. ' +
    'Flag any values significantly above average. Note implications for target demographics (e.g., "elevated asthma reports suggest families with children may need air filtration").'
  ),
  safety_highlights: z.string().describe(
    '2-3 sentences on safety. Include crime rates if available, feeling of safety score, street lighting quality. ' +
    'Compare to municipality. Note which demographics this affects most (seniors sensitive to safety).'
  ),
  livability_highlights: z.string().describe(
    '2-3 sentences on livability factors: social cohesion, public space maintenance, youth/senior facilities. ' +
    'Note strong points and gaps. Mention implications for building amenities (e.g., "low youth facilities score suggests building could include community spaces").'
  ),
  environmental_highlights: z.string().describe(
    '3-4 sentences covering: air quality (NO2, PM10 vs WHO guidelines), noise (dB vs Bouwbesluit thresholds), ' +
    'green coverage (% trees vs 15% minimum), heat stress index. ALWAYS include specific measurements when available. ' +
    'End with design implications (e.g., "noise of 62dB requires enhanced sound insulation (GA 30-35dB)").'
  ),
  amenity_analysis: z.string().describe(
    '3-4 sentences on amenities. List what is well-served (<500m): supermarket, transit, etc. ' +
    'List critical gaps: what essential amenities are missing or far (>1km). ' +
    'End with what the building should provide to fill gaps (e.g., "missing pharmacy within 1km suggests ground-floor healthcare space").'
  ),
  cross_correlations: z.array(z.string()).describe(
    '3-5 insights connecting multiple datasets. Pattern: "[Data A] + [Data B] → [Conclusion/Implication]". ' +
    'Example: "High stress reports (12%) + noise 58dB + low green (8%) → environmental factors may compound health issues, prioritize green courtyard and sound insulation". ' +
    'Look for: health+environment correlations, safety+livability patterns, amenity+demographic mismatches.'
  ),
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

    // Helper to format a single metric with comparison
    const formatMetric = (name: string, metric: { description: string; neighborhood: string; municipality: string; national?: string }) => {
      const buurtVal = parseFloat(metric.neighborhood) || 0;
      const gemVal = parseFloat(metric.municipality) || 0;
      const comparison = buurtVal > gemVal ? '↑ hoger dan gemeente' : buurtVal < gemVal ? '↓ lager dan gemeente' : '= gelijk aan gemeente';
      return `- ${name}: Buurt ${metric.neighborhood}, Gemeente ${metric.municipality} (${comparison})`;
    };

    // Helper to format an array of CompactMetric
    const formatMetricArray = (metrics: Array<{ name: string; description: string; neighborhood: string; municipality: string; national?: string }>) => {
      return metrics.map(m => {
        const buurtVal = parseFloat(m.neighborhood) || 0;
        const gemVal = parseFloat(m.municipality) || 0;
        const comparison = buurtVal > gemVal ? '↑ hoger dan gemeente' : buurtVal < gemVal ? '↓ lager dan gemeente' : '= gelijk aan gemeente';
        return `- ${m.name}: Buurt ${m.neighborhood}, Gemeente ${m.municipality} (${comparison})`;
      }).join('\n');
    };

    // Format health data with context
    const formatHealthData = (health: typeof stageData.health) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${health.description}`);
      lines.push('## Indicatoren (hoger % = meer rapporteren probleem, referentie is nationaal gemiddelde):');

      // Single value metrics
      lines.push(formatMetric('Ervaren gezondheid', health.experiencedHealth));
      lines.push(formatMetric('Wekelijks sporten', health.sports));
      lines.push(formatMetric('Roker', health.smoker));
      lines.push(formatMetric('Beperkt door gezondheid', health.limitedHealth));
      lines.push(formatMetric('Mist emotionele steun', health.emotionalSupport));

      // Array metrics
      lines.push('### Gewicht');
      lines.push(formatMetricArray(health.weight));
      lines.push('### Alcohol');
      lines.push(formatMetricArray(health.alcohol));
      lines.push('### Eenzaamheid');
      lines.push(formatMetricArray(health.loneliness));
      lines.push('### Psychologische gezondheid');
      lines.push(formatMetricArray(health.psychologicalHealth));

      return lines.join('\n');
    };

    // Format safety data with context
    const formatSafetyData = (safety: typeof stageData.safety) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${safety.description}`);
      lines.push('## Indicatoren (lagere criminaliteit = beter, hoger veiligheidsgevoel = beter):');

      // All safety metrics are single values
      lines.push(formatMetric('Totaal misdrijven (per 1000 inwoners)', safety.totalCrimes));
      lines.push(formatMetric('Woninginbraken (per 1000 woningen)', safety.burglary));
      lines.push(formatMetric('Zakkenrollerij (per 1000 inwoners)', safety.pickpocketing));
      lines.push(formatMetric('Verkeersongevallen (per 1000 inwoners)', safety.accidents));
      lines.push(formatMetric('Voelt zich onveilig', safety.feelsUnsafe));
      lines.push(formatMetric('Straatverlichting (schaal 1-10)', safety.streetLighting));

      return lines.join('\n');
    };

    // Format livability data with context
    const formatLivabilityData = (livability: typeof stageData.livability) => {
      const lines: string[] = [];
      lines.push(`Beschrijving: ${livability.description}`);
      lines.push('## Indicatoren (hogere scores = betere leefbaarheid):');

      // Array metrics
      lines.push('### Onderhoud');
      lines.push(formatMetricArray(livability.maintenance));
      lines.push('### Jongerenvoorzieningen');
      lines.push(formatMetricArray(livability.youthFacilities));
      lines.push('### Sociale contacten');
      lines.push(formatMetricArray(livability.contact));

      // Single value metrics
      lines.push('### Overige indicatoren');
      lines.push(formatMetric('Straatverlichting (schaal 1-10)', livability.streetLighting));
      lines.push(formatMetric('Vrijwilligerswerk', livability.volunteers));
      lines.push(formatMetric('Sociale cohesie (schaal 0-100)', livability.socialCohesion));
      lines.push(formatMetric('Leefbaarheid rapportcijfer (schaal 1-10)', livability.livabilityScore));

      return lines.join('\n');
    };

    const prompt = locale === 'nl' ? `
Je bent een ervaren stedenbouwkundige adviseur die een collega-ontwikkelaar informeert over een locatie. Schrijf alsof je de locatie zelf hebt bezocht en je bevindingen deelt.

# SCHRIJFSTIJL - KRITISCH
Schrijf natuurlijk en direct, zoals een professional tegen een collega praat. Vermijd typisch AI-taalgebruik:

VERBODEN WOORDEN (gebruik deze NOOIT):
- "Cruciaal", "essentieel", "van vitaal belang", "onmisbaar"
- "Bovendien", "daarnaast", "tevens", "voorts"
- "Een rijke tapijt", "een bruisend", "levendig"
- "Verkennen", "duiken in", "ontdekken"
- "Landschap" (als metafoor), "domein", "rijk"
- "Robuust", "uitgebreid", "alomvattend"
- "Optimaliseren", "faciliteren", "implementeren"
- "Het is belangrijk op te merken dat..."
- "In de context van...", "met betrekking tot..."

GEWENSTE STIJL:
- Kort en bondig. Geen omhaal, direct ter zake.
- Wissel korte zinnen af met langere. "Geluidsniveau: 62dB. Dat is fors. Bewoners aan de straatzijde zullen dit merken, vooral 's nachts."
- Gebruik concrete getallen, geen vage termen als "aanzienlijk" of "substantieel"
- Geef je mening waar relevant: "Dit vind ik zorgelijk" of "Hier zie ik kansen"
- Schrijf alsof je het aan iemand uitlegt bij de koffieautomaat

VOORBEELDEN GOEDE STIJL:
✓ "De luchtkwaliteit valt tegen. NO2 zit op 28 µg/m³, ruim boven de WHO-norm van 25."
✓ "Supermarkt op 180 meter, huisarts op 400 meter - prima voor dagelijkse boodschappen."
✓ "Let op: 38% alleenstaanden in de buurt. Dat vraagt om compactere woningen."
✗ "Het is cruciaal om op te merken dat de luchtkwaliteit aanzienlijke uitdagingen met zich meebrengt."
✗ "De buurt biedt een rijke tapijt van voorzieningen die de leefbaarheid faciliteren."

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
1. Een locatiesamenvatting (2-3 alinea's) - beschrijf de plek alsof je er net bent geweest
2. 5-7 kernpunten voor vastgoedontwikkeling - concreet en actionable
3. Gezondheids-highlights: wat valt op, goed én slecht
4. Veiligheids-highlights: criminaliteit, veiligheidsgevoel, straatverlichting
5. Leefbaarheids-highlights: sociale cohesie, onderhoud, voorzieningen
6. Omgevings-highlights: lucht, geluid, groen, klimaat - noem de getallen
7. Voorzieningen-analyse: wat is dichtbij, wat ontbreekt, wat betekent dat voor bewoners
8. 3-5 cross-correlaties: verbanden die iets opleveren

## VOORBEELD CROSS-CORRELATIES:
- "Stress 12% (↑ gemeente) + geluid 58dB + groen 8% → de omgeving werkt niet mee aan de gezondheid. Prioriteit: groene binnentuin en goede geluidsisolatie"
- "Geen huisarts binnen 1km + 15% ouderen → overweeg medische ruimte op de begane grond"
- "Veiligheid 7.8 + OV op 200m → prima voor jonge gezinnen en starters"

## KWALITEITSCRITERIA
✓ Concrete getallen, geen vage bewoordingen
✓ Vergelijk met gemeente/landelijk waar relevant
✓ Cross-correlaties combineren minimaal 2 bronnen
✓ Eindig met wat het gebouw moet doen

Wees eerlijk over zowel pluspunten als minpunten. Een te positief verhaal is niet geloofwaardig.
` : `
You are an experienced urban planning advisor briefing a fellow developer about a location. Write as if you've visited the site yourself and are sharing your findings.

# WRITING STYLE - CRITICAL
Write naturally and directly, like a professional talking to a colleague. Avoid typical AI language:

BANNED WORDS (NEVER use these):
- "Crucial", "essential", "vital", "paramount"
- "Furthermore", "moreover", "additionally"
- "Rich tapestry", "vibrant", "bustling"
- "Delve", "dive into", "explore", "unpack"
- "Landscape" (as metaphor), "realm", "sphere"
- "Robust", "comprehensive", "holistic"
- "Optimize", "facilitate", "leverage", "utilize"
- "It's important to note that..."
- "In the context of...", "with regards to..."

DESIRED STYLE:
- Short and punchy. No fluff, get to the point.
- Mix short sentences with longer ones. "Noise level: 62dB. That's high. Street-side residents will notice, especially at night."
- Use concrete numbers, not vague terms like "significant" or "substantial"
- Share your opinion where relevant: "I find this concerning" or "I see opportunity here"
- Write as if explaining to someone at the coffee machine

GOOD STYLE EXAMPLES:
✓ "Air quality is disappointing. NO2 at 28 µg/m³, well above WHO guideline of 25."
✓ "Supermarket 180m away, GP at 400m - fine for daily needs."
✓ "Note: 38% single-person households nearby. That calls for more compact units."
✗ "It is crucial to note that air quality presents significant challenges."
✗ "The neighborhood offers a rich tapestry of amenities that facilitate livability."

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
1. A location summary (2-3 paragraphs) - describe the place as if you've just been there
2. 5-7 key points for real estate development - concrete and actionable
3. Health highlights: what stands out, good and bad
4. Safety highlights: crime, sense of safety, street lighting
5. Livability highlights: social cohesion, maintenance, facilities
6. Environmental highlights: air, noise, green, climate - include the numbers
7. Amenities analysis: what's nearby, what's missing, what that means for residents
8. 3-5 cross-correlations: connections that matter

## EXAMPLE CROSS-CORRELATIONS:
- "Stress 12% (↑ municipality) + noise 58dB + green 8% → environment doesn't help health. Priority: green courtyard and sound insulation"
- "No GP within 1km + 15% seniors → consider medical space on ground floor"
- "Safety 7.8 + transit at 200m → works well for young families and starters"

## QUALITY CRITERIA
✓ Concrete numbers, no vague wording
✓ Compare to municipal/national averages where relevant
✓ Cross-correlations combine at least 2 sources
✓ End with what the building should do

Be honest about both pros and cons. An overly positive story isn't credible.
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
