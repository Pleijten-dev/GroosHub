import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import housingTypologies from '@/features/location/data/sources/housing-typologies.json';
import buildingAmenities from '@/features/location/data/sources/building-amenities.json';

// Schema for a single unit type in the unit mix
const UnitMixItemSchema = z.object({
  typology_id: z.string().describe('ID of the housing typology from the provided list'),
  typology_name: z.string().describe('Name of the housing typology'),
  quantity: z.number().describe('Number of units of this type'),
  total_m2: z.number().describe('Total square meters for this unit type (quantity * size_m2)'),
  rationale: z.string().describe('Explanation for why this unit type and quantity was chosen based on the local demographics and persona suitability'),
});

// Schema for a single amenity in the building program
const AmenityItemSchema = z.object({
  amenity_id: z.string().describe('ID of the amenity from the provided list'),
  amenity_name: z.string().describe('Name of the amenity'),
  size_m2: z.number().describe('Allocated square meters for this amenity'),
  rationale: z.string().describe('Explanation for why this amenity was selected based on local needs, demographics, and existing amenities'),
});

// Schema for commercial spaces
const CommercialSpaceSchema = z.object({
  type: z.string().describe('Type of commercial space (e.g., retail, restaurant, office)'),
  size_m2: z.number().describe('Size in square meters'),
  rationale: z.string().describe('Explanation for this commercial space based on local amenities and demand'),
});

// Schema for a single scenario program
const ScenarioProgramSchema = z.object({
  scenario_name: z.string().describe('Name of the scenario (Scenario 1, Scenario 2, Scenario 3, or Op maat)'),
  target_personas: z.array(z.string()).describe('List of persona names this scenario targets'),
  summary: z.string().describe('High-level summary of this program and its strategic approach'),

  residential: z.object({
    total_m2: z.number().describe('Total residential square meters from PVE'),
    unit_mix: z.array(UnitMixItemSchema).describe('Detailed unit mix with quantities and rationale'),
    demographics_considerations: z.string().describe('How local demographics (age, family type, income) influenced the unit mix'),
    total_units: z.number().describe('Total number of residential units'),
  }),

  commercial: z.object({
    total_m2: z.number().describe('Total commercial square meters from PVE'),
    spaces: z.array(CommercialSpaceSchema).describe('Commercial space allocation'),
    local_amenities_analysis: z.string().describe('Analysis of existing local amenities and how commercial spaces complement them'),
  }),

  hospitality: z.object({
    total_m2: z.number().describe('Total hospitality square meters from PVE'),
    concept: z.string().describe('Hospitality concept and rationale based on local context'),
  }),

  social: z.object({
    total_m2: z.number().describe('Total social facilities square meters from PVE'),
    facilities: z.array(z.object({
      type: z.string(),
      size_m2: z.number(),
      rationale: z.string(),
    })).describe('Social facilities allocation'),
  }),

  communal: z.object({
    total_m2: z.number().describe('Total communal square meters from PVE'),
    amenities: z.array(AmenityItemSchema).describe('Building amenities selection'),
    persona_needs_analysis: z.string().describe('How selected amenities serve the target personas'),
  }),

  offices: z.object({
    total_m2: z.number().describe('Total office space square meters from PVE'),
    concept: z.string().describe('Office space concept and rationale'),
  }),

  key_insights: z.array(z.string()).describe('3-5 key insights about how local data (safety, health, livability) influenced design decisions'),
});

