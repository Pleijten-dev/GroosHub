// ============================================
// PHASE A4: TRANSPORT TO BUILDING SITE
// ============================================

import type { Material } from '../../types';
import { DEFAULT_TRANSPORT_DISTANCES, TRANSPORT_EMISSION_FACTORS } from './types';

/**
 * Calculate A4 impact (Transport to construction site)
 *
 * Formula: (mass in tonnes) × distance (km) × emission factor (kg CO₂-eq/tonne-km)
 *
 * @param mass Material mass in kg
 * @param material Material data from database
 * @param customDistance Optional custom transport distance in km
 * @returns GWP impact in kg CO₂-eq
 *
 * @example
 * ```typescript
 * const impact = calculateA4(1000, concreteM aterial);
 * // Returns: 3.1 kg CO₂-eq (1 tonne × 50 km × 0.062)
 * ```
 */
export function calculateA4(
  mass: number,
  material: Material,
  customDistance?: number | null
): number {
  // Determine transport distance (priority: custom > material default > category default)
  const distance =
    customDistance ||
    material.transport_distance ||
    getDefaultTransportDistance(material.category);

  // Get transport mode and emission factor
  const transportMode = (material.transport_mode as keyof typeof TRANSPORT_EMISSION_FACTORS) || 'truck';
  const emissionFactor = TRANSPORT_EMISSION_FACTORS[transportMode] || TRANSPORT_EMISSION_FACTORS.truck;

  // Calculate: mass (tonnes) × distance × emission factor
  const massInTonnes = mass / 1000;
  return massInTonnes * distance * emissionFactor;
}

/**
 * Get default transport distance for a material category
 *
 * @param category Material category
 * @returns Default distance in km
 */
function getDefaultTransportDistance(category: string): number {
  return DEFAULT_TRANSPORT_DISTANCES[category] || 300; // Default: 300 km
}
