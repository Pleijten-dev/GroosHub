import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';

/**
 * Extracts location scores from UnifiedLocationData and maps them to
 * subcategory names used in the target group scoring system
 */
export function extractLocationScores(data: UnifiedLocationData): Record<string, number> {
  const scores: Record<string, number> = {};

  // Helper to add scores from UnifiedDataRows
  const addScoresFromRows = (rows: UnifiedDataRow[]) => {
    rows.forEach(row => {
      // Use calculated score if available, otherwise fall back to relative value normalized
      if (row.calculatedScore !== undefined && row.calculatedScore !== null) {
        scores[row.title] = row.calculatedScore;
      } else if (row.relative !== null) {
        // Normalize relative percentage values to -1 to 1 scale
        scores[row.title] = normalizePercentage(row.relative);
      }
    });
  };

  // Extract from all geographic levels (prioritize more specific levels)
  // Demographics
  if (data.demographics.neighborhood.length > 0) {
    addScoresFromRows(data.demographics.neighborhood);
  } else if (data.demographics.district.length > 0) {
    addScoresFromRows(data.demographics.district);
  } else if (data.demographics.municipality.length > 0) {
    addScoresFromRows(data.demographics.municipality);
  }

  // Health
  if (data.health.neighborhood.length > 0) {
    addScoresFromRows(data.health.neighborhood);
  } else if (data.health.district.length > 0) {
    addScoresFromRows(data.health.district);
  } else if (data.health.municipality.length > 0) {
    addScoresFromRows(data.health.municipality);
  }

  // Livability
  if (data.livability.municipality.length > 0) {
    addScoresFromRows(data.livability.municipality);
  }

  // Safety
  if (data.safety.neighborhood.length > 0) {
    addScoresFromRows(data.safety.neighborhood);
  } else if (data.safety.district.length > 0) {
    addScoresFromRows(data.safety.district);
  } else if (data.safety.municipality.length > 0) {
    addScoresFromRows(data.safety.municipality);
  }

  // Amenities
  if (data.amenities && data.amenities.length > 0) {
    addScoresFromRows(data.amenities);
  }

  // Residential data - extract what's available
  // Note: ResidentialData structure may vary, so we check for availability
  if (data.residential && data.residential.hasData) {
    // We'll use dummy normalization for residential data since we don't know the exact structure
    // In a production system, you'd want to properly map these fields

    // For now, add a note that residential data needs manual mapping
    console.log('Residential data available but needs manual mapping to scoring subcategories');
  }

  return scores;
}

/**
 * Normalize a percentage (0-100) to a score (-1 to 1)
 * Uses reference values for interpretation:
 * - Below 30%: negative
 * - 30-70%: around 0
 * - Above 70%: positive
 */
function normalizePercentage(percentage: number): number {
  if (percentage < 30) {
    // Map 0-30% to -1 to 0
    return (percentage / 30) - 1;
  } else if (percentage < 70) {
    // Map 30-70% to -0.5 to 0.5
    return ((percentage - 30) / 40) - 0.5;
  } else {
    // Map 70-100% to 0.5 to 1
    return ((percentage - 70) / 30) * 0.5 + 0.5;
  }
}
