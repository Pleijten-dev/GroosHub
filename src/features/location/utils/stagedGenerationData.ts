/**
 * Staged Generation Data Utilities
 *
 * Extracts data required for each stage of the rapport generation pipeline.
 * Now with 4 stages including environmental analysis and building constraints.
 *
 * PIPELINE STAGES:
 * 1. Location Analysis: health, safety, livability, WMS, full amenities → location_summary + environmental analysis
 * 2. Persona & Scenario: summary + personas + demographics + amenity matching → scenario recommendations
 * 3. Building Constraints: environmental data → design requirements and constraints
 * 4. PVE Allocation: summaries + constraints + spaces → detailed building program
 */

import type { CompactLocationExport, CompactScenario } from './jsonExportCompact';

// ============================================================================
// STAGE 1: Location Analysis Data (Enhanced with WMS + Full Amenities)
// ============================================================================

export interface WMSLayerSummary {
  id: string;
  name: string;
  category: string;
  pointValue?: number | string | null;
  averageValue?: number | null;
  maxValue?: number | null;
  unit?: string;
  description: string;
}

export interface FullAmenityData {
  name: string;
  description: string;
  count: number;
  countScore: number;
  proximityCount: number;
  proximityBonus: number;
  closestDistance: number | null;
  averageDistance: number | null;
}

export interface Stage1Input {
  metadata: {
    location: string;
    municipality?: string;
    district?: string;
    neighborhood?: string;
    coordinates?: { lat: number; lon: number };
  };
  health: CompactLocationExport['health'];
  safety: CompactLocationExport['safety'];
  livability: CompactLocationExport['livability'];
  // Full amenities data with distances and scores
  amenities: {
    description: string;
    items: FullAmenityData[];
    summary: string;
    missingAmenities: string[];
    amenityGaps: string[]; // Important amenities that are missing or far away
  };
  // WMS Environmental data - NEW
  environmental?: {
    description: string;
    airQuality: {
      no2?: WMSLayerSummary;
      pm10?: WMSLayerSummary;
      pm25?: WMSLayerSummary;
      summary: string;
    };
    noise: {
      roadTraffic?: WMSLayerSummary;
      summary: string;
    };
    greenSpace: {
      trees?: WMSLayerSummary;
      grass?: WMSLayerSummary;
      shrubs?: WMSLayerSummary;
      treeCanopy?: WMSLayerSummary;
      summary: string;
    };
    climate: {
      heatStress?: WMSLayerSummary;
      rainfall?: WMSLayerSummary;
      summary: string;
    };
    overallAssessment: string;
  };
}

export interface Stage1Output {
  location_summary: string;
  key_location_insights: string[];
  health_highlights: string;
  safety_highlights: string;
  livability_highlights: string;
  // NEW: Environmental analysis
  environmental_highlights: string;
  // NEW: Full amenity analysis with gaps
  amenity_analysis: string;
  // NEW: Cross-correlations between datasets
  cross_correlations: string[];
}

/**
 * Extract data for Stage 1 (Location Analysis)
 * Now includes WMS environmental data and full amenities for holistic analysis
 */
