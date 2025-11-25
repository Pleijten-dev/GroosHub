// ============================================
// OPERATIONAL ENERGY (B6) - SIMPLIFIED CALCULATION
// ============================================

import type { LCAProject } from '../../types';

/**
 * Calculate operational carbon emissions (Module B6)
 *
 * Simplified calculation based on:
 * 1. Energy label (if available)
 * 2. Actual gas and electricity usage (if available)
 * 3. Default estimate based on building type
 *
 * **Note:** This is a simplified approach. For accurate B6 calculations,
 * use dedicated energy simulation tools (EPA-W, PHPP, etc.)
 *
 * @param project Project data including energy information
 * @returns Annual operational carbon per m² (kg CO₂-eq/m²/year)
 *
 * @example
 * ```typescript
 * const annualCarbon = calculateOperationalCarbon(project);
 * // For energy label A: Returns ~25 kg CO₂-eq/m²/year
 * // Over 75 years: 25 × 75 = 1875 kg CO₂-eq/m²
 * ```
 */
export function calculateOperationalCarbon(project: LCAProject): number {
  // Method 1: Estimate based on energy label
  if (project.energy_label) {
    return getEnergyLabelEstimate(project.energy_label);
  }

  // Method 2: Calculate from actual usage
  if (project.annual_gas_use && project.annual_electricity) {
    return calculateFromActualUsage(
      project.annual_gas_use,
      project.annual_electricity,
      project.gross_floor_area
    );
  }

  // Method 3: Default estimate
  return 25; // kg CO₂-eq/m²/year (typical for energy-efficient building)
}

/**
 * Get operational carbon estimate based on energy label
 *
 * @param energyLabel Dutch energy label (A++++ to D)
 * @returns Annual operational carbon per m² (kg CO₂-eq/m²/year)
 */
function getEnergyLabelEstimate(energyLabel: string): number {
  const estimates: Record<string, number> = {
    'A++++': 5,    // Nearly zero energy
    'A+++': 8,     // Very low energy
    'A++': 12,     // Low energy
    'A+': 18,      // Energy efficient
    'A': 25,       // Good performance
    'B': 35,       // Average
    'C': 45,       // Below average
    'D': 55        // Poor performance
  };

  return estimates[energyLabel] || 30; // Default if label not recognized
}

/**
 * Calculate operational carbon from actual gas and electricity usage
 *
 * **Emission factors:**
 * - Natural gas: 1.884 kg CO₂/m³ (including combustion + upstream)
 * - Electricity: 0.475 kg CO₂/kWh (Dutch grid mix 2024)
 *
 * @param annualGasM3 Annual natural gas use in m³
 * @param annualElectricityKwh Annual electricity use in kWh
 * @param grossFloorArea Building floor area in m²
 * @returns Annual operational carbon per m² (kg CO₂-eq/m²/year)
 */
function calculateFromActualUsage(
  annualGasM3: number,
  annualElectricityKwh: number,
  grossFloorArea: number
): number {
  // Emission factors
  const GAS_EMISSION_FACTOR = 1.884;   // kg CO₂/m³ gas
  const ELEC_EMISSION_FACTOR = 0.475;  // kg CO₂/kWh electricity

  // Calculate total annual emissions
  const gasEmissions = annualGasM3 * GAS_EMISSION_FACTOR;
  const elecEmissions = annualElectricityKwh * ELEC_EMISSION_FACTOR;
  const totalAnnual = gasEmissions + elecEmissions;

  // Normalize per m²
  return totalAnnual / grossFloorArea;
}

/**
 * Emission factors for reference
 */
export const EMISSION_FACTORS = {
  /** Natural gas (kg CO₂/m³) - includes combustion + upstream */
  NATURAL_GAS: 1.884,

  /** Electricity (kg CO₂/kWh) - Dutch grid mix 2024 */
  ELECTRICITY_GRID: 0.475,

  /** District heating (kg CO₂/MJ) */
  DISTRICT_HEATING: 0.05,

  /** Solar PV (kg CO₂/kWh) - lifecycle emissions */
  SOLAR_PV: 0.045
} as const;
