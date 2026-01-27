/**
 * Stage 2: Persona & Scenario Analysis
 *
 * Input: Stage 1 output + demographics + personas + housing market
 * Output: scenario recommendations, target personas, residential strategy
 *
 * Token usage: ~8KB input + 500 token summary → ~2KB output
 * Purpose: Generate persona-specific analysis and scenario text
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import type { Stage1Output } from '../stage1/route';

export const maxDuration = 120; // Stage 2 needs more time for multiple scenarios

// Input type for Stage 2
interface Stage2Input {
  locationSummary: Stage1Output;
  demographics: {
    description: string;
    age: Array<{ name: string; description: string; neighborhood: string; municipality: string; national?: string }>;
    status: Array<{ name: string; description: string; neighborhood: string; municipality: string; national?: string }>;
    familySize: { description: string; neighborhood: string; municipality: string; national?: string };
    familyType: Array<{ name: string; description: string; neighborhood: string; municipality: string; national?: string }>;
    income: { description: string; neighborhood: string; municipality: string; national?: string };
  };
  targetGroups: {
    topPersonas: Array<{
      name: string;
      rank: number;
      score: number;
      incomeLevel: string;
      householdType: string;
      ageGroup: string;
      description: string;
    }>;
    recommendedScenarios: Array<{
      name: string;
      personaNames: string[];
      avgScore: number;
    }>;
  };
  housingMarket?: {
    avgPrice: number;
    avgSize: number;
    typeDistribution: Array<{ type: string; percentage: number }>;
    priceDistribution: Array<{ range: string; percentage: number }>;
  };
}

// Output schema for Stage 2
const ScenarioAnalysisSchema = z.object({
  scenario_name: z.string().describe('Name of the scenario (Scenario 1, Scenario 2, etc.)'),
  scenario_simple_name: z.string().describe('Short, catchy name based on target personas (e.g., "Young Starters Hub", "Family Focus")'),
  target_personas: z.array(z.string()).describe('List of persona names this scenario targets'),
  summary: z.string().describe('High-level strategy summary explaining the vision for this scenario (2-3 paragraphs)'),
  residential_strategy: z.string().describe('Strategy for residential units: what types of housing, what sizes, what price ranges based on the target personas'),
  demographics_considerations: z.string().describe('How local demographics (age distribution, family types, income levels) influence the housing choices'),
  key_insights: z.array(z.string()).describe('3-5 key insights about how the location data influenced this scenario'),
});

const Stage2OutputSchema = z.object({
  scenarios: z.array(ScenarioAnalysisSchema).describe('Analysis for each scenario (3 automatic + optional custom)'),
});

export type Stage2Output = z.infer<typeof Stage2OutputSchema>;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stageData, locale = 'nl' } = body as { stageData: Stage2Input; locale: 'nl' | 'en' };

    if (!stageData || !stageData.locationSummary) {
      return new Response(
        JSON.stringify({ error: 'Stage 2 data with Stage 1 output is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = locale === 'nl' ? `
Je bent een expert in vastgoedontwikkeling en doelgroepanalyse. Op basis van de locatieanalyse en demografische gegevens, ontwikkel je gedetailleerde scenario's voor een nieuw woongebouw.

# LOCATIEANALYSE (uit eerdere analyse)
${stageData.locationSummary.location_summary}

## Belangrijkste inzichten
${stageData.locationSummary.key_location_insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

## Gezondheid
${stageData.locationSummary.health_highlights}

## Veiligheid
${stageData.locationSummary.safety_highlights}

## Leefbaarheid
${stageData.locationSummary.livability_highlights}

# DEMOGRAFISCHE GEGEVENS
${stageData.demographics.description}

## Leeftijdsverdeling
${stageData.demographics.age.map(a => `- ${a.name}: Buurt ${a.neighborhood}, Gemeente ${a.municipality}`).join('\n')}

## Huishoudsamenstelling
${stageData.demographics.familyType.map(f => `- ${f.name}: Buurt ${f.neighborhood}, Gemeente ${f.municipality}`).join('\n')}

## Inkomen
Gemiddeld inkomen: Buurt ${stageData.demographics.income.neighborhood}, Gemeente ${stageData.demographics.income.municipality}

# TOP GESCHIKTE PERSONA'S (gerangschikt op geschiktheid)
${stageData.targetGroups.topPersonas.map(p => `
${p.rank}. ${p.name} (Score: ${p.score})
   - Inkomen: ${p.incomeLevel}
   - Huishouden: ${p.householdType}
   - Leeftijd: ${p.ageGroup}
   - ${p.description}
`).join('\n')}

# SCENARIO'S OM TE ANALYSEREN
${stageData.targetGroups.recommendedScenarios.map((s, i) => `
Scenario ${i + 1}: ${s.name}
Doelgroepen: ${s.personaNames.join(', ')}
Gemiddelde score: ${s.avgScore}
`).join('\n')}

${stageData.housingMarket ? `
# WONINGMARKT CONTEXT
- Gemiddelde prijs: €${stageData.housingMarket.avgPrice.toLocaleString()}
- Gemiddelde grootte: ${stageData.housingMarket.avgSize} m²
- Woningtypen: ${stageData.housingMarket.typeDistribution.map(t => `${t.type} (${t.percentage}%)`).join(', ')}
- Prijsklassen: ${stageData.housingMarket.priceDistribution.map(p => `${p.range} (${p.percentage}%)`).join(', ')}
` : ''}

# OPDRACHT
Voor ELK scenario, ontwikkel:
1. Een korte, pakkende naam (bijv. "Jonge Starters Hub", "Familie Focus")
2. Een strategische samenvatting (2-3 paragrafen) die de visie beschrijft
3. Een woonstrategie: welke woningtypen, groottes, prijsklassen passen bij de doelgroepen
4. Demografische overwegingen: hoe beïnvloeden lokale demografie de keuzes
5. 3-5 kernpunten over hoe de locatiegegevens dit scenario beïnvloeden

Wees specifiek en data-gedreven. Verwijs naar de locatieanalyse en persona-kenmerken.
` : `
You are an expert in real estate development and target group analysis. Based on the location analysis and demographic data, develop detailed scenarios for a new residential building.

# LOCATION ANALYSIS (from previous analysis)
${stageData.locationSummary.location_summary}

## Key Insights
${stageData.locationSummary.key_location_insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

## Health
${stageData.locationSummary.health_highlights}

## Safety
${stageData.locationSummary.safety_highlights}

## Livability
${stageData.locationSummary.livability_highlights}

# DEMOGRAPHIC DATA
${stageData.demographics.description}

## Age Distribution
${stageData.demographics.age.map(a => `- ${a.name}: Neighborhood ${a.neighborhood}, Municipality ${a.municipality}`).join('\n')}

## Household Composition
${stageData.demographics.familyType.map(f => `- ${f.name}: Neighborhood ${f.neighborhood}, Municipality ${f.municipality}`).join('\n')}

## Income
Average income: Neighborhood ${stageData.demographics.income.neighborhood}, Municipality ${stageData.demographics.income.municipality}

# TOP SUITABLE PERSONAS (ranked by suitability)
${stageData.targetGroups.topPersonas.map(p => `
${p.rank}. ${p.name} (Score: ${p.score})
   - Income: ${p.incomeLevel}
   - Household: ${p.householdType}
   - Age: ${p.ageGroup}
   - ${p.description}
`).join('\n')}

# SCENARIOS TO ANALYZE
${stageData.targetGroups.recommendedScenarios.map((s, i) => `
Scenario ${i + 1}: ${s.name}
Target groups: ${s.personaNames.join(', ')}
Average score: ${s.avgScore}
`).join('\n')}

${stageData.housingMarket ? `
# HOUSING MARKET CONTEXT
- Average price: €${stageData.housingMarket.avgPrice.toLocaleString()}
- Average size: ${stageData.housingMarket.avgSize} m²
- Housing types: ${stageData.housingMarket.typeDistribution.map(t => `${t.type} (${t.percentage}%)`).join(', ')}
- Price ranges: ${stageData.housingMarket.priceDistribution.map(p => `${p.range} (${p.percentage}%)`).join(', ')}
` : ''}

# TASK
For EACH scenario, develop:
1. A short, catchy name (e.g., "Young Starters Hub", "Family Focus")
2. A strategic summary (2-3 paragraphs) describing the vision
3. A residential strategy: what housing types, sizes, price ranges fit the target groups
4. Demographic considerations: how local demographics influence choices
5. 3-5 key insights about how location data influences this scenario

Be specific and data-driven. Reference the location analysis and persona characteristics.
`;

    const result = await streamObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: Stage2OutputSchema,
      schemaName: 'Stage2PersonaAnalysis',
      schemaDescription: locale === 'nl'
        ? 'Persona- en scenarioanalyse voor vastgoedontwikkeling'
        : 'Persona and scenario analysis for real estate development',
      prompt,
      temperature: 0.6,
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
    console.error('Stage 2 error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate persona analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
