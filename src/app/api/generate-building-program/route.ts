import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import housingTypologies from '@/features/location/data/sources/housing-typologies.json';
import buildingAmenities from '@/features/location/data/sources/building-amenities.json';
import propertyTypeMapping from '@/features/location/data/sources/property-type-mapping.json';
import type { CompactScenario } from '@/features/location/utils/jsonExportCompact';

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

// Export the inferred type for use in components
export type BuildingProgram = z.infer<typeof BuildingProgramSchema>;

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
    const mapping = propertyTypeMapping[locale as 'nl' | 'en'];

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

# MAPPING VAN PERSONA WONINGTYPEN NAAR TYPOLOGIEËN
${mapping.note}

${JSON.stringify(mapping.mappings, null, 2)}

BELANGRIJK: Gebruik deze mapping om de gewenste woningtypen van persona's te matchen met de beschikbare typologieën. Als een persona "Goedkoop 2-kamer appartement" zoekt, kies dan uit de typology_ids in de mapping (bijv. "social_housing_70" of "one_bed_55"). Let op: grondgebonden woningen zijn NIET beschikbaar - gebruik de voorgestelde alternatieven voor die gevallen.

# BESCHIKBARE GEBOUWVOORZIENINGEN
${JSON.stringify(amenities, null, 2)}

# DOELGROEPEN SCENARIOS
Het project moet ${rapportData.targetGroups.recommendedScenarios.length} verschillende scenarios bedienen:
${rapportData.targetGroups.recommendedScenarios.map((scenario: CompactScenario, index: number) => `
Scenario ${index + 1}: ${scenario.name}
Doelgroep Persona's: ${scenario.personaNames.join(', ')}
Score: ${scenario.avgScore}
`).join('\n')}

# LOCATIE DATA (Volledig rapport)
${JSON.stringify(rapportData, null, 2)}

# OPDRACHT
Maak voor ELK scenario een gedetailleerd bouwprogramma dat:

1. Een unit mix voorstelt die perfect aansluit bij de doelgroep persona's - Gebruik de MAPPING VAN PERSONA WONINGTYPEN om de gewenste woningtypen van persona's te vertalen naar de beschikbare typology_ids. Analyseer de "desired_property_types" van elke persona in het scenario en match deze met de juiste typologieën uit de mapping.
2. Rekening houdt met lokale demografische gegevens (leeftijd, gezinssamenstelling, inkomen)
3. Commerciële ruimtes voorstelt die de bestaande voorzieningen in de buurt aanvullen
4. Gemeenschappelijke voorzieningen selecteert die de behoeften van de doelgroepen dienen
5. Sociale faciliteiten plant die de lokale gemeenschap versterken
6. De veiligheids-, gezondheids- en leefbaarheidsindicatoren meeneemt in de overwegingen
7. BELANGRIJK: Vermijd het voorstellen van voorzieningen die al dichtbij aanwezig zijn. Let op de 'closestDistance' en 'averageDistance' velden in de amenities data. Als een voorziening al binnen 500m aanwezig is (closestDistance < 500), stel deze NIET voor als gebouwvoorziening tenzij er een duidelijke behoefte is aan extra capaciteit.

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

# MAPPING OF PERSONA HOUSING TYPES TO TYPOLOGIES
${mapping.note}

${JSON.stringify(mapping.mappings, null, 2)}

IMPORTANT: Use this mapping to match persona desired housing types with available typologies. If a persona seeks "Affordable 2-room apartment", choose from the typology_ids in the mapping (e.g., "social_housing_70" or "one_bed_55"). Note: ground-level dwellings are NOT available - use the suggested alternatives for those cases.

# AVAILABLE BUILDING AMENITIES
${JSON.stringify(amenities, null, 2)}

# TARGET GROUP SCENARIOS
The project must serve ${rapportData.targetGroups.recommendedScenarios.length} different scenarios:
${rapportData.targetGroups.recommendedScenarios.map((scenario: CompactScenario, index: number) => `
Scenario ${index + 1}: ${scenario.name}
Target Personas: ${scenario.personaNames.join(', ')}
Score: ${scenario.avgScore}
`).join('\n')}

# LOCATION DATA (Complete Report)
${JSON.stringify(rapportData, null, 2)}

# ASSIGNMENT
Create a detailed building program for EACH scenario that:

1. Proposes a unit mix that perfectly matches the target persona groups - Use the MAPPING OF PERSONA HOUSING TYPES to translate persona desired housing types into available typology_ids. Analyze the "desired_property_types" of each persona in the scenario and match them to the appropriate typologies from the mapping.
2. Accounts for local demographics (age, household composition, income)
3. Suggests commercial spaces that complement existing local amenities
4. Selects communal facilities that serve the needs of target groups
5. Plans social facilities that strengthen the local community
6. Considers safety, health, and livability indicators in the decisions
7. IMPORTANT: Avoid recommending amenities that are already nearby. Pay attention to the 'closestDistance' and 'averageDistance' fields in the amenities data. If an amenity is already within 500m (closestDistance < 500), do NOT recommend it as a building amenity unless there is a clear need for additional capacity.

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
