/**
 * Shared types for data parsers
 *
 * These types define the structure for parsed data with both absolute and relative values
 */

/**
 * A single parsed indicator with absolute and relative values
 */
export interface ParsedIndicator {
  /** Human-readable indicator name */
  indicator: string;
  /** Original value from the API (may be absolute, relative, or n/a) */
  originalValue: number | string | null;
  /** Calculated absolute value (e.g., actual count) */
  absoluteValue: number | null;
  /** Calculated relative value (e.g., percentage) */
  relativeValue: number | null;
  /** Description of the calculation operator */
  operator: string | null;
  /** Display format hint (e.g., 'percentage', 'count', 'currency', 'distance') */
  format?: 'percentage' | 'count' | 'currency' | 'distance' | 'score' | 'energy' | 'area';
  /** Unit of measurement (e.g., '€1000', 'km', 'kWh') */
  unit?: string;
}

/**
 * Parsed demographics data from CBS
 */
export interface ParsedDemographicsData {
  source: 'Demografie (CBS)';
  indicators: ParsedIndicator[];
  metadata: {
    gemeentenaam: string;
    soortRegio: string;
    codering: string;
    aantalInwoners: number;
    huishoudensTotaal: number;
    bedrijfsvestigingenTotaal: number;
  };
}

/**
 * Parsed health data from RIVM
 */
export interface ParsedHealthData {
  source: 'Gezondheid (RIVM)';
  indicators: ParsedIndicator[];
  metadata: {
    gemeentenaam: string;
    soortRegio: string;
    codering: string;
  };
}

/**
 * Parsed livability data from CBS
 */
export interface ParsedLivabilityData {
  source: 'Leefbaarheid (CBS)';
  indicators: ParsedIndicator[];
  metadata: {
    gemeentenaam?: string;
    soortRegio?: string;
    codering?: string;
  };
}

/**
 * Parsed safety data from Politie
 */
export interface ParsedSafetyData {
  source: 'Veiligheid (Politie)';
  indicators: ParsedIndicator[];
  metadata: {
    gemeentenaam?: string;
    soortRegio?: string;
    codering?: string;
  };
}

/**
 * Union type for all parsed data types
 */
export type ParsedData =
  | ParsedDemographicsData
  | ParsedHealthData
  | ParsedLivabilityData
  | ParsedSafetyData;
