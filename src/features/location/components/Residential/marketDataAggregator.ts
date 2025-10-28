import type { ReferenceHouse } from '../../data/sources/altum-ai/types';

/**
 * Aggregated market data for a specific field
 */
export interface AggregatedFieldData {
  fieldName: string;
  displayName: {
    nl: string;
    en: string;
  };
  type: 'numeric' | 'string' | 'priceRange';
  average?: number | null;
  mostCommon?: string | null;
  count: number;
  valueDistribution?: Record<string, number>; // For string fields
}

/**
 * Parse price range string (e.g., "400000-450000") and return average
 */
function parsePriceRange(priceStr: string): number | null {
  if (!priceStr) return null;

  const parts = priceStr.split('-');
  if (parts.length !== 2) return null;

  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1], 10);

  if (isNaN(min) || isNaN(max)) return null;

  return (min + max) / 2;
}

/**
 * Get most common value from a distribution
 */
function getMostCommon(distribution: Record<string, number>): string | null {
  if (Object.keys(distribution).length === 0) return null;

  let maxCount = 0;
  let mostCommon: string | null = null;

  for (const [value, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  }

  return mostCommon;
}

/**
 * Aggregate market data from reference houses
 */
export function aggregateMarketData(
  referenceHouses: ReferenceHouse[]
): AggregatedFieldData[] {
  if (!referenceHouses || referenceHouses.length === 0) {
    return [];
  }

  const result: AggregatedFieldData[] = [];

  // HouseType - String field (most common + distribution)
  const houseTypeDistribution: Record<string, number> = {};
  let houseTypeCount = 0;

  referenceHouses.forEach((house) => {
    if (house.HouseType) {
      houseTypeDistribution[house.HouseType] =
        (houseTypeDistribution[house.HouseType] || 0) + 1;
      houseTypeCount++;
    }
  });

  result.push({
    fieldName: 'HouseType',
    displayName: {
      nl: 'Woningtype',
      en: 'House Type',
    },
    type: 'string',
    mostCommon: getMostCommon(houseTypeDistribution),
    count: houseTypeCount,
    valueDistribution: houseTypeDistribution,
  });

  // BuildYear - Numeric field (average)
  const buildYears = referenceHouses
    .map((house) => house.BuildYear)
    .filter((year) => year != null && !isNaN(year));

  result.push({
    fieldName: 'BuildYear',
    displayName: {
      nl: 'Bouwjaar',
      en: 'Build Year',
    },
    type: 'numeric',
    average:
      buildYears.length > 0
        ? buildYears.reduce((sum, year) => sum + year, 0) / buildYears.length
        : null,
    count: buildYears.length,
  });

  // InnerSurfaceArea - Numeric field (average)
  const innerAreas = referenceHouses
    .map((house) => house.InnerSurfaceArea)
    .filter((area) => area != null && !isNaN(area));

  result.push({
    fieldName: 'InnerSurfaceArea',
    displayName: {
      nl: 'Woonoppervlakte',
      en: 'Inner Surface Area',
    },
    type: 'numeric',
    average:
      innerAreas.length > 0
        ? innerAreas.reduce((sum, area) => sum + area, 0) / innerAreas.length
        : null,
    count: innerAreas.length,
  });

  // OuterSurfaceArea - Numeric field (average)
  const outerAreas = referenceHouses
    .map((house) => house.OuterSurfaceArea)
    .filter((area) => area != null && !isNaN(area));

  result.push({
    fieldName: 'OuterSurfaceArea',
    displayName: {
      nl: 'Perceeloppervlakte',
      en: 'Outer Surface Area',
    },
    type: 'numeric',
    average:
      outerAreas.length > 0
        ? outerAreas.reduce((sum, area) => sum + area, 0) / outerAreas.length
        : null,
    count: outerAreas.length,
  });

  // Volume - Numeric field (average)
  const volumes = referenceHouses
    .map((house) => house.Volume)
    .filter((vol) => vol != null && !isNaN(vol)) as number[];

  result.push({
    fieldName: 'Volume',
    displayName: {
      nl: 'Inhoud',
      en: 'Volume',
    },
    type: 'numeric',
    average:
      volumes.length > 0
        ? volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
        : null,
    count: volumes.length,
  });

  // DefinitiveEnergyLabel - String field (most common + distribution)
  const energyLabelDistribution: Record<string, number> = {};
  let energyLabelCount = 0;

  referenceHouses.forEach((house) => {
    if (house.DefinitiveEnergyLabel) {
      energyLabelDistribution[house.DefinitiveEnergyLabel] =
        (energyLabelDistribution[house.DefinitiveEnergyLabel] || 0) + 1;
      energyLabelCount++;
    }
  });

  result.push({
    fieldName: 'DefinitiveEnergyLabel',
    displayName: {
      nl: 'Energielabel',
      en: 'Energy Label',
    },
    type: 'string',
    mostCommon: getMostCommon(energyLabelDistribution),
    count: energyLabelCount,
    valueDistribution: energyLabelDistribution,
  });

  // TransactionPrice - Price range (average of midpoints)
  const transactionPrices = referenceHouses
    .map((house) => parsePriceRange(house.TransactionPrice))
    .filter((price) => price != null) as number[];

  result.push({
    fieldName: 'TransactionPrice',
    displayName: {
      nl: 'Transactieprijs',
      en: 'Transaction Price',
    },
    type: 'priceRange',
    average:
      transactionPrices.length > 0
        ? transactionPrices.reduce((sum, price) => sum + price, 0) /
          transactionPrices.length
        : null,
    count: transactionPrices.length,
  });

  // IndexedTransactionPrice - Price range (average of midpoints)
  const indexedPrices = referenceHouses
    .map((house) => parsePriceRange(house.IndexedTransactionPrice))
    .filter((price) => price != null) as number[];

  result.push({
    fieldName: 'IndexedTransactionPrice',
    displayName: {
      nl: 'Geïndexeerde Transactieprijs',
      en: 'Indexed Transaction Price',
    },
    type: 'priceRange',
    average:
      indexedPrices.length > 0
        ? indexedPrices.reduce((sum, price) => sum + price, 0) /
          indexedPrices.length
        : null,
    count: indexedPrices.length,
  });

  return result;
}

/**
 * Format a numeric value for display
 */
export function formatNumericValue(
  value: number | null | undefined,
  type: 'numeric' | 'priceRange'
): string {
  if (value == null) return '-';

  if (type === 'priceRange') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Round to 1 decimal place for regular numbers
  return value.toFixed(1);
}
