/**
 * Staged Generation Orchestrator
 *
 * Coordinates the multi-stage rapport generation pipeline:
 * Stage 1: Location Analysis (health, safety, livability)
 * Stage 2: Persona & Scenario Analysis
 * Stage 3: PVE & Spaces Allocation
 *
 * Benefits:
 * - ~45% token reduction
 * - Progressive context building
 * - Better quality through focused prompts
 */

import type { CompactLocationExport } from './jsonExportCompact';
import { extractStage1Data, type Stage1Output } from './stagedGenerationData';

// Stage 2 Output type (matches API schema)
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

// Stage 3 Output type (matches API schema)
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

export type StagedGenerationStage =
  | 'idle'
  | 'preparing'
  | 'stage1-location'
  | 'stage2-personas'
  | 'stage3-pve'
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
    demographics_considerations: string;
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

const STAGE_MESSAGES = {
  nl: {
    idle: 'Gereed',
    preparing: 'Voorbereiden...',
    'stage1-location': 'Stap 1/3: Locatie analyseren...',
    'stage2-personas': 'Stap 2/3: Doelgroepen analyseren...',
    'stage3-pve': 'Stap 3/3: Bouwprogramma genereren...',
    combining: 'Resultaten combineren...',
    complete: 'Voltooid!',
    error: 'Fout opgetreden',
  },
  en: {
    idle: 'Ready',
    preparing: 'Preparing...',
    'stage1-location': 'Step 1/3: Analyzing location...',
    'stage2-personas': 'Step 2/3: Analyzing personas...',
    'stage3-pve': 'Step 3/3: Generating building program...',
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
 * Execute Stage 2: Persona & Scenario Analysis
 */
async function executeStage2(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  locale: 'nl' | 'en'
): Promise<Stage2Output> {
  console.log('[Staged Generation] Starting Stage 2: Persona Analysis');

  // Prepare Stage 2 input
  const stageData = {
    locationSummary: stage1Output,
    demographics: data.demographics,
    targetGroups: {
      topPersonas: data.targetGroups.rankedPersonas.slice(0, 15).map(p => ({
        name: p.name,
        rank: p.rank,
        score: p.score,
        incomeLevel: p.incomeLevel,
        householdType: p.householdType,
        ageGroup: p.ageGroup,
        description: p.description,
      })),
      recommendedScenarios: data.targetGroups.recommendedScenarios,
    },
    housingMarket: data.housingMarket ? {
      avgPrice: data.housingMarket.avgPrice,
      avgSize: data.housingMarket.avgSize,
      typeDistribution: data.housingMarket.typeDistribution,
      priceDistribution: data.housingMarket.priceDistribution,
    } : undefined,
  };

  const response = await fetch('/api/generate-building-program/stage2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData, locale }),
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
 * Execute Stage 3: PVE & Spaces Allocation
 */
async function executeStage3(
  data: CompactLocationExport,
  stage1Output: Stage1Output,
  stage2Output: Stage2Output,
  locale: 'nl' | 'en'
): Promise<Stage3Output> {
  console.log('[Staged Generation] Starting Stage 3: PVE Allocation');

  // Prepare Stage 3 input
  const stageData = {
    stage1Output,
    stage2Output,
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

  const response = await fetch('/api/generate-building-program/stage3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageData, locale }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stage 3 failed: ${response.status} - ${errorText}`);
  }

  const result = await consumeSSEStream<Stage3Output>(response);
  console.log('[Staged Generation] Stage 3 complete:', {
    scenarioCount: result.scenarios?.length,
    hasGeneralizedPve: !!result.generalized_pve,
  });

  return result;
}

/**
 * Combine outputs from all stages into final building program
 */
function combineStageOutputs(
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  pve: CompactLocationExport['pve']
): StagedBuildingProgram {
  // Build PVE breakdown string
  const pveBreakdown = pve
    ? `Woningen: ${pve.percentages.apartments.percentage}%, Commercieel: ${pve.percentages.commercial.percentage}%, Horeca: ${pve.percentages.hospitality.percentage}%, Sociaal: ${pve.percentages.social.percentage}%, Gemeenschappelijk: ${pve.percentages.communal.percentage}%, Kantoren: ${pve.percentages.offices.percentage}%`
    : '';

  // Merge Stage 2 scenario analysis with Stage 3 PVE allocations
  const scenarios = stage2.scenarios.map((s2, i) => {
    const s3 = stage3.scenarios[i] || {
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
      residential: s3.residential,
      commercial: s3.commercial,
      hospitality: s3.hospitality,
      social: s3.social,
      communal: s3.communal,
      communal_spaces: s3.communal_spaces,
      public_spaces: s3.public_spaces,
      offices: s3.offices,
      key_insights: s2.key_insights,
    };
  });

  return {
    location_summary: stage1.location_summary,
    pve_overview: {
      total_m2: pve?.totalM2 || 0,
      breakdown: pveBreakdown,
    },
    generalized_pve: stage3.generalized_pve || {
      communal_categories: {},
      public_categories: {},
    },
    scenarios,
    comparative_analysis: stage3.comparative_analysis || '',
  };
}

/**
 * Main orchestration function for staged generation
 */
export async function generateBuildingProgramStaged(
  data: CompactLocationExport,
  locale: 'nl' | 'en',
  onProgress?: (progress: StagedGenerationProgress) => void
): Promise<StagedBuildingProgram> {
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
    // Prepare Stage 1 data
    reportProgress('preparing', 0, 0);
    const stage1Data = extractStage1Data(data);

    // Execute Stage 1: Location Analysis (0-25%)
    reportProgress('stage1-location', 5, 0);
    const stage1Output = await executeStage1(stage1Data, locale);
    reportProgress('stage1-location', 25, 100);

    // Execute Stage 2: Persona & Scenario Analysis (25-50%)
    reportProgress('stage2-personas', 30, 0);
    const stage2Output = await executeStage2(data, stage1Output, locale);
    reportProgress('stage2-personas', 50, 100);

    // Execute Stage 3: PVE & Spaces Allocation (50-90%)
    reportProgress('stage3-pve', 55, 0);
    const stage3Output = await executeStage3(data, stage1Output, stage2Output, locale);
    reportProgress('stage3-pve', 90, 100);

    // Combine all outputs (90-100%)
    reportProgress('combining', 95, 0);
    const combinedProgram = combineStageOutputs(stage1Output, stage2Output, stage3Output, data.pve);
    reportProgress('complete', 100, 100);

    console.log('[Staged Generation] All stages complete!');
    return combinedProgram;

  } catch (error) {
    console.error('[Staged Generation] Error:', error);
    reportProgress('error', 0, 0);
    throw error;
  }
}

/**
 * Get localized stage messages
 */
export function getStageMessages(locale: 'nl' | 'en') {
  return STAGE_MESSAGES[locale];
}
