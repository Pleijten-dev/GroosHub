/**
 * Calculate Omgeving (Environment) Category Scores
 *
 * Calculates composite scores for each Omgeving category from actual data.
 * Scores in UnifiedDataRow are in range [-1, 1], mapped to [10, 100] for display.
 *
 * Categories:
 * - Betaalbaarheid (Affordability) → from residential/housing data
 * - Veiligheid (Safety) → from safety data
 * - Gezondheid (Health) → from health data
 * - Leefbaarheid (Livability) → from livability data
 * - Voorzieningen (Amenities) → calculated separately using amenityScoring
 */

import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import { convertResidentialToRows } from '../components/Residential/residentialDataConverter';

export interface OmgevingCategoryScore {
  category: 'betaalbaarheid' | 'veiligheid' | 'gezondheid' | 'leefbaarheid';
  nameNl: string;
  nameEn: string;
  score: number; // 10-100 range
  rawScore: number; // -1 to 1 range
  itemCount: number; // Number of data points used
}

export interface OmgevingScores {
  betaalbaarheid: OmgevingCategoryScore;
  veiligheid: OmgevingCategoryScore;
  gezondheid: OmgevingCategoryScore;
  leefbaarheid: OmgevingCategoryScore;
}

/**
 * Map a raw score (-1 to 1) to display score (10 to 100)
 */
function mapScoreToDisplay(rawScore: number): number {
  // Clamp rawScore to [-1, 1]
  const clamped = Math.max(-1, Math.min(1, rawScore));
  // Map [-1, 1] to [10, 100]
  // Formula: ((rawScore + 1) / 2) * 90 + 10
  return Math.round(((clamped + 1) / 2) * 90 + 10);
}

/**
 * Calculate average score from an array of UnifiedDataRows
 * Only includes rows that have a calculatedScore
 */
function calculateAverageScore(rows: UnifiedDataRow[]): { rawScore: number; itemCount: number } {
  const rowsWithScores = rows.filter(
    row => row.calculatedScore !== undefined && row.calculatedScore !== null
  );

  if (rowsWithScores.length === 0) {
    return { rawScore: 0, itemCount: 0 };
  }

  const sum = rowsWithScores.reduce((acc, row) => acc + (row.calculatedScore || 0), 0);
  return {
    rawScore: sum / rowsWithScores.length,
    itemCount: rowsWithScores.length,
  };
}

/**
 * Get best available data from geographic levels (neighborhood > district > municipality)
 */
function getBestAvailableData(
  neighborhood: UnifiedDataRow[],
  district: UnifiedDataRow[],
  municipality: UnifiedDataRow[]
): UnifiedDataRow[] {
  if (neighborhood.length > 0) return neighborhood;
  if (district.length > 0) return district;
  if (municipality.length > 0) return municipality;
  return [];
}

/**
 * Calculate Betaalbaarheid (Affordability) score from residential data
 *
 * This uses the housing market scores:
 * - Transaction price categories (lower is more affordable)
 * - For affordability, we want to REVERSE the typical "higher is better" scoring
 *   - Laag (low price) = positive for affordability
 *   - Hoog (high price) = negative for affordability
 */
function calculateBetaalbaarheidScore(data: UnifiedLocationData): { rawScore: number; itemCount: number } {
  if (!data.residential?.hasData) {
    return { rawScore: 0, itemCount: 0 };
  }

  const residentialRows = convertResidentialToRows(data.residential);

  // Filter for transaction price categories
  const priceRows = residentialRows.filter(row =>
    row.key.startsWith('transactieprijs_')
  );

  if (priceRows.length === 0) {
    return { rawScore: 0, itemCount: 0 };
  }

  // Calculate weighted score:
  // - laag (low) scores contribute positively to affordability
  // - hoog (high) scores contribute negatively to affordability
  let weightedSum = 0;
  let totalCount = 0;

  priceRows.forEach(row => {
    const count = row.value as number || 0;
    const score = row.calculatedScore || 0;

    if (row.key === 'transactieprijs_laag') {
      // Low price = good for affordability, use positive score
      weightedSum += score * count;
    } else if (row.key === 'transactieprijs_midden') {
      // Medium price = neutral
      weightedSum += score * count * 0.5;
    } else if (row.key === 'transactieprijs_hoog') {
      // High price = bad for affordability, invert the score
      weightedSum += (-score) * count;
    }
    totalCount += count;
  });

  if (totalCount === 0) {
    return { rawScore: 0, itemCount: 0 };
  }

  return {
    rawScore: weightedSum / totalCount,
    itemCount: priceRows.length,
  };
}

