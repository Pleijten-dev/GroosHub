"use client";

import type { LocationData } from '../services/locationGeocoder';
import type { CBSDemographicsMultiLevelResponse } from '../sources/cbs-demographics/client';
import type { RIVMHealthMultiLevelResponse } from '../sources/rivm-health/client';
import type { CBSLivabilityMultiLevelResponse } from '../sources/cbs-livability/client';
import type { PolitieSafetyMultiLevelResponse } from '../sources/politie-safety/client';
import {
  CBSDemographicsParser,
  RIVMHealthParser,
  CBSLivabilityParser,
  PolitieSafetyParser,
  type ParsedValue,
} from '../parsers';

/**
 * Single data row in the unified table
 */
export interface UnifiedDataRow {
  source: 'demographics' | 'health' | 'livability' | 'safety';
  geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood';
  geographicCode: string;
  geographicName: string;
  key: string; // The data property key (e.g., "totalPopulation")
  label: string; // Human-readable label for this metric
  originalValue: unknown; // The original value from the API
  absoluteValue: number | null; // The absolute value (actual count/measurement)
  relativeValue: number | null; // The relative value (percentage, ratio, or normalized score)
  unit?: string; // Optional unit for display (e.g., "people", "km", "%")
  displayValue: string; // Formatted value for display (backward compatibility)
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
 * Uses parsers to transform raw data into structured format with absolute and relative values
 */
export class MultiLevelAggregator {
  private demographicsParser = new CBSDemographicsParser();
  private healthParser = new RIVMHealthParser();
  private livabilityParser = new CBSLivabilityParser();
  private safetyParser = new PolitieSafetyParser();

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
    // Get total population for calculations (prefer municipality, fallback to national)
    const totalPopulation = demographics.municipality
      ? this.getTotalPopulation(demographics.municipality.data)
      : demographics.national
      ? this.getTotalPopulation(demographics.national.data)
      : null;

