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
  type: 'municipality';
  name: string;
}

export interface CBSLivabilityResponse {
  level: GeographicLevel;
  data: FetchedData;
  fetchedAt: Date;
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

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`CBS Livability API error: ${response.statusText}`);
        return {};
      }

      const data = await response.json();
      const rows = data.value as FetchedData[] | undefined;

      if (!rows || rows.length === 0) {
        return {};
      }

      return rows[0];
    } catch (error) {
      console.error('Error fetching CBS livability data:', error);
      return {};
    }
  }

  /**
   * Fetch livability data for municipality level
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