export function extractStage1Data(data: CompactLocationExport): Stage1Input {
  // Full amenities data with distances and scores
  const fullAmenities: FullAmenityData[] = data.amenities.items.map(a => ({
    name: a.name,
    description: a.description,
    count: a.count,
    countScore: a.countScore,
    proximityCount: a.proximityCount,
    proximityBonus: a.proximityBonus,
    closestDistance: a.closestDistance,
    averageDistance: a.averageDistance,
  }));

  const missingAmenities = data.amenities.items
    .filter(a => a.count === 0)
    .map(a => a.name);

  // Important amenities that are missing or far away (>1km)
  const importantAmenities = ['Supermarkt', 'Huisartsen', 'Openbaar vervoer', 'Basisscholen', 'Apotheken'];
  const amenityGaps = data.amenities.items
    .filter(a => {
      const isImportant = importantAmenities.some(imp => a.name.toLowerCase().includes(imp.toLowerCase()));
      const isMissing = a.count === 0;
      const isFar = a.closestDistance !== null && a.closestDistance > 1000;
      return isImportant && (isMissing || isFar);
    })
    .map(a => a.count === 0
      ? `${a.name}: niet aanwezig`
      : `${a.name}: ${a.closestDistance}m (ver weg)`
    );

  const presentAmenities = fullAmenities.filter(a => a.count > 0);
  const amenitySummary = `${presentAmenities.length} types voorzieningen gevonden. ` +
    `Dichtbij (<250m): ${fullAmenities.filter(a => a.proximityCount > 0).map(a => a.name).join(', ') || 'geen'}. ` +
    `${missingAmenities.length > 0 ? `Ontbrekend: ${missingAmenities.join(', ')}` : 'Alle gangbare voorzieningen aanwezig.'}`;

  // Process WMS environmental data if available
  let environmental: Stage1Input['environmental'] = undefined;

  if (data.wmsLayers && data.wmsLayers.layers.length > 0) {
    const findLayer = (idPattern: string) =>
      data.wmsLayers?.layers.find(l => l.id.toLowerCase().includes(idPattern.toLowerCase()));

    const no2Layer = findLayer('no2');
    const pm10Layer = findLayer('pm10');
    const pm25Layer = findLayer('pm25');
    const noiseLayer = findLayer('geluid') || findLayer('noise');
    const treesLayer = findLayer('percbomen') || findLayer('tree');
    const grassLayer = findLayer('gras');
    const shrubsLayer = findLayer('struik');
    const canopyLayer = findLayer('bomenkaart');
    const heatLayer = findLayer('hitte') || findLayer('heat');
    const rainLayer = findLayer('regen') || findLayer('rain');

    // Air quality assessment
    const airQualityValues: number[] = [];
    if (no2Layer?.pointValue && typeof no2Layer.pointValue === 'number') airQualityValues.push(no2Layer.pointValue);
    if (pm10Layer?.pointValue && typeof pm10Layer.pointValue === 'number') airQualityValues.push(pm10Layer.pointValue);

    let airQualitySummary = 'Geen luchtkwaliteitsdata beschikbaar';
    if (airQualityValues.length > 0) {
      const no2Val = no2Layer?.pointValue as number | undefined;
      // WHO guideline for NO2 is 25 µg/m³
      if (no2Val && no2Val < 20) airQualitySummary = 'Goede luchtkwaliteit (NO2 onder WHO-richtlijn)';
      else if (no2Val && no2Val < 30) airQualitySummary = 'Matige luchtkwaliteit (NO2 rond WHO-richtlijn)';
      else if (no2Val) airQualitySummary = 'Verhoogde luchtvervuiling (NO2 boven WHO-richtlijn)';
    }

    // Noise assessment
    const noiseVal = noiseLayer?.pointValue as number | undefined;
    let noiseSummary = 'Geen geluidsdata beschikbaar';
    if (noiseVal) {
      if (noiseVal < 50) noiseSummary = 'Rustige omgeving (geluid <50dB)';
      else if (noiseVal < 60) noiseSummary = 'Normaal geluidsniveau (50-60dB)';
      else if (noiseVal < 70) noiseSummary = 'Verhoogd geluidsniveau (60-70dB) - isolatie aanbevolen';
      else noiseSummary = 'Hoog geluidsniveau (>70dB) - extra geluidsisolatie vereist';
    }

    // Green space assessment
    const treeVal = treesLayer?.pointValue as number | undefined;
    let greenSummary = 'Geen groendata beschikbaar';
    if (treeVal !== undefined) {
      if (treeVal > 30) greenSummary = 'Groene omgeving met veel bomen (>30% boombedekking)';
      else if (treeVal > 15) greenSummary = 'Gemiddelde hoeveelheid groen (15-30% bomen)';
      else greenSummary = 'Beperkt groen aanwezig (<15% bomen) - groene daken/tuinen aanbevolen';
    }

    // Climate assessment
    const heatVal = heatLayer?.averageValue as number | undefined;
    let climateSummary = 'Geen klimaatdata beschikbaar';
    if (heatVal !== undefined) {
      if (heatVal > 0.7) climateSummary = 'Hoog hittestress risico - schaduw en koeling essentieel';
      else if (heatVal > 0.4) climateSummary = 'Gemiddeld hittestress risico - schaduwvoorzieningen aanbevolen';
      else climateSummary = 'Laag hittestress risico';
    }

    // Overall assessment
    const concerns: string[] = [];
    if (airQualitySummary.includes('Verhoogde')) concerns.push('luchtkwaliteit');
    if (noiseSummary.includes('Verhoogd') || noiseSummary.includes('Hoog')) concerns.push('geluid');
    if (greenSummary.includes('Beperkt')) concerns.push('groenvoorziening');
    if (climateSummary.includes('Hoog')) concerns.push('hittestress');

    const overallAssessment = concerns.length === 0
      ? 'Gunstige omgevingscondities voor woningbouw'
      : `Aandachtspunten: ${concerns.join(', ')}. Deze factoren vereisen specifieke ontwerpmaatregelen.`;

    environmental = {
      description: data.wmsLayers.description,
      airQuality: {
        no2: no2Layer ? { ...no2Layer } : undefined,
        pm10: pm10Layer ? { ...pm10Layer } : undefined,
        pm25: pm25Layer ? { ...pm25Layer } : undefined,
        summary: airQualitySummary,
      },
      noise: {
        roadTraffic: noiseLayer ? { ...noiseLayer } : undefined,
        summary: noiseSummary,
      },
      greenSpace: {
        trees: treesLayer ? { ...treesLayer } : undefined,
        grass: grassLayer ? { ...grassLayer } : undefined,
        shrubs: shrubsLayer ? { ...shrubsLayer } : undefined,
        treeCanopy: canopyLayer ? { ...canopyLayer } : undefined,
        summary: greenSummary,
      },
      climate: {
        heatStress: heatLayer ? { ...heatLayer } : undefined,
        rainfall: rainLayer ? { ...rainLayer } : undefined,
        summary: climateSummary,
      },
      overallAssessment,
    };
  }

  return {
    metadata: {
      location: data.metadata.location,
      municipality: data.metadata.municipality,
      district: data.metadata.district,
      neighborhood: data.metadata.neighborhood,
      coordinates: data.metadata.coordinates,
    },
    health: data.health,
    safety: data.safety,
    livability: data.livability,
    amenities: {
      description: data.amenities.description,
      items: fullAmenities,
      summary: amenitySummary,
      missingAmenities,
      amenityGaps,
    },
    environmental,
  };
}

