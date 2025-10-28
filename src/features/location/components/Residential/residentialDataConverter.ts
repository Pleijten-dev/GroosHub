import type { ResidentialData } from '../../data/sources/altum-ai/types';
import type { UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import {
  aggregateMarketData,
  formatNumericValue,
} from './marketDataAggregator';

/**
 * Get all unique values and their counts for a specific field
 */
function getFieldDistribution(
  referenceHouses: any[],
  fieldKey: string
): Record<string, number> {
  const distribution: Record<string, number> = {};

  referenceHouses.forEach((house) => {
    const value = house[fieldKey];
    if (value !== null && value !== undefined) {
      const stringValue = String(value);
      distribution[stringValue] = (distribution[stringValue] || 0) + 1;
    }
  });

  return distribution;
}

/**
 * Convert residential market data to UnifiedDataRow format
 * for display in the main data table
 * Creates a row for each unique value found in the dataset
 */
export function convertResidentialToRows(
  residentialData: ResidentialData | null
): UnifiedDataRow[] {
  if (!residentialData || !residentialData.hasData) {
    return [];
  }

  const rows: UnifiedDataRow[] = [];
  const referenceHouses = residentialData.referenceHouses;

  // Field definitions with their display names
  const fields = [
    {
      key: 'HouseType',
      displayNameNl: 'Woningtype',
      displayNameEn: 'House Type',
    },
    {
      key: 'BuildYear',
      displayNameNl: 'Bouwjaar',
      displayNameEn: 'Build Year',
    },
    {
      key: 'InnerSurfaceArea',
      displayNameNl: 'Woonoppervlakte',
      displayNameEn: 'Inner Surface Area',
    },
    {
      key: 'OuterSurfaceArea',
      displayNameNl: 'Perceeloppervlakte',
      displayNameEn: 'Outer Surface Area',
    },
    {
      key: 'Volume',
      displayNameNl: 'Inhoud',
      displayNameEn: 'Volume',
    },
    {
      key: 'DefinitiveEnergyLabel',
      displayNameNl: 'Energielabel',
      displayNameEn: 'Energy Label',
    },
  ];

  // Process each field
  fields.forEach((field) => {
    const distribution = getFieldDistribution(referenceHouses, field.key);

    // Create a row for each unique value
    Object.entries(distribution).forEach(([value, count]) => {
      rows.push({
        source: 'residential',
        geographicLevel: 'municipality',
        geographicCode: residentialData.targetProperty.address.postcode,
        geographicName: residentialData.targetProperty.address.postcode,
        key: `${field.key}_${value}`,
        title: `${field.displayNameNl} - ${value}`,
        titleNl: `${field.displayNameNl} - ${value}`,
        titleEn: `${field.displayNameEn} - ${value}`,
        value: count,
        absolute: count,
        relative: null,
        displayValue: count.toString(),
        displayAbsolute: count.toString(),
        displayRelative: '-',
        metadata: {
          count,
          total: referenceHouses.length,
          fieldName: field.key,
          fieldValue: value,
        },
      });
    });
  });

  // Handle price ranges separately (TransactionPrice and IndexedTransactionPrice)
  // For these, we'll extract the unique ranges and their counts
  const priceFields = [
    {
      key: 'TransactionPrice',
      displayNameNl: 'Transactieprijs',
      displayNameEn: 'Transaction Price',
    },
    {
      key: 'IndexedTransactionPrice',
      displayNameNl: 'Geïndexeerde Transactieprijs',
      displayNameEn: 'Indexed Transaction Price',
    },
  ];

  priceFields.forEach((field) => {
    const distribution = getFieldDistribution(referenceHouses, field.key);

    // Create a row for each unique price range
    Object.entries(distribution).forEach(([priceRange, count]) => {
      rows.push({
        source: 'residential',
        geographicLevel: 'municipality',
        geographicCode: residentialData.targetProperty.address.postcode,
        geographicName: residentialData.targetProperty.address.postcode,
        key: `${field.key}_${priceRange}`,
        title: `${field.displayNameNl} - ${priceRange}`,
        titleNl: `${field.displayNameNl} - ${priceRange}`,
        titleEn: `${field.displayNameEn} - ${priceRange}`,
        value: count,
        absolute: count,
        relative: null,
        displayValue: count.toString(),
        displayAbsolute: count.toString(),
        displayRelative: '-',
        metadata: {
          count,
          total: referenceHouses.length,
          fieldName: field.key,
          fieldValue: priceRange,
        },
      });
    });
  });

  return rows;
}
