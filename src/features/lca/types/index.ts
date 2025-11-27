// ============================================
// LCA FEATURE - TYPESCRIPT TYPES
// ============================================

// NOTE: These types will be replaced by Prisma-generated types once the schema is integrated
// For now, we define them manually to allow the build to pass

// ============================================
// DATABASE MODEL TYPES (Manual - TODO: Replace with Prisma types)
// ============================================

export interface Material {
  id: string;
  oekobaudat_uuid: string | null;
  oekobaudat_version: string | null;
  name_de: string;
  name_en: string | null;
  name_nl: string | null;
  category: string;
  subcategory: string | null;
  material_type: string;
  density: number | null;
  bulk_density: number | null;
  area_weight: number | null;
  reference_thickness: number | null;
  thermal_conductivity: number | null;
  declared_unit: string;
  conversion_to_kg: number;
  gwp_a1_a3: number;
  odp_a1_a3: number | null;
  pocp_a1_a3: number | null;
  ap_a1_a3: number | null;
  ep_a1_a3: number | null;
  adpe_a1_a3: number | null;
  adpf_a1_a3: number | null;
  gwp_a4: number | null;
  transport_distance: number | null;
  transport_mode: string | null;
  gwp_a5: number | null;
  gwp_c1: number | null;
  gwp_c2: number | null;
  gwp_c3: number | null;
  gwp_c4: number | null;
  gwp_d: number | null;
  biogenic_carbon: number | null;
  fossil_carbon: number | null;
  reference_service_life: number | null;
  rsl_source: string | null;
  rsl_confidence: string | null;
  eol_scenario: string | null;
  recyclability: number | null;
  region: string;
  dutch_availability: boolean;
  epd_validity: Date | null;
  epd_owner: string | null;
  epd_url: string | null;
  background_database: string | null;
  quality_rating: number;
  is_verified: boolean;
  is_generic: boolean;
  user_id: string | null;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LCAProject {
  id: string;
  name: string;
  description: string | null;
  project_number: string | null;
  gross_floor_area: number;
  building_type: string | null;  // Made optional as it's no longer required in quick start
  construction_system: string | null;
  floors: number;
  dwelling_count: number | null;  // NEW: Number of dwellings
  facade_cladding: string | null;  // NEW: Facade cladding type
  foundation: string | null;  // NEW: Foundation type
  roof: string | null;  // NEW: Roof type
  window_frames: string | null;  // NEW: Window frame material
  window_to_wall_ratio: number | null;  // NEW: Percentage of windows
  study_period: number;
  location: string | null;
  energy_label: string | null;
  heating_system: string | null;
  annual_gas_use: number | null;
  annual_electricity: number | null;
  total_gwp_a1_a3: number | null;
  total_gwp_a4: number | null;
  total_gwp_a5: number | null;
  total_gwp_b4: number | null;
  total_gwp_c: number | null;
  total_gwp_d: number | null;
  total_gwp_sum: number | null;
  total_gwp_per_m2_year: number | null;
  operational_carbon: number | null;
  total_carbon: number | null;
  mpg_reference_value: number | null;
  is_compliant: boolean | null;
  user_id: string;
  is_template: boolean;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LCAElement {
  id: string;
  project_id: string;
  package_id: string | null;  // Reference to package this element was created from
  name: string;
  sfb_code: string | null;
  category: string;
  quantity: number;
  quantity_unit: string;
  description: string | null;
  notes: string | null;
  total_gwp_a1_a3: number | null;
  total_gwp_a4: number | null;
  total_gwp_a5: number | null;
  total_gwp_b4: number | null;
  total_gwp_c: number | null;
  total_gwp_d: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface LCALayer {
  id: string;
  element_id: string;
  position: number;
  material_id: string;
  thickness: number;
  coverage: number;
  custom_lifespan: number | null;
  custom_transport_km: number | null;
  custom_eol_scenario: string | null;
}

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
  | 'clt'
  | 'metselwerk'
  | 'beton'
  | 'staal'
  | 'custom';

export type FacadeCladding =
  | 'hout'
  | 'vezelcement'
  | 'metselwerk'
  | 'metaal'
  | 'stucwerk';

export type Foundation =
  | 'kruipruimte'
  | 'betonplaat'
  | 'souterrain';

export type RoofType =
  | 'plat_bitumen'
  | 'hellend_dakpannen'
  | 'hellend_metaal'
  | 'groendak';

export type WindowFrames =
  | 'pvc'
  | 'hout'
  | 'aluminium';

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

// ============================================
// PACKAGE TYPES
// ============================================

export interface LCAPackage {
  id: string;
  name: string;
  description: string | null;
  category: ElementCategory;
  subcategory: string | null;
  construction_system: ConstructionSystem | null;
  insulation_level: InsulationLevel | null;
  total_thickness: number | null;  // meters
  total_rc_value: number | null;  // m²K/W
  total_weight: number | null;  // kg/m²
  is_template: boolean;
  is_public: boolean;
  user_id: string | null;
  usage_count: number;
  tags: string[] | null;
  created_at: Date;
  updated_at: Date;
}

export interface LCAPackageLayer {
  id: string;
  package_id: string;
  position: number;
  material_id: string;
  thickness: number;  // meters
  coverage: number;  // 0-1
  layer_function: string | null;
  notes: string | null;
}

// Extended types with relations
export interface PackageLayerWithMaterial extends LCAPackageLayer {
  material: Material;
}

export interface PackageWithLayers extends LCAPackage {
  layers: PackageLayerWithMaterial[];
  layer_count?: number;
}

// ============================================
// PACKAGE API TYPES
// ============================================

export interface CreatePackageInput {
  name: string;
  description?: string;
  category: ElementCategory;
  subcategory?: string;
  construction_system?: ConstructionSystem;
  insulation_level?: InsulationLevel;
  is_public?: boolean;
  tags?: string[];
  layers: CreatePackageLayerInput[];
}

export interface CreatePackageLayerInput {
  position: number;
  material_id: string | null;  // null for air cavities
  thickness: number;  // meters
  coverage?: number;  // default: 1.0
  layer_function?: string;
  notes?: string;
}

export interface UpdatePackageInput extends Partial<CreatePackageInput> {
  id: string;
}

export interface PackageSearchParams {
  category?: ElementCategory;
  construction_system?: ConstructionSystem;
  insulation_level?: InsulationLevel;
  is_public?: boolean;
  is_template?: boolean;
  user_only?: boolean;
  search?: string;  // Search in name, description, tags
  tags?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'usage_count' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface ApplyPackageToProjectInput {
  package_id: string;
  project_id: string;
  quantity: number;
  quantity_unit?: string;
  element_name?: string;  // Override default name
}

// ============================================
// PACKAGE STATISTICS
// ============================================

export interface PackageStats {
  total_packages: number;
  by_category: Record<ElementCategory, number>;
  by_construction_system: Record<ConstructionSystem, number>;
  most_used: LCAPackage[];
  recently_added: LCAPackage[];
}

// ============================================
// QUICK START WITH PACKAGES
// ============================================

export interface QuickStartPackageSelections {
  exterior_wall?: string;  // package_id
  roof?: string;
  floor?: string;
  windows?: string;
  foundation?: string;
}
