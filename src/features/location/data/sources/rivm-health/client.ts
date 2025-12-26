"use client";

/**
 * RIVM Health API Client
 * Dataset: 50120NED (Gezondheid en zorggebruik)
 *
 * This client fetches health data at district and neighborhood levels
 * Note: This dataset uses WijkenEnBuurten codes (WK/BU), not municipality codes
 *
 * Supports historic data from 2012, 2016, 2020, 2022 (periodic health surveys)
 */

import {
  HEALTH_DATASET,
  getHealthAvailableYears,
  isHealthYearAvailable,
  getHealthPeriodCode
} from '../historic-datasets';

export type FetchedData = Record<string, unknown>;

export interface GeographicLevel {
  code: string;
  type: 'national' | 'municipality' | 'district' | 'neighborhood';
  name: string;
}

export interface RIVMHealthResponse {
  level: GeographicLevel;
  data: FetchedData;
  fetchedAt: Date;
  year?: number;  // Year of the data (for historic data)
}

export interface RIVMHealthMultiLevelResponse {
  national: RIVMHealthResponse | null;
  municipality: RIVMHealthResponse | null;
  district: RIVMHealthResponse | null;
  neighborhood: RIVMHealthResponse | null;
}

export interface RIVMHealthHistoricResponse {
  year: number;
  period: string;
  data: RIVMHealthMultiLevelResponse;
}

export interface GeographicCodes {
  municipality: string;
  district: string | null;
  neighborhood: string | null;
}

export class RIVMHealthClient {
  private readonly baseUrl = 'https://dataderden.cbs.nl/ODataApi/odata/50120NED/UntypedDataSet';
  private readonly defaultPeriod = '2022JJ00'; // 2022 annual data (latest available)
  private readonly defaultLeeftijd = '20300'; // All ages
  private readonly defaultMarges = 'MW00000'; // No margin indicator

