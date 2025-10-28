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