// ============================================================================
// STAGE 2: Persona & Scenario Analysis Data (Enhanced with amenity matching)
// ============================================================================

// Persona-specific amenity requirements
export interface PersonaAmenityRequirements {
  personaType: string; // e.g., 'gezinnen', 'senioren', 'starters'
  requiredAmenities: string[]; // e.g., ['Basisscholen', 'Kinderdagverblijven']
  preferredAmenities: string[]; // e.g., ['Parken', 'Sportfaciliteiten']
}

// Pre-defined persona amenity requirements
export const PERSONA_AMENITY_REQUIREMENTS: PersonaAmenityRequirements[] = [
  {
    personaType: 'gezinnen',
    requiredAmenities: ['Basisscholen', 'Supermarkt', 'Huisartsen'],
    preferredAmenities: ['Kinderdagverblijven', 'Parken', 'Sportfaciliteiten', 'Middelbare scholen'],
  },
  {
    personaType: 'senioren',
    requiredAmenities: ['Huisartsen', 'Apotheken', 'Supermarkt'],
    preferredAmenities: ['Openbaar vervoer', 'Parken', 'Culturele voorzieningen'],
  },
  {
    personaType: 'starters',
    requiredAmenities: ['Openbaar vervoer', 'Supermarkt'],
    preferredAmenities: ['Restaurants', 'Cafés/Bars', 'Sportfaciliteiten'],
  },
  {
    personaType: 'studenten',
    requiredAmenities: ['Openbaar vervoer'],
    preferredAmenities: ['Supermarkt', 'Cafés/Bars', 'Bibliotheken'],
  },
  {
    personaType: 'professionals',
    requiredAmenities: ['Openbaar vervoer', 'Supermarkt'],
    preferredAmenities: ['Restaurants', 'Sportfaciliteiten', 'Cafés/Bars'],
  },
];

