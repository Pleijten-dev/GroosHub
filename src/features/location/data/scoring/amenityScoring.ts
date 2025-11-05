/**
 * Amenity Scoring System
 *
 * Calculates two scores for each amenity category:
 * 1. Count-based score: -1 to 1 based on number of amenities
 * 2. Proximity bonus: 0 or 1 based on amenities within 250m
 */

import type { AmenitySearchResult, PlaceResult } from '../sources/google-places/types';

/**
 * Amenity score breakdown
 */
export interface AmenityScore {
  /** Category ID */
  categoryId: string;
  /** Category display name */
  categoryName: string;
  /** Total amenities found in category radius */
  totalCount: number;
  /** Amenities within 250m */
  proximityCount: number;
  /** Count-based score: -1 to 1 */
  countScore: number;
  /** Proximity bonus: 0 or 1 */
  proximityBonus: number;
  /** Combined score (for display) */
  combinedScore: number;
  /** Search radius used */
  searchRadius: number;
}

/**
 * Calculate count-based amenity score
 *
 * Scoring logic:
 * - 0 amenities → -1
 * - 1 amenity → 0
 * - 2-5 amenities → Linear interpolation from 0 to 1
 *   Formula: (count - 1) / 4
 * - 6+ amenities → 1
 *
 * @param count Number of amenities found
 * @returns Score from -1 to 1
 */
export function calculateCountScore(count: number): number {
  if (count === 0) return -1;
  if (count === 1) return 0;
  if (count >= 6) return 1;

  // Linear interpolation for 2-5 amenities
  // count=2 → 0.25, count=3 → 0.50, count=4 → 0.75, count=5 → 1.0
  return (count - 1) / 4;
}

/**
 * Calculate proximity bonus
 *
 * Scoring logic:
 * - 1+ amenities within 250m → 1
 * - 0 amenities within 250m → 0
 *
 * @param places Array of amenity places with distances
 * @param radiusMeters Proximity radius (default: 250m)
 * @returns 0 or 1
 */
export function calculateProximityBonus(
  places: PlaceResult[],
  radiusMeters: number = 250
): number {
  const nearby = places.filter(place =>
    place.distance !== undefined && place.distance <= radiusMeters
  );

  return nearby.length > 0 ? 1 : 0;
}

/**
 * Calculate amenity scores for a search result
 *
 * @param result Amenity search result
 * @returns Amenity score breakdown
 */
export function calculateAmenityScore(result: AmenitySearchResult): AmenityScore {
  const totalCount = result.places.length;
  const proximityCount = result.places.filter(
    p => p.distance !== undefined && p.distance <= 250
  ).length;

  const countScore = calculateCountScore(totalCount);
  const proximityBonus = calculateProximityBonus(result.places);

  // Combined score is average of count score (normalized) and proximity bonus
  // Count score range: -1 to 1, Proximity bonus range: 0 to 1
  // To make them comparable, we normalize count score to 0-1: (countScore + 1) / 2
  const normalizedCountScore = (countScore + 1) / 2;
  const combinedScore = (normalizedCountScore + proximityBonus) / 2;

  return {
    categoryId: result.category.id,
    categoryName: result.category.displayName,
    totalCount,
    proximityCount,
    countScore,
    proximityBonus,
    combinedScore,
    searchRadius: result.searchRadius,
  };
}

/**
 * Calculate scores for all amenity categories
 *
 * @param results Array of amenity search results
 * @returns Array of amenity scores
 */
export function calculateAllAmenityScores(
  results: AmenitySearchResult[]
): AmenityScore[] {
  return results.map(result => calculateAmenityScore(result));
}

/**
 * Get amenity score summary statistics
 *
 * @param scores Array of amenity scores
 * @returns Summary statistics
 */
export interface AmenityScoreSummary {
  totalCategories: number;
  averageCountScore: number;
  averageProximityBonus: number;
  averageCombinedScore: number;
  categoriesWithProximity: number;
  categoriesWithNoAmenities: number;
}

export function getAmenityScoreSummary(scores: AmenityScore[]): AmenityScoreSummary {
  const totalCategories = scores.length;

  if (totalCategories === 0) {
    return {
      totalCategories: 0,
      averageCountScore: 0,
      averageProximityBonus: 0,
      averageCombinedScore: 0,
      categoriesWithProximity: 0,
      categoriesWithNoAmenities: 0,
    };
  }

  const sumCountScore = scores.reduce((sum, s) => sum + s.countScore, 0);
  const sumProximityBonus = scores.reduce((sum, s) => sum + s.proximityBonus, 0);
  const sumCombinedScore = scores.reduce((sum, s) => sum + s.combinedScore, 0);

  const categoriesWithProximity = scores.filter(s => s.proximityBonus === 1).length;
  const categoriesWithNoAmenities = scores.filter(s => s.totalCount === 0).length;

  return {
    totalCategories,
    averageCountScore: sumCountScore / totalCategories,
    averageProximityBonus: sumProximityBonus / totalCategories,
    averageCombinedScore: sumCombinedScore / totalCategories,
    categoriesWithProximity,
    categoriesWithNoAmenities,
  };
}
