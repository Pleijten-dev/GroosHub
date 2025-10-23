"use client";

/**
 * CBS Demographics API Client
 * Dataset: 84583NED (Kerncijfers wijken en buurten)
 *
 * This client fetches demographic data at multiple geographic levels:
 * - NL00: National level
 * - GMxxxx: Municipality level
 * - WKxxxxxx: District/Wijk level
 * - BUxxxxxxxx: Neighborhood/Buurt level
 */

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
}

export interface CBSDemographicsMultiLevelResponse {
  national: CBSDemographicsResponse | null;
  municipality: CBSDemographicsResponse | null;
  district: CBSDemographicsResponse | null;
  neighborhood: CBSDemographicsResponse | null;
}

export class CBSDemographicsClient {
  private readonly baseUrl = 'https://opendata.cbs.nl/ODataApi/odata/84583NED/UntypedDataSet';
  private readonly defaultPeriod = '2023JJ00'; // 2023 annual data

  /**
   * Fetch demographics data for a single geographic code
   */
  async fetchByCode(
    code: string,
    period: string = this.defaultPeriod
  ): Promise<FetchedData> {
    try {
      const url = `${this.baseUrl}?$filter=startswith(WijkenEnBuurten,'${code}') and Perioden eq '${period}'`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`CBS Demographics API error: ${response.statusText}`);
        return {};
      }

      const data = await response.json();
      const rows = data.value as FetchedData[] | undefined;

      if (!rows || rows.length === 0) {
        return {};
      }

      // Return the first row (should only be one for a specific code)
      return rows[0];
    } catch (error) {
      console.error('Error fetching CBS demographics data:', error);
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
      const url = `https://opendata.cbs.nl/ODataApi/odata/84583NED/DataProperties`;
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
