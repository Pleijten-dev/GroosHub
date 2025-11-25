// ============================================
// PHASE B4: REPLACEMENT
// ============================================

import type { Material } from '../../types';
import { DEFAULT_SERVICE_LIFE } from './types';
import { calculateA1A3 } from './phase-a1-a3';

/**
 * Calculate B4 impact (Replacement during use phase)
 *
 * Calculates how many times a material needs to be replaced during the
 * building's study period, and the production impact of those replacements.
 *
 * Formula: Number of replacements × A1-A3 impact per replacement
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @param customLifespan Optional custom reference service life in years
 * @param studyPeriod Building study period in years (typically 75)
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateB4(50, windowMaterial, null, 75);
 * // If window lifespan = 30 years:
 * // Replacements = floor(75/30) - 1 = 1 replacement
 * // Returns: 1 × A1-A3 impact
 * ```
 */
export function calculateB4(
  mass: number,
  material: Material,
  customLifespan: number | null,
  studyPeriod: number
): number {
  // Determine lifespan (priority: custom > material RSL > category default)
  const lifespan =
    customLifespan ||
    material.reference_service_life ||
    estimateLifespan(material.category);

  // Calculate number of replacements (excluding initial installation)
  const replacements = Math.max(0, Math.floor(studyPeriod / lifespan) - 1);

  // No replacements needed
  if (replacements === 0) return 0;

  // Each replacement has the same production impact as initial installation
  const singleImpact = calculateA1A3(mass, material);

  return singleImpact * replacements;
}

/**
 * Estimate reference service life for a material category
 *
 * Used as fallback when no material-specific RSL is available
 *
 * @param category Material category
 * @returns Estimated lifespan in years
 */
function estimateLifespan(category: string): number {
  return DEFAULT_SERVICE_LIFE[category] || 50; // Default: 50 years
}

/**
 * Calculate number of replacements during study period
 *
 * @param lifespan Material lifespan in years
 * @param studyPeriod Study period in years
 * @returns Number of replacements (excluding initial installation)
 */
export function calculateReplacements(lifespan: number, studyPeriod: number): number {
  return Math.max(0, Math.floor(studyPeriod / lifespan) - 1);
}
