"use client";

/**
 * CBS Demographics API Client
 * Dataset: 84583NED (Kerncijfers wijken en buurten) - Default for 2019
 *
 * This client fetches demographic data at multiple geographic levels:
 * - NL00: National level
 * - GMxxxx: Municipality level
 * - WKxxxxxx: District/Wijk level
 * - BUxxxxxxxx: Neighborhood/Buurt level
 *
 * Supports historic data fetching from different dataset IDs (each year is a separate dataset)
 */

import {
  DEMOGRAPHICS_DATASETS,
  getDemographicsDatasetConfig,
  getDemographicsAvailableYears,
  isDemographicsYearAvailable,
  type DatasetConfig
} from '../historic-datasets';

export type FetchedData = Record<string, unknown>;

export interface GeographicLevel {
  code: string;
  type: 'national' | 'municipality' | 'district' | 'neighborhood';
  name: string;
}

export interface CBSDemographicsResponse {
  level: GeographicLevel;
  data: FetchedData;
  fetchedAt: Date;
  year?: number;  // Year of the data (for historic data)
  datasetId?: string;  // Dataset ID used (for historic data)
}

export interface CBSDemographicsMultiLevelResponse {
  national: CBSDemographicsResponse | null;
  municipality: CBSDemographicsResponse | null;
  district: CBSDemographicsResponse | null;
  neighborhood: CBSDemographicsResponse | null;
}

export interface CBSDemographicsHistoricResponse {
  year: number;
  datasetId: string;
  data: CBSDemographicsMultiLevelResponse;
}

export interface GeographicCodes {
  municipality: string;
  district: string | null;
  neighborhood: string | null;
}

export class CBSDemographicsClient {
  private readonly baseUrl: string;
  private readonly defaultPeriod: string;
  private readonly datasetId: string;
  private readonly year: number;

  /**
   * Create a CBS Demographics client
   * @param datasetId - CBS dataset ID (default: 85618NED for 2023)
   * @param year - Year of the dataset (default: 2023)
   */
  constructor(datasetId: string = '85618NED', year: number = 2023) {
    this.datasetId = datasetId;
    this.year = year;
    this.baseUrl = `https://opendata.cbs.nl/ODataApi/odata/${datasetId}/UntypedDataSet`;
    this.defaultPeriod = `${year}JJ00`;
  }

