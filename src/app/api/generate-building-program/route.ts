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

// ============================================================================
// DATA SIMPLIFICATION & FILTERING HELPERS
// ============================================================================
/**
 * OPTIMIZATION: Reduce prompt size to fix LLM hanging on scenario generation
 *
 * PROBLEM (Nov 22-24):
 * - Full JSON files totaled ~235KB+ input (~60,000 tokens)
 * - communal-spaces.json: 84KB (2,673 lines)
 * - public-spaces.json: 63KB (2,043 lines)
 * - Left insufficient tokens for LLM to generate 3 detailed scenarios
 * - Generation hung at "step 4 scenario 1 uitwerken"
 *
 * SOLUTION:
 * 1. Simplify JSON data (remove examples, regulations, spatial_considerations)
 *    - Keeps: id, name, description, category, area ranges, target_groups
 *    - Reduction: 84KB→18KB (79%), 63KB→15KB (76%)
 * 2. Pre-filter by target groups (only send relevant spaces for scenarios)
 *    - Additional 50-70% reduction (37→15 spaces typically)
 *
 * RESULT: ~235KB → ~88KB (62% reduction)
 * - Enough output tokens for 3 complete scenario objects
 * - Faster generation time
 * - Lower API costs
 */

/**
 * Simplified space interface - keeps only essential fields for LLM
 * Reduces communal-spaces.json from 84KB to ~18KB (79% reduction)
 * Reduces public-spaces.json from 63KB to ~15KB (76% reduction)
 */
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

/**
 * Simplified typology interface
 */
interface SimplifiedTypology {
  id: string;
  name: string;
  description: string;
  size_m2: number;
  rooms: number;
  suitable_for: string[];
}

/**
 * Simplified amenity interface
 */
interface SimplifiedAmenity {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * Simplify communal/public spaces by removing verbose fields
 * Keeps: id, name, description, category, area ranges, m2_per_resident, target_groups
 * Removes: examples, spatial_considerations, regulations, location_within_building, parking_impact
 */
function simplifySpaces(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spaces: any[],
  locale: 'nl' | 'en'
): SimplifiedSpace[] {
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

/**
 * Simplify housing typologies
 */
function simplifyTypologies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typologies: any[],
  locale: 'nl' | 'en'
): SimplifiedTypology[] {
  return typologies.map(typology => ({
    id: typology.id,
    name: locale === 'nl' ? typology.name_nl : typology.name_en,
    description: locale === 'nl' ? typology.description_nl : typology.description_en,
    size_m2: typology.size_m2,
    rooms: typology.rooms,
    suitable_for: typology.suitable_for || [],
  }));
}

/**
 * Simplify building amenities
 */
function simplifyAmenities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  amenities: any[],
  locale: 'nl' | 'en'
): SimplifiedAmenity[] {
  return amenities.map(amenity => ({
    id: amenity.id,
    name: locale === 'nl' ? amenity.name_nl : amenity.name_en,
    description: locale === 'nl' ? amenity.description_nl : amenity.description_en,
    category: amenity.category,
  }));
}

/**
 * Pre-filter spaces based on scenario persona target groups
 * Reduces data by 50-70% by only including relevant spaces
 */
function filterSpacesByTargetGroups(
  spaces: SimplifiedSpace[],
  scenarios: CompactScenario[]
): SimplifiedSpace[] {
  // Extract all unique target groups from scenario personas
  const scenarioTargetGroups = new Set<string>();

  scenarios.forEach(scenario => {
    scenario.personaNames.forEach(personaName => {
      // Map persona names to target groups (simplified mapping)
      // Common target groups: starters, gezinnen, senioren, studenten, jonge_professionals, etc.
      const lowerName = personaName.toLowerCase();
      if (lowerName.includes('starter') || lowerName.includes('jong')) {
        scenarioTargetGroups.add('starters');
        scenarioTargetGroups.add('jonge_professionals');
      }
      if (lowerName.includes('gezin') || lowerName.includes('familie') || lowerName.includes('family')) {
        scenarioTargetGroups.add('gezinnen');
      }
      if (lowerName.includes('senior') || lowerName.includes('oudere')) {
        scenarioTargetGroups.add('senioren');
      }
      if (lowerName.includes('student')) {
        scenarioTargetGroups.add('studenten');
      }
      if (lowerName.includes('professional')) {
        scenarioTargetGroups.add('jonge_professionals');
      }
    });
  });

  // If no specific target groups identified, return all spaces (fallback)
  if (scenarioTargetGroups.size === 0) {
    return spaces;
  }

  // Filter spaces that match any of the scenario target groups
  return spaces.filter(space => {
    // Keep spaces that match scenario personas
    const matchesTargetGroup = space.target_groups.some(tg =>
      scenarioTargetGroups.has(tg)
    );

    // Also keep spaces with "alle" (all) target group - these are universally relevant
    const isUniversal = space.target_groups.includes('alle') ||
                       space.target_groups.includes('all');

    return matchesTargetGroup || isUniversal;
  });
}