export interface Stage2Input {
  locationSummary: Stage1Output; // From Stage 1
  demographics: CompactLocationExport['demographics'];
  targetGroups: {
    description: string;
    topPersonas: Array<{
      name: string;
      rank: number;
      score: number;
      incomeLevel: string;
      householdType: string;
      ageGroup: string;
      description: string;
    }>;
    recommendedScenarios: CompactScenario[];
  };
  housingMarket?: {
    avgPrice: number;
    avgSize: number;
    typeDistribution: Array<{ type: string; percentage: number }>;
    priceDistribution: Array<{ range: string; percentage: number }>;
  };
  // NEW: Amenity data for persona-amenity matching
  amenityAnalysis: {
    summary: string;
    availableAmenities: Array<{
      name: string;
      count: number;
      closestDistance: number | null;
    }>;
    missingAmenities: string[];
    amenityGaps: string[];
  };
  // NEW: Environmental summary for persona fit
  environmentalSummary?: {
    airQuality: string;
    noise: string;
    greenSpace: string;
    climate: string;
    overall: string;
  };
}

export interface PersonaAmenityFit {
  personaName: string;
  fitScore: 'excellent' | 'good' | 'moderate' | 'poor';
  availableRequired: string[];
  missingRequired: string[];
  availablePreferred: string[];
  missingPreferred: string[];
  summary: string;
}

export interface Stage2Output {
  scenarios: Array<{
    scenario_name: string;
    scenario_simple_name: string;
    target_personas: string[];
    summary: string;
    residential_strategy: string;
    demographics_considerations: string;
    key_insights: string[];
    // NEW: Persona-amenity fit analysis
    persona_amenity_fit: PersonaAmenityFit[];
    // NEW: Environmental fit for target personas
    environmental_fit: string;
  }>;
}

/**
 * Extract data for Stage 2 (Persona & Scenario Analysis)
 * Now includes amenity data for persona-amenity matching and environmental summary
 */
export function extractStage2Data(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage1Input: Stage1Input
): Stage2Input {
  // Only include top 15 personas to reduce tokens
  const topPersonas = data.targetGroups.rankedPersonas
    .slice(0, 15)
    .map(p => ({
      name: p.name,
      rank: p.rank,
      score: p.score,
      incomeLevel: p.incomeLevel,
      householdType: p.householdType,
      ageGroup: p.ageGroup,
      description: p.description,
    }));

  // Simplify housing market data
  const housingMarket = data.housingMarket ? {
    avgPrice: data.housingMarket.avgPrice,
    avgSize: data.housingMarket.avgSize,
    typeDistribution: data.housingMarket.typeDistribution,
    priceDistribution: data.housingMarket.priceDistribution,
  } : undefined;

  // Extract amenity analysis from Stage 1 input
  const amenityAnalysis = {
    summary: stage1Input.amenities.summary,
    availableAmenities: stage1Input.amenities.items
      .filter(a => a.count > 0)
      .map(a => ({
        name: a.name,
        count: a.count,
        closestDistance: a.closestDistance,
      })),
    missingAmenities: stage1Input.amenities.missingAmenities,
    amenityGaps: stage1Input.amenities.amenityGaps,
  };

  // Extract environmental summary if available
  const environmentalSummary = stage1Input.environmental ? {
    airQuality: stage1Input.environmental.airQuality.summary,
    noise: stage1Input.environmental.noise.summary,
    greenSpace: stage1Input.environmental.greenSpace.summary,
    climate: stage1Input.environmental.climate.summary,
    overall: stage1Input.environmental.overallAssessment,
  } : undefined;

  return {
    locationSummary: stage1Output,
    demographics: data.demographics,
    targetGroups: {
      description: data.targetGroups.description,
      topPersonas,
      recommendedScenarios: data.targetGroups.recommendedScenarios,
    },
    housingMarket,
    amenityAnalysis,
    environmentalSummary,
  };
}