/**
 * Calculate all Omgeving category scores
 */
export function calculateOmgevingScores(data: UnifiedLocationData): OmgevingScores {
  // Safety score
  const safetyData = getBestAvailableData(
    data.safety.neighborhood,
    data.safety.district,
    data.safety.municipality
  );
  const safetyResult = calculateAverageScore(safetyData);

  // Health score
  const healthData = getBestAvailableData(
    data.health.neighborhood,
    data.health.district,
    data.health.municipality
  );
  const healthResult = calculateAverageScore(healthData);

  // Livability score
  const livabilityData = data.livability.municipality;
  const livabilityResult = calculateAverageScore(livabilityData);

  // Betaalbaarheid score (affordability from residential data)
  const betaalbaarheidResult = calculateBetaalbaarheidScore(data);

  return {
    betaalbaarheid: {
      category: 'betaalbaarheid',
      nameNl: 'Betaalbaarheid',
      nameEn: 'Affordability',
      score: mapScoreToDisplay(betaalbaarheidResult.rawScore),
      rawScore: betaalbaarheidResult.rawScore,
      itemCount: betaalbaarheidResult.itemCount,
    },
    veiligheid: {
      category: 'veiligheid',
      nameNl: 'Veiligheid',
      nameEn: 'Safety',
      score: mapScoreToDisplay(safetyResult.rawScore),
      rawScore: safetyResult.rawScore,
      itemCount: safetyResult.itemCount,
    },
    gezondheid: {
      category: 'gezondheid',
      nameNl: 'Gezondheid',
      nameEn: 'Health',
      score: mapScoreToDisplay(healthResult.rawScore),
      rawScore: healthResult.rawScore,
      itemCount: healthResult.itemCount,
    },
    leefbaarheid: {
      category: 'leefbaarheid',
      nameNl: 'Leefbaarheid',
      nameEn: 'Livability',
      score: mapScoreToDisplay(livabilityResult.rawScore),
      rawScore: livabilityResult.rawScore,
      itemCount: livabilityResult.itemCount,
    },
  };
}

/**
 * Get formatted Omgeving data for RadialChart display
 */
export function getOmgevingChartData(
  data: UnifiedLocationData,
  voorzieningenScore: number,
  locale: 'nl' | 'en'
): Array<{ name: string; value: number; color: string }> {
  const scores = calculateOmgevingScores(data);

  return [
    {
      name: locale === 'nl' ? scores.betaalbaarheid.nameNl : scores.betaalbaarheid.nameEn,
      value: scores.betaalbaarheid.score,
      color: '#48806a',
    },
    {
      name: locale === 'nl' ? scores.veiligheid.nameNl : scores.veiligheid.nameEn,
      value: scores.veiligheid.score,
      color: '#477638',
    },
    {
      name: locale === 'nl' ? scores.gezondheid.nameNl : scores.gezondheid.nameEn,
      value: scores.gezondheid.score,
      color: '#8a976b',
    },
    {
      name: locale === 'nl' ? scores.leefbaarheid.nameNl : scores.leefbaarheid.nameEn,
      value: scores.leefbaarheid.score,
      color: '#0c211a',
    },
    {
      name: locale === 'nl' ? 'Voorzieningen' : 'Amenities',
      value: voorzieningenScore,
      color: '#48806a',
    },
  ];
}
