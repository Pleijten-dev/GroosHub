// ============================================
// PHASE A1-A3: RAW MATERIAL SUPPLY, TRANSPORT, AND MANUFACTURING
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate A1-A3 impact (Production phase)
 *
 * Includes:
 * - A1: Raw material supply and pre-processing
 * - A2: Transport to manufacturer
 * - A3: Manufacturing
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateA1A3(100, osbMaterial);
 * // Returns: -890 kg CO₂-eq (negative due to biogenic carbon storage)
 * ```
 */
export function calculateA1A3(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_a1_a3) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