// ============================================================================
// STAGE 3: Building Constraints (NEW)
// Derives design requirements from environmental data
// ============================================================================

export interface BuildingConstraint {
  category: 'noise' | 'air_quality' | 'climate' | 'green_space' | 'amenity_gap';
  severity: 'critical' | 'important' | 'recommended';
  constraint: string;
  designImplication: string;
  affectedAreas: string[]; // e.g., ['facades', 'ventilation', 'outdoor_spaces']
}

export interface Stage3Input {
  locationSummary: Stage1Output;
  scenarioAnalysis: Stage2Output;
  // Environmental data for constraint derivation
  environmental?: Stage1Input['environmental'];
  // Amenity gaps that building could fill
  amenityGaps: string[];
  missingAmenities: string[];
  // Target personas for persona-specific constraints
  targetPersonas: string[];
}

export interface Stage3Output {
  // Building design constraints derived from environment
  constraints: BuildingConstraint[];
  // Design recommendations grouped by category
  designRecommendations: {
    facade: string[];
    ventilation: string[];
    acoustics: string[];
    outdoor_spaces: string[];
    green_integration: string[];
    climate_adaptation: string[];
  };
  // Commercial/amenity opportunities based on gaps
  amenityOpportunities: Array<{
    type: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
    suggestedSize: string;
  }>;
  // Summary for inclusion in rapport
  constraintsSummary: string;
  opportunitiesSummary: string;
}

/**
 * Extract data for Stage 3 (Building Constraints)
 * Analyzes environmental data to derive design requirements
 */
export function extractStage3ConstraintsData(
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  stage1Input: Stage1Input
): Stage3Input {
  // Get all target personas from scenarios
  const targetPersonas = stage2Output.scenarios.flatMap(s => s.target_personas);
  const uniquePersonas = [...new Set(targetPersonas)];

  return {
    locationSummary: stage1Output,
    scenarioAnalysis: stage2Output,
    environmental: stage1Input.environmental,
    amenityGaps: stage1Input.amenities.amenityGaps,
    missingAmenities: stage1Input.amenities.missingAmenities,
    targetPersonas: uniquePersonas,
  };
}

// ============================================================================
// STAGE 4: PVE & Spaces Allocation Data (was Stage 3)
// Now includes constraint-aware recommendations
// ============================================================================
export interface SimplifiedSpace {
  id: string;
  name: string;
  description: string;
  category: string;
  area_min_m2: number;
  area_max_m2: number;
  m2_per_resident?: number;
  target_groups: string[];
}

export interface SimplifiedTypology {
  id: string;
  name: string;
  description: string;
  size_m2: number;
  rooms: number;
  suitable_for: string[];
}

export interface Stage4Input {
  locationSummary: Stage1Output;
  scenarioAnalysis: Stage2Output;
  // NEW: Building constraints from Stage 3
  buildingConstraints: Stage3Output;
  pve: CompactLocationExport['pve'];
  // Only include personas relevant to the scenarios
  scenarioPersonas: Array<{
    name: string;
    desiredPropertyTypes: string[];
  }>;
  // Filtered spaces based on scenario target groups
  communalSpaces: SimplifiedSpace[];
  publicSpaces: SimplifiedSpace[];
  // Housing typologies with mapping
  typologies: SimplifiedTypology[];
  typologyMapping: Record<string, string[]>;
}

