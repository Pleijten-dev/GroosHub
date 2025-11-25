// ============================================
// PHASE C3: WASTE PROCESSING FOR REUSE, RECOVERY, AND/OR RECYCLING
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate C3 impact (Waste processing)
 *
 * Includes emissions from:
 * - **Incineration**: Burning waste for energy recovery
 *   - Releases biogenic carbon stored in timber (high C3 for wood products)
 *   - Fossil carbon from plastics, coatings
 * - **Recycling**: Energy for material processing
 * - **Sorting and separation**: Mechanical processing
 * - **Crushing and grinding**: For aggregate production
 *
 * **Note for timber materials:**
 * C3 values for wood products are typically high because incineration releases
 * the biogenic carbon that was stored during production (negative A1-A3).
 * This creates a "carbon cycle" effect:
 * - A1-A3: Negative (carbon stored)
 * - C3: Positive (carbon released)
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateC3(1000, osbMaterial);
 * // For OSB with C3 = 1130 kg CO₂-eq/m³:
 * // Returns high positive value (stored carbon released)
 * ```
 */
export function calculateC3(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_c3) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion (handles volumetric vs mass-based units)
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