  /**
   * Fetch demographics data for a single geographic code
   */
  async fetchByCode(
    code: string,
    period: string = this.defaultPeriod
  ): Promise<FetchedData> {
    try {
      const url = `${this.baseUrl}?$filter=startswith(WijkenEnBuurten,'${code}') and Perioden eq '${period}'`;

      console.log(`🔵 [CBS Demographics] Fetching code: ${code}`);
      console.log(`🔵 [CBS Demographics] URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ [CBS Demographics] API error: ${response.statusText}`);
        console.error(`❌ [CBS Demographics] URL: ${url}`);
        return {};
      }

      const data = await response.json();
      const rows = data.value as FetchedData[] | undefined;

      console.log(`✅ [CBS Demographics] Found ${rows?.length || 0} rows for ${code}`);

      if (!rows || rows.length === 0) {
        console.warn(`⚠️ [CBS Demographics] No data for ${code}`);
        return {};
      }

      // Return the first row (should only be one for a specific code)
      return rows[0];
    } catch (error) {
      console.error(`❌ [CBS Demographics] Error:`, error);
      return {};
    }
  }

  /**
   * Fetch demographics data for multiple geographic levels simultaneously
   */
  async fetchMultiLevel(
    municipalityCode: string,
    districtCode: string | null,
    neighborhoodCode: string | null,
    period: string = this.defaultPeriod
  ): Promise<CBSDemographicsMultiLevelResponse> {
    // Fetch all levels in parallel
    const [nationalData, municipalityData, districtData, neighborhoodData] =
      await Promise.all([
        this.fetchByCode('NL00', period), // National level
        this.fetchByCode(municipalityCode, period), // Municipality
        districtCode ? this.fetchByCode(districtCode, period) : Promise.resolve({}), // District
        neighborhoodCode ? this.fetchByCode(neighborhoodCode, period) : Promise.resolve({}), // Neighborhood
      ]);

    const now = new Date();

    return {
      national: Object.keys(nationalData).length > 0
        ? {
            level: {
              code: 'NL00',
              type: 'national',
              name: 'Nederland',
            },
            data: nationalData,
            fetchedAt: now,
          }
        : null,
      municipality: Object.keys(municipalityData).length > 0
        ? {
            level: {
              code: municipalityCode,
              type: 'municipality',
              name: municipalityCode, // Will be replaced with actual name
            },
            data: municipalityData,
            fetchedAt: now,
          }
        : null,
      district:
        districtCode && Object.keys(districtData).length > 0
          ? {
              level: {
                code: districtCode,
                type: 'district',
                name: districtCode,
              },
              data: districtData,
              fetchedAt: now,
            }
          : null,
      neighborhood:
        neighborhoodCode && Object.keys(neighborhoodData).length > 0
          ? {
              level: {
                code: neighborhoodCode,
                type: 'neighborhood',
                name: neighborhoodCode,
              },
              data: neighborhoodData,
              fetchedAt: now,
            }
          : null,
    };
  }

  /**
   * Get all available columns/metrics from the dataset
   * This is useful for understanding what data is available
   */
  async getAvailableMetrics(): Promise<string[]> {
    try {
      const url = `https://opendata.cbs.nl/ODataApi/odata/${this.datasetId}/DataProperties`;
      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.value.map((prop: { Key: string }) => prop.Key);
    } catch (error) {
      console.error('Error fetching available metrics:', error);
      return [];
    }
  }

  // =============================================================================
  // HISTORIC DATA METHODS
  // =============================================================================

  /**
   * Fetch historic demographics data for multiple years
   *
   * @param codes - Geographic codes (municipality, district, neighborhood)
   * @param years - Array of years to fetch (e.g., [2020, 2021, 2022])
   * @param options - Fetch options
   * @returns Map of year to multi-level response
   *
   * @example
   * ```typescript
   * const client = new CBSDemographicsClient();
   * const historic = await client.fetchHistoricData(
   *   { municipality: 'GM0363', district: 'WK036300', neighborhood: null },
   *   [2020, 2021, 2022, 2023]
   * );
   * ```
   */
  async fetchHistoricData(
    codes: GeographicCodes,
    years: number[],
    options?: {
      onProgress?: (current: number, total: number, year: number) => void;
      rateLimitDelay?: number;  // Delay between requests in ms (default: 200)
    }
  ): Promise<Map<number, CBSDemographicsHistoricResponse>> {
    const results = new Map<number, CBSDemographicsHistoricResponse>();
    const rateLimitDelay = options?.rateLimitDelay ?? 200;

    console.log(`📊 [CBS Demographics Historic] Fetching ${years.length} years: ${years.join(', ')}`);

    // Validate years
    const validYears = years.filter(year => {
      const isValid = isDemographicsYearAvailable(year);
      if (!isValid) {
        console.warn(`⚠️ [CBS Demographics Historic] No dataset for year ${year}`);
      }
      return isValid;
    });

    if (validYears.length === 0) {
      console.error('❌ [CBS Demographics Historic] No valid years to fetch');
      return results;
    }

    // Fetch each year sequentially to avoid rate limiting
    for (let i = 0; i < validYears.length; i++) {
      const year = validYears[i];
      const config = getDemographicsDatasetConfig(year);

      if (!config) {
        console.warn(`⚠️ [CBS Demographics Historic] No config for year ${year}`);
        continue;
      }

      try {
        console.log(`📊 [CBS Demographics Historic] Fetching year ${year} (${i + 1}/${validYears.length})`);

        // Create client for this specific year
        const yearClient = new CBSDemographicsClient(config.id, year);

        // Fetch multi-level data
        const data = await yearClient.fetchMultiLevel(
          codes.municipality,
          codes.district,
          codes.neighborhood,
          config.period
        );

        // Add year and dataset metadata to each response
        const enrichData = (response: CBSDemographicsResponse | null): CBSDemographicsResponse | null => {
          if (!response) return null;
          return {
            ...response,
            year,
            datasetId: config.id
          };
        };

        results.set(year, {
          year,
          datasetId: config.id,
          data: {
            national: enrichData(data.national),
            municipality: enrichData(data.municipality),
            district: enrichData(data.district),
            neighborhood: enrichData(data.neighborhood)
          }
        });

        console.log(`✅ [CBS Demographics Historic] Successfully fetched year ${year}`);

        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, validYears.length, year);
        }

        // Rate limiting: wait before next request
        if (i < validYears.length - 1) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }

      } catch (error) {
        console.error(`❌ [CBS Demographics Historic] Failed to fetch year ${year}:`, error);
        // Continue with next year instead of failing entirely
      }
    }

    console.log(`📊 [CBS Demographics Historic] Completed: ${results.size}/${validYears.length} years fetched`);

    return results;
  }

  /**
   * Fetch historic demographics data for a single year
   *
   * @param codes - Geographic codes
   * @param year - Year to fetch
   * @returns Historic response or null if not available
   */
  async fetchHistoricYear(
    codes: GeographicCodes,
    year: number
  ): Promise<CBSDemographicsHistoricResponse | null> {
    const results = await this.fetchHistoricData(codes, [year]);
    return results.get(year) || null;
  }

  /**
   * Get all available years for demographics data
   */
  static getAvailableYears(): number[] {
    return getDemographicsAvailableYears();
  }

  /**
   * Check if demographics data is available for a specific year
   */
  static isYearAvailable(year: number): boolean {
    return isDemographicsYearAvailable(year);
  }

  /**
   * Get dataset configuration for a specific year
   */
  static getDatasetConfig(year: number): DatasetConfig | null {
    return getDemographicsDatasetConfig(year);
  }
}
