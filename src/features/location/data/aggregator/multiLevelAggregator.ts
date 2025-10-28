"use client";

import type { LocationData } from '../services/locationGeocoder';
import type { CBSDemographicsMultiLevelResponse } from '../sources/cbs-demographics/client';
import type { RIVMHealthMultiLevelResponse } from '../sources/rivm-health/client';
import type { CBSLivabilityMultiLevelResponse } from '../sources/cbs-livability/client';
import type { PolitieSafetyMultiLevelResponse } from '../sources/politie-safety/client';
import type { ResidentialData } from '../sources/altum-ai/types';
import { getReadableKey as getDemographicsReadableKey } from '../normalizers/demographicsKeyNormalizer';
import { getReadableKey as getHealthReadableKey } from '../normalizers/healthKeyNormalizer';
import { getReadableKey as getLivabilityReadableKey } from '../normalizers/livabilityKeyNormalizer';
import { normalizeSafetyKey } from '../normalizers/safetyKeyNormalizer';
import { DemographicsParser } from '../parsers/demographicsParser';
import { HealthParser } from '../parsers/healthParser';
import { LivabilityParser } from '../parsers/livabilityParser';
import { SafetyParser } from '../parsers/safetyParser';

/**
 * Single data row in the unified table
 */
export interface UnifiedDataRow {
  source: 'demographics' | 'health' | 'livability' | 'safety';
  geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood';
  geographicCode: string;
  geographicName: string;
  key: string; // The data property key (e.g., "Bevolking_1")
  title: string; // Human-readable title
  value: unknown; // The original raw value
  absolute: number | null; // Absolute value (actual count/amount)
  relative: number | null; // Relative value (percentage, per capita, etc.)
  unit?: string; // Unit for the value (%, count, etc.)
  displayValue: string; // Formatted value for display (original behavior)
  displayAbsolute: string; // Formatted absolute value
  displayRelative: string; // Formatted relative value
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
  residential: ResidentialData | null;
  fetchedAt: Date;
}

/**
 * Multi-level data aggregator
 * Combines all data sources at all available geographic levels
 */
export class MultiLevelAggregator {
  private demographicsParser = new DemographicsParser();
  private healthParser = new HealthParser();
  private livabilityParser = new LivabilityParser();
  private safetyParser = new SafetyParser();

