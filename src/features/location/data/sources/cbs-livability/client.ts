"use client";

/**
 * CBS Livability API Client
 * Dataset: 85146NED (Veiligheidsmonitor - Safety Monitor)
 *
 * This client fetches livability perception data at municipality level
 * Includes safety perception, crime victimization, and livability questions
 *
 * Supports historic data from 2021, 2023
 * Note: 2021 not easily comparable with earlier editions due to questionnaire changes
 */

import {
  LIVABILITY_DATASET,
  getLivabilityAvailableYears,
  isLivabilityYearAvailable,
  getLivabilityPeriodCode
} from '../historic-datasets';

export type FetchedData = Record<string, unknown>;

export interface GeographicLevel {
  code: string;
  type: 'national' | 'municipality';
  name: string;
}

export interface CBSLivabilityResponse {
  level: GeographicLevel;
  data: FetchedData;
  fetchedAt: Date;
  year?: number;  // Year of the data (for historic data)
}

export interface CBSLivabilityMultiLevelResponse {
  national: CBSLivabilityResponse | null;
  municipality: CBSLivabilityResponse | null;
}

export interface CBSLivabilityHistoricResponse {
  year: number;
  period: string;
  data: CBSLivabilityMultiLevelResponse;
}

export interface GeographicCodes {
  municipality: string;
}

export class CBSLivabilityClient {
  private readonly baseUrl = 'https://opendata.cbs.nl/ODataApi/odata/85146NED/UntypedDataSet';
  private readonly defaultPeriod = '2023JJ00'; // 2023 annual data
  private readonly defaultMarges = 'MW00000'; // No margin indicator

