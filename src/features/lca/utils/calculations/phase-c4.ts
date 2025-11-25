// ============================================
// PHASE C4: DISPOSAL
// ============================================

import type { Material } from '../../types';
import { getUnitHandling, applyUnitConversion } from './types';

/**
 * Calculate C4 impact (Disposal/Landfill)
 *
 * Includes:
 * - **Landfill operations**: Equipment, compaction, covering
 * - **Landfill emissions**:
 *   - Methane (CH₄) from anaerobic decomposition of organic materials
 *   - CO₂ from aerobic decomposition
 *   - Leachate treatment
 * - **Long-term monitoring**: Post-closure maintenance
 *
 * **Material-specific considerations:**
 * - **Inert materials** (concrete, masonry): Low C4 (minimal decomposition)
 * - **Organic materials** (timber, paper): Higher C4 (methane generation)
 * - **Plastics**: Low decomposition but long-term environmental persistence
 *
 * **Note:** C4 is only relevant for materials that actually go to landfill.
 * Materials that are fully recycled or incinerated may have C4 = 0.
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateC4(1000, gypsumMaterial);
 * // Returns C4 impact from landfill disposal
 * ```
 */
export function calculateC4(mass: number, material: Material): number {
  const gwpValue = Number(material.gwp_c4) || 0;

  // Get unit handling for this material
  const unitHandling = getUnitHandling(material);

  // Apply unit conversion (handles volumetric vs mass-based units)
  return applyUnitConversion(mass, gwpValue, unitHandling);
}
