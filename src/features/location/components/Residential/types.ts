/**
 * Residential Display Types
 * Extended types for frontend residential display components
 */

import type { ResidentialData, ReferenceHouse } from '../../data/sources/altum-ai/types';

export type { ResidentialData, ReferenceHouse };

/**
 * Reference house display data with formatted values
 */
export interface ReferenceHouseDisplay extends ReferenceHouse {
  distanceFormatted: string; // e.g., "1.2 km" or "340 m"
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  isNearby: boolean; // within 1km
  isClose: boolean; // within 5km
}

/**
 * Market statistics for display
 */
export interface MarketStatsDisplay {
  averageDistanceFormatted: string;
  closestDistanceFormatted: string;
  averagePriceFormatted: string;
  totalReferences: number;
  withinOneKm: number;
  withinFiveKm: number;
  mostCommonHouseType: string;
}