export interface Stage4Output {
  scenarios: Array<{
    scenario_name: string;
    residential: {
      total_m2: number;
      unit_mix: Array<{
        typology_id: string;
        typology_name: string;
        quantity: number;
        total_m2: number;
        rationale: string;
      }>;
      total_units: number;
    };
    commercial: {
      total_m2: number;
      spaces: Array<{
        type: string;
        size_m2: number;
        rationale: string;
      }>;
      local_amenities_analysis: string;
    };
    hospitality: {
      total_m2: number;
      concept: string;
    };
    social: {
      total_m2: number;
      facilities: Array<{
        type: string;
        size_m2: number;
        rationale: string;
      }>;
    };
    communal: {
      total_m2: number;
      amenities: Array<{
        amenity_id: string;
        amenity_name: string;
        size_m2: number;
        rationale: string;
      }>;
      persona_needs_analysis: string;
    };
    communal_spaces: {
      total_m2: number;
      spaces: Array<{
        amenity_id: string;
        amenity_name: string;
        size_m2: number;
        rationale: string;
      }>;
      category_breakdown: Record<string, {
        total_m2: number;
        percentage: number;
      }>;
    };
    public_spaces: {
      total_m2: number;
      spaces: Array<{
        amenity_id: string;
        amenity_name: string;
        size_m2: number;
        rationale: string;
      }>;
      category_breakdown: Record<string, {
        total_m2: number;
        percentage: number;
      }>;
    };
    offices: {
      total_m2: number;
      concept: string;
    };
    // NEW: Constraint-aware design notes
    design_notes: {
      noise_mitigation: string;
      climate_adaptation: string;
      green_integration: string;
    };
  }>;
  generalized_pve: {
    communal_categories: Record<string, {
      category_name: string;
      total_m2: number;
      amenities: string[];
    }>;
    public_categories: Record<string, {
      category_name: string;
      total_m2: number;
      amenities: string[];
    }>;
  };
  comparative_analysis: string;
  // NEW: How constraints influenced the program
  constraints_influence: string;
}

/**
 * Filter spaces by target groups in scenarios
 */
function filterSpacesByScenarios(
  spaces: SimplifiedSpace[],
  scenarios: CompactScenario[]
): SimplifiedSpace[] {
  // Extract all unique persona names from scenarios
  const scenarioPersonaNames = new Set<string>();
  scenarios.forEach(scenario => {
    scenario.personaNames.forEach(name => scenarioPersonaNames.add(name.toLowerCase()));
  });

  // Map persona names to target groups
  const targetGroups = new Set<string>();
  scenarioPersonaNames.forEach(name => {
    if (name.includes('starter') || name.includes('jong')) {
      targetGroups.add('starters');
      targetGroups.add('jonge_professionals');
    }
    if (name.includes('gezin') || name.includes('familie') || name.includes('family')) {
      targetGroups.add('gezinnen');
    }
    if (name.includes('senior') || name.includes('oudere')) {
      targetGroups.add('senioren');
    }
    if (name.includes('student')) {
      targetGroups.add('studenten');
    }
    if (name.includes('professional')) {
      targetGroups.add('jonge_professionals');
    }
  });

  // If no specific groups identified, return all
  if (targetGroups.size === 0) return spaces;

  // Filter spaces matching target groups or universal spaces
  return spaces.filter(space => {
    const matchesGroup = space.target_groups.some(tg => targetGroups.has(tg));
    const isUniversal = space.target_groups.includes('alle') || space.target_groups.includes('all');
    return matchesGroup || isUniversal;
  });
}

/**
 * Extract data for Stage 4 (PVE & Spaces Allocation)
 * Uses Stage 1+2+3 outputs + PVE + filtered spaces
 * Now constraint-aware based on Stage 3 building constraints
 */
