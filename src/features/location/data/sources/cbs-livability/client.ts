"use client";

/**
 * CBS Livability API Client
 * Dataset: 85146NED (Leefervaring en voorzieningen)
 *
 * This client fetches livability data at municipality level
 */

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
}

export interface CBSLivabilityMultiLevelResponse {
  national: CBSLivabilityResponse | null;
  municipality: CBSLivabilityResponse | null;
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
}
