// ============================================
// SHARED CALCULATION TYPES
// ============================================

import type { Material } from '../../types';

/**
 * Common calculation context passed to all phase calculations
 */
export interface CalculationContext {
  /** Mass of material in kg */
  mass: number;
  /** Material data from database */
  material: Material;
  /** Study period in years (for B4 calculations) */
  studyPeriod?: number;
  /** Element category (for A5 calculations) */
  elementCategory?: string;
  /** Custom transport distance in km (for A4 calculations) */
  customTransportKm?: number | null;
  /** Custom lifespan in years (for B4 calculations) */
  customLifespan?: number | null;
  /** Custom end-of-life scenario (for C calculations) */
  customEolScenario?: string | null;
}

/**
 * Result from a phase calculation
 */
export interface PhaseResult {
  /** Total GWP impact in kg CO₂-eq */
  impact: number;
  /** Optional breakdown of sub-components */
  breakdown?: Record<string, number>;
  /** Optional notes/details about calculation */
  notes?: string;
}

/**
 * Unit handling utilities
 */
export interface UnitHandling {
  /** Is the declared unit volumetric (m³, m²) */
  isVolumetric: boolean;
  /** Conversion factor to kg */
  conversionFactor: number;
  /** Material density (kg/m³) */
  density: number;
}

/**
 * Get unit handling information for a material
 */
export function getUnitHandling(material: Material): UnitHandling {
  const declaredUnit = material.declared_unit || '1 kg';
  const isVolumetric =
    declaredUnit.toLowerCase().includes('m3') ||
    declaredUnit.toLowerCase().includes('m³') ||
    declaredUnit.toLowerCase().includes('m2') ||
    declaredUnit.toLowerCase().includes('m²');

  return {
    isVolumetric,
    conversionFactor: Number(material.conversion_to_kg) || 1,
    density: Number(material.density) || 0
  };
}

/**
 * Apply unit conversion to calculate impact
 * Handles both volumetric (per m³) and mass-based (per kg) declared units
 */
export function applyUnitConversion(
  mass: number,
  gwpValue: number,
  unitHandling: UnitHandling
): number {
  // If volumetric and density available, convert GWP from per-m³ to per-kg
  if (unitHandling.isVolumetric && unitHandling.density > 0) {
    const gwpPerKg = gwpValue / unitHandling.density;
    return mass * gwpPerKg;
  }

  // If conversion factor is 1, use mass directly
  if (unitHandling.conversionFactor === 1) {
    return mass * gwpValue;
  }

  // Otherwise, convert mass to declared unit quantity
  const quantityInDeclaredUnit = mass / unitHandling.conversionFactor;
  return quantityInDeclaredUnit * gwpValue;
}

/**
 * Default transport distances by material category (km)
 */
export const DEFAULT_TRANSPORT_DISTANCES: Record<string, number> = {
  concrete: 50,      // Local production
  masonry: 50,
  timber: 200,       // National
  metal: 500,        // European
  insulation: 500,
  glass: 500,
  finishes: 200
};

/**
 * Default reference service life by material category (years)
 */
export const DEFAULT_SERVICE_LIFE: Record<string, number> = {
  concrete: 100,
  timber: 75,
  masonry: 100,
  metal: 75,
  insulation: 50,
  glass: 30,
  finishes: 25
};

/**
 * Transport emission factors by mode (kg CO₂-eq per tonne-km)
 */
export const TRANSPORT_EMISSION_FACTORS: Record<string, number> = {
  truck: 0.062,      // Road transport
  train: 0.022,      // Rail transport
  ship: 0.008,       // Sea transport
  combined: 0.050    // Multi-modal
};

/**
 * A5 (Construction) impact as percentage of A1-A3 by element category
 */
export const A5_FACTORS: Record<string, number> = {
  exterior_wall: 0.05,
  interior_wall: 0.03,
  floor: 0.04,
  roof: 0.06,
  foundation: 0.08,
  windows: 0.02,
  doors: 0.02,
  mep: 0.10,        // Mechanical, Electrical, Plumbing
  finishes: 0.03
};
