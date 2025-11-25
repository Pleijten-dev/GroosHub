// ============================================
// PHASE A5: CONSTRUCTION-INSTALLATION PROCESS
// ============================================

import { A5_FACTORS } from './types';

/**
 * Calculate A5 impact (Construction-installation)
 *
 * Includes on-site activities:
 * - Energy use for installation
 * - Waste from cutting/fitting
 * - Equipment usage
 *
 * Calculated as a percentage of A1-A3 impact, varying by element type
 *
 * @param a1a3Impact The A1-A3 impact value (kg CO₂-eq)
 * @param elementCategory Element category (e.g., 'exterior_wall', 'roof')
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const a1a3 = 1000; // kg CO₂-eq
 * const a5 = calculateA5(a1a3, 'exterior_wall');
 * // Returns: 50 kg CO₂-eq (5% of A1-A3 for exterior walls)
 * ```
 */
export function calculateA5(a1a3Impact: number, elementCategory: string): number {
  // Get factor for this element category
  const factor = A5_FACTORS[elementCategory] || 0.05; // Default: 5%

  // A5 is calculated as a percentage of A1-A3
  return a1a3Impact * factor;
}

/**
 * Get A5 factor for an element category
 *
 * @param elementCategory Element category
 * @returns A5 factor (0-1, representing percentage)
 */
export function getA5Factor(elementCategory: string): number {
  return A5_FACTORS[elementCategory] || 0.05;
}