// ============================================================================
// ZODS SCHEMAS
// ============================================================================

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

    // ========================================================================
    // STEP 1: Load raw data from JSON files
    // ========================================================================
    const rawTypologies = housingTypologies[locale as 'nl' | 'en'].typologies;
    const rawAmenities = buildingAmenities[locale as 'nl' | 'en'].amenities;
    const rawCommunalSpaces = communalSpaces[locale as 'nl' | 'en'].spaces;
    const rawPublicSpaces = publicSpaces[locale as 'nl' | 'en'].spaces;
    const mapping = propertyTypeMapping[locale as 'nl' | 'en'];

    // ========================================================================
    // STEP 2: Simplify data (remove verbose fields, keep only essentials)
    // Reduces: communal-spaces 84KB→18KB, public-spaces 63KB→15KB (79-76% reduction)
    // ========================================================================
    const simplifiedTypologies = simplifyTypologies(rawTypologies, locale);
    const simplifiedAmenities = simplifyAmenities(rawAmenities, locale);
    const simplifiedCommunalSpaces = simplifySpaces(rawCommunalSpaces, locale);
    const simplifiedPublicSpaces = simplifySpaces(rawPublicSpaces, locale);

    // ========================================================================
    // STEP 3: Pre-filter spaces by target groups (50-70% further reduction)
    // Only include spaces relevant to the scenario personas
    // ========================================================================
    const scenarios = rapportData.targetGroups?.recommendedScenarios || [];
    const filteredCommunalSpaces = filterSpacesByTargetGroups(simplifiedCommunalSpaces, scenarios);
    const filteredPublicSpaces = filterSpacesByTargetGroups(simplifiedPublicSpaces, scenarios);

    // Log reduction statistics for debugging
    console.log('Data reduction stats:');
    console.log(`- Communal spaces: ${rawCommunalSpaces.length} → ${filteredCommunalSpaces.length} (${Math.round((1 - filteredCommunalSpaces.length / rawCommunalSpaces.length) * 100)}% reduction)`);
    console.log(`- Public spaces: ${rawPublicSpaces.length} → ${filteredPublicSpaces.length} (${Math.round((1 - filteredPublicSpaces.length / rawPublicSpaces.length) * 100)}% reduction)`);

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
${JSON.stringify(simplifiedTypologies, null, 2)}

# MAPPING VAN PERSONA WONINGTYPEN NAAR TYPOLOGIEËN
${mapping.note}

${JSON.stringify(mapping.mappings, null, 2)}

BELANGRIJK: Gebruik deze mapping om de gewenste woningtypen van persona's te matchen met de beschikbare typologieën. Als een persona "Goedkoop 2-kamer appartement" zoekt, kies dan uit de typology_ids in de mapping (bijv. "social_housing_70" of "one_bed_55"). Let op: grondgebonden woningen zijn NIET beschikbaar - gebruik de voorgestelde alternatieven voor die gevallen.

# BESCHIKBARE GEBOUWVOORZIENINGEN
${JSON.stringify(simplifiedAmenities, null, 2)}

# BESCHIKBARE GEMEENSCHAPPELIJKE RUIMTES
De volgende gemeenschappelijke ruimtes zijn VOORAF GEFILTERD op relevantie voor jouw doelgroep scenarios. Elke ruimte heeft:
- id - unieke identificatie
- name - naam van de ruimte
- description - korte beschrijving van functie en gebruik
- category - categorie (sociaal_en_gastvrij, sport_en_fitness, etc.)
- area_min_m2 en area_max_m2 - minimale en maximale oppervlakte
- m2_per_resident - aanbevolen oppervlakte per bewoner
- target_groups - welke doelgroepen het meest profiteren van deze ruimte

${JSON.stringify(filteredCommunalSpaces, null, 2)}

BELANGRIJK: Deze lijst is al gefilterd op basis van de doelgroep persona's in jouw scenarios. Selecteer de meest geschikte ruimtes die het beste passen bij elk specifiek scenario.

# BESCHIKBARE PUBLIEKE EN COMMERCIËLE RUIMTES
De volgende publieke en commerciële ruimtes zijn VOORAF GEFILTERD op relevantie voor jouw doelgroep scenarios. Deze ruimtes zijn commercieel/publiek-gericht en kunnen inkomsten genereren of publieke functies vervullen:
- id - unieke identificatie
- name - naam van de ruimte
- description - korte beschrijving van functie en gebruik
- category - categorie (food, gezondheid, retail, etc.)
- area_min_m2 en area_max_m2 - minimale en maximale oppervlakte
- m2_per_resident - aanbevolen oppervlakte per bewoner
- target_groups - welke doelgroepen het meest profiteren van deze ruimte

