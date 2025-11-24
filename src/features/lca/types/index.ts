// ============================================
// LCA FEATURE - TYPESCRIPT TYPES
// ============================================

import type { Material, LCAProject, LCAElement, LCALayer } from '@prisma/client';

// ============================================
// CALCULATION TYPES
// ============================================

export interface LCAResult {
  a1_a3: number;
  a4: number;
  a5: number;
  b4: number;
  c1_c2: number;
  c3: number;
  c4: number;
  d: number;
  total_a_to_c: number;  // For MPG compliance
  total_with_d: number;   // Including circularity
  breakdown_by_element: ElementBreakdown[];
  breakdown_by_phase: PhaseBreakdown;
}

export interface ElementBreakdown {
  element_id: string;
  element_name: string;
  total_impact: number;
  percentage: number;
}

export interface PhaseBreakdown {
  production: number;      // A1-A3
  transport: number;        // A4
  construction: number;     // A5
  use_replacement: number;  // B4
  end_of_life: number;      // C
  benefits: number;         // D
}

export interface NormalizedResult extends LCAResult {
  per_m2: number;
  per_m2_per_year: number;
}

export interface ElementResult {
  a1_a3: number;
  a4: number;
  a5: number;
  b4: number;
  c: number;
  d: number;
  total: number;
}

// ============================================
// PROJECT TYPES
// ============================================

export interface CreateProjectInput {
  name: string;
  description?: string;
  gross_floor_area: number;
  building_type: BuildingType;
  construction_system?: ConstructionSystem;
  study_period?: number;
  energy_label?: EnergyLabel;
}

export type BuildingType =
  | 'vrijstaand'
  | 'twee_onder_een_kap'
  | 'rijwoning'
  | 'appartement'
  | 'custom';

export type ConstructionSystem =
  | 'houtskelet'
  | 'clv'
  | 'metselwerk'
  | 'beton'
  | 'staal'
  | 'custom';

export type EnergyLabel =
  | 'A++++'
  | 'A+++'
  | 'A++'
  | 'A+'
  | 'A'
  | 'B'
  | 'C'
  | 'D';

export type InsulationLevel =
  | 'rc_3.5'
  | 'rc_5.0'
  | 'rc_6.0'
  | 'rc_8.0';

// ============================================
// ELEMENT TYPES
// ============================================

export interface CreateElementInput {
  project_id: string;
  name: string;
  sfb_code?: string;
  category: ElementCategory;
  quantity: number;
  quantity_unit?: string;
  description?: string;
}

export type ElementCategory =
  | 'exterior_wall'
  | 'interior_wall'
  | 'floor'
  | 'roof'
  | 'foundation'
  | 'windows'
  | 'doors'
  | 'mep'
  | 'finishes'
  | 'other';

// ============================================
// LAYER TYPES
// ============================================

export interface CreateLayerInput {
  element_id: string;
  position: number;
  material_id: string;
  thickness: number;  // meters
  coverage?: number;  // 0-1
  custom_lifespan?: number;
  custom_transport_km?: number;
  custom_eol_scenario?: string;
}

// ============================================
// MATERIAL TYPES
// ============================================

export interface MaterialSearchParams {
  search?: string;
  category?: string;
  subcategory?: string;
  dutch_availability?: boolean;
  min_quality_rating?: number;
  is_generic?: boolean;
}

export type MaterialCategory =
  | 'insulation'
  | 'concrete'
  | 'timber'
  | 'masonry'
  | 'metal'
  | 'glass'
  | 'finishes'
  | 'roofing'
  | 'hvac'
  | 'other';

export type TransportMode = 'truck' | 'train' | 'ship' | 'combined';

export type EOLScenario = 'recycling' | 'incineration' | 'landfill' | 'reuse';

// ============================================
// TEMPLATE TYPES
// ============================================

export interface TemplateElementData {
  name: string;
  sfb_code?: string;
  category: ElementCategory;
  area_factor: number;  // m² per m² GFA
  layers: TemplateLayerData[];
}

export interface TemplateLayerData {
  material_search: string;  // Search string to find material
  material_id?: string;     // Resolved material ID
  thickness: number;        // meters
  coverage: number;         // 0-1
}

// ============================================
// QUICK START TYPES
// ============================================

export interface QuickStartFormData {
  name: string;
  gfa: string;
  buildingType: BuildingType;
  constructionSystem: ConstructionSystem;
  insulationLevel: InsulationLevel;
  energyLabel: EnergyLabel;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CalculationResponse {
  success: boolean;
  result: NormalizedResult;
  operational: number;
  total_carbon: number;
}

// ============================================
// IMPORT/EXPORT TYPES
// ============================================

export interface GrasshopperExportData {
  project_name: string;
  gross_floor_area: number;
  elements: GrasshopperElement[];
  source: 'grasshopper';
  timestamp: string;
}

export interface GrasshopperElement {
  name: string;
  category: ElementCategory;
  material: string;
  quantity: number;
  quantity_unit: string;
  geometry_id: string;
}

export interface RevitExportData {
  project_name: string;
  gross_floor_area: number;
  elements: RevitElement[];
  source: 'revit';
  revit_version?: string;
}

export interface RevitElement {
  name: string;
  category: ElementCategory;
  quantity: number;
  quantity_unit: string;
  layers: RevitLayer[];
}

export interface RevitLayer {
  material_name: string;
  thickness: number;  // meters
  function: string;
}

// ============================================
// SCORING CONFIG
// ============================================

export interface ScoringConfig {
  comparisonType: 'relatief' | 'absoluut';
  baseValue: number | null;
  direction: 'positive' | 'negative';  // Higher is better vs lower is better
  margin: number;  // ±20% default
}

// ============================================
// EXTENDED TYPES WITH RELATIONS
// ============================================

export interface ElementWithLayers extends LCAElement {
  layers: LayerWithMaterial[];
}

export interface LayerWithMaterial extends LCALayer {
  material: Material;
}

export interface ProjectWithElements extends LCAProject {
  elements: ElementWithLayers[];
}

// ============================================
// TRANSPORT EMISSION FACTORS
// ============================================

export const TRANSPORT_EMISSION_FACTORS: Record<TransportMode, number> = {
  truck: 0.062,      // kg CO2-eq per tonne-km
  train: 0.022,
  ship: 0.008,
  combined: 0.050
};

// ============================================
// DEFAULT VALUES
// ============================================

export const DEFAULT_TRANSPORT_DISTANCES: Record<string, number> = {
  concrete: 50,      // Local
  masonry: 50,
  timber: 200,       // National
  metal: 500,        // European
  insulation: 500,
  glass: 500,
  finishes: 200,
  default: 300
};

export const DEFAULT_LIFESPANS: Record<string, number> = {
  concrete: 100,
  timber: 75,
  masonry: 100,
  metal: 75,
  insulation: 50,
  glass: 30,
  finishes: 25,
  default: 50
};

export const A5_FACTORS: Record<ElementCategory, number> = {
  exterior_wall: 0.05,
  interior_wall: 0.03,
  floor: 0.04,
  roof: 0.06,
  foundation: 0.08,
  windows: 0.02,
  doors: 0.02,
  mep: 0.10,
  finishes: 0.03,
  other: 0.05
};

export const OPERATIONAL_CARBON_BY_LABEL: Record<EnergyLabel, number> = {
  'A++++': 5,
  'A+++': 8,
  'A++': 12,
  'A+': 18,
  'A': 25,
  'B': 35,
  'C': 45,
  'D': 55
};
