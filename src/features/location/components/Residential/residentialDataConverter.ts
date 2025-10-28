import type { ResidentialData } from '../../data/sources/altum-ai/types';
import type { UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import {
  aggregateMarketData,
  formatNumericValue,
} from './marketDataAggregator';

/**
 * Convert residential market data to UnifiedDataRow format
 * for display in the main data table
 */
export function convertResidentialToRows(
  residentialData: ResidentialData | null
): UnifiedDataRow[] {
  if (!residentialData || !residentialData.hasData) {
    return [];
  }

  const aggregatedData = aggregateMarketData(residentialData.referenceHouses);
  const rows: UnifiedDataRow[] = [];

  aggregatedData.forEach((field) => {
    let displayValue: string;
    let displayAbsolute: string;

    if (field.type === 'string') {
      // For string fields, show most common value
      displayValue = field.mostCommon || '-';
      displayAbsolute = field.mostCommon || '-';
    } else {
      // For numeric fields, show average
      displayValue = formatNumericValue(field.average, field.type);
      displayAbsolute = formatNumericValue(field.average, field.type);
    }

    // Create a row with the market data (value)
    rows.push({
      source: 'residential',
      geographicLevel: 'municipality', // Residential data is location-specific
      geographicCode: residentialData.targetProperty.address.postcode,
      geographicName: residentialData.targetProperty.address.postcode,
      key: field.fieldName,
      title: field.displayName.nl, // Default to Dutch, will be overridden by titleNl/titleEn
      titleNl: field.displayName.nl,
      titleEn: field.displayName.en,
      value: field.average || field.mostCommon,
      absolute: typeof field.average === 'number' ? field.average : null,
      relative: null, // Not applicable for residential data
      displayValue,
      displayAbsolute,
      displayRelative: '-',
      // Add metadata for distribution display
      metadata: {
        count: field.count,
        total: residentialData.referenceHouses.length,
        distribution: field.valueDistribution,
      },
    });

    // Create a row with the count
    rows.push({
      source: 'residential',
      geographicLevel: 'municipality',
      geographicCode: residentialData.targetProperty.address.postcode,
      geographicName: residentialData.targetProperty.address.postcode,
      key: `${field.fieldName}_Count`,
      title: `${field.displayName.nl} - Aantal`,
      titleNl: `${field.displayName.nl} - Aantal`,
      titleEn: `${field.displayName.en} - Count`,
      value: field.count,
      absolute: field.count,
      relative: null,
      displayValue: field.count.toString(),
      displayAbsolute: field.count.toString(),
      displayRelative: '-',
      metadata: {
        count: field.count,
        total: residentialData.referenceHouses.length,
      },
    });
  });

  return rows;
}
