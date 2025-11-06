import type { AmenityMultiCategoryResponse, AmenitySearchResult } from '../../data/sources/google-places/types';
import type { UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { calculateAmenityScore, type AmenityScore } from '../../data/scoring/amenityScoring';

/**
 * Convert amenity search result to UnifiedDataRow with scoring
 */
function createAmenityRow(
  result: AmenitySearchResult,
  geographicCode: string,
  geographicName: string
): UnifiedDataRow[] {
  const rows: UnifiedDataRow[] = [];
  const score: AmenityScore = calculateAmenityScore(result);

  // Row 1: Count Score
  rows.push({
    source: 'amenities',
    geographicLevel: 'municipality',
    geographicCode,
    geographicName,
    key: `amenity_${result.category.id}_count`,
    title: `${result.category.displayName} - Aantal`,
    titleNl: `${result.category.displayName} - Aantal`,
    titleEn: `${result.category.name} - Count`,
    value: score.totalCount,
    absolute: score.totalCount,
    relative: null,
    displayValue: score.totalCount.toString(),
    displayAbsolute: score.totalCount.toString(),
    displayRelative: '-',
    unit: 'voorzieningen',
    // Add scoring info
    scoring: {
      comparisonType: 'absoluut',
      margin: 50, // Not really used for amenities, but required
      baseValue: 1, // Base value for amenity count scoring
      direction: 'positive'
    },
    calculatedScore: score.countScore,
    metadata: {
      categoryType: undefined,
      categoryKey: result.category.id,
      isAverage: false,
      isDistribution: false,
      fieldName: 'amenity_count',
      fieldValue: result.category.id,
      count: score.totalCount,
      total: score.totalCount,
    },
  });

  // Row 2: Proximity Score (always 250m)
  rows.push({
    source: 'amenities',
    geographicLevel: 'municipality',
    geographicCode,
    geographicName,
    key: `amenity_${result.category.id}_proximity`,
    title: `${result.category.displayName} - Nabijheid (250m)`,
    titleNl: `${result.category.displayName} - Nabijheid (250m)`,
    titleEn: `${result.category.name} - Proximity (250m)`,
    value: score.proximityCount,
    absolute: score.proximityCount,
    relative: null,
    displayValue: `${score.proximityCount} binnen 250m`,
    displayAbsolute: score.proximityCount.toString(),
    displayRelative: '-',
    unit: 'binnen 250m',
    // Add scoring info - proximity bonus is 0 or 1
    scoring: {
      comparisonType: 'absoluut',
      margin: 50,
      baseValue: 0,
      direction: 'positive'
    },
    calculatedScore: score.proximityBonus, // This is already 0 or 1
    metadata: {
      categoryType: undefined,
      categoryKey: result.category.id,
      isAverage: false,
      isDistribution: false,
      fieldName: 'amenity_proximity',
      fieldValue: result.category.id,
      count: score.proximityCount,
      total: score.totalCount,
    },
  });

  return rows;
}

/**
 * Convert amenity multi-category response to UnifiedDataRow format
 * for display in the main data table
 *
 * Creates two rows per category:
 * 1. Count score row (number of amenities within category's defaultRadius)
 *    - Filters amenities to only count those within meaningful distance
 *    - Uses category-specific radius from amenity-search-config.ts (e.g., 1km for supermarkets)
 *    - Falls back to 1km if not specified
 * 2. Proximity score row (amenities within fixed 250m)
 *    - Always uses 250m radius
 *    - Binary bonus: 1 if any amenities within 250m, 0 otherwise
 */
export function convertAmenitiesToRows(
  amenitiesData: AmenityMultiCategoryResponse | null,
  geographicCode: string,
  geographicName: string
): UnifiedDataRow[] {
  if (!amenitiesData || amenitiesData.results.length === 0) {
    return [];
  }

  const rows: UnifiedDataRow[] = [];

  // Convert each amenity category to rows
  amenitiesData.results.forEach((result) => {
    const categoryRows = createAmenityRow(result, geographicCode, geographicName);
    rows.push(...categoryRows);
  });

  return rows;
}