export function extractStage4Data(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  stage3Output: Stage3Output,
  communalSpaces: SimplifiedSpace[],
  publicSpaces: SimplifiedSpace[],
  typologies: SimplifiedTypology[],
  typologyMapping: Record<string, string[]>
): Stage4Input {
  // Get personas relevant to scenarios
  const scenarioPersonaNames = new Set<string>();
  data.targetGroups.recommendedScenarios.forEach(s => {
    s.personaNames.forEach(name => scenarioPersonaNames.add(name));
  });

  // Note: We need housing personas with desired property types
  // This would need to be passed in or looked up
  const scenarioPersonas = Array.from(scenarioPersonaNames).map(name => ({
    name,
    desiredPropertyTypes: [] as string[], // Will be filled by caller
  }));

  // Filter spaces based on scenarios
  const filteredCommunal = filterSpacesByScenarios(communalSpaces, data.targetGroups.recommendedScenarios);
  const filteredPublic = filterSpacesByScenarios(publicSpaces, data.targetGroups.recommendedScenarios);

  return {
    locationSummary: stage1Output,
    scenarioAnalysis: stage2Output,
    buildingConstraints: stage3Output,
    pve: data.pve,
    scenarioPersonas,
    communalSpaces: filteredCommunal,
    publicSpaces: filteredPublic,
    typologies,
    typologyMapping,
  };
}

// ============================================================================
// COMBINED OUTPUT (Updated for 4-stage pipeline)
// ============================================================================
export interface StagedBuildingProgram {
  location_summary: string;
  // NEW: Environmental analysis from Stage 1
  environmental_highlights: string;
  amenity_analysis: string;
  cross_correlations: string[];
  // NEW: Building constraints from Stage 3
  building_constraints: {
    summary: string;
    opportunities: string;
    constraints: Stage3Output['constraints'];
    design_recommendations: Stage3Output['designRecommendations'];
    amenity_opportunities: Stage3Output['amenityOpportunities'];
  };
  pve_overview: {
    total_m2: number;
    breakdown: string;
  };
  generalized_pve: Stage4Output['generalized_pve'];
  scenarios: Array<{
    scenario_name: string;
    scenario_simple_name: string;
    target_personas: string[];
    summary: string;
    // From Stage 2
    demographics_considerations: string;
    persona_amenity_fit: Stage2Output['scenarios'][0]['persona_amenity_fit'];
    environmental_fit: string;
    // From Stage 4
    residential: Stage4Output['scenarios'][0]['residential'];
    commercial: Stage4Output['scenarios'][0]['commercial'];
    hospitality: Stage4Output['scenarios'][0]['hospitality'];
    social: Stage4Output['scenarios'][0]['social'];
    communal: Stage4Output['scenarios'][0]['communal'];
    communal_spaces: Stage4Output['scenarios'][0]['communal_spaces'];
    public_spaces: Stage4Output['scenarios'][0]['public_spaces'];
    offices: Stage4Output['scenarios'][0]['offices'];
    design_notes: Stage4Output['scenarios'][0]['design_notes'];
    key_insights: string[];
  }>;
  comparative_analysis: string;
  constraints_influence: string;
}

/**
 * Combine outputs from all 4 stages into final building program
 */
