// ============================================
// PHASE C2: TRANSPORT TO WASTE PROCESSING
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate C2 impact (Transport to waste processing facility)
 *
 * Includes:
 * - Transport from demolition site to:
 *   - Recycling facility
 *   - Incineration plant
 *   - Landfill
 *   - Material recovery facility
 *
 * Transport distance and mode depend on:
 * - Material type (recyclable, combustible, inert)
 * - Local waste management infrastructure
 * - End-of-life scenario
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateC2(1000, timberMaterial);
 * // Returns C2 impact for transport to processing facility
 * ```
 */
export function calculateC2(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_c2) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion (handles volumetric vs mass-based units)
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
