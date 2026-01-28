/**
 * Staged Generation Orchestrator (4-Stage Pipeline)
 *
 * Coordinates the multi-stage rapport generation pipeline:
 * Stage 1: Location Analysis (health, safety, livability, WMS environmental, full amenities)
 * Stage 2: Persona & Scenario Analysis (with amenity matching and environmental fit)
 * Stage 3: Building Constraints (environmental → design requirements)
 * Stage 4: PVE & Spaces Allocation (constraint-aware)
 *
 * Benefits:
 * - Holistic analysis with cross-correlations
 * - Environmental data informs all stages
 * - Building design constraints derived from data
 * - Better quality through focused prompts
 */

import type { CompactLocationExport } from './jsonExportCompact';
import {
  extractStage1Data,
  extractStage2Data,
  extractStage3ConstraintsData,
  type Stage1Output,
  type Stage1Input,
  type Stage3Output,
} from './stagedGenerationData';
import {
  RapportCache,
  generateInputHash,
  type CachedRapportData,
} from '../data/cache/rapportCache';

// Stage 2 Output type (matches API schema - Enhanced)
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
    persona_amenity_fit: Array<{
      personaName: string;
      fitScore: 'excellent' | 'good' | 'moderate' | 'poor';
      availableRequired: string[];
      missingRequired: string[];
      availablePreferred: string[];
      missingPreferred: string[];
      summary: string;
    }>;
    // NEW: Environmental fit
    environmental_fit: string;
  }>;
}

// Stage 4 Output type (PVE Allocation - was Stage3)
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

export type StagedGenerationStage =
  | 'idle'
  | 'preparing'
  | 'stage1-location'
  | 'stage2-personas'
  | 'stage3-constraints'  // NEW: Building constraints
  | 'stage4-pve'          // Renamed from stage3-pve
  | 'combining'
  | 'complete'
  | 'error';

export interface StagedGenerationProgress {
  stage: StagedGenerationStage;
  progress: number;
  currentStageProgress: number;
  message: string;
}

export interface StagedBuildingProgram {
  location_summary: string;
  // NEW: Environmental and amenity analysis from Stage 1
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
    demographics_considerations: string;
    // NEW: Persona-amenity fit from Stage 2
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
    key_insights: string[];
  }>;
  comparative_analysis: string;
}

const STAGE_MESSAGES = {
  nl: {
    idle: 'Gereed',
    preparing: 'Voorbereiden...',
    'stage1-location': 'Stap 1/4: Locatie en omgeving analyseren...',
    'stage2-personas': 'Stap 2/4: Doelgroepen en voorzieningen matchen...',
    'stage3-constraints': 'Stap 3/4: Bouwkundige eisen afleiden...',
    'stage4-pve': 'Stap 4/4: Bouwprogramma genereren...',
    combining: 'Resultaten combineren...',
    complete: 'Voltooid!',
    error: 'Fout opgetreden',
  },
  en: {
    idle: 'Ready',
    preparing: 'Preparing...',
    'stage1-location': 'Step 1/4: Analyzing location and environment...',
    'stage2-personas': 'Step 2/4: Matching personas and amenities...',
    'stage3-constraints': 'Step 3/4: Deriving building requirements...',
    'stage4-pve': 'Step 4/4: Generating building program...',
    combining: 'Combining results...',
    complete: 'Complete!',
    error: 'Error occurred',
  },
};

/**
 * Helper to consume SSE stream and get final JSON object
 */
async function consumeSSEStream<T>(response: Response): Promise<T> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let lastObject: T | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.slice(6);
          lastObject = JSON.parse(jsonStr) as T;
        } catch {
          // Ignore parsing errors for partial objects
        }
      }
    }
  }

  if (!lastObject) {
    throw new Error('No valid JSON object received from stream');
  }

  return lastObject;
}

/**
 * Execute Stage 1: Location Analysis
 */
