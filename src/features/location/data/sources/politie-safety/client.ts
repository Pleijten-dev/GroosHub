"use client";

/**
 * Politie Safety API Client
 * Dataset: 47018NED (Geregistreerde criminaliteit)
 *
 * This client fetches safety/crime data at district and neighborhood levels
 * Returns crime statistics by type of crime (SoortMisdrijf)
 */

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
}

export interface PolitieSafetyMultiLevelResponse {
  national: PolitieSafetyResponse | null;
  municipality: PolitieSafetyResponse | null;
  district: PolitieSafetyResponse | null;
  neighborhood: PolitieSafetyResponse | null;
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
}
