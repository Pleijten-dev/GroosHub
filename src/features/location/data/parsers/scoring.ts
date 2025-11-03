import type { ScoringConfig, ComparisonType, ScoreDirection, ParsedValue } from './types';

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  comparisonType: 'relatief',
  margin: 20,
  baseValue: null,
  direction: 'positive',
};

/**
 * Optional configuration overrides for specific indicators
 * Can be specified in parser JSON tables
 */
export interface ScoringConfigOverride {
  comparisonType?: ComparisonType;
  margin?: number;
  baseValue?: number;
  direction?: ScoreDirection;
}

/**
 * Create a scoring configuration with optional overrides
 */
export function createScoringConfig(
  override?: ScoringConfigOverride
): ScoringConfig {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...override,
  };
}

/**
 * Calculate the score based on comparison value, base value, and configuration
 *
 * @param parsedValue - The parsed value containing absolute and relative data
 * @param nationalValue - The national level value for comparison (if baseValue not overridden)
 * @param config - Scoring configuration (optional overrides)
 * @returns Score: -1 (below threshold), 0 (within range), 1 (above threshold), or null if cannot calculate
 */
export function calculateScore(
  parsedValue: ParsedValue,
  nationalValue: ParsedValue | null,
  config?: ScoringConfigOverride
): -1 | 0 | 1 | null {
  const scoringConfig = createScoringConfig(config);

  // Determine which value to use for comparison
  const comparisonValue = scoringConfig.comparisonType === 'relatief'
    ? parsedValue.relative
    : parsedValue.absolute;

  // If comparison value is null, cannot calculate score
  if (comparisonValue === null) {
    return null;
  }

  // Determine base value (use override if provided, otherwise national level)
  let baseValue = scoringConfig.baseValue;

  if (baseValue === null) {
    if (!nationalValue) {
      return null; // Cannot calculate without base value
    }

    baseValue = scoringConfig.comparisonType === 'relatief'
      ? nationalValue.relative
      : nationalValue.absolute;

    if (baseValue === null) {
      return null; // National value is null
    }
  }

  // Calculate bounds
  const marginValue = Math.abs(baseValue) * (scoringConfig.margin / 100);
  const lowerBound = baseValue - marginValue;
  const upperBound = baseValue + marginValue;

  // Calculate raw score
  let rawScore: -1 | 0 | 1;

  if (comparisonValue < lowerBound) {
    rawScore = -1;
  } else if (comparisonValue > upperBound) {
    rawScore = 1;
  } else {
    rawScore = 0;
  }

  // Invert score if direction is negative
  if (scoringConfig.direction === 'negative') {
    if (rawScore === -1) {
      return 1;
    } else if (rawScore === 1) {
      return -1;
    }
    return 0;
  }

  return rawScore;
}

/**
 * Create a ParsedValue with scoring information
 */
export function createScoredValue(
  title: string,
  originalValue: string | number | null,
  absolute: number | null,
  relative: number | null,
  nationalValue: ParsedValue | null,
  unit?: string,
  configOverride?: ScoringConfigOverride
): ParsedValue {
  const scoring = createScoringConfig(configOverride);

  // Create the base parsed value
  const parsedValue: ParsedValue = {
    title,
    originalValue,
    absolute,
    relative,
    unit,
    scoring,
    calculatedScore: null,
  };

  // Calculate the score
  parsedValue.calculatedScore = calculateScore(parsedValue, nationalValue, configOverride);

  return parsedValue;
}

/**
 * Update the calculated score for an existing ParsedValue
 */
export function updateScore(
  parsedValue: ParsedValue,
  nationalValue: ParsedValue | null,
  configOverride?: ScoringConfigOverride
): ParsedValue {
  return {
    ...parsedValue,
    scoring: createScoringConfig(configOverride),
    calculatedScore: calculateScore(parsedValue, nationalValue, configOverride),
  };
}

/**
 * Scoring configuration overrides loaded from JSON
 */
export interface ScoringConfigOverrides {
  [source: string]: {
    [indicatorKey: string]: ScoringConfigOverride;
  };
}

/**
 * Load scoring configuration overrides from JSON file
 * This should be called once at application startup
 */
let cachedScoringConfig: ScoringConfigOverrides | null = null;

export async function loadScoringConfig(): Promise<ScoringConfigOverrides> {
  if (cachedScoringConfig) {
    return cachedScoringConfig;
  }

  try {
    const config = await import('./scoring-config.json');
    cachedScoringConfig = config.default as ScoringConfigOverrides;
    return cachedScoringConfig;
  } catch (error) {
    console.warn('Failed to load scoring configuration, using defaults:', error);
    return {};
  }
}

/**
 * Apply scoring to all indicators in a dataset
 *
 * @param locationDataset - The location's parsed dataset
 * @param nationalDataset - The national level parsed dataset for comparison
 * @param source - The data source ('demographics', 'health', 'safety', 'livability')
 * @param configOverrides - Optional configuration overrides from JSON
 */
export function applyScoringToDataset(
  locationDataset: Map<string, ParsedValue>,
  nationalDataset: Map<string, ParsedValue> | null,
  source: string,
  configOverrides?: ScoringConfigOverrides
): Map<string, ParsedValue> {
  const sourceOverrides = configOverrides?.[source] || {};
  const scoredDataset = new Map<string, ParsedValue>();

  for (const [key, locationValue] of locationDataset.entries()) {
    const nationalValue = nationalDataset?.get(key) || null;
    const indicatorOverride = sourceOverrides[key];

    scoredDataset.set(key, updateScore(locationValue, nationalValue, indicatorOverride));
  }

  return scoredDataset;
}