// Main building program schema
const BuildingProgramSchema = z.object({
  location_summary: z.string().describe('Brief summary of the location characteristics and key findings from the data'),
  pve_overview: z.object({
    total_m2: z.number(),
    breakdown: z.string().describe('Overview of the PVE allocation percentages'),
  }),
  scenarios: z.array(ScenarioProgramSchema).describe('Detailed building programs for each scenario (3 automatic + 1 custom if provided)'),
  comparative_analysis: z.string().describe('Comparison of the scenarios and recommendations based on local context'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rapportData, locale = 'nl' } = body;

    if (!rapportData) {
      return NextResponse.json(
        { error: 'Rapport data is required' },
        { status: 400 }
      );
    }

    // Get the appropriate locale data
    const typologies = housingTypologies[locale as 'nl' | 'en'].typologies;
    const amenities = buildingAmenities[locale as 'nl' | 'en'].amenities;

    // Build the prompt
    const prompt = locale === 'nl' ? `
Je bent een expert in vastgoedontwikkeling en stedenbouwkundige planning. Je taak is om een gedetailleerd bouwprogramma te maken voor een nieuw ontwikkelingsproject.

# LOCATIE GEGEVENS
Je hebt ontvangen: uitgebreide gegevens over de locatie, inclusief:
- Demografische gegevens (leeftijd, gezinssamenstelling, inkomen)
- Gezondheids- en welzijnsindicatoren
- Veiligheidsindicatoren
- Leefbaarheid en sociale cohesie
- Bestaande voorzieningen in de buurt
- Woningmarkt data

# PROGRAM VAN EISEN (PVE)
${rapportData.pve ? `
Het project heeft een totaal van ${rapportData.pve.totalM2} m² met de volgende verdeling:
- Woningen: ${rapportData.pve.percentages.apartments.percentage}% (${rapportData.pve.percentages.apartments.m2} m²)
- Commercieel: ${rapportData.pve.percentages.commercial.percentage}% (${rapportData.pve.percentages.commercial.m2} m²)
- Horeca: ${rapportData.pve.percentages.hospitality.percentage}% (${rapportData.pve.percentages.hospitality.m2} m²)
- Sociaal: ${rapportData.pve.percentages.social.percentage}% (${rapportData.pve.percentages.social.m2} m²)
- Gemeenschappelijk: ${rapportData.pve.percentages.communal.percentage}% (${rapportData.pve.percentages.communal.m2} m²)
- Kantoren: ${rapportData.pve.percentages.offices.percentage}% (${rapportData.pve.percentages.offices.m2} m²)
` : 'Geen PVE data beschikbaar.'}

# BESCHIKBARE WONINGTYPOLOGIEËN
${JSON.stringify(typologies, null, 2)}

# BESCHIKBARE GEBOUWVOORZIENINGEN
${JSON.stringify(amenities, null, 2)}

# DOELGROEPEN SCENARIOS
Het project moet ${rapportData.targetGroups.recommendedScenarios.length} verschillende scenarios bedienen:
${rapportData.targetGroups.recommendedScenarios.map((scenario: any, index: number) => `
Scenario ${index + 1}: ${scenario.name}
Doelgroep Persona's: ${scenario.personaNames.join(', ')}
Score: ${scenario.avgScore}
`).join('\n')}

# LOCATIE DATA (Volledig rapport)
${JSON.stringify(rapportData, null, 2)}

# OPDRACHT
Maak voor ELK scenario een gedetailleerd bouwprogramma dat:

1. Een unit mix voorstelt die perfect aansluit bij de doelgroep persona's
2. Rekening houdt met lokale demografische gegevens (leeftijd, gezinssamenstelling, inkomen)
3. Commerciële ruimtes voorstelt die de bestaande voorzieningen in de buurt aanvullen
4. Gemeenschappelijke voorzieningen selecteert die de behoeften van de doelgroepen dienen
5. Sociale faciliteiten plant die de lokale gemeenschap versterken
6. De veiligheids-, gezondheids- en leefbaarheidsindicatoren meeneemt in de overwegingen

Wees specifiek, data-gedreven en leg uit waarom je bepaalde keuzes maakt op basis van de verstrekte locatie gegevens.
` : `
You are an expert in real estate development and urban planning. Your task is to create a detailed building program for a new development project.

# LOCATION DATA
You have received: comprehensive location data including:
- Demographics (age, household composition, income)
- Health and wellbeing indicators
- Safety indicators
- Livability and social cohesion
- Existing local amenities
- Housing market data

# PROGRAM OF REQUIREMENTS (PVE)
${rapportData.pve ? `
The project has a total of ${rapportData.pve.totalM2} m² with the following allocation:
- Residential: ${rapportData.pve.percentages.apartments.percentage}% (${rapportData.pve.percentages.apartments.m2} m²)
- Commercial: ${rapportData.pve.percentages.commercial.percentage}% (${rapportData.pve.percentages.commercial.m2} m²)
- Hospitality: ${rapportData.pve.percentages.hospitality.percentage}% (${rapportData.pve.percentages.hospitality.m2} m²)
- Social: ${rapportData.pve.percentages.social.percentage}% (${rapportData.pve.percentages.social.m2} m²)
- Communal: ${rapportData.pve.percentages.communal.percentage}% (${rapportData.pve.percentages.communal.m2} m²)
- Offices: ${rapportData.pve.percentages.offices.percentage}% (${rapportData.pve.percentages.offices.m2} m²)
` : 'No PVE data available.'}

# AVAILABLE HOUSING TYPOLOGIES
${JSON.stringify(typologies, null, 2)}

# AVAILABLE BUILDING AMENITIES
${JSON.stringify(amenities, null, 2)}

# TARGET GROUP SCENARIOS
The project must serve ${rapportData.targetGroups.recommendedScenarios.length} different scenarios:
${rapportData.targetGroups.recommendedScenarios.map((scenario: any, index: number) => `
Scenario ${index + 1}: ${scenario.name}
Target Personas: ${scenario.personaNames.join(', ')}
Score: ${scenario.avgScore}
`).join('\n')}

# LOCATION DATA (Complete Report)
${JSON.stringify(rapportData, null, 2)}

# ASSIGNMENT
Create a detailed building program for EACH scenario that:

1. Proposes a unit mix that perfectly matches the target persona groups
2. Accounts for local demographics (age, household composition, income)
3. Suggests commercial spaces that complement existing local amenities
4. Selects communal facilities that serve the needs of target groups
5. Plans social facilities that strengthen the local community
6. Considers safety, health, and livability indicators in the decisions

Be specific, data-driven, and explain why you make certain choices based on the provided location data.
`;

    // Generate the building program using Claude
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: BuildingProgramSchema,
      schemaName: 'BuildingProgram',
      schemaDescription: locale === 'nl'
        ? 'Een gedetailleerd bouwprogramma voor een vastgoedontwikkelingsproject'
        : 'A detailed building program for a real estate development project',
      prompt,
      temperature: 0.7,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('Error generating building program:', error);
    return NextResponse.json(
      { error: 'Failed to generate building program', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