async function executeStage1(
  stageData: Stage1Input,
  locale: 'nl' | 'en'
): Promise<Stage1Output> {
  console.log('[Staged Generation] Starting Stage 1: Location Analysis');

  const response = await fetch('/api/generate-building-program/stage1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData, locale }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stage 1 failed: ${response.status} - ${errorText}`);
  }

  const result = await consumeSSEStream<Stage1Output>(response);
  console.log('[Staged Generation] Stage 1 complete:', {
    summaryLength: result.location_summary?.length,
    insightCount: result.key_location_insights?.length,
  });

  return result;
}

/**
 * Execute Stage 2: Persona & Scenario Analysis (Enhanced with amenity matching)
 */
async function executeStage2(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage1Input: Stage1Input,
  locale: 'nl' | 'en'
): Promise<Stage2Output> {
  console.log('[Staged Generation] Starting Stage 2: Persona & Amenity Analysis');

  // Use the extractStage2Data helper to prepare input with amenity matching
  const stage2Input = extractStage2Data(data, stage1Output, stage1Input);

  const response = await fetch('/api/generate-building-program/stage2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData: stage2Input, locale }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stage 2 failed: ${response.status} - ${errorText}`);
  }

  const result = await consumeSSEStream<Stage2Output>(response);
  console.log('[Staged Generation] Stage 2 complete:', {
    scenarioCount: result.scenarios?.length,
  });

  return result;
}

/**
 * Execute Stage 3: Building Constraints (NEW)
 */
async function executeStage3Constraints(
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  stage1Input: Stage1Input,
  locale: 'nl' | 'en'
): Promise<Stage3Output> {
  console.log('[Staged Generation] Starting Stage 3: Building Constraints');

  // Use the extractStage3ConstraintsData helper
  const stage3Input = extractStage3ConstraintsData(stage1Output, stage2Output, stage1Input);

  const response = await fetch('/api/generate-building-program/stage3-constraints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData: stage3Input, locale }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stage 3 (Constraints) failed: ${response.status} - ${errorText}`);
  }

  const result = await consumeSSEStream<Stage3Output>(response);
  console.log('[Staged Generation] Stage 3 complete:', {
    constraintCount: result.constraints?.length,
    opportunityCount: result.amenityOpportunities?.length,
  });

  return result;
}

/**
 * Execute Stage 4: PVE & Spaces Allocation (was Stage 3)
 */
