// ============================================
// PHASE C1: DECONSTRUCTION / DEMOLITION
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate C1 impact (Deconstruction/Demolition)
 *
 * Includes:
 * - Energy use for demolition
 * - Equipment operation
 * - Manual labor (minimal impact)
 * - On-site processing/sorting
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateC1(1000, concreteMaterial);
 * // Returns C1 impact based on material's gwp_c1 value
 * ```
 */
export function calculateC1(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_c1) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion (handles volumetric vs mass-based units)
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
