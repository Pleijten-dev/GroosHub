/**
 * Altum AI Data Parser
 * Transforms raw API responses into normalized data structures
 */

import type {
  AltumAIResponse,
  ResidentialData,
  PropertyInfo,
  PriceRange,
  MarketStatistics,
  ReferenceHouse,
} from './types';

/**
 * Parse a price range string (e.g., "350000-375000") into structured data
 */
export function parsePriceRange(rangeString: string): PriceRange {
  const parts = rangeString.split('-');

  if (parts.length !== 2) {
    return {
      min: 0,
      max: 0,
      average: 0,
      formatted: rangeString,
    };
  }

  const min = parseInt(parts[0], 10);
  const max = parseInt(parts[1], 10);
  const average = Math.round((min + max) / 2);

  return {
    min,
    max,
    average,
    formatted: rangeString,
  };
}

/**
 * Format a date from YYYYMMDD format to Date object
 */
export function parseValuationDate(dateNumber: number): Date {
  const dateString = dateNumber.toString();
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS months are 0-indexed
  const day = parseInt(dateString.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Calculate market statistics from reference houses
 */
export function calculateMarketStatistics(
  referenceHouses: ReferenceHouse[]
): MarketStatistics {
  if (referenceHouses.length === 0) {
    return {
      averageDistance: 0,
      closestDistance: 0,
      furthestDistance: 0,
      averagePrice: {
        min: 0,
        max: 0,
        average: 0,
        formatted: '0-0',
      },
      priceRange: {
        lowest: {
          min: 0,
          max: 0,
          average: 0,
          formatted: '0-0',
        },
        highest: {
          min: 0,
          max: 0,
          average: 0,
          formatted: '0-0',
        },
      },
      totalReferences: 0,
      withinRadius: {
        oneKm: 0,
        fiveKm: 0,
        tenKm: 0,
      },
      houseTypeDistribution: {},
      averageBuildYear: 0,
      averageSurfaceArea: 0,
    };
  }

  // Calculate distances
  const distances = referenceHouses.map((h) => h.Distance);
  const averageDistance = Math.round(
    distances.reduce((sum, d) => sum + d, 0) / distances.length
  );
  const closestDistance = Math.min(...distances);
  const furthestDistance = Math.max(...distances);

  // Calculate within radius counts
  const withinRadius = {
    oneKm: referenceHouses.filter((h) => h.Distance <= 1000).length,
    fiveKm: referenceHouses.filter((h) => h.Distance <= 5000).length,
    tenKm: referenceHouses.filter((h) => h.Distance <= 10000).length,
  };

  // Calculate price statistics using IndexedTransactionPrice
  const prices = referenceHouses.map((h) =>
    parsePriceRange(h.IndexedTransactionPrice)
  );
  const avgPriceMin = Math.round(
    prices.reduce((sum, p) => sum + p.min, 0) / prices.length
  );
  const avgPriceMax = Math.round(
    prices.reduce((sum, p) => sum + p.max, 0) / prices.length
  );
  const avgPriceAvg = Math.round((avgPriceMin + avgPriceMax) / 2);

  // Find price range
  const allPriceAverages = prices.map((p) => p.average);
  const lowestAvg = Math.min(...allPriceAverages);
  const highestAvg = Math.max(...allPriceAverages);

  const lowestPrice = prices.find((p) => p.average === lowestAvg) || prices[0];
  const highestPrice = prices.find((p) => p.average === highestAvg) || prices[0];

  // Calculate house type distribution
  const houseTypeDistribution: Record<string, number> = {};
  referenceHouses.forEach((house) => {
    const type = house.HouseType;
    houseTypeDistribution[type] = (houseTypeDistribution[type] || 0) + 1;
  });

  // Calculate averages
  const averageBuildYear = Math.round(
    referenceHouses.reduce((sum, h) => sum + h.BuildYear, 0) /
      referenceHouses.length
  );
  const averageSurfaceArea = Math.round(
    referenceHouses.reduce((sum, h) => sum + h.InnerSurfaceArea, 0) /
      referenceHouses.length
  );

  return {
    averageDistance,
    closestDistance,
    furthestDistance,
    averagePrice: {
      min: avgPriceMin,
      max: avgPriceMax,
      average: avgPriceAvg,
      formatted: `${avgPriceMin}-${avgPriceMax}`,
    },
    priceRange: {
      lowest: lowestPrice,
      highest: highestPrice,
    },
    totalReferences: referenceHouses.length,
    withinRadius,
    houseTypeDistribution,
    averageBuildYear,
    averageSurfaceArea,
  };
}

/**
 * Parse target property information from GivenHouse data
 */
export function parsePropertyInfo(givenHouse: AltumAIResponse['GivenHouse']): PropertyInfo {
  return {
    address: {
      postcode: givenHouse.PostCode,
      houseNumber: givenHouse.HouseNumber,
      houseAddition: givenHouse.HouseAddition,
    },
    characteristics: {
      houseType: givenHouse.HouseType,
      buildYear: givenHouse.BuildYear,
      innerSurfaceArea: givenHouse.InnerSurfaceArea,
      outerSurfaceArea: givenHouse.OuterSurfaceArea,
      energyLabel: givenHouse.EnergyLabel.DefinitiveEnergyLabel,
    },
    image: givenHouse.Image,
    valuationDate: parseValuationDate(givenHouse.ValuationDate),
  };
}

/**
 * Filter reference houses by distance
 * Returns houses sorted by distance (closest first)
 */
export function filterByDistance(
  referenceHouses: ReferenceHouse[],
  maxDistanceMeters: number
): ReferenceHouse[] {
  return referenceHouses
    .filter((house) => house.Distance <= maxDistanceMeters)
    .sort((a, b) => a.Distance - b.Distance);
}

/**
 * Sort reference houses by various criteria
 */
export function sortReferenceHouses(
  referenceHouses: ReferenceHouse[],
  sortBy: 'distance' | 'price' | 'similarity' | 'weight' = 'distance'
): ReferenceHouse[] {
  const sorted = [...referenceHouses];

  switch (sortBy) {
    case 'distance':
      return sorted.sort((a, b) => a.Distance - b.Distance);

    case 'price': {
      const getPriceAvg = (priceStr: string) => parsePriceRange(priceStr).average;
      return sorted.sort(
        (a, b) =>
          getPriceAvg(b.IndexedTransactionPrice) - getPriceAvg(a.IndexedTransactionPrice)
      );
    }

    case 'similarity':
      return sorted.sort(
        (a, b) =>
          (b.VisualSimilarityScore || 0) - (a.VisualSimilarityScore || 0)
      );

    case 'weight':
      return sorted.sort((a, b) => b.Weight - a.Weight);

    default:
      return sorted;
  }
}

/**
 * Main parser: Transform raw Altum AI response into normalized ResidentialData
 */
export function parseAltumResponse(
  response: AltumAIResponse
): ResidentialData {
  const { GivenHouse, Inputs, ReferenceData } = response;

  // Parse target property
  const targetProperty = parsePropertyInfo(GivenHouse);

  // Parse reference price mean
  const referencePriceMean = parsePriceRange(ReferenceData.ReferencePriceMean);

  // Get all reference houses
  const referenceHouses = ReferenceData.ReferenceHouses;

  // Filter nearby references (within 5km by default)
  const nearbyReferences = filterByDistance(referenceHouses, 5000);

  // Calculate market statistics
  const marketStatistics = calculateMarketStatistics(referenceHouses);

  return {
    targetProperty,
    referencePriceMean,
    referenceHouses: sortReferenceHouses(referenceHouses, 'distance'),
    nearbyReferences,
    marketStatistics,
    searchParameters: Inputs,
    fetchedAt: new Date(),
    hasData: referenceHouses.length > 0,
  };
}

/**
 * Parser class for convenient usage
 */
export class AltumAIParser {
  /**
   * Parse full response
   */
  parse(response: AltumAIResponse): ResidentialData {
    return parseAltumResponse(response);
  }

  /**
   * Parse price range string
   */
  parsePriceRange(rangeString: string): PriceRange {
    return parsePriceRange(rangeString);
  }

  /**
   * Filter houses by distance
   */
  filterByDistance(
    houses: ReferenceHouse[],
    maxDistance: number
  ): ReferenceHouse[] {
    return filterByDistance(houses, maxDistance);
  }

  /**
   * Sort houses
   */
  sortHouses(
    houses: ReferenceHouse[],
    sortBy: 'distance' | 'price' | 'similarity' | 'weight'
  ): ReferenceHouse[] {
    return sortReferenceHouses(houses, sortBy);
  }
}
