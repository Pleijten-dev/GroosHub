/**
 * Historic Dataset Configuration
 *
 * This file contains all dataset IDs and configuration for fetching
 * historic data from Dutch government sources (CBS, RIVM, Politie)
 *
 * Last Updated: 2025-12-26
 */

// =============================================================================
// CBS DEMOGRAPHICS (Kerncijfers wijken en buurten)
// =============================================================================

/**
 * CBS Demographics Dataset Configuration
 *
 * Each year from 2013+ is published as a SEPARATE dataset with unique ID
 * Older years (2004-2012) are in combined multi-year tables
 */
export interface DatasetConfig {
  id: string;
  year: number;
  baseUrl: string;
  period: string;  // Format: YYYYJJ00
  notes?: string;
}

/**
 * Demographics datasets by year (2013-2024)
 * Each year is a separate CBS StatLine table
 */
export const DEMOGRAPHICS_DATASETS: Record<number, DatasetConfig> = {
  2024: {
    id: '85984NED',
    year: 2024,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/85984NED/UntypedDataSet',
    period: '2024JJ00',
    notes: 'Most recent dataset'
  },
  2023: {
    id: '85618NED',
    year: 2023,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/85618NED/UntypedDataSet',
    period: '2023JJ00',
    notes: 'Currently used in production'
  },
  2022: {
    id: '85318NED',
    year: 2022,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/85318NED/UntypedDataSet',
    period: '2022JJ00'
  },
  2021: {
    id: '85039NED',
    year: 2021,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/85039NED/UntypedDataSet',
    period: '2021JJ00'
  },
  2020: {
    id: '84799NED',
    year: 2020,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/84799NED/UntypedDataSet',
    period: '2020JJ00',
    notes: 'COVID-19 pandemic year'
  },
  2019: {
    id: '84583NED',
    year: 2019,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet',
    period: '2019JJ00'
  },
  2018: {
    id: '84286NED',
    year: 2018,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/84286NED/UntypedDataSet',
    period: '2018JJ00'
  },
  2017: {
    id: '83765NED',
    year: 2017,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/83765NED/UntypedDataSet',
    period: '2017JJ00'
  },
  2016: {
    id: '83487NED',
    year: 2016,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/83487NED/UntypedDataSet',
    period: '2016JJ00'
  },
  2014: {
    id: '82931NED',
    year: 2014,
    baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/82931NED/UntypedDataSet',
    period: '2014JJ00'
  }
  // Note: 2015 and 2013 likely exist in multi-year tables
  // 2004-2012 are in combined tables (separate research needed)
};

/**
 * Get available years for demographics data
 */
export function getDemographicsAvailableYears(): number[] {
  return Object.keys(DEMOGRAPHICS_DATASETS)
    .map(Number)
    .sort((a, b) => b - a); // Descending order (newest first)
}

/**
 * Get dataset config for a specific year
 */
export function getDemographicsDatasetConfig(year: number): DatasetConfig | null {
  return DEMOGRAPHICS_DATASETS[year] || null;
}

/**
 * Check if demographics data is available for a year
 */
export function isDemographicsYearAvailable(year: number): boolean {
  return year in DEMOGRAPHICS_DATASETS;
}

// =============================================================================
// RIVM HEALTH (Gezondheid per wijk en buurt)
// =============================================================================

/**
 * RIVM Health Dataset Configuration
 *
 * Single dataset (50120NED) with multiple years available via period parameter
 * Data comes from periodic health surveys (not annual)
 */
export interface HealthDatasetConfig {
  datasetId: string;
  baseUrl: string;
  availableYears: number[];
  getPeriodCode: (year: number) => string;
  notes: string;
}

export const HEALTH_DATASET: HealthDatasetConfig = {
  datasetId: '50120NED',
  baseUrl: 'https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet',
  availableYears: [2012, 2016, 2020, 2022],
  getPeriodCode: (year: number) => `${year}JJ00`,
  notes: 'Based on Gezondheidsmonitor Volwassenen en Ouderen (2012, 2016, 2020) and Corona Gezondheidsmonitor 2022'
};

/**
 * Get available years for health data
 */
export function getHealthAvailableYears(): number[] {
  return [...HEALTH_DATASET.availableYears].sort((a, b) => b - a);
}

/**
 * Check if health data is available for a year
 */
export function isHealthYearAvailable(year: number): boolean {
  return HEALTH_DATASET.availableYears.includes(year);
}

/**
 * Get period code for health data
 */
export function getHealthPeriodCode(year: number): string | null {
  if (!isHealthYearAvailable(year)) return null;
  return HEALTH_DATASET.getPeriodCode(year);
}

// =============================================================================
// POLITIE SAFETY (Geregistreerde misdrijven)
// =============================================================================

/**
 * Politie Safety Dataset Configuration
 *
 * Single dataset (47018NED) with annual data from 2012-2024
 */
export interface SafetyDatasetConfig {
  datasetId: string;
  baseUrl: string;
  yearRange: {
    start: number;
    end: number;
  };
  getPeriodCode: (year: number) => string;
  notes: string;
}

export const SAFETY_DATASET: SafetyDatasetConfig = {
  datasetId: '47018NED',
  baseUrl: 'https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet',
  yearRange: {
    start: 2012,
    end: 2024
  },
  getPeriodCode: (year: number) => `${year}JJ00`,
  notes: 'Annual crime statistics. 2025 data to be added January 2026. All data normalized to 2025 geographic boundaries.'
};

/**
 * Get available years for safety data
 */
export function getSafetyAvailableYears(): number[] {
  const years: number[] = [];
  for (let year = SAFETY_DATASET.yearRange.start; year <= SAFETY_DATASET.yearRange.end; year++) {
    years.push(year);
  }
  return years.sort((a, b) => b - a);
}