    return {
      location: locationData,
      demographics: {
        national: demographics.national
          ? this.convertDemographicsToRows(
              demographics.national.data,
              'national',
              demographics.national.level.code,
              demographics.national.level.name
            )
          : [],
        municipality: demographics.municipality
          ? this.convertDemographicsToRows(
              demographics.municipality.data,
              'municipality',
              demographics.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: demographics.district
          ? this.convertDemographicsToRows(
              demographics.district.data,
              'district',
              demographics.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: demographics.neighborhood
          ? this.convertDemographicsToRows(
              demographics.neighborhood.data,
              'neighborhood',
              demographics.neighborhood.level.code,
              locationData.neighborhood?.statnaam || ''
            )
          : [],
      },
      health: {
        national: health.national
          ? this.convertHealthToRows(
              health.national.data,
              'national',
              health.national.level.code,
              'Nederland',
              totalPopulation
            )
          : [],
        municipality: health.municipality
          ? this.convertHealthToRows(
              health.municipality.data,
              'municipality',
              health.municipality.level.code,
              locationData.municipality.statnaam,
              totalPopulation
            )
          : [],
        district: health.district
          ? this.convertHealthToRows(
              health.district.data,
              'district',
              health.district.level.code,
              locationData.district?.statnaam || '',
              totalPopulation
            )
          : [],
        neighborhood: health.neighborhood
          ? this.convertHealthToRows(
              health.neighborhood.data,
              'neighborhood',
              health.neighborhood.level.code,
              locationData.neighborhood?.statnaam || '',
              totalPopulation
            )
          : [],
      },
      livability: {
        national: livability.national
          ? this.convertLivabilityToRows(
              livability.national.data,
              'national',
              livability.national.level.code,
              'Nederland',
              totalPopulation
            )
          : [],
        municipality: livability.municipality
          ? this.convertLivabilityToRows(
              livability.municipality.data,
              'municipality',
              livability.municipality.level.code,
              locationData.municipality.statnaam,
              totalPopulation
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
              totalPopulation
            )
          : [],
        municipality: safety.municipality
          ? this.convertSafetyToRows(
              safety.municipality.data,
              'municipality',
              safety.municipality.level.code,
              locationData.municipality.statnaam,
              totalPopulation
            )
          : [],
        district: safety.district
          ? this.convertSafetyToRows(
              safety.district.data,
              'district',
              safety.district.level.code,
              locationData.district?.statnaam || '',
              totalPopulation
            )
          : [],
        neighborhood: safety.neighborhood
          ? this.convertSafetyToRows(
              safety.neighborhood.data,
              'neighborhood',
              safety.neighborhood.level.code,
              locationData.neighborhood?.statnaam || '',
              totalPopulation
            )
          : [],
      },
      fetchedAt: new Date(),
    };
  }

  /**
   * Extract total population from raw demographics data
   */
  private getTotalPopulation(data: Record<string, unknown>): number | null {
    const value = data.Bevolking_1; // Aantal Inwoners
    if (value === null || value === undefined) return null;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? null : num;
  }

  /**
   * Convert demographics data to UnifiedDataRow array
   */
  private convertDemographicsToRows(
    data: Record<string, unknown>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const parsed = this.demographicsParser.parse(data);
    return this.parsedDataToRows(parsed, 'demographics', geographicLevel, geographicCode, geographicName);
  }

  /**
   * Convert health data to UnifiedDataRow array
   */
  private convertHealthToRows(
    data: Record<string, unknown>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string,
    totalPopulation: number | null
  ): UnifiedDataRow[] {
    const parsed = this.healthParser.parse(data, totalPopulation);
    return this.parsedDataToRows(parsed, 'health', geographicLevel, geographicCode, geographicName);
  }

  /**
   * Convert livability data to UnifiedDataRow array
   */
  private convertLivabilityToRows(
    data: Record<string, unknown>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string,
    totalPopulation: number | null
  ): UnifiedDataRow[] {
    const parsed = this.livabilityParser.parse(data, totalPopulation);
    return this.parsedDataToRows(parsed, 'livability', geographicLevel, geographicCode, geographicName);
  }

  /**
   * Convert safety data to UnifiedDataRow array
   */
  private convertSafetyToRows(
    data: Record<string, number>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string,
    totalPopulation: number | null
  ): UnifiedDataRow[] {
    const parsed = this.safetyParser.parse(data, totalPopulation);
    return this.parsedDataToRows(parsed, 'safety', geographicLevel, geographicCode, geographicName);
  }

  /**
   * Convert parsed data object to UnifiedDataRow array
   */
  private parsedDataToRows(
    parsedData: Record<string, ParsedValue | string>,
    source: 'demographics' | 'health' | 'livability' | 'safety',
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const rows: UnifiedDataRow[] = [];

    Object.entries(parsedData).forEach(([key, value]) => {
      // Skip metadata fields
      if (
        key === 'municipalityName' ||
        key === 'regionType' ||
        key === 'regionCode'
      ) {
        return;
      }

      // Type guard to ensure value is ParsedValue
      if (typeof value === 'object' && value !== null && 'label' in value) {
        const parsedValue = value as ParsedValue;

        rows.push({
          source,
          geographicLevel,
          geographicCode,
          geographicName,
          key,
          label: parsedValue.label,
          originalValue: parsedValue.original,
          absoluteValue: parsedValue.absolute,
          relativeValue: parsedValue.relative,
          unit: parsedValue.unit,
          displayValue: this.formatDisplayValue(parsedValue),
        });
      }
    });

    return rows;
  }

  /**
   * Format ParsedValue for display
   */
  private formatDisplayValue(value: ParsedValue): string {
    // Priority: Show relative if available, otherwise absolute, otherwise original
    if (value.relative !== null) {
      return `${this.formatNumber(value.relative)}${value.unit === '%' ? '%' : ''}`;
    }

    if (value.absolute !== null) {
      return this.formatNumber(value.absolute);
    }

    if (value.original !== null && value.original !== undefined) {
      if (typeof value.original === 'number') {
        return this.formatNumber(value.original);
      }
      if (typeof value.original === 'string') {
        const num = parseFloat(value.original);
        if (!isNaN(num)) {
          return this.formatNumber(num);
        }
        return value.original;
      }
    }

    return '-';
  }

  /**
   * Format number for display with locale formatting
   */
  private formatNumber(value: number): string {
    return value.toLocaleString('nl-NL', {
      maximumFractionDigits: 2,
    });
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
   * Find a specific data point by key across all levels
   */
  findByKey(
    data: UnifiedLocationData,
    key: string,
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

    return allRows.filter((row) => row.key === key);
  }
}
