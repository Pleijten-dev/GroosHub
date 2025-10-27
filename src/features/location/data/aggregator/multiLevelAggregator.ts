"use client";

import type { LocationData } from '../services/locationGeocoder';
import type { CBSDemographicsMultiLevelResponse } from '../sources/cbs-demographics/client';
import type { RIVMHealthMultiLevelResponse } from '../sources/rivm-health/client';
import type { CBSLivabilityMultiLevelResponse } from '../sources/cbs-livability/client';
import type { PolitieSafetyMultiLevelResponse } from '../sources/politie-safety/client';
import {
  parseDemographicsData,
  parseHealthData,
  parseLivabilityData,
  parseSafetyData,
  type ParsedIndicator,
} from '../parsers';

/**
 * Single data row in the unified table
 */
export interface UnifiedDataRow {
  source: 'demographics' | 'health' | 'livability' | 'safety';
  geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood';
  geographicCode: string;
  geographicName: string;
  indicator: string; // Human-readable indicator name
  originalValue: number | string | null; // Original value from API
  absoluteValue: number | null; // Calculated absolute value
  relativeValue: number | null; // Calculated relative value (percentage)
  operator: string | null; // Description of the calculation
  format?: 'percentage' | 'count' | 'currency' | 'distance' | 'score' | 'energy' | 'area';
  unit?: string; // Unit of measurement
  displayValueAbsolute: string; // Formatted absolute value for display
  displayValueRelative: string; // Formatted relative value for display
}

/**
 * Unified multi-level location data
 */
export interface UnifiedLocationData {
  location: LocationData;
  demographics: {
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
    district: UnifiedDataRow[];
    neighborhood: UnifiedDataRow[];
  };
  health: {
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
    district: UnifiedDataRow[];
    neighborhood: UnifiedDataRow[];
  };
  livability: {
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
  };
  safety: {
    national: UnifiedDataRow[];
    municipality: UnifiedDataRow[];
    district: UnifiedDataRow[];
    neighborhood: UnifiedDataRow[];
  };
  fetchedAt: Date;
}

/**
 * Multi-level data aggregator
 * Combines all data sources at all available geographic levels
 */
export class MultiLevelAggregator {
  /**
   * Aggregate all data sources into a unified structure
   */
  aggregate(
    locationData: LocationData,
    demographics: CBSDemographicsMultiLevelResponse,
    health: RIVMHealthMultiLevelResponse,
    livability: CBSLivabilityMultiLevelResponse,
    safety: PolitieSafetyMultiLevelResponse
  ): UnifiedLocationData {
    // Extract population counts from demographics data for each level
    const aantalInwonersNational = this.getAantalInwoners(demographics.national?.data);
    const aantalInwonersMunicipality = this.getAantalInwoners(demographics.municipality?.data);
    const aantalInwonersDistrict = this.getAantalInwoners(demographics.district?.data);
    const aantalInwonersNeighborhood = this.getAantalInwoners(demographics.neighborhood?.data);

    return {
      location: locationData,
      demographics: {
        national: demographics.national
          ? this.convertToRows(
              demographics.national.data,
              'demographics',
              'national',
              demographics.national.level.code,
              demographics.national.level.name,
              aantalInwonersNational
            )
          : [],
        municipality: demographics.municipality
          ? this.convertToRows(
              demographics.municipality.data,
              'demographics',
              'municipality',
              demographics.municipality.level.code,
              locationData.municipality.statnaam,
              aantalInwonersMunicipality
            )
          : [],
        district: demographics.district
          ? this.convertToRows(
              demographics.district.data,
              'demographics',
              'district',
              demographics.district.level.code,
              locationData.district?.statnaam || '',
              aantalInwonersDistrict
            )
          : [],
        neighborhood: demographics.neighborhood
          ? this.convertToRows(
              demographics.neighborhood.data,
              'demographics',
              'neighborhood',
              demographics.neighborhood.level.code,
              locationData.neighborhood?.statnaam || '',
              aantalInwonersNeighborhood
            )
          : [],
      },
      health: {
        national: health.national
          ? this.convertToRows(
              health.national.data,
              'health',
              'national',
              health.national.level.code,
              'Nederland',
              aantalInwonersNational
            )
          : [],
        municipality: health.municipality
          ? this.convertToRows(
              health.municipality.data,
              'health',
              'municipality',
              health.municipality.level.code,
              locationData.municipality.statnaam,
              aantalInwonersMunicipality
            )
          : [],
        district: health.district
          ? this.convertToRows(
              health.district.data,
              'health',
              'district',
              health.district.level.code,
              locationData.district?.statnaam || '',
              aantalInwonersDistrict
            )
          : [],
        neighborhood: health.neighborhood
          ? this.convertToRows(
              health.neighborhood.data,
              'health',
              'neighborhood',
              health.neighborhood.level.code,
              locationData.neighborhood?.statnaam || '',
              aantalInwonersNeighborhood
            )
          : [],
      },
      livability: {
        national: livability.national
          ? this.convertToRows(
              livability.national.data,
              'livability',
              'national',
              livability.national.level.code,
              'Nederland',
              aantalInwonersNational
            )
          : [],
        municipality: livability.municipality
          ? this.convertToRows(
              livability.municipality.data,
              'livability',
              'municipality',
              livability.municipality.level.code,
              locationData.municipality.statnaam,
              aantalInwonersMunicipality
            )
          : [],
      },
      safety: {
        national: safety.national
          ? this.convertSafetyToRows(
              safety.national.data,
              'national',
              safety.national.level.code,
              'Nederland',
              aantalInwonersNational
            )
          : [],
        municipality: safety.municipality
          ? this.convertSafetyToRows(
              safety.municipality.data,
              'municipality',
              safety.municipality.level.code,
              locationData.municipality.statnaam,
              aantalInwonersMunicipality
            )
          : [],
        district: safety.district
          ? this.convertSafetyToRows(
              safety.district.data,
              'district',
              safety.district.level.code,
              locationData.district?.statnaam || '',
              aantalInwonersDistrict
            )
          : [],
        neighborhood: safety.neighborhood
          ? this.convertSafetyToRows(
              safety.neighborhood.data,
              'neighborhood',
              safety.neighborhood.level.code,
              locationData.neighborhood?.statnaam || '',
              aantalInwonersNeighborhood
            )
          : [],
      },
      fetchedAt: new Date(),
    };
  }

