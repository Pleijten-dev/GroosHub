/**
 * Staged Generation Data Utilities
 *
 * Extracts minimal data required for each stage of the rapport generation pipeline.
 * This reduces token usage by only sending relevant data per stage.
 *
 * PIPELINE STAGES:
 * 1. Location Analysis: health, safety, livability → location_summary
 * 2. Persona & Scenario: summary + personas + demographics → scenario recommendations
 * 3. PVE Allocation: summaries + spaces → detailed building program
 */

import type { CompactLocationExport, CompactScenario } from './jsonExportCompact';

// ============================================================================
// STAGE 1: Location Analysis Data
// ============================================================================
export interface Stage1Input {
  metadata: {
    location: string;
    municipality?: string;
    district?: string;
    neighborhood?: string;
  };
  health: CompactLocationExport['health'];
  safety: CompactLocationExport['safety'];
  livability: CompactLocationExport['livability'];
  amenities: {
    description: string;
    summary: string; // Simplified summary instead of full items array
    topAmenities: Array<{
      name: string;
      count: number;
      closestDistance: number | null;
    }>;
    missingAmenities: string[]; // Amenities with 0 count
  };
}

export interface Stage1Output {
  location_summary: string;
  key_location_insights: string[];
  health_highlights: string;
  safety_highlights: string;
  livability_highlights: string;
}

/**
 * Extract minimal data for Stage 1 (Location Analysis)
 * Focuses on health, safety, livability - no personas, no spaces
 */
export function extractStage1Data(data: CompactLocationExport): Stage1Input {
  // Summarize amenities instead of sending full list
  const topAmenities = data.amenities.items
    .filter(a => a.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(a => ({
      name: a.name,
      count: a.count,
      closestDistance: a.closestDistance,
    }));

  const missingAmenities = data.amenities.items
    .filter(a => a.count === 0)
    .map(a => a.name);

  const amenitySummary = `${topAmenities.length} types of amenities found nearby. Top categories: ${topAmenities.slice(0, 5).map(a => `${a.name} (${a.count})`).join(', ')}. ${missingAmenities.length > 0 ? `Missing: ${missingAmenities.join(', ')}` : 'All common amenities available.'}`;

  return {
    metadata: {
      location: data.metadata.location,
      municipality: data.metadata.municipality,
      district: data.metadata.district,
      neighborhood: data.metadata.neighborhood,
    },
    health: data.health,
    safety: data.safety,
    livability: data.livability,
    amenities: {
      description: data.amenities.description,
      summary: amenitySummary,
      topAmenities,
      missingAmenities,
    },
  };
}

// ============================================================================
// STAGE 2: Persona & Scenario Analysis Data
// ============================================================================
export interface Stage2Input {
  locationSummary: Stage1Output; // From Stage 1
  demographics: CompactLocationExport['demographics'];
  targetGroups: {
    description: string;
    // Only top personas with simplified data
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
  }>;
}

/**
 * Extract minimal data for Stage 2 (Persona & Scenario Analysis)
 * Uses Stage 1 output + demographics + personas (no spaces data)
 */
export function extractStage2Data(
  data: CompactLocationExport,
  stage1Output: Stage1Output
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

  return {
    locationSummary: stage1Output,
    demographics: data.demographics,
    targetGroups: {
      description: data.targetGroups.description,
      topPersonas,
      recommendedScenarios: data.targetGroups.recommendedScenarios,
    },
    housingMarket,
  };
}

// ============================================================================
// STAGE 3: PVE & Spaces Allocation Data
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

export interface Stage3Input {
  locationSummary: Stage1Output;
  scenarioAnalysis: Stage2Output;
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

export interface Stage3Output {
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
 * Extract minimal data for Stage 3 (PVE & Spaces Allocation)
 * Uses Stage 1+2 outputs + PVE + filtered spaces
 */
export function extractStage3Data(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  communalSpaces: SimplifiedSpace[],
  publicSpaces: SimplifiedSpace[],
  typologies: SimplifiedTypology[],
  typologyMapping: Record<string, string[]>
): Stage3Input {
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
    pve: data.pve,
    scenarioPersonas,
    communalSpaces: filteredCommunal,
    publicSpaces: filteredPublic,
    typologies,
    typologyMapping,
  };
}

// ============================================================================
// COMBINED OUTPUT
// ============================================================================
export interface StagedBuildingProgram {
  location_summary: string;
  pve_overview: {
    total_m2: number;
    breakdown: string;
  };
  generalized_pve: Stage3Output['generalized_pve'];
  scenarios: Array<{
    scenario_name: string;
    scenario_simple_name: string;
    target_personas: string[];
    summary: string;
    // From Stage 2
    demographics_considerations: string;
    // From Stage 3
    residential: Stage3Output['scenarios'][0]['residential'];
    commercial: Stage3Output['scenarios'][0]['commercial'];
    hospitality: Stage3Output['scenarios'][0]['hospitality'];
    social: Stage3Output['scenarios'][0]['social'];
    communal: Stage3Output['scenarios'][0]['communal'];
    communal_spaces: Stage3Output['scenarios'][0]['communal_spaces'];
    public_spaces: Stage3Output['scenarios'][0]['public_spaces'];
    offices: Stage3Output['scenarios'][0]['offices'];
    key_insights: string[];
  }>;
  comparative_analysis: string;
}

/**
 * Combine outputs from all stages into final building program
 */
export function combineStagedOutputs(
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  pve: CompactLocationExport['pve']
): StagedBuildingProgram {
  // Combine scenarios from stage 2 and stage 3
  const scenarios = stage2.scenarios.map((s2, i) => {
    const s3 = stage3.scenarios[i];
    return {
      scenario_name: s2.scenario_name,
      scenario_simple_name: s2.scenario_simple_name,
      target_personas: s2.target_personas,
      summary: s2.summary,
      demographics_considerations: s2.demographics_considerations,
      residential: s3?.residential || {
        total_m2: 0,
        unit_mix: [],
        total_units: 0,
      },
      commercial: s3?.commercial || {
        total_m2: 0,
        spaces: [],
        local_amenities_analysis: '',
      },
      hospitality: s3?.hospitality || {
        total_m2: 0,
        concept: '',
      },
      social: s3?.social || {
        total_m2: 0,
        facilities: [],
      },
      communal: s3?.communal || {
        total_m2: 0,
        amenities: [],
        persona_needs_analysis: '',
      },
      communal_spaces: s3?.communal_spaces || {
        total_m2: 0,
        spaces: [],
        category_breakdown: {},
      },
      public_spaces: s3?.public_spaces || {
        total_m2: 0,
        spaces: [],
        category_breakdown: {},
      },
      offices: s3?.offices || {
        total_m2: 0,
        concept: '',
      },
      key_insights: s2.key_insights,
    };
  });

  const pveBreakdown = pve ? `Woningen: ${pve.percentages.apartments.percentage}%, Commercieel: ${pve.percentages.commercial.percentage}%, Horeca: ${pve.percentages.hospitality.percentage}%, Sociaal: ${pve.percentages.social.percentage}%, Gemeenschappelijk: ${pve.percentages.communal.percentage}%, Kantoren: ${pve.percentages.offices.percentage}%` : '';

  return {
    location_summary: stage1.location_summary,
    pve_overview: {
      total_m2: pve?.totalM2 || 0,
      breakdown: pveBreakdown,
    },
    generalized_pve: stage3.generalized_pve,
    scenarios,
    comparative_analysis: stage3.comparative_analysis,
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
