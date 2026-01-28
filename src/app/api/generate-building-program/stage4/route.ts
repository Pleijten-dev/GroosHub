/**
 * Stage 4: PVE & Spaces Allocation (Constraint-Aware)
 *
 * Input: Stage 1+2+3 outputs + PVE + communalSpaces + publicSpaces + typologies
 * Output: Detailed building program for each scenario with design notes
 *
 * Token usage: ~30KB input + 4KB summaries → ~18KB output
 * Purpose: Generate detailed PVE allocations informed by building constraints from Stage 3
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import housingTypologies from '@/features/location/data/sources/housing-typologies.json';
import buildingAmenities from '@/features/location/data/sources/building-amenities.json';
import communalSpacesData from '@/features/location/data/sources/communal-spaces.json';
import publicSpacesData from '@/features/location/data/sources/public-spaces.json';
import propertyTypeMapping from '@/features/location/data/sources/property-type-mapping.json';
import type { Stage1Output } from '../stage1/route';
import type { Stage2Output } from '../stage2/route';

export const maxDuration = 300; // Stage 3 needs full time for detailed generation

// ============================================================================
// DATA SIMPLIFICATION
// ============================================================================

interface SimplifiedSpace {
  id: string;
  name: string;
  description: string;
  category: string;
  area_min_m2: number;
  area_max_m2: number;
  m2_per_resident?: number;
  target_groups: string[];
}

interface SimplifiedTypology {
  id: string;
  name: string;
  description: string;
  size_m2: number;
  rooms: number;
  suitable_for: string[];
}

interface SimplifiedAmenity {
  id: string;
  name: string;
  description: string;
  category: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simplifySpaces(spaces: any[], locale: 'nl' | 'en'): SimplifiedSpace[] {
  return spaces.map(space => ({
    id: space.id,
    name: locale === 'nl' ? space.name_nl : space.name_en,
    description: locale === 'nl' ? space.description_nl : space.description_en,
    category: space.category,
    area_min_m2: space.area_min_m2,
    area_max_m2: space.area_max_m2,
    m2_per_resident: space.m2_per_resident,
    target_groups: space.target_groups || [],
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simplifyTypologies(typologies: any[], locale: 'nl' | 'en'): SimplifiedTypology[] {
  return typologies.map(typology => ({
    id: typology.id,
    name: locale === 'nl' ? typology.name_nl : typology.name_en,
    description: locale === 'nl' ? typology.description_nl : typology.description_en,
    size_m2: typology.size_m2,
    rooms: typology.rooms,
    suitable_for: typology.suitable_for || [],
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function simplifyAmenities(amenities: any[], locale: 'nl' | 'en'): SimplifiedAmenity[] {
  return amenities.map(amenity => ({
    id: amenity.id,
    name: locale === 'nl' ? amenity.name_nl : amenity.name_en,
    description: locale === 'nl' ? amenity.description_nl : amenity.description_en,
    category: amenity.category,
  }));
}

function filterSpacesByTargetGroups(
  spaces: SimplifiedSpace[],
  scenarioPersonaNames: string[]
): SimplifiedSpace[] {
  const targetGroups = new Set<string>();

  scenarioPersonaNames.forEach(name => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('starter') || lowerName.includes('jong')) {
      targetGroups.add('starters');
      targetGroups.add('jonge_professionals');
    }
    if (lowerName.includes('gezin') || lowerName.includes('familie') || lowerName.includes('family')) {
      targetGroups.add('gezinnen');
    }
    if (lowerName.includes('senior') || lowerName.includes('oudere')) {
      targetGroups.add('senioren');
    }
    if (lowerName.includes('student')) {
      targetGroups.add('studenten');
    }
    if (lowerName.includes('professional')) {
      targetGroups.add('jonge_professionals');
    }
  });

  if (targetGroups.size === 0) return spaces;

  return spaces.filter(space => {
    const matchesGroup = space.target_groups.some(tg => targetGroups.has(tg));
    const isUniversal = space.target_groups.includes('alle') || space.target_groups.includes('all');
    return matchesGroup || isUniversal;
  });
}

// ============================================================================
// SCHEMAS
// ============================================================================

const UnitMixItemSchema = z.object({
  typology_id: z.string().describe('ID of the housing typology'),
  typology_name: z.string().describe('Name of the housing typology'),
  quantity: z.number().describe('Number of units'),
  total_m2: z.number().describe('Total square meters'),
  rationale: z.string().describe('Why this unit type was chosen'),
});

const AmenityItemSchema = z.object({
  amenity_id: z.string().describe('ID of the amenity/space'),
  amenity_name: z.string().describe('Name of the amenity/space'),
  size_m2: z.number().describe('Allocated square meters'),
  rationale: z.string().describe('Why this was selected'),
});

const CommercialSpaceSchema = z.object({
  type: z.string().describe('Type of commercial space'),
  size_m2: z.number().describe('Size in square meters'),
  rationale: z.string().describe('Explanation'),
});

const CategoryBreakdownSchema = z.record(z.string(), z.object({
  total_m2: z.number(),
  percentage: z.number(),
}));

const ScenarioPVESchema = z.object({
  scenario_name: z.string(),
  residential: z.object({
    total_m2: z.number(),
    unit_mix: z.array(UnitMixItemSchema),
    total_units: z.number(),
  }),
  commercial: z.object({
    total_m2: z.number(),
    spaces: z.array(CommercialSpaceSchema),
    local_amenities_analysis: z.string(),
  }),
  hospitality: z.object({
    total_m2: z.number(),
    concept: z.string(),
  }),
  social: z.object({
    total_m2: z.number(),
    facilities: z.array(z.object({
      type: z.string(),
      size_m2: z.number(),
      rationale: z.string(),
    })),
  }),
  communal: z.object({
    total_m2: z.number(),
    amenities: z.array(AmenityItemSchema),
    persona_needs_analysis: z.string(),
  }),
  communal_spaces: z.object({
    total_m2: z.number(),
    spaces: z.array(AmenityItemSchema),
    category_breakdown: CategoryBreakdownSchema,
  }),
  public_spaces: z.object({
    total_m2: z.number(),
    spaces: z.array(AmenityItemSchema),
    category_breakdown: CategoryBreakdownSchema,
  }),
  offices: z.object({
    total_m2: z.number(),
    concept: z.string(),
  }),
  // Design notes based on building constraints from Stage 3
  design_notes: z.object({
    noise_mitigation: z.string().describe('How the design addresses noise constraints'),
    climate_adaptation: z.string().describe('How the design addresses climate/heat stress'),
    green_integration: z.string().describe('How greenery is integrated to compensate for environmental gaps'),
  }).describe('Design considerations based on building constraints'),
});

const Stage4OutputSchema = z.object({
  scenarios: z.array(ScenarioPVESchema),
  generalized_pve: z.object({
    communal_categories: z.record(z.string(), z.object({
      category_name: z.string(),
      total_m2: z.number(),
      amenities: z.array(z.string()),
    })),
    public_categories: z.record(z.string(), z.object({
      category_name: z.string(),
      total_m2: z.number(),
      amenities: z.array(z.string()),
    })),
  }),
  comparative_analysis: z.string().describe('Comparison of scenarios and recommendations'),
});

export type Stage4Output = z.infer<typeof Stage4OutputSchema>;

// ============================================================================
// INPUT TYPE
// ============================================================================

interface PVEData {
  totalM2: number;
  percentages: {
    apartments: { percentage: number; m2: number };
    commercial: { percentage: number; m2: number };
    hospitality: { percentage: number; m2: number };
    social: { percentage: number; m2: number };
    communal: { percentage: number; m2: number };
    offices: { percentage: number; m2: number };
  };
}

// Building constraints from Stage 3
interface BuildingConstraints {
  constraints: Array<{
    category: string;
    severity: string;
    constraint: string;
    designImplication: string;
    affectedAreas: string[];
  }>;
  designRecommendations: {
    facade: string[];
    ventilation: string[];
    acoustics: string[];
    outdoor_spaces: string[];
    green_integration: string[];
    climate_adaptation: string[];
  };
  amenityOpportunities: Array<{
    type: string;
    rationale: string;
    priority: string;
    suggestedSize: string;
  }>;
  constraintsSummary: string;
  opportunitiesSummary: string;
}

interface Stage4Input {
  stage1Output: Stage1Output;
  stage2Output: Stage2Output;
  buildingConstraints?: BuildingConstraints; // From Stage 3
  pve: PVEData;
  scenarios: Array<{
    name: string;
    personaNames: string[];
  }>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stageData, locale = 'nl' } = body as { stageData: Stage3Input; locale: 'nl' | 'en' };

    if (!stageData || !stageData.stage1Output || !stageData.stage2Output || !stageData.pve) {
      return new Response(
        JSON.stringify({ error: 'Stage 3 data with Stage 1+2 outputs and PVE is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load and simplify data
    const rawTypologies = housingTypologies[locale].typologies;
    const rawAmenities = buildingAmenities[locale].amenities;
    const rawCommunalSpaces = communalSpacesData[locale].spaces;
    const rawPublicSpaces = publicSpacesData[locale].spaces;
    const mapping = propertyTypeMapping[locale];

    const simplifiedTypologies = simplifyTypologies(rawTypologies, locale);
    const simplifiedAmenities = simplifyAmenities(rawAmenities, locale);
    const simplifiedCommunalSpaces = simplifySpaces(rawCommunalSpaces, locale);
    const simplifiedPublicSpaces = simplifySpaces(rawPublicSpaces, locale);

    // Get all persona names from scenarios
    const allPersonaNames = stageData.scenarios.flatMap(s => s.personaNames);

    // Filter spaces by target groups
    const filteredCommunalSpaces = filterSpacesByTargetGroups(simplifiedCommunalSpaces, allPersonaNames);
    const filteredPublicSpaces = filterSpacesByTargetGroups(simplifiedPublicSpaces, allPersonaNames);

    console.log('Stage 3 data reduction:');
    console.log(`- Communal spaces: ${rawCommunalSpaces.length} → ${filteredCommunalSpaces.length}`);
    console.log(`- Public spaces: ${rawPublicSpaces.length} → ${filteredPublicSpaces.length}`);

    // Extract valid IDs for explicit constraints
    const validTypologyIds = simplifiedTypologies.map(t => t.id);
    const validAmenityIds = simplifiedAmenities.map(a => a.id);
    const validCommunalSpaceIds = filteredCommunalSpaces.map(s => s.id);
    const validPublicSpaceIds = filteredPublicSpaces.map(s => s.id);

    // Build building constraints section from Stage 3
    const constraintsSection = stageData.buildingConstraints ? `
# BOUWKUNDIGE BEPERKINGEN (uit Stage 3 analyse)
## Samenvatting
${stageData.buildingConstraints.constraintsSummary}

## Kansen
${stageData.buildingConstraints.opportunitiesSummary}

## Kritieke beperkingen
${stageData.buildingConstraints.constraints
  .filter(c => c.severity === 'critical')
  .map(c => `- [${c.category}] ${c.constraint} → ${c.designImplication}`)
  .join('\n') || 'Geen kritieke beperkingen'}

## Belangrijke beperkingen
${stageData.buildingConstraints.constraints
  .filter(c => c.severity === 'important')
  .map(c => `- [${c.category}] ${c.constraint} → ${c.designImplication}`)
  .join('\n') || 'Geen belangrijke beperkingen'}

## Ontwerpaanbevelingen
- Gevel: ${stageData.buildingConstraints.designRecommendations.facade.join('; ') || 'Geen specifieke aanbevelingen'}
- Ventilatie: ${stageData.buildingConstraints.designRecommendations.ventilation.join('; ') || 'Geen specifieke aanbevelingen'}
- Akoestiek: ${stageData.buildingConstraints.designRecommendations.acoustics.join('; ') || 'Geen specifieke aanbevelingen'}
- Groenintegratie: ${stageData.buildingConstraints.designRecommendations.green_integration.join('; ') || 'Geen specifieke aanbevelingen'}
- Klimaatadaptatie: ${stageData.buildingConstraints.designRecommendations.climate_adaptation.join('; ') || 'Geen specifieke aanbevelingen'}

## Voorzieningen kansen (gebouw kan lokale gaps vullen)
${stageData.buildingConstraints.amenityOpportunities
  .map(a => `- [${a.priority}] ${a.type}: ${a.rationale} (${a.suggestedSize})`)
  .join('\n') || 'Geen specifieke kansen geïdentificeerd'}
` : '';

    const constraintsSectionEN = stageData.buildingConstraints ? `
# BUILDING CONSTRAINTS (from Stage 3 analysis)
## Summary
${stageData.buildingConstraints.constraintsSummary}

## Opportunities
${stageData.buildingConstraints.opportunitiesSummary}

## Critical constraints
${stageData.buildingConstraints.constraints
  .filter(c => c.severity === 'critical')
  .map(c => `- [${c.category}] ${c.constraint} → ${c.designImplication}`)
  .join('\n') || 'No critical constraints'}

## Important constraints
${stageData.buildingConstraints.constraints
  .filter(c => c.severity === 'important')
  .map(c => `- [${c.category}] ${c.constraint} → ${c.designImplication}`)
  .join('\n') || 'No important constraints'}

## Design recommendations
- Facade: ${stageData.buildingConstraints.designRecommendations.facade.join('; ') || 'No specific recommendations'}
- Ventilation: ${stageData.buildingConstraints.designRecommendations.ventilation.join('; ') || 'No specific recommendations'}
- Acoustics: ${stageData.buildingConstraints.designRecommendations.acoustics.join('; ') || 'No specific recommendations'}
- Green integration: ${stageData.buildingConstraints.designRecommendations.green_integration.join('; ') || 'No specific recommendations'}
- Climate adaptation: ${stageData.buildingConstraints.designRecommendations.climate_adaptation.join('; ') || 'No specific recommendations'}

## Amenity opportunities (building can fill local gaps)
${stageData.buildingConstraints.amenityOpportunities
  .map(a => `- [${a.priority}] ${a.type}: ${a.rationale} (${a.suggestedSize})`)
  .join('\n') || 'No specific opportunities identified'}
` : '';

    const prompt = locale === 'nl' ? `
Je bent een expert in vastgoedontwikkeling. Maak een gedetailleerd bouwprogramma voor elk scenario.

## KRITIEKE REGELS - LEES DIT EERST
Je MOET UITSLUITEND kiezen uit de hieronder opgegeven lijsten. MAAK GEEN eigen items of IDs.
- Gebruik ALLEEN typology_id's uit de WONINGTYPOLOGIEËN lijst
- Gebruik ALLEEN amenity_id's uit de GEBOUWVOORZIENINGEN, GEMEENSCHAPPELIJKE of PUBLIEKE RUIMTES lijsten
- Als een item niet in de lijst staat, MAG je het NIET gebruiken

GELDIGE TYPOLOGY IDs (kies ALLEEN hieruit):
${validTypologyIds.join(', ')}

GELDIGE AMENITY IDs voor gebouwvoorzieningen (kies ALLEEN hieruit):
${validAmenityIds.join(', ')}

GELDIGE IDs voor gemeenschappelijke ruimtes (kies ALLEEN hieruit):
${validCommunalSpaceIds.join(', ')}

GELDIGE IDs voor publieke/commerciële ruimtes (kies ALLEEN hieruit):
${validPublicSpaceIds.join(', ')}

# LOCATIESAMENVATTING (uit eerdere analyse)
${stageData.stage1Output.location_summary}

Kernpunten:
${stageData.stage1Output.key_location_insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

# SCENARIO ANALYSES (uit eerdere analyse)
${stageData.stage2Output.scenarios.map(s => `
## ${s.scenario_name}: ${s.scenario_simple_name}
Doelgroepen: ${s.target_personas.join(', ')}

${s.summary}

Woonstrategie: ${s.residential_strategy}

Demografische overwegingen: ${s.demographics_considerations}
`).join('\n---\n')}

${constraintsSection}

# PROGRAM VAN EISEN (PVE)
Totaal: ${stageData.pve.totalM2} m²
- Woningen: ${stageData.pve.percentages.apartments.percentage}% (${stageData.pve.percentages.apartments.m2} m²)
- Commercieel: ${stageData.pve.percentages.commercial.percentage}% (${stageData.pve.percentages.commercial.m2} m²)
- Horeca: ${stageData.pve.percentages.hospitality.percentage}% (${stageData.pve.percentages.hospitality.m2} m²)
- Sociaal: ${stageData.pve.percentages.social.percentage}% (${stageData.pve.percentages.social.m2} m²)
- Gemeenschappelijk: ${stageData.pve.percentages.communal.percentage}% (${stageData.pve.percentages.communal.m2} m²)
- Kantoren: ${stageData.pve.percentages.offices.percentage}% (${stageData.pve.percentages.offices.m2} m²)

# WONINGTYPOLOGIEËN (EXCLUSIEVE LIJST - gebruik ALLEEN deze)
${JSON.stringify(simplifiedTypologies, null, 2)}

# MAPPING PERSONA WONINGTYPEN → TYPOLOGIEËN
${mapping.note}
${JSON.stringify(mapping.mappings, null, 2)}

# GEBOUWVOORZIENINGEN (EXCLUSIEVE LIJST - gebruik ALLEEN deze)
${JSON.stringify(simplifiedAmenities, null, 2)}

# GEMEENSCHAPPELIJKE RUIMTES (EXCLUSIEVE LIJST - gebruik ALLEEN deze)
${JSON.stringify(filteredCommunalSpaces, null, 2)}

# PUBLIEKE/COMMERCIËLE RUIMTES (EXCLUSIEVE LIJST - gebruik ALLEEN deze)
${JSON.stringify(filteredPublicSpaces, null, 2)}

# OPDRACHT
Maak voor ELK scenario een gedetailleerd bouwprogramma:

1. WONINGEN: Unit mix met typology_id (MOET uit bovenstaande lijst komen), aantal, m², en onderbouwing per type
2. COMMERCIEEL: Winkel/retail concepten met m² en onderbouwing
3. HORECA: Concept beschrijving
4. SOCIAAL: Sociale faciliteiten met m² en onderbouwing
5. GEMEENSCHAPPELIJK: Gebouwvoorzieningen met amenity_id (MOET uit bovenstaande lijst komen), m², onderbouwing
6. GEMEENSCHAPPELIJKE RUIMTES: Selecteer ALLEEN uit de gefilterde lijst hierboven, groepeer per category
7. PUBLIEKE RUIMTES: Selecteer ALLEEN uit de gefilterde lijst hierboven, groepeer per category
8. KANTOREN: Concept beschrijving
9. ONTWERP NOTITIES: Gebaseerd op de bouwkundige beperkingen:
   - noise_mitigation: Hoe het ontwerp geluidsproblemen aanpakt
   - climate_adaptation: Hoe het ontwerp hittestress/klimaat aanpakt
   - green_integration: Hoe groen wordt geïntegreerd ter compensatie

Maak ook:
- Een generalized_pve met totaal m² per categorie over alle scenarios
- Een vergelijkende analyse met aanbevelingen

Gebruik de scenario-analyses EN bouwkundige beperkingen als basis. Wees specifiek in je onderbouwing.
HERINNERING: Gebruik UITSLUITEND de opgegeven IDs. Verzin GEEN nieuwe items.
` : `
You are a real estate development expert. Create a detailed building program for each scenario.

## CRITICAL RULES - READ THIS FIRST
You MUST ONLY choose from the lists provided below. DO NOT create your own items or IDs.
- Use ONLY typology_id's from the HOUSING TYPOLOGIES list
- Use ONLY amenity_id's from the BUILDING AMENITIES, COMMUNAL or PUBLIC SPACES lists
- If an item is not in the list, you MAY NOT use it

VALID TYPOLOGY IDs (choose ONLY from these):
${validTypologyIds.join(', ')}

VALID AMENITY IDs for building amenities (choose ONLY from these):
${validAmenityIds.join(', ')}

VALID IDs for communal spaces (choose ONLY from these):
${validCommunalSpaceIds.join(', ')}

VALID IDs for public/commercial spaces (choose ONLY from these):
${validPublicSpaceIds.join(', ')}

# LOCATION SUMMARY (from previous analysis)
${stageData.stage1Output.location_summary}

Key insights:
${stageData.stage1Output.key_location_insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

# SCENARIO ANALYSES (from previous analysis)
${stageData.stage2Output.scenarios.map(s => `
## ${s.scenario_name}: ${s.scenario_simple_name}
Target groups: ${s.target_personas.join(', ')}

${s.summary}

Residential strategy: ${s.residential_strategy}

Demographic considerations: ${s.demographics_considerations}
`).join('\n---\n')}

${constraintsSectionEN}

# PROGRAM OF REQUIREMENTS (PVE)
Total: ${stageData.pve.totalM2} m²
- Residential: ${stageData.pve.percentages.apartments.percentage}% (${stageData.pve.percentages.apartments.m2} m²)
- Commercial: ${stageData.pve.percentages.commercial.percentage}% (${stageData.pve.percentages.commercial.m2} m²)
- Hospitality: ${stageData.pve.percentages.hospitality.percentage}% (${stageData.pve.percentages.hospitality.m2} m²)
- Social: ${stageData.pve.percentages.social.percentage}% (${stageData.pve.percentages.social.m2} m²)
- Communal: ${stageData.pve.percentages.communal.percentage}% (${stageData.pve.percentages.communal.m2} m²)
- Offices: ${stageData.pve.percentages.offices.percentage}% (${stageData.pve.percentages.offices.m2} m²)

# HOUSING TYPOLOGIES (EXCLUSIVE LIST - use ONLY these)
${JSON.stringify(simplifiedTypologies, null, 2)}

# MAPPING PERSONA HOUSING TYPES → TYPOLOGIES
${mapping.note}
${JSON.stringify(mapping.mappings, null, 2)}

# BUILDING AMENITIES (EXCLUSIVE LIST - use ONLY these)
${JSON.stringify(simplifiedAmenities, null, 2)}

# COMMUNAL SPACES (EXCLUSIVE LIST - use ONLY these)
${JSON.stringify(filteredCommunalSpaces, null, 2)}

# PUBLIC/COMMERCIAL SPACES (EXCLUSIVE LIST - use ONLY these)
${JSON.stringify(filteredPublicSpaces, null, 2)}

# TASK
Create a detailed building program for EACH scenario:

1. RESIDENTIAL: Unit mix with typology_id (MUST be from the list above), quantity, m², and rationale per type
2. COMMERCIAL: Retail/shop concepts with m² and rationale
3. HOSPITALITY: Concept description
4. SOCIAL: Social facilities with m² and rationale
5. COMMUNAL: Building amenities with amenity_id (MUST be from the list above), m², rationale
6. COMMUNAL SPACES: Select ONLY from the filtered list above, group by category
7. PUBLIC SPACES: Select ONLY from the filtered list above, group by category
8. OFFICES: Concept description
9. DESIGN NOTES: Based on building constraints:
   - noise_mitigation: How the design addresses noise issues
   - climate_adaptation: How the design addresses heat stress/climate
   - green_integration: How greenery is integrated for compensation

Also create:
- A generalized_pve with total m² per category across all scenarios
- A comparative analysis with recommendations

Use the scenario analyses AND building constraints as foundation. Be specific in your rationale.
REMINDER: Use ONLY the provided IDs. DO NOT invent new items.
`;

    const result = await streamObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: Stage4OutputSchema,
      schemaName: 'Stage4PVEAllocation',
      schemaDescription: locale === 'nl'
        ? 'Gedetailleerde PVE-allocatie voor vastgoedontwikkeling'
        : 'Detailed PVE allocation for real estate development',
      prompt,
      temperature: 0.7,
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
    console.error('Stage 3 error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate PVE allocation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