async function executeStage4(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  stage3Output: Stage3Output,
  locale: 'nl' | 'en'
): Promise<Stage4Output> {
  console.log('[Staged Generation] Starting Stage 4: PVE Allocation');

  // Prepare Stage 4 input (includes building constraints from Stage 3)
  const stageData = {
    stage1Output,
    stage2Output,
    buildingConstraints: stage3Output,
    pve: data.pve ? {
      totalM2: data.pve.totalM2,
      percentages: {
        apartments: { percentage: data.pve.percentages.apartments.percentage, m2: data.pve.percentages.apartments.m2 },
        commercial: { percentage: data.pve.percentages.commercial.percentage, m2: data.pve.percentages.commercial.m2 },
        hospitality: { percentage: data.pve.percentages.hospitality.percentage, m2: data.pve.percentages.hospitality.m2 },
        social: { percentage: data.pve.percentages.social.percentage, m2: data.pve.percentages.social.m2 },
        communal: { percentage: data.pve.percentages.communal.percentage, m2: data.pve.percentages.communal.m2 },
        offices: { percentage: data.pve.percentages.offices.percentage, m2: data.pve.percentages.offices.m2 },
      },
    } : {
      totalM2: 10000,
      percentages: {
        apartments: { percentage: 70, m2: 7000 },
        commercial: { percentage: 10, m2: 1000 },
        hospitality: { percentage: 5, m2: 500 },
        social: { percentage: 5, m2: 500 },
        communal: { percentage: 5, m2: 500 },
        offices: { percentage: 5, m2: 500 },
      },
    },
    scenarios: data.targetGroups.recommendedScenarios.map(s => ({
      name: s.name,
      personaNames: s.personaNames,
    })),
  };

  const response = await fetch('/api/generate-building-program/stage4', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData, locale }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stage 4 failed: ${response.status} - ${errorText}`);
  }

  const result = await consumeSSEStream<Stage4Output>(response);
  console.log('[Staged Generation] Stage 4 complete:', {
    scenarioCount: result.scenarios?.length,
    hasGeneralizedPve: !!result.generalized_pve,
  });

  return result;
}

/**
 * Combine outputs from all 4 stages into final building program
 */
function combineStageOutputs(
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  stage4: Stage4Output,
  pve: CompactLocationExport['pve']
): StagedBuildingProgram {
  // Build PVE breakdown string
  const pveBreakdown = pve
    ? `Woningen: ${pve.percentages.apartments.percentage}%, Commercieel: ${pve.percentages.commercial.percentage}%, Horeca: ${pve.percentages.hospitality.percentage}%, Sociaal: ${pve.percentages.social.percentage}%, Gemeenschappelijk: ${pve.percentages.communal.percentage}%, Kantoren: ${pve.percentages.offices.percentage}%`
    : '';

  // Merge Stage 2 scenario analysis with Stage 4 PVE allocations
  const scenarios = stage2.scenarios.map((s2, i) => {
    const s4 = stage4.scenarios[i] || {
      scenario_name: s2.scenario_name,
      residential: { total_m2: 0, unit_mix: [], total_units: 0 },
      commercial: { total_m2: 0, spaces: [], local_amenities_analysis: '' },
      hospitality: { total_m2: 0, concept: '' },
      social: { total_m2: 0, facilities: [] },
      communal: { total_m2: 0, amenities: [], persona_needs_analysis: '' },
      communal_spaces: { total_m2: 0, spaces: [], category_breakdown: {} },
      public_spaces: { total_m2: 0, spaces: [], category_breakdown: {} },
      offices: { total_m2: 0, concept: '' },
    };

    return {
      scenario_name: s2.scenario_name,
      scenario_simple_name: s2.scenario_simple_name,
      target_personas: s2.target_personas,
      summary: s2.summary,
      demographics_considerations: s2.demographics_considerations,
      // NEW: Persona-amenity fit from Stage 2
      persona_amenity_fit: s2.persona_amenity_fit || [],
      environmental_fit: s2.environmental_fit || '',
      // From Stage 4
      residential: s4.residential,
      commercial: s4.commercial,
      hospitality: s4.hospitality,
      social: s4.social,
      communal: s4.communal,
      communal_spaces: s4.communal_spaces,
      public_spaces: s4.public_spaces,
      offices: s4.offices,
      key_insights: s2.key_insights,
    };
  });

  return {
    location_summary: stage1.location_summary,
    // NEW: Environmental and amenity analysis from Stage 1
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
  };
}

/**
 * Result type that includes cache info (updated for 4-stage pipeline)
 */
export interface StagedGenerationResult {
  program: StagedBuildingProgram;
  fromCache: boolean;
  stage1Output: Stage1Output;
  stage2Output: Stage2Output;
  stage3Output: Stage3Output; // Building constraints
  stage4Output: Stage4Output; // PVE allocation
  inputHash: string;
  generationTimeMs?: number;
}

/**
 * Main orchestration function for staged generation (4-stage pipeline)
 * Stage 1: Location + Environment + Amenities
 * Stage 2: Personas + Amenity matching
 * Stage 3: Building Constraints
 * Stage 4: PVE Allocation
 */
export async function generateBuildingProgramStaged(
  data: CompactLocationExport,
  locale: 'nl' | 'en',
  onProgress?: (progress: StagedGenerationProgress) => void,
  options?: {
    skipCache?: boolean; // Force regeneration even if cached
    saveToCache?: boolean; // Save result to cache (default: true)
  }
): Promise<StagedGenerationResult> {
  const startTime = Date.now();
  const cache = new RapportCache(locale);
  const inputHash = generateInputHash(data, locale);
  const shouldSaveToCache = options?.saveToCache !== false;

  const reportProgress = (stage: StagedGenerationStage, progress: number, stageProgress: number) => {
    if (onProgress) {
      onProgress({
        stage,
        progress,
        currentStageProgress: stageProgress,
        message: STAGE_MESSAGES[locale][stage],
      });
    }
  };

  try {
    // Check cache first (unless skipCache is true)
    // Note: Cache structure may need updating for 4-stage pipeline
    if (!options?.skipCache) {
      reportProgress('preparing', 0, 0);
      const cached = cache.get(data);

      if (cached && cached.stage4Output) {
        console.log('[Staged Generation] Cache hit! Using cached data.');
        reportProgress('complete', 100, 100);

        return {
          program: cached.combinedProgram,
          fromCache: true,
          stage1Output: cached.stage1Output,
          stage2Output: cached.stage2Output,
          stage3Output: cached.stage3Output,
          stage4Output: cached.stage4Output,
          inputHash: cached.inputHash,
        };
      }
      console.log('[Staged Generation] Cache miss or old format. Generating new data...');
    }

    // Prepare Stage 1 data (now includes WMS + full amenities)
    reportProgress('preparing', 0, 0);
    const stage1Data = extractStage1Data(data);

    // Execute Stage 1: Location + Environment + Amenities (0-20%)
    reportProgress('stage1-location', 5, 0);
    const stage1Output = await executeStage1(stage1Data, locale);
    reportProgress('stage1-location', 20, 100);

    // Execute Stage 2: Persona & Amenity Matching (20-40%)
    reportProgress('stage2-personas', 25, 0);
    const stage2Output = await executeStage2(data, stage1Output, stage1Data, locale);
    reportProgress('stage2-personas', 40, 100);

    // Execute Stage 3: Building Constraints (40-55%)
    reportProgress('stage3-constraints', 45, 0);
    const stage3Output = await executeStage3Constraints(stage1Output, stage2Output, stage1Data, locale);
    reportProgress('stage3-constraints', 55, 100);

    // Execute Stage 4: PVE & Spaces Allocation (55-90%)
    reportProgress('stage4-pve', 60, 0);
    const stage4Output = await executeStage4(data, stage1Output, stage2Output, stage3Output, locale);
    reportProgress('stage4-pve', 90, 100);

    // Combine all outputs (90-100%)
    reportProgress('combining', 95, 0);
    const combinedProgram = combineStageOutputs(stage1Output, stage2Output, stage3Output, stage4Output, data.pve);

    const generationTimeMs = Date.now() - startTime;

    // Save to cache (full 4-stage pipeline)
    if (shouldSaveToCache) {
      try {
        const saved = cache.save(data, stage1Output, stage2Output, stage3Output, stage4Output, combinedProgram);
        if (saved) {
          console.log('[Staged Generation] Saved to cache (all 4 stages)');
        }
      } catch {
        console.warn('[Staged Generation] Cache save failed');
      }
    }

    reportProgress('complete', 100, 100);
    console.log(`[Staged Generation] All 4 stages complete! (${generationTimeMs}ms)`);

    return {
      program: combinedProgram,
      fromCache: false,
      stage1Output,
      stage2Output,
      stage3Output,
      stage4Output,
      inputHash,
      generationTimeMs,
    };

  } catch (error) {
    console.error('[Staged Generation] Error:', error);
    reportProgress('error', 0, 0);
    throw error;
  }
}

/**
 * Check if rapport data is cached for given input
 */
export function isRapportCached(data: CompactLocationExport, locale: 'nl' | 'en'): boolean {
  const cache = new RapportCache(locale);
  return cache.isCached(data);
}

/**
 * Get cached rapport data if available
 */
export function getCachedRapport(
  data: CompactLocationExport,
  locale: 'nl' | 'en'
): CachedRapportData | null {
  const cache = new RapportCache(locale);
  return cache.get(data);
}

/**
 * Clear rapport cache for specific data
 */
export function clearRapportCache(data: CompactLocationExport, locale: 'nl' | 'en'): void {
  const cache = new RapportCache(locale);
  cache.clear(data);
}

/**
 * Clear all rapport cache
 */
export function clearAllRapportCache(): void {
  const nlCache = new RapportCache('nl');
  const enCache = new RapportCache('en');
  nlCache.clearAll();
  enCache.clearAll();
}

/**
 * Get localized stage messages
 */
export function getStageMessages(locale: 'nl' | 'en') {
  return STAGE_MESSAGES[locale];
}
