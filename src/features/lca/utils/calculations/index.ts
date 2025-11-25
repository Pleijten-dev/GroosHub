// ============================================
// LCA CALCULATIONS - CENTRALIZED EXPORTS
// ============================================

// Types and utilities
export * from './types';

// Phase A: Product and Construction Process Stage
export { calculateA1A3 } from './phase-a1-a3';
export { calculateA4 } from './phase-a4';
export { calculateA5 } from './phase-a5';

// Phase B: Use Stage
export { calculateB4, calculateReplacements } from './phase-b4';
export { calculateOperationalCarbon, EMISSION_FACTORS } from './operational';

// Phase C: End of Life Stage
export { calculateC1 } from './phase-c1';
export { calculateC2 } from './phase-c2';
export { calculateC3 } from './phase-c3';
export { calculateC4 } from './phase-c4';

// Module D: Benefits and Loads Beyond System Boundary
export { calculateD } from './phase-d';

/**
 * Calculate total C phase impact (C1 + C2 + C3 + C4)
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns Total C phase GWP impact in kg CO₂-eq
 */
import type { Material } from '../../types';
import { calculateC1 } from './phase-c1';
import { calculateC2 } from './phase-c2';
import { calculateC3 } from './phase-c3';
import { calculateC4 } from './phase-c4';

export function calculateC(mass: number, material: Material): number {
  const c1 = calculateC1(mass, material);
  const c2 = calculateC2(mass, material);
  const c3 = calculateC3(mass, material);
  const c4 = calculateC4(mass, material);

  return c1 + c2 + c3 + c4;
}

/**
 * Calculate total C phase impact with detailed breakdown
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @returns Breakdown of C1, C2, C3, C4 and total
 */
export function calculateCDetailed(mass: number, material: Material): {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  total: number;
} {
  const c1 = calculateC1(mass, material);
  const c2 = calculateC2(mass, material);
  const c3 = calculateC3(mass, material);
  const c4 = calculateC4(mass, material);

  return {
    c1,
    c2,
    c3,
    c4,
    total: c1 + c2 + c3 + c4
  };
}