/**
 * Check if safety data is available for a year
 */
export function isSafetyYearAvailable(year: number): boolean {
  return year >= SAFETY_DATASET.yearRange.start && year <= SAFETY_DATASET.yearRange.end;
}

/**
 * Get period code for safety data
 */
export function getSafetyPeriodCode(year: number): string | null {
  if (!isSafetyYearAvailable(year)) return null;
  return SAFETY_DATASET.getPeriodCode(year);
}

// =============================================================================
// CBS LIVABILITY (Veiligheidsmonitor)
// =============================================================================

/**
 * CBS Livability Dataset Configuration
 *
 * Dataset 85146NED (Veiligheidsmonitor - Safety Monitor)
 * Includes livability perception questions as part of safety survey
 *
 * Note: Only 2 years available. 2021 not easily comparable with earlier editions
 * due to questionnaire changes.
 */
export interface LivabilityDatasetConfig {
  datasetId: string;
  baseUrl: string;
  availableYears: number[];
  getPeriodCode: (year: number) => string;
  notes: string;
  warning: string;
}

export const LIVABILITY_DATASET: LivabilityDatasetConfig = {
  datasetId: '85146NED',
  baseUrl: 'https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet',
  availableYears: [2021, 2023],
  getPeriodCode: (year: number) => `${year}JJ00`,
  notes: 'Veiligheidsmonitor (Safety Monitor). Includes livability perception, safety, crime victimization.',
  warning: '2021 results cannot be easily compared with earlier editions due to questionnaire changes'
};

/**
 * Get available years for livability data
 */
export function getLivabilityAvailableYears(): number[] {
  return [...LIVABILITY_DATASET.availableYears].sort((a, b) => b - a);
}

/**
 * Check if livability data is available for a year
 */
export function isLivabilityYearAvailable(year: number): boolean {
  return LIVABILITY_DATASET.availableYears.includes(year);
}

/**
 * Get period code for livability data
 */
export function getLivabilityPeriodCode(year: number): string | null {
  if (!isLivabilityYearAvailable(year)) return null;
  return LIVABILITY_DATASET.getPeriodCode(year);
}

// =============================================================================
// UNIFIED DATA AVAILABILITY
// =============================================================================

/**
 * Data source types
 */
export type DataSource = 'demographics' | 'health' | 'safety' | 'livability';

/**
 * Get available years for any data source
 */
export function getAvailableYears(dataSource: DataSource): number[] {
  switch (dataSource) {
    case 'demographics':
      return getDemographicsAvailableYears();
    case 'health':
      return getHealthAvailableYears();
    case 'safety':
      return getSafetyAvailableYears();
    case 'livability':
      return getLivabilityAvailableYears();
    default:
      return [];
  }
}

/**
 * Check if data is available for a specific year and source
 */
export function isYearAvailable(dataSource: DataSource, year: number): boolean {
  switch (dataSource) {
    case 'demographics':
      return isDemographicsYearAvailable(year);
    case 'health':
      return isHealthYearAvailable(year);
    case 'safety':
      return isSafetyYearAvailable(year);
    case 'livability':
      return isLivabilityYearAvailable(year);
    default:
      return false;
  }
}

/**
 * Get period code for any data source and year
 */
export function getPeriodCode(dataSource: DataSource, year: number): string | null {
  switch (dataSource) {
    case 'demographics':
      return getDemographicsDatasetConfig(year)?.period || null;
    case 'health':
      return getHealthPeriodCode(year);
    case 'safety':
      return getSafetyPeriodCode(year);
    case 'livability':
      return getLivabilityPeriodCode(year);
    default:
      return null;
  }
}

/**
 * Get all years where data is available from ALL sources
 */
export function getCommonAvailableYears(): number[] {
  const demographics = new Set(getDemographicsAvailableYears());
  const health = new Set(getHealthAvailableYears());
  const safety = new Set(getSafetyAvailableYears());
  const livability = new Set(getLivabilityAvailableYears());

  // Find intersection
  const common: number[] = [];
  for (const year of demographics) {
    if (health.has(year) && safety.has(year) && livability.has(year)) {
      common.push(year);
    }
  }

  return common.sort((a, b) => b - a);
}

/**
 * Get data availability matrix for visualization
 */
export interface DataAvailabilityMatrix {
  years: number[];
  sources: {
    demographics: boolean[];
    health: boolean[];
    safety: boolean[];
    livability: boolean[];
  };
}

/**
 * Create a data availability matrix for a year range
 */
export function getDataAvailabilityMatrix(startYear: number, endYear: number): DataAvailabilityMatrix {
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push(year);
  }

  return {
    years,
    sources: {
      demographics: years.map(y => isDemographicsYearAvailable(y)),
      health: years.map(y => isHealthYearAvailable(y)),
      safety: years.map(y => isSafetyYearAvailable(y)),
      livability: years.map(y => isLivabilityYearAvailable(y))
    }
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default year ranges for quick selection
 */
export const PRESET_YEAR_RANGES = {
  LAST_3_YEARS: { start: new Date().getFullYear() - 3, end: new Date().getFullYear() },
  LAST_5_YEARS: { start: new Date().getFullYear() - 5, end: new Date().getFullYear() },
  LAST_10_YEARS: { start: new Date().getFullYear() - 10, end: new Date().getFullYear() },
  ALL_AVAILABLE: { start: 2012, end: new Date().getFullYear() }
} as const;

/**
 * Maximum number of years to fetch at once (to prevent API overload)
 */
export const MAX_YEARS_PER_REQUEST = 10;

/**
 * Default cache TTL for historic data (longer than current data)
 * Historic data doesn't change, so can be cached for 1 week
 */
export const HISTORIC_DATA_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