  /**
   * Fetch livability data for a municipality code
   */
  async fetchByCode(
    gemeenteCode: string,
    period: string = this.defaultPeriod,
    marges: string = this.defaultMarges
  ): Promise<FetchedData> {
    try {
      const url =
        `${this.baseUrl}?` +
        `$filter=startswith(RegioS,'${gemeenteCode}')` +
        ` and Perioden eq '${period}'` +
        ` and Marges eq '${marges}'`;

      console.log(`🟣 [CBS Livability] Fetching code: ${gemeenteCode}`);
      console.log(`🟣 [CBS Livability] URL: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`❌ [CBS Livability] API error: ${response.statusText}`);
        console.error(`❌ [CBS Livability] URL: ${url}`);
        return {};
      }

      const data = await response.json();
      const rows = data.value as FetchedData[] | undefined;

      console.log(`✅ [CBS Livability] Found ${rows?.length || 0} rows for ${gemeenteCode}`);

      if (!rows || rows.length === 0) {
        console.warn(`⚠️ [CBS Livability] No data for ${gemeenteCode}`);
        return {};
      }

      return rows[0];
    } catch (error) {
      console.error(`❌ [CBS Livability] Error:`, error);
      return {};
    }
  }

  /**
   * Fetch livability data for municipality level
   * @deprecated Use fetchMultiLevel instead
   */
  async fetchMunicipality(
    municipalityCode: string,
    period: string = this.defaultPeriod
  ): Promise<CBSLivabilityResponse | null> {
    const municipalityData = await this.fetchByCode(municipalityCode, period);

    if (Object.keys(municipalityData).length === 0) {
      return null;
    }

    return {
      level: {
        code: municipalityCode,
        type: 'municipality',
        name: municipalityCode,
      },
      data: municipalityData,
      fetchedAt: new Date(),
    };
  }

  /**
   * Fetch livability data for multiple geographic levels
   * Note: Will try both NL00 and NL01 for national level
   */
  async fetchMultiLevel(
    municipalityCode: string,
    period: string = this.defaultPeriod
  ): Promise<CBSLivabilityMultiLevelResponse> {
    // Try both NL00 and NL01 for national level
    const [nationalDataNL00, nationalDataNL01, municipalityData] =
      await Promise.all([
        this.fetchByCode('NL00', period),
        this.fetchByCode('NL01', period),
        this.fetchByCode(municipalityCode, period),
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
    };
  }

  /**
   * Get available metrics from the dataset
   */
  async getAvailableMetrics(): Promise<string[]> {
    try {
      const url = `https://opendata.cbs.nl/ODataApi/odata/85146NED/DataProperties`;
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
   * Fetch historic livability data for multiple years
   *
   * @param codes - Geographic codes (municipality only)
   * @param years - Array of years to fetch (available: 2021, 2023)
   * @param options - Fetch options
   * @returns Map of year to multi-level response
   *
   * @example
   * ```typescript
   * const client = new CBSLivabilityClient();
   * const historic = await client.fetchHistoricData(
   *   { municipality: 'GM0363' },
   *   [2021, 2023]
   * );
   * ```
   *
   * @warning 2021 results cannot be easily compared with earlier editions due to
   *          questionnaire and research design changes
   */
  async fetchHistoricData(
    codes: GeographicCodes,
    years?: number[],  // Optional: if not provided, fetch all available years
    options?: {
      onProgress?: (current: number, total: number, year: number) => void;
      rateLimitDelay?: number;  // Delay between requests in ms (default: 200)
    }
  ): Promise<Map<number, CBSLivabilityHistoricResponse>> {
    const results = new Map<number, CBSLivabilityHistoricResponse>();
    const rateLimitDelay = options?.rateLimitDelay ?? 200;

    // Use provided years or all available years
    const targetYears = years || getLivabilityAvailableYears();

    console.log(`🟣 [CBS Livability Historic] Fetching ${targetYears.length} years: ${targetYears.join(', ')}`);

    // Validate years
    const validYears = targetYears.filter(year => {
      const isValid = isLivabilityYearAvailable(year);
      if (!isValid) {
        console.warn(`⚠️ [CBS Livability Historic] Data not available for year ${year}`);
        console.warn(`⚠️ [CBS Livability Historic] Available years: ${getLivabilityAvailableYears().join(', ')}`);
      }
      return isValid;
    });

    if (validYears.length === 0) {
      console.error('❌ [CBS Livability Historic] No valid years to fetch');
      return results;
    }

    // Show warning about 2021 comparability
    if (validYears.includes(2021) && validYears.length > 1) {
      console.warn('⚠️ [CBS Livability Historic] Warning: ' + LIVABILITY_DATASET.warning);
    }

    // Fetch each year sequentially to avoid rate limiting
    for (let i = 0; i < validYears.length; i++) {
      const year = validYears[i];
      const periodCode = getLivabilityPeriodCode(year);

      if (!periodCode) {
        console.warn(`⚠️ [CBS Livability Historic] No period code for year ${year}`);
        continue;
      }

      try {
        console.log(`🟣 [CBS Livability Historic] Fetching year ${year} (${i + 1}/${validYears.length})`);

        // Fetch multi-level data for this year
        const data = await this.fetchMultiLevel(
          codes.municipality,
          periodCode
        );

        // Add year metadata to each response
        const enrichData = (response: CBSLivabilityResponse | null): CBSLivabilityResponse | null => {
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
            municipality: enrichData(data.municipality)
          }
        });

        console.log(`✅ [CBS Livability Historic] Successfully fetched year ${year}`);

        // Report progress
        if (options?.onProgress) {
          options.onProgress(i + 1, validYears.length, year);
        }

        // Rate limiting: wait before next request
        if (i < validYears.length - 1) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }

      } catch (error) {
        console.error(`❌ [CBS Livability Historic] Failed to fetch year ${year}:`, error);
        // Continue with next year instead of failing entirely
      }
    }

    console.log(`🟣 [CBS Livability Historic] Completed: ${results.size}/${validYears.length} years fetched`);

    return results;
  }

  /**
   * Fetch historic livability data for a single year
   *
   * @param codes - Geographic codes
   * @param year - Year to fetch
   * @returns Historic response or null if not available
   */
  async fetchHistoricYear(
    codes: GeographicCodes,
    year: number
  ): Promise<CBSLivabilityHistoricResponse | null> {
    const results = await this.fetchHistoricData(codes, [year]);
    return results.get(year) || null;
  }

  /**
   * Get all available years for livability data
   */
  static getAvailableYears(): number[] {
    return getLivabilityAvailableYears();
  }

  /**
   * Check if livability data is available for a specific year
   */
  static isYearAvailable(year: number): boolean {
    return isLivabilityYearAvailable(year);
  }

  /**
   * Get period code for a specific year
   */
  static getPeriodCode(year: number): string | null {
    return getLivabilityPeriodCode(year);
  }
}
