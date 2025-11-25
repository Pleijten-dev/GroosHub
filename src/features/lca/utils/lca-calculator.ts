// ============================================
// LCA CALCULATOR - CORE CALCULATION ENGINE
// ============================================

import { getDbConnection } from '@/lib/db/connection';
import type {
  Material,
  LCAProject,
  LCAResult,
  ElementResult,
  ElementWithLayers,
  NormalizedResult,
  ElementBreakdown,
  LCAElement,
  LCALayer
} from '../types';

// Import all phase calculations
import {
  calculateA1A3,
  calculateA4,
  calculateA5,
  calculateB4,
  calculateC,
  calculateD,
  calculateOperationalCarbon
} from './calculations';

// ============================================
// DATA TRANSFORMATION HELPER
// ============================================

interface ProjectRow {
  // Project fields
  id: string;
  name: string;
  description: string | null;
  project_number: string | null;
  gross_floor_area: number;
  study_period: number;
  building_type: string;
  construction_system: string;
  floors: number;
  location: string | null;
  energy_label: string | null;
  heating_system: string | null;
  annual_gas_use: number | null;
  annual_electricity: number | null;
  user_id: number;
  is_template: boolean;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
  // Element fields (nullable)
  element_id: string | null;
  element_name: string | null;
  element_category: string | null;
  element_sfb_code: string | null;
  element_quantity: number | null;
  element_quantity_unit: string | null;
  // Layer fields (nullable)
  layer_id: string | null;
  layer_position: number | null;
  layer_thickness: number | null;
  layer_coverage: number | null;
  layer_custom_lifespan: number | null;
  layer_custom_transport_km: number | null;
  layer_custom_eol_scenario: string | null;
  // Material fields (all Material interface fields)
  material_id: string | null;
  oekobaudat_uuid: string | null;
  name_de: string | null;
  name_en: string | null;
  name_nl: string | null;
  category: string | null;
  subcategory: string | null;
  material_type: string | null;
  density: number | null;
  bulk_density: number | null;
  declared_unit: string | null;
  conversion_to_kg: number | null;
  gwp_a1_a3: number | null;
  gwp_a4: number | null;
  gwp_a5: number | null;
  gwp_c1: number | null;
  gwp_c2: number | null;
  gwp_c3: number | null;
  gwp_c4: number | null;
  gwp_d: number | null;
  biogenic_carbon: number | null;
  reference_service_life: number | null;
  transport_distance: number | null;
  transport_mode: string | null;
}

interface ProjectWithElements extends LCAProject {
  elements: ElementWithLayers[];
}

