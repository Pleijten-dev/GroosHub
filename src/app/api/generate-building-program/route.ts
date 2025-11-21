import { anthropic } from '@ai-sdk/anthropic';
import { streamObject } from 'ai';
import { z } from 'zod';
import housingTypologies from '@/features/location/data/sources/housing-typologies.json';
import buildingAmenities from '@/features/location/data/sources/building-amenities.json';
import communalSpaces from '@/features/location/data/sources/communal-spaces.json';
import publicSpaces from '@/features/location/data/sources/public-spaces.json';
import propertyTypeMapping from '@/features/location/data/sources/property-type-mapping.json';
import type { CompactScenario } from '@/features/location/utils/jsonExportCompact';

// Set maximum duration for Vercel serverless function (in seconds)
// Pro plan allows up to 300s, Enterprise can go higher
export const maxDuration = 300;

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
  scenario_simple_name: z.string().describe('Short, catchy name based on the target personas (e.g., "Young Professionals Hub", "Family Focused", "Senior Living"). Keep it concise and descriptive, similar to persona names.'),
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

  communal_spaces: z.object({
    total_m2: z.number().describe('Total communal spaces square meters'),
    spaces: z.array(AmenityItemSchema).describe('Selected communal spaces from the provided list'),
    category_breakdown: z.record(z.string(), z.object({
      total_m2: z.number().describe('Total square meters for this category'),
      percentage: z.number().describe('Percentage of total communal spaces'),
    })).describe('Breakdown by category (e.g., sociaal_en_gastvrij, sport_en_fitness)'),
  }),

  public_spaces: z.object({
    total_m2: z.number().describe('Total public/commercial spaces square meters'),
    spaces: z.array(AmenityItemSchema).describe('Selected public spaces from the provided list'),
    category_breakdown: z.record(z.string(), z.object({
      total_m2: z.number().describe('Total square meters for this category'),
      percentage: z.number().describe('Percentage of total public spaces'),
    })).describe('Breakdown by category (e.g., sociaal_en_gastvrij, zorg_en_welzijn)'),
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
  generalized_pve: z.object({
    communal_categories: z.record(z.string(), z.object({
      category_name: z.string().describe('Display name of the category'),
      total_m2: z.number().describe('Total m2 across all scenarios for this category'),
      amenities: z.array(z.string()).describe('List of amenity names in this category'),
    })).describe('Generalized PVE for communal spaces grouped by category'),
    public_categories: z.record(z.string(), z.object({
      category_name: z.string().describe('Display name of the category'),
      total_m2: z.number().describe('Total m2 across all scenarios for this category'),
      amenities: z.array(z.string()).describe('List of amenity names in this category'),
    })).describe('Generalized PVE for public spaces grouped by category'),
  }).describe('High-level PVE organized by categories rather than specific amenities'),
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
      return new Response(
        JSON.stringify({ error: 'Rapport data is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the appropriate locale data
    const typologies = housingTypologies[locale as 'nl' | 'en'].typologies;
    const amenities = buildingAmenities[locale as 'nl' | 'en'].amenities;
    const spaces = communalSpaces[locale as 'nl' | 'en'].spaces;
    const publicSpacesList = publicSpaces[locale as 'nl' | 'en'].spaces;
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

# BESCHIKBARE GEMEENSCHAPPELIJKE RUIMTES
De volgende gemeenschappelijke ruimtes kunnen worden toegevoegd aan het gebouw. Elke ruimte heeft:
- schaal (kleinste_schaal / kleine_schaal / middenschaal / grotere_schaal) - bepaalt welke schaal project dit nodig heeft
- category - het type ruimte
- area_min_m2 en area_max_m2 - minimale en maximale oppervlakte
- m2_per_resident - aanbevolen oppervlakte per bewoner
- min_residents en max_residents - optimaal aantal bewoners voor deze ruimte
- target_groups - welke doelgroepen het meest profiteren van deze ruimte

${JSON.stringify(spaces, null, 2)}

BELANGRIJK: Selecteer gemeenschappelijke ruimtes die passen bij de doelgroep persona's in elk scenario. Gebruik de target_groups lijst om te bepalen welke ruimtes relevant zijn. Let op de schaal - kleinere projecten hebben kleinere schaal ruimtes nodig, grotere projecten kunnen grotere schaal ruimtes ondersteunen.

# BESCHIKBARE PUBLIEKE EN COMMERCIËLE RUIMTES
De volgende publieke en commerciële ruimtes kunnen worden toegevoegd aan het project. Deze ruimtes zijn typisch commercieel/publiek-gericht en kunnen inkomsten genereren of publieke functies vervullen. Elke ruimte heeft:
- schaal (kleine_schaal / middenschaal / grotere_schaal / grote_schaal) - bepaalt welke schaal project dit nodig heeft
- category - het type ruimte
- area_min_m2 en area_max_m2 - minimale en maximale oppervlakte
- m2_per_resident - aanbevolen oppervlakte per bewoner
- min_residents en max_residents - optimaal aantal bewoners voor deze ruimte
- target_groups - welke doelgroepen het meest profiteren van deze ruimte
- regulations - relevante wet- en regelgeving
- parking_impact - of deze ruimte invloed heeft op parkeerbehoefte

${JSON.stringify(publicSpacesList, null, 2)}

BELANGRIJK: Publieke/commerciële ruimtes zijn anders dan gemeenschappelijke ruimtes:
- Gemeenschappelijke ruimtes zijn voor bewoners (gratis toegang, gedeeld beheer)
- Publieke/commerciële ruimtes zijn voor een breder publiek (vaak commercieel geëxploiteerd)
Gebruik publieke ruimtes voor commerciële functies, detailhandel, horeca, gezondheidszorg, kinderopvang, etc. Kies ruimtes die aansluiten bij de target_groups van de doelgroep persona's en die de buurt aanvullen (niet concurreren met nabije voorzieningen).

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

1. SCENARIO NAAM: Bedenk een korte, pakkende naam voor elk scenario gebaseerd op de doelgroep persona's (bijv. "Jonge Starters Hub", "Familie Focus", "Senior Comfort"). Houd het kort en to-the-point, vergelijkbaar met persona namen. Voeg dit toe als "scenario_simple_name".

2. WONINGTYPOLOGIEËN: Een unit mix voorstelt die perfect aansluit bij de doelgroep persona's - Gebruik de MAPPING VAN PERSONA WONINGTYPEN om de gewenste woningtypen van persona's te vertalen naar de beschikbare typology_ids. Analyseer de "desired_property_types" van elke persona in het scenario en match deze met de juiste typologieën uit de mapping.

3. LOKALE CONTEXT: Rekening houdt met lokale demografische gegevens (leeftijd, gezinssamenstelling, inkomen)

4. PUBLIEKE RUIMTES: Selecteer publieke en commerciële ruimtes uit de BESCHIKBARE PUBLIEKE EN COMMERCIËLE RUIMTES lijst die passen bij de target_groups. Kies functies die inkomsten kunnen genereren (retail, horeca, gezondheidszorg) of belangrijke publieke functies vervullen, en die de bestaande voorzieningen in de buurt aanvullen (niet concurreren). Groepeer deze per category en bereken totaal m2 en percentage per categorie.

5. GEMEENSCHAPPELIJKE RUIMTES: Selecteer gemeenschappelijke ruimtes uit de BESCHIKBARE GEMEENSCHAPPELIJKE RUIMTES lijst die passen bij de target_groups van de doelgroep persona's. Kies ruimtes waarvan de target_groups overeenkomen met de persona's in het scenario. Groepeer deze per category en bereken totaal m2 en percentage per categorie.

6. SOCIALE FACILITEITEN: Plant sociale faciliteiten die de lokale gemeenschap versterken

7. OVERWEGINGEN: De veiligheids-, gezondheids- en leefbaarheidsindicatoren meeneemt in de overwegingen

8. BELANGRIJK: Vermijd het voorstellen van voorzieningen die al dichtbij aanwezig zijn. Let op de 'closestDistance' en 'averageDistance' velden in de amenities data. Als een voorziening al binnen 500m aanwezig is (closestDistance < 500), stel deze NIET voor als gebouwvoorziening tenzij er een duidelijke behoefte is aan extra capaciteit.

9. GENERALIZED PVE: Creëer ook een generalized_pve op het hoogste niveau die de totale m2 per categorie weergeeft (niet per specifieke voorziening) voor zowel gemeenschappelijke als publieke ruimtes over alle scenarios heen.

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

# AVAILABLE COMMUNAL SPACES
The following communal spaces can be added to the building. Each space has:
- scale (smallest_scale / small_scale / medium_scale / larger_scale) - determines what project scale requires this
- category - the type of space
- area_min_m2 and area_max_m2 - minimum and maximum area
- m2_per_resident - recommended area per resident
- min_residents and max_residents - optimal number of residents for this space
- target_groups - which target groups benefit most from this space

${JSON.stringify(spaces, null, 2)}

IMPORTANT: Select communal spaces that match the target group personas in each scenario. Use the target_groups list to determine which spaces are relevant. Pay attention to scale - smaller projects need smaller scale spaces, larger projects can support larger scale spaces.

# AVAILABLE PUBLIC AND COMMERCIAL SPACES
The following public and commercial spaces can be added to the project. These spaces are typically commercial/public-facing and can generate income or fulfill public functions. Each space has:
- scale (small_scale / medium_scale / larger_scale / large_scale) - determines what project scale requires this
- category - the type of space
- area_min_m2 and area_max_m2 - minimum and maximum area
- m2_per_resident - recommended area per resident
- min_residents and max_residents - optimal number of residents for this space
- target_groups - which target groups benefit most from this space
- regulations - relevant legislation and regulations
- parking_impact - whether this space impacts parking requirements

${JSON.stringify(publicSpacesList, null, 2)}

IMPORTANT: Public/commercial spaces are different from communal spaces:
- Communal spaces are for residents (free access, shared management)
- Public/commercial spaces are for a broader public (often commercially operated)
Use public spaces for commercial functions, retail, hospitality, healthcare, childcare, etc. Choose spaces that align with the target_groups of the target personas and complement the neighborhood (don't compete with nearby amenities).

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

1. SCENARIO NAME: Create a short, catchy name for each scenario based on the target personas (e.g., "Young Starters Hub", "Family Focus", "Senior Comfort"). Keep it concise and to-the-point, similar to persona names. Add this as "scenario_simple_name".

2. HOUSING TYPOLOGIES: Proposes a unit mix that perfectly matches the target persona groups - Use the MAPPING OF PERSONA HOUSING TYPES to translate persona desired housing types into available typology_ids. Analyze the "desired_property_types" of each persona in the scenario and match them to the appropriate typologies from the mapping.

3. LOCAL CONTEXT: Accounts for local demographics (age, household composition, income)

4. PUBLIC SPACES: Selects public and commercial spaces from the AVAILABLE PUBLIC AND COMMERCIAL SPACES list that match the target_groups. Choose functions that can generate income (retail, hospitality, healthcare) or fulfill important public functions, and complement (not compete with) existing neighborhood amenities. Group these by category and calculate total m2 and percentage per category.

5. COMMUNAL SPACES: Selects communal spaces from the AVAILABLE COMMUNAL SPACES list that match the target_groups of the target personas. Choose spaces whose target_groups align with the personas in the scenario. Group these by category and calculate total m2 and percentage per category.

6. SOCIAL FACILITIES: Plans social facilities that strengthen the local community

7. CONSIDERATIONS: Considers safety, health, and livability indicators in the decisions

8. IMPORTANT: Avoid recommending amenities that are already nearby. Pay attention to the 'closestDistance' and 'averageDistance' fields in the amenities data. If an amenity is already within 500m (closestDistance < 500), do NOT recommend it as a building amenity unless there is a clear need for additional capacity.

9. GENERALIZED PVE: Also create a generalized_pve at the top level showing total m2 per category (not per specific amenity) for both communal and public spaces across all scenarios.

Be specific, data-driven, and explain why you make certain choices based on the provided location data.
`;

    // Generate the building program using Claude with streaming
    const result = await streamObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: BuildingProgramSchema,
      schemaName: 'BuildingProgram',
      schemaDescription: locale === 'nl'
        ? 'Een gedetailleerd bouwprogramma voor een vastgoedontwikkelingsproject'
        : 'A detailed building program for a real estate development project',
      prompt,
      temperature: 0.7,
    });

    // Return the streaming response
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error generating building program:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate building program',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