export function combineStagedOutputs(
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  stage4: Stage4Output,
  pve: CompactLocationExport['pve']
): StagedBuildingProgram {
  // Combine scenarios from stage 2 and stage 4
  const scenarios = stage2.scenarios.map((s2, i) => {
    const s4 = stage4.scenarios[i];
    return {
      scenario_name: s2.scenario_name,
      scenario_simple_name: s2.scenario_simple_name,
      target_personas: s2.target_personas,
      summary: s2.summary,
      demographics_considerations: s2.demographics_considerations,
      persona_amenity_fit: s2.persona_amenity_fit || [],
      environmental_fit: s2.environmental_fit || '',
      residential: s4?.residential || {
        total_m2: 0,
        unit_mix: [],
        total_units: 0,
      },
      commercial: s4?.commercial || {
        total_m2: 0,
        spaces: [],
        local_amenities_analysis: '',
      },
      hospitality: s4?.hospitality || {
        total_m2: 0,
        concept: '',
      },
      social: s4?.social || {
        total_m2: 0,
        facilities: [],
      },
      communal: s4?.communal || {
        total_m2: 0,
        amenities: [],
        persona_needs_analysis: '',
      },
      communal_spaces: s4?.communal_spaces || {
        total_m2: 0,
        spaces: [],
        category_breakdown: {},
      },
      public_spaces: s4?.public_spaces || {
        total_m2: 0,
        spaces: [],
        category_breakdown: {},
      },
      offices: s4?.offices || {
        total_m2: 0,
        concept: '',
      },
      design_notes: s4?.design_notes || {
        noise_mitigation: '',
        climate_adaptation: '',
        green_integration: '',
      },
      key_insights: s2.key_insights,
    };
  });

  const pveBreakdown = pve ? `Woningen: ${pve.percentages.apartments.percentage}%, Commercieel: ${pve.percentages.commercial.percentage}%, Horeca: ${pve.percentages.hospitality.percentage}%, Sociaal: ${pve.percentages.social.percentage}%, Gemeenschappelijk: ${pve.percentages.communal.percentage}%, Kantoren: ${pve.percentages.offices.percentage}%` : '';

  return {
    location_summary: stage1.location_summary,
    // NEW: Environmental analysis from Stage 1
    environmental_highlights: stage1.environmental_highlights || '',
    amenity_analysis: stage1.amenity_analysis || '',
    cross_correlations: stage1.cross_correlations || [],
    // NEW: Building constraints from Stage 3
    building_constraints: {
      summary: stage3.constraintsSummary || '',
      opportunities: stage3.opportunitiesSummary || '',
      constraints: stage3.constraints || [],
      design_recommendations: stage3.designRecommendations || {
        facade: [],
        ventilation: [],
        acoustics: [],
        outdoor_spaces: [],
        green_integration: [],
        climate_adaptation: [],
      },
      amenity_opportunities: stage3.amenityOpportunities || [],
    },
    pve_overview: {
      total_m2: pve?.totalM2 || 0,
      breakdown: pveBreakdown,
    },
    generalized_pve: stage4.generalized_pve || {
      communal_categories: {},
      public_categories: {},
    },
    scenarios,
    comparative_analysis: stage4.comparative_analysis || '',
    constraints_influence: stage4.constraints_influence || '',
  };
}

/**
 * Estimate token usage for each stage
 */
export function estimateTokenUsage(data: CompactLocationExport): {
  stage1: number;
  stage2: number;
  stage3: number;
  total: number;
  originalTotal: number;
  savings: number;
} {
  // Rough estimates: 1 token ≈ 4 characters
  const stage1Data = extractStage1Data(data);
  const stage1Tokens = Math.ceil(JSON.stringify(stage1Data).length / 4);

  // Stage 2 estimate (demographics + top 15 personas + summaries)
  const stage2Tokens = Math.ceil((
    JSON.stringify(data.demographics).length +
    JSON.stringify(data.targetGroups.rankedPersonas.slice(0, 15)).length +
    2000 // Stage 1 output
  ) / 4);

  // Stage 3 estimate (PVE + filtered spaces + summaries)
  const stage3Tokens = Math.ceil((
    JSON.stringify(data.pve || {}).length +
    20000 + // Filtered spaces (estimate)
    4000 // Stage 1+2 outputs
  ) / 4);

  const total = stage1Tokens + stage2Tokens + stage3Tokens;
  const originalTotal = Math.ceil(JSON.stringify(data).length / 4);
  const savings = Math.round((1 - total / originalTotal) * 100);

  return {
    stage1: stage1Tokens,
    stage2: stage2Tokens,
    stage3: stage3Tokens,
    total,
    originalTotal,
    savings,
  };
}
