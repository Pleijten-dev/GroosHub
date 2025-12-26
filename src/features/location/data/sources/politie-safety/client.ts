"use client";

/**
 * Politie Safety API Client
 * Dataset: 47018NED (Geregistreerde criminaliteit)
 *
 * This client fetches safety/crime data at district and neighborhood levels
 * Returns crime statistics by type of crime (SoortMisdrijf)
 *
 * Supports historic data from 2012-2024 (annual crime statistics)
 */

import {
  SAFETY_DATASET,
  getSafetyAvailableYears,
  isSafetyYearAvailable,
  getSafetyPeriodCode
} from '../historic-datasets';

export type FetchedData = Record<string, unknown>;

/**
 * Remapped safety data: crime type code => number of registered crimes
 * Example: { "0.0.0": 3353, "1.1.1": 8, "1.1.2": 3, ... }
 */
export type SafetyDataRemapped = Record<string, number>;

export interface GeographicLevel {
  code: string;
  type: 'national' | 'municipality' | 'district' | 'neighborhood';
  name: string;
}

export interface PolitieSafetyResponse {
  level: GeographicLevel;
  data: SafetyDataRemapped;
  fetchedAt: Date;
  year?: number;  // Year of the data (for historic data)
}

export interface PolitieSafetyMultiLevelResponse {
  national: PolitieSafetyResponse | null;
  municipality: PolitieSafetyResponse | null;
  district: PolitieSafetyResponse | null;
  neighborhood: PolitieSafetyResponse | null;
}

export interface PolitieSafetyHistoricResponse {
  year: number;
  period: string;
  data: PolitieSafetyMultiLevelResponse;
}

export interface GeographicCodes {
  municipality: string;
  district: string | null;
  neighborhood: string | null;
}

interface VeiligheidRow {
  [key: string]: unknown;
  SoortMisdrijf?: string;
  GeregistreerdeMisdrijven_1?: string;
}

export class PolitieSafetyClient {
  private readonly baseUrl = 'https://dataderden.cbs.nl/ODataApi/odata/47018NED/UntypedDataSet';
  private readonly defaultPeriod = '2024JJ00'; // 2024 annual data

  /**
   * Fetch safety data for a single geographic code (WK or BU)
   * Returns a mapping of crime type code to number of crimes
   */
  async fetchByCode(
    code: string,
    period: string = this.defaultPeriod
  ): Promise<SafetyDataRemapped> {
    try {
      const url =
        `${this.baseUrl}?` +
        `$filter=startswith(WijkenEnBuurten,'${code}')` +
        ` and Perioden eq '${period}'`;

      console.log(`🔴 [Politie Safety] Fetching code: ${code}`);
      console.log(`🔴 [Politie Safety] URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ [Politie Safety] API error: ${response.statusText}`);
        console.error(`❌ [Politie Safety] URL: ${url}`);
        return {};
      }

      const data = await response.json();
      const rows = (data.value as VeiligheidRow[]) || [];

      console.log(`✅ [Politie Safety] Found ${rows.length} crime types for ${code}`);

      // Build a dictionary: SoortMisdrijf => number of crimes
      const result: SafetyDataRemapped = {};

      for (const row of rows) {
        const crimeType = (row.SoortMisdrijf ?? '').toString().trim(); // e.g. "0.0.0"
        const valueStr = (row.GeregistreerdeMisdrijven_1 ?? '').toString().trim(); // e.g. "3353" or "."

        // Parse value, treat "." as 0
        let valueNum = parseInt(valueStr, 10);
        if (isNaN(valueNum)) {
          valueNum = 0;
        }

        // Store in dictionary
        if (crimeType) {
          result[crimeType] = valueNum;
        }
      }

      if (Object.keys(result).length === 0) {
        console.warn(`⚠️ [Politie Safety] No crime data for ${code}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ [Politie Safety] Error:`, error);
      return {};
    }
  }

