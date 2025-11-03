/**
 * Comparison type for scoring calculation
 */
export type ComparisonType = 'relatief' | 'absoluut';

/**
 * Direction for scoring interpretation
 */
export type ScoreDirection = 'positive' | 'negative';

/**
 * Scoring configuration for a data point
 */
export interface ScoringConfig {
  /** Type of value to use for comparison (default: 'relatief') */
  comparisonType: ComparisonType;
  /** Acceptable variance threshold percentage (default: 20) */
  margin: number;
  /** Benchmark value for comparison (default: national level value) */
  baseValue: number | null;
  /** Whether higher values are better (default: 'positive') */
  direction: ScoreDirection;
}

/**
 * Parsed data value with both absolute and relative representations
 */
export interface ParsedValue {
  /** Human-readable title for the indicator */
  title: string;
  /** Original raw value from the API */
  originalValue: string | number | null;
  /** Absolute value (actual count/amount) */
  absolute: number | null;
  /** Relative value (percentage, per capita, etc.) */
  relative: number | null;
  /** Unit for the value (%, count, etc.) */
  unit?: string;
  /** Scoring configuration (optional, added during scoring phase) */
  scoring?: ScoringConfig;
  /** Calculated score based on comparison (-1, 0, or 1) (optional, added during scoring phase) */
  calculatedScore?: -1 | 0 | 1 | null;
}

/**
 * Parsed dataset with all indicators
 */
export interface ParsedDataset {
  /** Map of indicator key to parsed value */
  indicators: Map<string, ParsedValue>;
  /** Metadata about the dataset */
  metadata: {
    source: 'demographics' | 'health' | 'livability' | 'safety';
    fetchedAt: Date;
  };
}

/**
 * Base parser interface
 */
export interface DataParser<T = Record<string, unknown>> {
  /**
   * Parse raw API data into structured format with absolute and relative values
   */
  parse(rawData: T): ParsedDataset;
}
