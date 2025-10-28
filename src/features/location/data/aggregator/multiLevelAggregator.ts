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

/**
 * Single data row in the unified table
 */
export interface UnifiedDataRow {
  source: 'demographics' | 'health' | 'livability' | 'safety';
  geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood';
  geographicCode: string;
  geographicName: string;
  key: string; // The data property key (e.g., "Bevolking_1")
  value: unknown; // The actual value
  displayValue: string; // Formatted value for display
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
    return {
      location: locationData,
      demographics: {
        national: demographics.national
          ? this.convertToRows(
              demographics.national.data,
              'demographics',
              'national',
              demographics.national.level.code,
              demographics.national.level.name
            )
          : [],
        municipality: demographics.municipality
          ? this.convertToRows(
              demographics.municipality.data,
              'demographics',
              'municipality',
              demographics.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: demographics.district
          ? this.convertToRows(
              demographics.district.data,
              'demographics',
              'district',
              demographics.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: demographics.neighborhood
          ? this.convertToRows(
              demographics.neighborhood.data,
              'demographics',
              'neighborhood',
              demographics.neighborhood.level.code,
              locationData.neighborhood?.statnaam || ''
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
              'Nederland'
            )
          : [],
        municipality: health.municipality
          ? this.convertToRows(
              health.municipality.data,
              'health',
              'municipality',
              health.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: health.district
          ? this.convertToRows(
              health.district.data,
              'health',
              'district',
              health.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: health.neighborhood
          ? this.convertToRows(
              health.neighborhood.data,
              'health',
              'neighborhood',
              health.neighborhood.level.code,
              locationData.neighborhood?.statnaam || ''
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
              'Nederland'
            )
          : [],
        municipality: livability.municipality
          ? this.convertToRows(
              livability.municipality.data,
              'livability',
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
              'national',
              safety.national.level.code,
              'Nederland'
            )
          : [],
        municipality: safety.municipality
          ? this.convertSafetyToRows(
              safety.municipality.data,
              'municipality',
              safety.municipality.level.code,
              locationData.municipality.statnaam
            )
          : [],
        district: safety.district
          ? this.convertSafetyToRows(
              safety.district.data,
              'district',
              safety.district.level.code,
              locationData.district?.statnaam || ''
            )
          : [],
        neighborhood: safety.neighborhood
          ? this.convertSafetyToRows(
              safety.neighborhood.data,
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
   * Convert raw data object to UnifiedDataRow array
   */
  private convertToRows(
    data: Record<string, unknown>,
    source: 'demographics' | 'health' | 'livability' | 'safety',
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const rows: UnifiedDataRow[] = [];

    Object.entries(data).forEach(([key, value]) => {
      // Skip metadata fields
      if (
        key === 'ID' ||
        key === 'WijkenEnBuurten' ||
        key === 'RegioS' ||
        key === 'Perioden' ||
        key === 'Leeftijd' ||
        key === 'Marges'
      ) {
        return;
      }

      // Normalize the key based on the source
      let normalizedKey = key;
      switch (source) {
        case 'demographics':
          normalizedKey = getDemographicsReadableKey(key);
          break;
        case 'health':
          normalizedKey = getHealthReadableKey(key);
          break;
        case 'livability':
          normalizedKey = getLivabilityReadableKey(key);
          break;
      }

      rows.push({
        source,
        geographicLevel,
        geographicCode,
        geographicName,
        key: normalizedKey,
        value,
        displayValue: this.formatValue(value),
      });
    });

    return rows;
  }

  /**
   * Convert safety data (crime statistics) to UnifiedDataRow array
   * Safety data has a different structure: crime type => count
   */
  private convertSafetyToRows(
    data: Record<string, number>,
    geographicLevel: 'national' | 'municipality' | 'district' | 'neighborhood',
    geographicCode: string,
    geographicName: string
  ): UnifiedDataRow[] {
    const rows: UnifiedDataRow[] = [];

    Object.entries(data).forEach(([crimeType, count]) => {
      // Normalize the crime code to human-readable crime type name
      const normalizedKey = normalizeSafetyKey(`Crime_${crimeType}`);

      rows.push({
        source: 'safety',
        geographicLevel,
        geographicCode,
        geographicName,
        key: normalizedKey,
        value: count,
        displayValue: this.formatValue(count),
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