  /**
   * Extract Aantal Inwoners from demographics data
   */
  private getAantalInwoners(data: Record<string, unknown> | undefined): number {
    if (!data) return 0;
    const value = data['Bevolking_1'];
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Convert raw data object to UnifiedDataRow array using parsers
   */
  private convertToRows(
    data: Record<string, unknown>,
    source: 'demographics' | 'health' | 'livability' | 'safety',
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string,
    aantalInwoners: number
  ): UnifiedDataRow[] {
    let parsedData: { indicators: ParsedIndicator[] };

    // Parse data using the appropriate parser
    switch (source) {
      case 'demographics':
        parsedData = parseDemographicsData(data);
        break;
      case 'health':
        parsedData = parseHealthData(data, aantalInwoners);
        break;
      case 'livability':
        parsedData = parseLivabilityData(data, aantalInwoners);
        break;
      default:
        return [];
    }

    // Convert parsed indicators to UnifiedDataRow
    return parsedData.indicators.map((indicator) => ({
      source,
      geographicLevel,
      geographicCode,
      geographicName,
      indicator: indicator.indicator,
      originalValue: indicator.originalValue,
      absoluteValue: indicator.absoluteValue,
      relativeValue: indicator.relativeValue,
      operator: indicator.operator,
      format: indicator.format,
      unit: indicator.unit,
      displayValueAbsolute: this.formatValue(indicator.absoluteValue, indicator.format, indicator.unit),
      displayValueRelative: this.formatValue(indicator.relativeValue, 'percentage'),
    }));
  }

  /**
   * Convert safety data (crime statistics) to UnifiedDataRow array using parser
   * Safety data has a different structure: crime type => count
   */
  private convertSafetyToRows(
    data: Record<string, number>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string,
    aantalInwoners: number
  ): UnifiedDataRow[] {
    // Parse safety data
    const parsedData = parseSafetyData(data, aantalInwoners);

    // Convert parsed indicators to UnifiedDataRow
    return parsedData.indicators.map((indicator) => ({
      source: 'safety',
      geographicLevel,
      geographicCode,
      geographicName,
      indicator: indicator.indicator,
      originalValue: indicator.originalValue,
      absoluteValue: indicator.absoluteValue,
      relativeValue: indicator.relativeValue,
      operator: indicator.operator,
      format: indicator.format,
      unit: indicator.unit,
      displayValueAbsolute: this.formatValue(indicator.absoluteValue, indicator.format, indicator.unit),
      displayValueRelative: this.formatValue(indicator.relativeValue, 'percentage'),
    }));
  }

  /**
   * Format value for display
   */
  private formatValue(
    value: number | string | null,
    format?: 'percentage' | 'count' | 'currency' | 'distance' | 'score' | 'energy' | 'area',
    unit?: string
  ): string {
    if (value === null || value === undefined || value === 'n/a') {
      return 'n/a';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }

    // Format based on type
    switch (format) {
      case 'percentage':
        return `${numValue.toFixed(2)}%`;
      case 'currency':
        return unit ? `${unit} ${numValue.toLocaleString('nl-NL')}` : `€${numValue.toLocaleString('nl-NL')}`;
      case 'distance':
        return `${numValue.toFixed(1)} km`;
      case 'energy':
        return unit ? `${numValue.toLocaleString('nl-NL')} ${unit}` : `${numValue.toLocaleString('nl-NL')} kWh`;
      case 'area':
        return unit ? `${numValue.toLocaleString('nl-NL')} ${unit}` : `${numValue.toLocaleString('nl-NL')} ha`;
      case 'score':
        return numValue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      case 'count':
      default:
        return numValue.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
  }

  /**
   * Query methods for easy data access
   */

  /**
   * Get all data for a specific source and level
   */
  getBySourceAndLevel(
    data: UnifiedLocationData,
    source: 'demographics' | 'health' | 'livability' | 'safety',
    level: 'national' | 'municipality' | 'district' | 'neighborhood'
  ): UnifiedDataRow[] {
    switch (source) {
      case 'demographics':
        return data.demographics[level] || [];
      case 'health':
        return data.health[level] || [];
      case 'livability':
        if (level === 'national' || level === 'municipality') {
          return data.livability[level] || [];
        }
        return [];
      case 'safety':
        return data.safety[level] || [];
      default:
        return [];
    }
  }

  /**
   * Get all data for a specific geographic level across all sources
   */
  getAllByLevel(
    data: UnifiedLocationData,
    level: 'national' | 'municipality' | 'district' | 'neighborhood'
  ): UnifiedDataRow[] {
    const rows: UnifiedDataRow[] = [];

    if (level === 'national') {
      rows.push(...data.demographics.national);
      rows.push(...data.health.national);
      rows.push(...data.livability.national);
      rows.push(...data.safety.national);
    }

    if (level === 'municipality') {
      rows.push(...data.demographics.municipality);
      rows.push(...data.health.municipality);
      rows.push(...data.livability.municipality);
      rows.push(...data.safety.municipality);
    }

    if (level === 'district') {
      rows.push(...data.demographics.district);
      rows.push(...data.health.district);
      rows.push(...data.safety.district);
    }

    if (level === 'neighborhood') {
      rows.push(...data.demographics.neighborhood);
      rows.push(...data.health.neighborhood);
      rows.push(...data.safety.neighborhood);
    }

    return rows;
  }

  /**
   * Find a specific data point by indicator name across all levels
   */
  findByIndicator(
    data: UnifiedLocationData,
    indicator: string,
    source: 'demographics' | 'health' | 'livability' | 'safety'
  ): UnifiedDataRow[] {
    const allRows: UnifiedDataRow[] = [];

    // Collect all rows for this source
    switch (source) {
      case 'demographics':
        allRows.push(
          ...data.demographics.national,
          ...data.demographics.municipality,
          ...data.demographics.district,
          ...data.demographics.neighborhood
        );
        break;
      case 'health':
        allRows.push(
          ...data.health.national,
          ...data.health.municipality,
          ...data.health.district,
          ...data.health.neighborhood
        );
        break;
      case 'livability':
        allRows.push(
          ...data.livability.national,
          ...data.livability.municipality
        );
        break;
      case 'safety':
        allRows.push(
          ...data.safety.national,
          ...data.safety.municipality,
          ...data.safety.district,
          ...data.safety.neighborhood
        );
        break;
    }

    return allRows.filter((row) => row.indicator === indicator);
  }
}