${JSON.stringify(filteredPublicSpaces, null, 2)}

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

4. PUBLIEKE RUIMTES: Selecteer publieke en commerciële ruimtes uit de BESCHIKBARE PUBLIEKE EN COMMERCIËLE RUIMTES lijst die passen bij de target_groups. Kies functies die inkomsten kunnen genereren (retail, horeca, gezondheidszorg) of belangrijke publieke functies vervullen, en die de bestaande voorzieningen in de buurt aanvullen (niet concurreren). BELANGRIJK: Vul ZOWEL de 'commercial' sectie ALS de 'public_spaces' sectie met deze data. Voor public_spaces: groepeer alle geselecteerde ruimtes per category, voeg ze toe aan de 'spaces' array, en bereken het totaal m2 en percentage per categorie in 'category_breakdown'.

5. GEMEENSCHAPPELIJKE RUIMTES: Selecteer gemeenschappelijke ruimtes uit de BESCHIKBARE GEMEENSCHAPPELIJKE RUIMTES lijst die passen bij de target_groups van de doelgroep persona's. Kies ruimtes waarvan de target_groups overeenkomen met de persona's in het scenario. BELANGRIJK: Vul ZOWEL de 'communal' sectie (met amenities array) ALS de 'communal_spaces' sectie met deze data. Voor communal_spaces: groepeer alle geselecteerde ruimtes per category, voeg ze toe aan de 'spaces' array, en bereken het totaal m2 en percentage per categorie in 'category_breakdown'. Zorg ervoor dat ALLE geselecteerde ruimtes in BEIDE secties verschijnen.

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
${JSON.stringify(simplifiedTypologies, null, 2)}

# MAPPING OF PERSONA HOUSING TYPES TO TYPOLOGIES
${mapping.note}

${JSON.stringify(mapping.mappings, null, 2)}

IMPORTANT: Use this mapping to match persona desired housing types with available typologies. If a persona seeks "Affordable 2-room apartment", choose from the typology_ids in the mapping (e.g., "social_housing_70" or "one_bed_55"). Note: ground-level dwellings are NOT available - use the suggested alternatives for those cases.

# AVAILABLE BUILDING AMENITIES
${JSON.stringify(simplifiedAmenities, null, 2)}

# AVAILABLE COMMUNAL SPACES
The following communal spaces have been PRE-FILTERED for relevance to your target group scenarios. Each space has:
- id - unique identifier
- name - name of the space
- description - brief description of function and use
- category - category (sociaal_en_gastvrij, sport_en_fitness, etc.)
- area_min_m2 and area_max_m2 - minimum and maximum area
- m2_per_resident - recommended area per resident
- target_groups - which target groups benefit most from this space

${JSON.stringify(filteredCommunalSpaces, null, 2)}

IMPORTANT: This list is already filtered based on the target group personas in your scenarios. Select the most appropriate spaces that best fit each specific scenario.

# AVAILABLE PUBLIC AND COMMERCIAL SPACES
The following public and commercial spaces have been PRE-FILTERED for relevance to your target group scenarios. These spaces are commercial/public-facing and can generate income or fulfill public functions:
- id - unique identifier
- name - name of the space
- description - brief description of function and use
- category - category (food, gezondheid, retail, etc.)
- area_min_m2 and area_max_m2 - minimum and maximum area
- m2_per_resident - recommended area per resident
- target_groups - which target groups benefit most from this space

${JSON.stringify(filteredPublicSpaces, null, 2)}

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

4. PUBLIC SPACES: Selects public and commercial spaces from the AVAILABLE PUBLIC AND COMMERCIAL SPACES list that match the target_groups. Choose functions that can generate income (retail, hospitality, healthcare) or fulfill important public functions, and complement (not compete with) existing neighborhood amenities. IMPORTANT: Fill BOTH the 'commercial' section AND the 'public_spaces' section with this data. For public_spaces: group all selected spaces by category, add them to the 'spaces' array, and calculate total m2 and percentage per category in 'category_breakdown'.

5. COMMUNAL SPACES: Selects communal spaces from the AVAILABLE COMMUNAL SPACES list that match the target_groups of the target personas. Choose spaces whose target_groups align with the personas in the scenario. IMPORTANT: Fill BOTH the 'communal' section (with amenities array) AND the 'communal_spaces' section with this data. For communal_spaces: group all selected spaces by category, add them to the 'spaces' array, and calculate total m2 and percentage per category in 'category_breakdown'. Ensure that ALL selected spaces appear in BOTH sections.

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

    // Create a custom stream that sends JSON-serialized partial objects
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