  /**
   * Fetch health data for a single geographic code (WK or BU)
   */
  async fetchByCode(
    code: string,
    period: string = this.defaultPeriod,
    leeftijd: string = this.defaultLeeftijd,
    marges: string = this.defaultMarges
  ): Promise<FetchedData> {
    try {
      const url =
        `${this.baseUrl}?` +
        `$filter=startswith(WijkenEnBuurten,'${code}')` +
        ` and Perioden eq '${period}'` +
        ` and Leeftijd eq '${leeftijd}'` +
        ` and Marges eq '${marges}'`;

      console.log(`🟢 [RIVM Health] Fetching code: ${code}`);
      console.log(`🟢 [RIVM Health] URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ [RIVM Health] API error: ${response.statusText}`);
        console.error(`❌ [RIVM Health] URL: ${url}`);
        return {};
      }

      const data = await response.json();
      const rows = data.value as FetchedData[] | undefined;

      console.log(`✅ [RIVM Health] Found ${rows?.length || 0} rows for ${code}`);

      if (!rows || rows.length === 0) {
        console.warn(`⚠️ [RIVM Health] No data for ${code}`);
        return {};
      }

      return rows[0];
    } catch (error) {
      console.error(`❌ [RIVM Health] Error:`, error);
      return {};
    }
  }

  /**
   * Fetch health data for multiple geographic levels
   * Note: Will try both NL00 and NL01 for national level
   */
  async fetchMultiLevel(
    municipalityCode: string,
    districtCode: string | null,
    neighborhoodCode: string | null,
    period: string = this.defaultPeriod
  ): Promise<RIVMHealthMultiLevelResponse> {
    // Try both NL00 and NL01 for national level
    const [nationalDataNL00, nationalDataNL01, municipalityData, districtData, neighborhoodData] =
      await Promise.all([
        this.fetchByCode('NL00', period),
        this.fetchByCode('NL01', period),
        this.fetchByCode(municipalityCode, period),
        districtCode ? this.fetchByCode(districtCode, period) : Promise.resolve({}),
        neighborhoodCode ? this.fetchByCode(neighborhoodCode, period) : Promise.resolve({}),
      ]);

    const now = new Date();

    // Use NL01 if NL00 is empty
    const nationalData = Object.keys(nationalDataNL00).length > 0
      ? { code: 'NL00', data: nationalDataNL00 }
      : Object.keys(nationalDataNL01).length > 0
      ? { code: 'NL01', data: nationalDataNL01 }
      : null;

    return {
      national: nationalData
        ? {
            level: {
              code: nationalData.code,
              type: 'national',
              name: 'Nederland',
            },
            data: nationalData.data,
            fetchedAt: now,
          }
        : null,
      municipality: Object.keys(municipalityData).length > 0
        ? {
            level: {
              code: municipalityCode,
              type: 'municipality',
              name: municipalityCode,
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
   * Get available metrics from the dataset
   */
  async getAvailableMetrics(): Promise<string[]> {
    try {
      const url = `https://dataderden.cbs.nl/ODataApi/odata/50120NED/DataProperties`;
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
   * Fetch historic health data for multiple years
   *
   * @param codes - Geographic codes (municipality, district, neighborhood)
   * @param years - Array of years to fetch (available: 2012, 2016, 2020, 2022)
   * @param options - Fetch options
   * @returns Map of year to multi-level response
   *
   * @example
   * ```typescript
   * const client = new RIVMHealthClient();
   * const historic = await client.fetchHistoricData(
   *   { municipality: 'GM0363', district: 'WK036300', neighborhood: null },
   *   [2016, 2020, 2022]
   * );
   * ```
   */
  async fetchHistoricData(
    codes: GeographicCodes,
    years?: number[],  // Optional: if not provided, fetch all available years
    options?: {
      onProgress?: (current: number, total: number, year: number) => void;
      rateLimitDelay?: number;  // Delay between requests in ms (default: 200)
    }
  ): Promise<Map<number, RIVMHealthHistoricResponse>> {
    const results = new Map<number, RIVMHealthHistoricResponse>();
    const rateLimitDelay = options?.rateLimitDelay ?? 200;

    // Use provided years or all available years
    const targetYears = years || getHealthAvailableYears();

    console.log(`🟢 [RIVM Health Historic] Fetching ${targetYears.length} years: ${targetYears.join(', ')}`);

    // Validate years
    const validYears = targetYears.filter(year => {
      const isValid = isHealthYearAvailable(year);
      if (!isValid) {
        console.warn(`⚠️ [RIVM Health Historic] Data not available for year ${year}`);
        console.warn(`⚠️ [RIVM Health Historic] Available years: ${getHealthAvailableYears().join(', ')}`);
      }
      return isValid;
    });

    if (validYears.length === 0) {
      console.error('❌ [RIVM Health Historic] No valid years to fetch');
      return results;
    }

    // Fetch each year sequentially to avoid rate limiting
    for (let i = 0; i < validYears.length; i++) {
      const year = validYears[i];
      const periodCode = getHealthPeriodCode(year);

      if (!periodCode) {
        console.warn(`⚠️ [RIVM Health Historic] No period code for year ${year}`);
        continue;
      }

      try {
        console.log(`🟢 [RIVM Health Historic] Fetching year ${year} (${i + 1}/${validYears.length})`);

        // Fetch multi-level data for this year
        const data = await this.fetchMultiLevel(
          codes.municipality,
          codes.district,
          codes.neighborhood,
          periodCode
        );

        // Add year metadata to each response
        const enrichData = (response: RIVMHealthResponse | null): RIVMHealthResponse | null => {
          if (!response) return null;
          return {
            ...response,
            year
          };
        };

        results.set(year, {
          year,
          period: periodCode,
          data: {
            national: enrichData(data.national),
            municipality: enrichData(data.municipality),
            district: enrichData(data.district),
            neighborhood: enrichData(data.neighborhood)
          }
        });

        console.log(`✅ [RIVM Health Historic] Successfully fetched year ${year}`);

        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, validYears.length, year);
        }

        // Rate limiting: wait before next request
        if (i < validYears.length - 1) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }

      } catch (error) {
        console.error(`❌ [RIVM Health Historic] Failed to fetch year ${year}:`, error);
        // Continue with next year instead of failing entirely
      }
    }

    console.log(`🟢 [RIVM Health Historic] Completed: ${results.size}/${validYears.length} years fetched`);

    return results;
  }

  /**
   * Fetch historic health data for a single year
   *
   * @param codes - Geographic codes
   * @param year - Year to fetch
   * @returns Historic response or null if not available
   */
  async fetchHistoricYear(
    codes: GeographicCodes,
    year: number
  ): Promise<RIVMHealthHistoricResponse | null> {
    const results = await this.fetchHistoricData(codes, [year]);
    return results.get(year) || null;
  }

  /**
   * Get all available years for health data
   */
  static getAvailableYears(): number[] {
    return getHealthAvailableYears();
  }

  /**
   * Check if health data is available for a specific year
   */
  static isYearAvailable(year: number): boolean {
    return isHealthYearAvailable(year);
  }

  /**
   * Get period code for a specific year
   */
  static getPeriodCode(year: number): string | null {
    return getHealthPeriodCode(year);
  }
}
