/**
 * Program Recommendations Types
 * TypeScript type definitions for AI-generated building program recommendations
 */

import type { BuildingProgram } from '@/app/api/generate-building-program/route';

// Re-export the main type from the API
export type { BuildingProgram };

/**
 * Category breakdown for spaces
 */
export interface CategoryBreakdown {
  total_m2: number;
  percentage: number;
}

/**
 * Single amenity/space recommendation
 */
export interface SpaceRecommendation {
  amenity_id: string;
  amenity_name: string;
  size_m2: number;
  rationale: string;
}

/**
 * Single housing unit recommendation
 */
export interface HousingRecommendation {
  typology_id: string;
  typology_name: string;
  quantity: number;
  total_m2: number;
  rationale: string;
}

/**
 * Scenario with recommendations
 */
export interface ScenarioRecommendation {
  scenario_name: string;
  scenario_simple_name: string;
  target_personas: string[];
  summary: string;
  residential: {
    total_m2: number;
    unit_mix: HousingRecommendation[];
    demographics_considerations: string;
    total_units: number;
  };
  communal_spaces: {
    total_m2: number;
    spaces: SpaceRecommendation[];
    category_breakdown: Record<string, CategoryBreakdown>;
  };
  public_spaces: {
    total_m2: number;
    spaces: SpaceRecommendation[];
    category_breakdown: Record<string, CategoryBreakdown>;
  };
  key_insights: string[];
}

/**
 * Generalized PVE category
 */
export interface GeneralizedCategory {
  category_name: string;
  total_m2: number;
  amenities: string[];
}

/**
 * Generalized PVE structure
 */
export interface GeneralizedPVE {
  communal_categories: Record<string, GeneralizedCategory>;
  public_categories: Record<string, GeneralizedCategory>;
}

/**
 * Cached rapport data structure
 * This is what gets stored in localStorage alongside location data
 */
export interface CachedRapportData {
  buildingProgram: BuildingProgram;
  generatedAt: number;
  locale: 'nl' | 'en';
}

/**
 * Utility type for scenario selection
 */
export type ScenarioType = 'scenario1' | 'scenario2' | 'scenario3' | 'custom';

/**
 * Props for scenario selector component
 */
export interface ScenarioSelectorProps {
  scenarios: Array<{
    id: ScenarioType;
    name: string;
    simpleName: string;
  }>;
  activeScenario: ScenarioType;
  onChange: (scenario: ScenarioType) => void;
  locale?: 'nl' | 'en';
}
