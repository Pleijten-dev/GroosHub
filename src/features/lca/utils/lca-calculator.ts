// ============================================
// LCA CALCULATOR - CORE CALCULATION ENGINE
// ============================================

import type { PrismaClient, Material, LCAProject } from '@prisma/client';
import type {
  LCAResult,
  ElementResult,
  ElementWithLayers,
  NormalizedResult,
  ElementBreakdown
} from '../types';

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export async function calculateProjectLCA(
  projectId: string,
  prisma: PrismaClient
): Promise<LCAResult> {
  // Load project with all elements and layers
  const project = await prisma.lCAProject.findUnique({
    where: { id: projectId },
    include: {
      elements: {
        include: {
          layers: {
            include: {
              material: true
            },
            orderBy: { position: 'asc' }
          }
        }
      }
    }
  });

  if (!project) throw new Error('Project not found');

  // Initialize accumulators
  let totalA1A3 = 0;
  let totalA4 = 0;
  let totalA5 = 0;
  let totalB4 = 0;
  let totalC = 0;
  let totalD = 0;

  const elementBreakdown: ElementBreakdown[] = [];

  // Calculate each element
  for (const element of project.elements) {
    const elementResult = await calculateElement(element as ElementWithLayers, project.study_period);

    totalA1A3 += elementResult.a1_a3;
    totalA4 += elementResult.a4;
    totalA5 += elementResult.a5;
    totalB4 += elementResult.b4;
    totalC += elementResult.c;
    totalD += elementResult.d;

    elementBreakdown.push({
      element_id: element.id,
      element_name: element.name,
      total_impact: elementResult.total,
      percentage: 0 // Calculate after total known
    });
  }

  const totalAToC = totalA1A3 + totalA4 + totalA5 + totalB4 + totalC;

  // Calculate percentages
  elementBreakdown.forEach(eb => {
    eb.percentage = totalAToC > 0 ? (eb.total_impact / totalAToC) * 100 : 0;
  });

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

    // Step 2: Module A1-A3 (Production)
    const a1a3 = calculateA1A3(mass, layer.material);
    elementA1A3 += a1a3;

    // Step 3: Module A4 (Transport)
    const a4 = calculateA4(mass, layer.material, layer.custom_transport_km);
    elementA4 += a4;

    // Step 4: Module A5 (Construction)
    const a5 = calculateA5(a1a3, element.category);
    elementA5 += a5;

    // Step 5: Module B4 (Replacement)
    const b4 = calculateB4(
      mass,
      layer.material,
      layer.custom_lifespan,
      studyPeriod
    );
    elementB4 += b4;

    // Step 6: Module C (End of Life)
    const c = calculateC(mass, layer.material);
    elementC += c;

    // Step 7: Module D (Benefits)
    const d = calculateD(mass, layer.material);
    elementD += d;
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
// MODULE CALCULATIONS
// ============================================

export function calculateA1A3(mass: number, material: Material): number {
  // Convert to declared unit if needed
  const massInDeclaredUnit = mass * material.conversion_to_kg;
  return massInDeclaredUnit * (material.gwp_a1_a3 || 0);
}

export function calculateA4(
  mass: number,
  material: Material,
  customDistance?: number | null
): number {
  // Use custom distance, material default, or category default
  const distance = customDistance ||
                   material.transport_distance ||
                   getDefaultTransportDistance(material.category);

  const transportMode = (material.transport_mode as keyof typeof TRANSPORT_EMISSION_FACTORS) || 'truck';
  const emissionFactor = TRANSPORT_EMISSION_FACTORS[transportMode] || 0.062;

  // Formula: (mass in tonnes) × distance × emission factor
  return (mass / 1000) * distance * emissionFactor;
}

const TRANSPORT_EMISSION_FACTORS: Record<string, number> = {
  truck: 0.062,      // kg CO2-eq per tonne-km
  train: 0.022,
  ship: 0.008,
  combined: 0.050
};

function getDefaultTransportDistance(category: string): number {
  const defaults: Record<string, number> = {
    concrete: 50,      // Local
    masonry: 50,
    timber: 200,       // National
    metal: 500,        // European
    insulation: 500,
    glass: 500,
    finishes: 200
  };
  return defaults[category] || 300;
}

export function calculateA5(a1a3Impact: number, elementCategory: string): number {
  // A5 as percentage of A1-A3
  const factors: Record<string, number> = {
    exterior_wall: 0.05,
    interior_wall: 0.03,
    floor: 0.04,
    roof: 0.06,
    foundation: 0.08,
    windows: 0.02,
    doors: 0.02,
    mep: 0.10,
    finishes: 0.03
  };

  const factor = factors[elementCategory] || 0.05;
  return a1a3Impact * factor;
}

export function calculateB4(
  mass: number,
  material: Material,
  customLifespan: number | null,
  studyPeriod: number
): number {
  // Get lifespan
  const lifespan = customLifespan ||
                   material.reference_service_life ||
                   estimateLifespan(material.category);

  // Calculate replacements (exclude initial installation)
  const replacements = Math.max(0, Math.floor(studyPeriod / lifespan) - 1);

  if (replacements === 0) return 0;

  // Replacement impact = production impact per replacement
  const singleImpact = mass * material.conversion_to_kg * (material.gwp_a1_a3 || 0);

  return singleImpact * replacements;
}

function estimateLifespan(category: string): number {
  // Fallback if no material-specific data
  const defaults: Record<string, number> = {
    concrete: 100,
    timber: 75,
    masonry: 100,
    metal: 75,
    insulation: 50,
    glass: 30,
    finishes: 25
  };
  return defaults[category] || 50;
}

export function calculateC(mass: number, material: Material): number {
  // Sum of C1-C4 modules
  const c1 = material.gwp_c1 || 0;
  const c2 = material.gwp_c2 || 0;
  const c3 = material.gwp_c3 || 0;
  const c4 = material.gwp_c4 || 0;

  const massInDeclaredUnit = mass * material.conversion_to_kg;
  return massInDeclaredUnit * (c1 + c2 + c3 + c4);
}

export function calculateD(mass: number, material: Material): number {
  // Module D benefits (negative = benefit)
  const d = material.gwp_d || 0;
  const massInDeclaredUnit = mass * material.conversion_to_kg;
  return massInDeclaredUnit * d;
}

// ============================================
// B6: OPERATIONAL ENERGY (SIMPLIFIED)
// ============================================

export function calculateOperationalCarbon(
  project: LCAProject
): number {
  // Lookup based on energy label
  if (project.energy_label) {
    const estimates: Record<string, number> = {
      'A++++': 5,
      'A+++': 8,
      'A++': 12,
      'A+': 18,
      'A': 25,
      'B': 35,
      'C': 45,
      'D': 55
    };
    return estimates[project.energy_label] || 30;
  }

  // Or calculate from actual usage if provided
  if (project.annual_gas_use && project.annual_electricity) {
    const gasEmissions = project.annual_gas_use * 1.884; // kg CO2/m³
    const elecEmissions = project.annual_electricity * 0.475; // kg CO2/kWh
    const annualTotal = gasEmissions + elecEmissions;
    return annualTotal / project.gross_floor_area; // Per m²
  }

  // Default estimate
  return 25; // kg CO2/m²/year
}

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