function transformToNestedStructure(rows: ProjectRow[]): ProjectWithElements {
  if (rows.length === 0) {
    throw new Error('No project data found');
  }

  const firstRow = rows[0];

  // Extract project data (same for all rows)
  const project: LCAProject = {
    id: firstRow.id,
    name: firstRow.name,
    description: firstRow.description,
    project_number: firstRow.project_number,
    gross_floor_area: firstRow.gross_floor_area,
    building_type: firstRow.building_type,
    construction_system: firstRow.construction_system,
    floors: firstRow.floors,
    study_period: firstRow.study_period,
    location: firstRow.location,
    energy_label: firstRow.energy_label,
    heating_system: firstRow.heating_system,
    annual_gas_use: firstRow.annual_gas_use,
    annual_electricity: firstRow.annual_electricity,
    total_gwp_a1_a3: null,
    total_gwp_a4: null,
    total_gwp_a5: null,
    total_gwp_b4: null,
    total_gwp_c: null,
    total_gwp_d: null,
    total_gwp_sum: null,
    total_gwp_per_m2_year: null,
    operational_carbon: null,
    total_carbon: null,
    mpg_reference_value: null,
    is_compliant: null,
    user_id: firstRow.user_id,
    is_template: firstRow.is_template,
    is_public: firstRow.is_public,
    created_at: firstRow.created_at,
    updated_at: firstRow.updated_at
  };

  // Group rows by element_id
  const elementsMap = new Map<string, ElementWithLayers>();

  rows.forEach(row => {
    if (!row.element_id) return; // Skip if no element

    // Get or create element
    if (!elementsMap.has(row.element_id)) {
      const element: LCAElement = {
        id: row.element_id,
        project_id: project.id,
        name: row.element_name!,
        sfb_code: row.element_sfb_code,
        category: row.element_category!,
        quantity: row.element_quantity!,
        quantity_unit: row.element_quantity_unit!,
        description: null,
        notes: null,
        total_gwp_a1_a3: null,
        total_gwp_a4: null,
        total_gwp_a5: null,
        total_gwp_b4: null,
        total_gwp_c: null,
        total_gwp_d: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      elementsMap.set(row.element_id, {
        ...element,
        layers: []
      });
    }

    const element = elementsMap.get(row.element_id)!;

    // Add layer if present
    if (row.layer_id && row.material_id) {
      const material: Material = {
        id: row.material_id,
        oekobaudat_uuid: row.oekobaudat_uuid,
        oekobaudat_version: null,
        name_de: row.name_de!,
        name_en: row.name_en,
        name_nl: row.name_nl,
        category: row.category!,
        subcategory: row.subcategory,
        material_type: row.material_type,
        density: row.density,
        bulk_density: row.bulk_density,
        area_weight: null,
        reference_thickness: null,
        thermal_conductivity: null,
        declared_unit: row.declared_unit!,
        conversion_to_kg: row.conversion_to_kg!,
        gwp_a1_a3: row.gwp_a1_a3!,
        odp_a1_a3: null,
        pocp_a1_a3: null,
        ap_a1_a3: null,
        ep_a1_a3: null,
        adpe_a1_a3: null,
        adpf_a1_a3: null,
        gwp_a4: row.gwp_a4,
        transport_distance: row.transport_distance,
        transport_mode: row.transport_mode,
        gwp_a5: row.gwp_a5,
        gwp_c1: row.gwp_c1,
        gwp_c2: row.gwp_c2,
        gwp_c3: row.gwp_c3,
        gwp_c4: row.gwp_c4,
        gwp_d: row.gwp_d,
        biogenic_carbon: row.biogenic_carbon,
        fossil_carbon: null,
        reference_service_life: row.reference_service_life,
        rsl_source: null,
        rsl_confidence: null,
        eol_scenario: null,
        recyclability: null,
        region: null,
        dutch_availability: true,
        epd_validity: null,
        epd_owner: null,
        epd_url: null,
        background_database: null,
        quality_rating: null,
        is_verified: false,
        is_generic: false,
        user_id: null,
        is_public: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const layer: LCALayer & { material: Material } = {
        id: row.layer_id,
        element_id: row.element_id,
        position: row.layer_position!,
        material_id: row.material_id,
        thickness: row.layer_thickness!,
        coverage: row.layer_coverage!,
        custom_lifespan: row.layer_custom_lifespan,
        custom_transport_km: row.layer_custom_transport_km,
        custom_eol_scenario: row.layer_custom_eol_scenario,
        material
      };

      element.layers.push(layer);
    }
  });

  return {
    ...project,
    elements: Array.from(elementsMap.values())
  };
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export async function calculateProjectLCA(
  projectId: string
): Promise<LCAResult> {
  const sql = getDbConnection();

  // Load project data with JOINs
  const projectRows = await sql`
    SELECT
      p.id,
      p.name,
      p.description,
      p.project_number,
      p.gross_floor_area,
      p.study_period,
      p.building_type,
      p.construction_system,
      p.floors,
      p.location,
      p.energy_label,
      p.heating_system,
      p.annual_gas_use,
      p.annual_electricity,
      p.user_id,
      p.is_template,
      p.is_public,
      p.created_at,
      p.updated_at,
      e.id as element_id,
      e.name as element_name,
      e.category as element_category,
      e.sfb_code as element_sfb_code,
      e.quantity as element_quantity,
      e.quantity_unit as element_quantity_unit,
      l.id as layer_id,
      l.position as layer_position,
      l.thickness as layer_thickness,
      l.coverage as layer_coverage,
      l.custom_lifespan as layer_custom_lifespan,
      l.custom_transport_km as layer_custom_transport_km,
      l.custom_eol_scenario as layer_custom_eol_scenario,
      m.id as material_id,
      m.oekobaudat_uuid,
      m.name_de,
      m.name_en,
      m.name_nl,
      m.category,
      m.subcategory,
      m.material_type,
      m.density,
      m.bulk_density,
      m.declared_unit,
      m.conversion_to_kg,
      m.gwp_a1_a3,
      m.gwp_a4,
      m.gwp_a5,
      m.gwp_c1,
      m.gwp_c2,
      m.gwp_c3,
      m.gwp_c4,
      m.gwp_d,
      m.biogenic_carbon,
      m.reference_service_life,
      m.transport_distance,
      m.transport_mode
    FROM lca_projects p
    LEFT JOIN lca_elements e ON e.project_id = p.id
    LEFT JOIN lca_layers l ON l.element_id = e.id
    LEFT JOIN lca_materials m ON m.id = l.material_id
    WHERE p.id = ${projectId}
    ORDER BY e.id, l.position
  `;

  if (projectRows.length === 0) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Transform flat rows into nested structure
  const project = transformToNestedStructure(projectRows as unknown as ProjectRow[]);

  // Initialize accumulators
  let totalA1A3 = 0;
  let totalA4 = 0;
  let totalA5 = 0;
  let totalB4 = 0;
  let totalC = 0;
  let totalD = 0;

  const elementBreakdown: ElementBreakdown[] = [];

  // Calculate each element
  const DEBUG = process.env.LCA_DEBUG === 'true';
  for (const element of project.elements) {
    const elementResult = await calculateElement(element as ElementWithLayers, project.study_period);

    if (DEBUG) {
      console.log(`\n=== Element: ${element.name} ===`);
      console.log(`  Result - A1-A3: ${elementResult.a1_a3}, A4: ${elementResult.a4}, A5: ${elementResult.a5}`);
      console.log(`  Result - B4: ${elementResult.b4}, C: ${elementResult.c}, D: ${elementResult.d}`);
    }

    totalA1A3 += elementResult.a1_a3;
    totalA4 += elementResult.a4;
    totalA5 += elementResult.a5;
    totalB4 += elementResult.b4;
    totalC += elementResult.c;
    totalD += elementResult.d;

    if (DEBUG) {
      console.log(`  Totals after - A1-A3: ${totalA1A3}, C: ${totalC}, D: ${totalD}`);
    }

    elementBreakdown.push({
      element_id: element.id,
      element_name: element.name,
      total_impact: elementResult.total,
      percentage: 0 // Calculate after total known
    });
  }

  if (DEBUG) {
    console.log(`\n=== Final Totals ===`);
    console.log(`  totalC: ${totalC}`);
    console.log(`  totalC * 0.3: ${totalC * 0.3}`);
  }

  const totalAToC = totalA1A3 + totalA4 + totalA5 + totalB4 + totalC;

  // Calculate percentages
  elementBreakdown.forEach(eb => {
    eb.percentage = totalAToC > 0 ? (eb.total_impact / totalAToC) * 100 : 0;
  });

  // Calculate normalized results
  const normalizedResult = normalizeResults(
    {
      a1_a3: totalA1A3,
      a4: totalA4,
      a5: totalA5,
      b4: totalB4,
      c1_c2: totalC * 0.3,
      c3: totalC * 0.3,
      c4: totalC * 0.4,
      d: totalD,
      total_a_to_c: totalAToC,
      total_with_d: totalAToC + totalD,
      breakdown_by_element: elementBreakdown,
      breakdown_by_phase: {
        production: totalA1A3,
        transport: totalA4,
        construction: totalA5,
        use_replacement: totalB4,
        end_of_life: totalC,
        benefits: totalD
      }
    },
    project.gross_floor_area,
    project.study_period
  );

  // Calculate operational carbon
  const operationalCarbon = calculateOperationalCarbon(project);

  // Get MPG reference value
  const mpgReferenceResult = await sql`
    SELECT mpg_limit
    FROM lca_reference_values
    WHERE building_type = ${project.building_type}
    LIMIT 1
  `;
  const mpgReference = mpgReferenceResult.length > 0 ? mpgReferenceResult[0].mpg_limit : 0;

  // Update project with cached results
  await sql`
    UPDATE lca_projects
    SET
      total_gwp_a1_a3 = ${totalA1A3},
      total_gwp_a4 = ${totalA4},
      total_gwp_a5 = ${totalA5},
      total_gwp_b4 = ${totalB4},
      total_gwp_c = ${totalC},
      total_gwp_d = ${totalD},
      total_gwp_sum = ${totalAToC},
      total_gwp_per_m2_year = ${normalizedResult.per_m2_per_year},
      operational_carbon = ${operationalCarbon},
      total_carbon = ${normalizedResult.per_m2_per_year + (operationalCarbon / project.study_period)},
      mpg_reference_value = ${mpgReference},
      is_compliant = ${normalizedResult.per_m2_per_year <= mpgReference},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
  `;

  return {
    a1_a3: totalA1A3,
    a4: totalA4,
    a5: totalA5,
    b4: totalB4,
    c1_c2: totalC * 0.3, // Rough split
    c3: totalC * 0.3,
    c4: totalC * 0.4,
    d: totalD,
    total_a_to_c: totalAToC,
    total_with_d: totalAToC + totalD,
    breakdown_by_element: elementBreakdown,
    breakdown_by_phase: {
      production: totalA1A3,
      transport: totalA4,
      construction: totalA5,
      use_replacement: totalB4,
      end_of_life: totalC,
      benefits: totalD
    }
  };
}

// ============================================
// ELEMENT CALCULATION
// ============================================

async function calculateElement(
  element: ElementWithLayers,
  studyPeriod: number
): Promise<ElementResult> {

  let elementA1A3 = 0;
  let elementA4 = 0;
  let elementA5 = 0;
  let elementB4 = 0;
  let elementC = 0;
  let elementD = 0;

  for (const layer of element.layers) {
    // Step 1: Calculate mass
    const volume = element.quantity * layer.thickness * layer.coverage;
    const density = layer.material.density || layer.material.bulk_density || 0;
    const mass = volume * density; // kg

    // DEBUG: Log layer calculation
    const DEBUG = process.env.LCA_DEBUG === 'true';
    if (DEBUG) {
      console.log(`\nLayer: ${layer.material.name_en || layer.material.name_de}`);
      console.log(`  Volume: ${volume.toFixed(4)} m³, Density: ${density}, Mass: ${mass.toFixed(2)} kg`);
    }

    // Step 2: Module A1-A3 (Production)
    const a1a3 = calculateA1A3(mass, layer.material);
    elementA1A3 += a1a3;
    if (DEBUG) console.log(`  A1-A3: ${a1a3.toFixed(2)}, Total: ${elementA1A3.toFixed(2)}`);

    // Step 3: Module A4 (Transport)
    const a4 = calculateA4(mass, layer.material, layer.custom_transport_km);
    elementA4 += a4;
    if (DEBUG) console.log(`  A4: ${a4.toFixed(2)}, Total: ${elementA4.toFixed(2)}`);

    // Step 4: Module A5 (Construction)
    const a5 = calculateA5(a1a3, element.category);
    elementA5 += a5;
    if (DEBUG) console.log(`  A5: ${a5.toFixed(2)}, Total: ${elementA5.toFixed(2)}`);

    // Step 5: Module B4 (Replacement)
    const b4 = calculateB4(
      mass,
      layer.material,
      layer.custom_lifespan,
      studyPeriod
    );
    elementB4 += b4;
    if (DEBUG) console.log(`  B4: ${b4.toFixed(2)}, Total: ${elementB4.toFixed(2)}`);

    // Step 6: Module C (End of Life)
    const c = calculateC(mass, layer.material);
    elementC += c;
    if (DEBUG) {
      console.log(`  C: ${c}, elementC before: ${elementC - c}, elementC after: ${elementC}`);
      console.log(`  Material C values: C1=${layer.material.gwp_c1}, C2=${layer.material.gwp_c2}, C3=${layer.material.gwp_c3}, C4=${layer.material.gwp_c4}`);
    }

    // Step 7: Module D (Benefits)
    const d = calculateD(mass, layer.material);
    elementD += d;
    if (DEBUG) console.log(`  D: ${d.toFixed(2)}, Total: ${elementD.toFixed(2)}`);
  }

  return {
    a1_a3: elementA1A3,
    a4: elementA4,
    a5: elementA5,
    b4: elementB4,
    c: elementC,
    d: elementD,
    total: elementA1A3 + elementA4 + elementA5 + elementB4 + elementC
  };
}

// ============================================
// NOTE: Phase calculations moved to ./calculations/
// Import individual phase functions from there for easier maintenance
// ============================================

// ============================================
// NORMALIZATION
// ============================================

export function normalizeResults(
  result: LCAResult,
  gfa: number,
  studyPeriod: number
): NormalizedResult {
  return {
    ...result,
    per_m2: result.total_a_to_c / gfa,
    per_m2_per_year: result.total_a_to_c / gfa / studyPeriod
  };
}

// ============================================
// SCORING
// ============================================

export interface ScoringConfig {
  comparisonType: 'relatief' | 'absoluut';
  baseValue: number | null;
  direction: 'positive' | 'negative';  // Higher is better vs lower is better
  margin: number;  // ±20% default
}

export function calculateScore(
  actualValue: number,
  config: ScoringConfig
): number {
  if (config.baseValue === null) return 0;

  const difference = actualValue - config.baseValue;
  const normalizedDiff = difference / config.margin;

  // Flip score if lower is better
  const score = config.direction === 'negative'
    ? -normalizedDiff
    : normalizedDiff;

  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, score));
}
