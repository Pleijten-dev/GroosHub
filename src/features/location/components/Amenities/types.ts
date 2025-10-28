/**
 * Amenity Display Types
 * Extended types for frontend amenity display components
 */

import type {
  AmenitySearchResult,
  AmenityMultiCategoryResponse,
  PlaceResult,
  AmenityCategory
} from '../../data/sources/google-places/types';

export type { AmenitySearchResult, AmenityMultiCategoryResponse, PlaceResult, AmenityCategory };

/**
 * Amenity display data with calculated metrics
 */
export interface AmenityCategoryDisplay {
  category: AmenityCategory;
  places: PlaceResult[];
  totalPlaces: number;
  closestPlace: PlaceResult | null;
  averageDistance: number;
  distanceRange: {
    min: number;
    max: number;
  };
  withinWalkingDistance: number; // Places within 1km
  hasData: boolean;
}

/**
 * Amenity summary statistics
 */
export interface AmenitySummaryStats {
  totalCategories: number;
  categoriesWithData: number;
  totalPlaces: number;
  averageDistanceAll: number;
  essentialServicesNearby: boolean; // All essential within 1km
}

/**
 * Quota warning level
 */
export type QuotaWarningLevel = 'none' | 'warning' | 'critical' | 'exceeded';

/**
 * Quota status for display
 */
export interface QuotaStatus {
  textSearchUsed: number;
  textSearchLimit: number;
  textSearchRemaining: number;
  percentUsed: number;
  warningLevel: QuotaWarningLevel;
  canSearch: boolean;
  message?: string;
}
