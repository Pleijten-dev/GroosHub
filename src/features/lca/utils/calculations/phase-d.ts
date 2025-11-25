// ============================================
// PHASE D: BENEFITS AND LOADS BEYOND SYSTEM BOUNDARY
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate Module D impact (Benefits and loads beyond system boundary)
 *
 * Module D captures impacts that occur outside the building's lifecycle
 * but result from decisions made during the building's life.
 *
 * **Typically NEGATIVE (benefits) and includes:**
 *
 * 1. **Recycling benefits**: Avoided production of virgin materials
 *    - Example: Recycled steel avoids primary steel production
 *
 * 2. **Energy recovery**: Heat/electricity from waste incineration
 *    - Example: Timber incineration produces energy, avoiding fossil fuel use
 *
 * 3. **Exported reused products**: Materials reused in other buildings
 *    - Example: Structural steel beams reused in another project
 *
 * 4. **Material downcycling**: Secondary uses at lower value
 *    - Example: Concrete crushed for road base aggregate
 *
 * **Important notes:**
 * - Module D is reported separately from A-C total (not included in MPG calculation)
 * - Represents potential for circular economy
 * - High negative D value indicates good recyclability/energy recovery
 * - Negative values = environmental benefit
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq (typically negative = benefit)
 *
 * @example
 * ```typescript
 * const impact = calculateD(1000, timberMaterial);
 * // Returns: -370 kg CO₂-eq (energy recovery benefit from incineration)
 * ```
 */
export function calculateD(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_d) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion (handles volumetric vs mass-based units)
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