  /**
   * Fetch safety data for multiple geographic levels
   * Note: Will try both NL00 and NL01 for national level
   */
  async fetchMultiLevel(
    municipalityCode: string,
    districtCode: string | null,
    neighborhoodCode: string | null,
    period: string = this.defaultPeriod
  ): Promise<PolitieSafetyMultiLevelResponse> {
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
   * Get available crime types from the dataset
   */
  async getAvailableCrimeTypes(): Promise<string[]> {
    try {
      const url = `https://dataderden.cbs.nl/ODataApi/odata/47018NED/SoortMisdrijf`;
      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.value.map((item: { Key: string; Title: string }) => ({
        code: item.Key,
        title: item.Title,
      }));
    } catch (error) {
      console.error('Error fetching available crime types:', error);
      return [];
    }
  }

  // =============================================================================
  // HISTORIC DATA METHODS
  // =============================================================================

  /**
   * Fetch historic safety/crime data for multiple years
   *
   * @param codes - Geographic codes (municipality, district, neighborhood)
   * @param years - Array of years to fetch (available: 2012-2024)
   * @param options - Fetch options
   * @returns Map of year to multi-level response
   *
   * @example
   * ```typescript
   * const client = new PolitieSafetyClient();
   * const historic = await client.fetchHistoricData(
   *   { municipality: 'GM0363', district: 'WK036300', neighborhood: null },
   *   [2020, 2021, 2022, 2023, 2024]
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
  ): Promise<Map<number, PolitieSafetyHistoricResponse>> {
    const results = new Map<number, PolitieSafetyHistoricResponse>();
    const rateLimitDelay = options?.rateLimitDelay ?? 200;

    // Use provided years or all available years
    const targetYears = years || getSafetyAvailableYears();

    console.log(`🔴 [Politie Safety Historic] Fetching ${targetYears.length} years: ${targetYears.join(', ')}`);

    // Validate years
    const validYears = targetYears.filter(year => {
      const isValid = isSafetyYearAvailable(year);
      if (!isValid) {
        console.warn(`⚠️ [Politie Safety Historic] Data not available for year ${year}`);
        console.warn(`⚠️ [Politie Safety Historic] Available: ${SAFETY_DATASET.yearRange.start}-${SAFETY_DATASET.yearRange.end}`);
      }
      return isValid;
    });

    if (validYears.length === 0) {
      console.error('❌ [Politie Safety Historic] No valid years to fetch');
      return results;
    }

    // Fetch each year sequentially to avoid rate limiting
    for (let i = 0; i < validYears.length; i++) {
      const year = validYears[i];
      const periodCode = getSafetyPeriodCode(year);

      if (!periodCode) {
        console.warn(`⚠️ [Politie Safety Historic] No period code for year ${year}`);
        continue;
      }

      try {
        console.log(`🔴 [Politie Safety Historic] Fetching year ${year} (${i + 1}/${validYears.length})`);

        // Fetch multi-level data for this year
        const data = await this.fetchMultiLevel(
          codes.municipality,
          codes.district,
          codes.neighborhood,
          periodCode
        );

        // Add year metadata to each response
        const enrichData = (response: PolitieSafetyResponse | null): PolitieSafetyResponse | null => {
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

        console.log(`✅ [Politie Safety Historic] Successfully fetched year ${year}`);

        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, validYears.length, year);
        }

        // Rate limiting: wait before next request
        if (i < validYears.length - 1) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }

      } catch (error) {
        console.error(`❌ [Politie Safety Historic] Failed to fetch year ${year}:`, error);
        // Continue with next year instead of failing entirely
      }
    }

    console.log(`🔴 [Politie Safety Historic] Completed: ${results.size}/${validYears.length} years fetched`);

    return results;
  }

  /**
   * Fetch historic safety data for a single year
   *
   * @param codes - Geographic codes
   * @param year - Year to fetch
   * @returns Historic response or null if not available
   */
  async fetchHistoricYear(
    codes: GeographicCodes,
    year: number
  ): Promise<PolitieSafetyHistoricResponse | null> {
    const results = await this.fetchHistoricData(codes, [year]);
    return results.get(year) || null;
  }

  /**
   * Get all available years for safety data
   */
  static getAvailableYears(): number[] {
    return getSafetyAvailableYears();
  }

  /**
   * Check if safety data is available for a specific year
   */
  static isYearAvailable(year: number): boolean {
    return isSafetyYearAvailable(year);
  }

  /**
   * Get period code for a specific year
   */
  static getPeriodCode(year: number): string | null {
    return getSafetyPeriodCode(year);
  }
}
