"use client";

/**
 * RIVM Health API Client
 * Dataset: 50120NED (Gezondheid en zorggebruik)
 *
 * This client fetches health data at district and neighborhood levels
 * Note: This dataset uses WijkenEnBuurten codes (WK/BU), not municipality codes
 */

export type FetchedData = Record<string, unknown>;

export interface GeographicLevel {
  code: string;
  type: 'district' | 'neighborhood';
  name: string;
}

export interface RIVMHealthResponse {
  level: GeographicLevel;
  data: FetchedData;
  fetchedAt: Date;
}

export interface RIVMHealthMultiLevelResponse {
  district: RIVMHealthResponse | null;
  neighborhood: RIVMHealthResponse | null;
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
   * Note: National and municipality level data may not be available in this dataset
   */
  async fetchMultiLevel(
    districtCode: string | null,
    neighborhoodCode: string | null,
    period: string = this.defaultPeriod
  ): Promise<RIVMHealthMultiLevelResponse> {
    // Fetch available levels in parallel
    const [districtData, neighborhoodData] = await Promise.all([
      districtCode ? this.fetchByCode(districtCode, period) : Promise.resolve({}),
      neighborhoodCode ? this.fetchByCode(neighborhoodCode, period) : Promise.resolve({}),
    ]);

    const now = new Date();

    return {
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
}
