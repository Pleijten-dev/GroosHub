/**
 * Amenity Scoring System
 *
 * Calculates two scores for each amenity category:
 * 1. Count-based score: -1 to 1 based on number of amenities WITHIN category's defaultRadius
 *    (Filters out amenities beyond the category's meaningful distance)
 * 2. Proximity bonus: 0 or 1 based on amenities within 250m (fixed)
 *
 * Distance filtering uses each category's defaultRadius from amenity-search-config.ts
 * Default radius is 1000m (1km) if not specified in the category config
 */

import type { AmenitySearchResult, PlaceResult } from '../sources/google-places/types';

/**
 * Default distance radius if not specified in category config
 */
const DEFAULT_DISTANCE_RADIUS = 1000; // 1km

/**
 * Fixed proximity bonus radius
 */
const PROXIMITY_BONUS_RADIUS = 250; // 250m (fixed)

/**
 * Amenity score breakdown
 */
export interface AmenityScore {
  /** Category ID */
  categoryId: string;
  /** Category display name */
  categoryName: string;
  /** Amenities found within category's defaultRadius (used for count score) */
  totalCount: number;
  /** Amenities within 250m (used for proximity bonus) */
  proximityCount: number;
  /** Count-based score: -1 to 1 (based on amenities within defaultRadius) */
  countScore: number;
  /** Proximity bonus: 0 or 1 (based on amenities within 250m) */
  proximityBonus: number;
  /** Combined score (for display) */
  combinedScore: number;
  /** Search radius used for API call */
  searchRadius: number;
  /** Distance radius used for count filtering (from category config or default 1km) */
  countRadius: number;
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
 * Note: Proximity bonus always uses fixed 250m radius
 *
 * @param places Array of amenity places with distances
 * @returns 0 or 1
 */
export function calculateProximityBonus(places: PlaceResult[]): number {
  const nearby = places.filter(place =>
    place.distance !== undefined && place.distance <= PROXIMITY_BONUS_RADIUS
  );

  return nearby.length > 0 ? 1 : 0;
}

/**
 * Calculate amenity scores for a search result
 *
 * Count Score:
 * - Uses category's defaultRadius to filter amenities (e.g., 1km for supermarkets)
 * - Only counts amenities within this meaningful distance
 * - Falls back to DEFAULT_DISTANCE_RADIUS (1000m) if not specified
 *
 * Proximity Bonus:
 * - Always uses fixed 250m radius
 * - Binary score: 1 if any amenities within 250m, 0 otherwise
 *
 * @param result Amenity search result
 * @returns Amenity score breakdown
 */
export function calculateAmenityScore(result: AmenitySearchResult): AmenityScore {
  // Use category's defaultRadius for counting, or fall back to 1km
  const countRadius = result.category.defaultRadius || DEFAULT_DISTANCE_RADIUS;

  // Filter amenities within the count radius (e.g., 1km for supermarkets)
  const amenitiesWithinRadius = result.places.filter(
    p => p.distance !== undefined && p.distance <= countRadius
  );

  // Count score is based on amenities within the count radius only
  const totalCount = amenitiesWithinRadius.length;

  // Proximity count is always based on fixed 250m
  const proximityCount = result.places.filter(
    p => p.distance !== undefined && p.distance <= PROXIMITY_BONUS_RADIUS
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
    countRadius,
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