  /**
   * Extract population count from demographics data
   */
  private getPopulation(data: Record<string, unknown>): number {
    const value = data['AantalInwoners_5'];
    if (value === null || value === undefined) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Aggregate all data sources into a unified structure
   */
  aggregate(
    locationData: LocationData,
    demographics: CBSDemographicsMultiLevelResponse,
    health: RIVMHealthMultiLevelResponse,
    livability: CBSLivabilityMultiLevelResponse,
    safety: PolitieSafetyMultiLevelResponse,
    residential: ResidentialData | null = null
  ): UnifiedLocationData {
    // Extract population at each level from demographics data
    const nationalPopulation = demographics.national
      ? this.getPopulation(demographics.national.data)
      : 0;
    const municipalityPopulation = demographics.municipality
      ? this.getPopulation(demographics.municipality.data)
      : 0;
    const districtPopulation = demographics.district
      ? this.getPopulation(demographics.district.data)
      : 0;
    const neighborhoodPopulation = demographics.neighborhood
      ? this.getPopulation(demographics.neighborhood.data)
      : 0;

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
              nationalPopulation,
              'national',
              health.national.level.code,
              'Nederland'
            )
          : [],
        municipality: health.municipality
          ? this.convertHealthToRows(
              health.municipality.data,
              municipalityPopulation,
              'municipality',
              health.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: health.district
          ? this.convertHealthToRows(
              health.district.data,
              districtPopulation,
              'district',
              health.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: health.neighborhood
          ? this.convertHealthToRows(
              health.neighborhood.data,
              neighborhoodPopulation,
              'neighborhood',
              health.neighborhood.level.code,
              locationData.neighborhood?.statnaam || ''
            )
          : [],
      },
      livability: {
        national: livability.national
          ? this.convertLivabilityToRows(
              livability.national.data,
              nationalPopulation,
              'national',
              livability.national.level.code,
              'Nederland'
            )
          : [],
        municipality: livability.municipality
          ? this.convertLivabilityToRows(
              livability.municipality.data,
              municipalityPopulation,
              'municipality',
              livability.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
      },
      safety: {
        national: safety.national
          ? this.convertSafetyToRows(
              safety.national.data,
              nationalPopulation,
              'national',
              safety.national.level.code,
              'Nederland'
            )
          : [],
        municipality: safety.municipality
          ? this.convertSafetyToRows(
              safety.municipality.data,
              municipalityPopulation,
              'municipality',
              safety.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: safety.district
          ? this.convertSafetyToRows(
              safety.district.data,
              districtPopulation,
              'district',
              safety.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: safety.neighborhood
          ? this.convertSafetyToRows(
              safety.neighborhood.data,
              neighborhoodPopulation,
              'neighborhood',
              safety.neighborhood.level.code,
              locationData.neighborhood?.statnaam || ''
            )
          : [],
      },
      residential,
      fetchedAt: new Date(),
    };
  }

  /**
   * Convert demographics data using parser
   */
  private convertDemographicsToRows(
    data: Record<string, unknown>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const parsed = this.demographicsParser.parse(data);
    const rows: UnifiedDataRow[] = [];

    parsed.indicators.forEach((parsedValue, key) => {
      // Skip metadata fields
      if (
        key === 'ID' ||
        key === 'WijkenEnBuurten' ||
        key === 'RegioS' ||
        key === 'Perioden'
      ) {
        return;
      }

      rows.push({
        source: 'demographics',
        geographicLevel,
        geographicCode,
        geographicName,
        key,
        title: parsedValue.title,
        value: parsedValue.originalValue,
        absolute: parsedValue.absolute,
        relative: parsedValue.relative,
        unit: parsedValue.unit,
        displayValue: this.formatValue(parsedValue.originalValue),
        displayAbsolute: this.formatNumber(parsedValue.absolute),
        displayRelative: this.formatNumber(parsedValue.relative, parsedValue.unit),
      });
    });

    return rows;
  }

  /**
   * Convert health data using parser
   */
  private convertHealthToRows(
    data: Record<string, unknown>,
    populationCount: number,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const parsed = this.healthParser.parse(data, { populationCount });
    const rows: UnifiedDataRow[] = [];

    parsed.indicators.forEach((parsedValue, key) => {
      // Skip metadata fields
      if (
        key === 'Gemeentenaam_1' ||
        key === 'SoortRegio_2' ||
        key === 'Codering_3' ||
        key === 'ID' ||
        key === 'WijkenEnBuurten' ||
        key === 'Perioden' ||
        key === 'Leeftijd' ||
        key === 'Marges'
      ) {
        return;
      }

      rows.push({
        source: 'health',
        geographicLevel,
        geographicCode,
        geographicName,
        key,
        title: parsedValue.title,
        value: parsedValue.originalValue,
        absolute: parsedValue.absolute,
        relative: parsedValue.relative,
        unit: parsedValue.unit,
        displayValue: this.formatValue(parsedValue.originalValue),
        displayAbsolute: this.formatNumber(parsedValue.absolute),
        displayRelative: this.formatNumber(parsedValue.relative, parsedValue.unit),
      });
    });

    return rows;
  }

  /**
   * Convert livability data using parser
   */
  private convertLivabilityToRows(
    data: Record<string, unknown>,
    populationCount: number,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const parsed = this.livabilityParser.parse(data, { populationCount });
    const rows: UnifiedDataRow[] = [];

    parsed.indicators.forEach((parsedValue, key) => {
      // Skip metadata fields
      if (
        key === 'ID' ||
        key === 'WijkenEnBuurten' ||
        key === 'RegioS' ||
        key === 'Perioden'
      ) {
        return;
      }

      rows.push({
        source: 'livability',
        geographicLevel,
        geographicCode,
        geographicName,
        key,
        title: parsedValue.title,
        value: parsedValue.originalValue,
        absolute: parsedValue.absolute,
        relative: parsedValue.relative,
        unit: parsedValue.unit,
        displayValue: this.formatValue(parsedValue.originalValue),
        displayAbsolute: this.formatNumber(parsedValue.absolute),
        displayRelative: this.formatNumber(parsedValue.relative, parsedValue.unit),
      });
    });

    return rows;
  }

  /**
   * Convert safety data using parser
   */
  private convertSafetyToRows(
    data: Record<string, number>,
    populationCount: number,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const parsed = this.safetyParser.parse(data, { populationCount });
    const rows: UnifiedDataRow[] = [];

    parsed.indicators.forEach((parsedValue, key) => {
      rows.push({
        source: 'safety',
        geographicLevel,
        geographicCode,
        geographicName,
        key,
        title: parsedValue.title,
        value: parsedValue.originalValue,
        absolute: parsedValue.absolute,
        relative: parsedValue.relative,
        unit: parsedValue.unit,
        displayValue: this.formatValue(parsedValue.originalValue),
        displayAbsolute: this.formatNumber(parsedValue.absolute),
        displayRelative: this.formatNumber(parsedValue.relative, parsedValue.unit),
      });
    });

    return rows;
  }


  /**
   * Format value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'number') {
      return value.toLocaleString('nl-NL');
    }

    if (typeof value === 'string') {
      // Check if it's a numeric string
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString('nl-NL');
      }
      return value;
    }

    return String(value);
  }

  /**
   * Format number for display with optional unit
   */
  private formatNumber(value: number | null, unit?: string): string {
    if (value === null || value === undefined) {
      return '-';
    }

    const formatted = value.toLocaleString('nl-NL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    if (unit) {
      return `${formatted}${unit}`;
    }

    return formatted;
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
