/**
 * Google Places API Types
 * Based on Google Places API (New) - https://developers.google.com/maps/documentation/places/web-service/place-types
 */

// Price levels as defined by Google Places API
export enum PRICE_LEVELS {
  FREE = 0,
  INEXPENSIVE = 1,
  MODERATE = 2,
  EXPENSIVE = 3,
  VERY_EXPENSIVE = 4,
}

// Search strategies
export type SearchStrategy = 'nearby' | 'text' | 'both';

// Priority levels for amenity categories
export type PriorityLevel = 'essential' | 'high' | 'medium' | 'low';

/**
 * Amenity Category Configuration
 */
export interface AmenityCategory {
  id: string;                           // Unique identifier (e.g., 'zorg_primair')
  name: string;                         // Internal name
  displayName: string;                  // Dutch display name
  priority: PriorityLevel;              // Importance level
  searchStrategy: SearchStrategy;       // Which API endpoints to use
  placeTypes: string[];                 // Google Place Types
  keywords: string[];                   // Search keywords (for text search)
  defaultRadius: number;                // Search radius in meters
  color: string;                        // UI color (hex)
  icon: string;                         // Emoji icon
  priceLevels?: PRICE_LEVELS[];         // Price filter (only for text search)
  textQuery?: string;                   // Custom text query for text search
}

/**
 * Search Configuration
 */
export interface SearchConfig {
  useNearbySearch: boolean;             // Enable Nearby Search API
  useTextSearch: boolean;               // Enable Text Search API
  maxRadius: number;                    // Maximum search radius
  searchRadiusSteps: number[];          // Radius steps for progressive search
  includeInactiveBusinesses: boolean;   // Include closed businesses
  maxResults: number;                   // Results per category
  languageCode: string;                 // Response language (nl)
  region: string;                       // Region code (nl)
}

/**
 * Location (Latitude/Longitude)
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Opening Hours
 */
export interface OpeningHours {
  openNow?: boolean;
  weekdayText?: string[];
}

/**
 * Place Result from Google Places API
 */
export interface PlaceResult {
  placeId: string;                      // Unique Google Place ID
  name: string;                         // Place name
  displayName?: {                       // Localized display name
    text: string;
    languageCode: string;
  };
  location: LatLng;                     // Place coordinates
  types: string[];                      // Place types
  formattedAddress?: string;            // Formatted address
  rating?: number;                      // Average rating (0-5)
  userRatingsTotal?: number;            // Number of ratings
  priceLevel?: PRICE_LEVELS;            // Price level
  openingHours?: OpeningHours;          // Opening hours
  businessStatus?: string;              // Business status
  distance?: number;                    // Distance from search point (meters) - calculated
  distanceKm?: number;                  // Distance in kilometers - calculated
}

/**
 * Search Result for a single category
 */
export interface AmenitySearchResult {
  category: AmenityCategory;
  places: PlaceResult[];
  searchLocation: LatLng;
  searchRadius: number;
  totalResults: number;
  searchedAt: Date;
  searchStrategy: SearchStrategy;       // Which strategy was used
  error?: string;
}

/**
 * Multi-category search response
 */
export interface AmenityMultiCategoryResponse {
  location: LatLng;
  results: AmenitySearchResult[];
  totalCategories: number;
  successfulCategories: number;
  failedCategories: number;
  quotaStatus?: {
    textSearchRemaining: number;
    textSearchLimit: number;
    percentUsed: number;
  };
  searchedAt: Date;
}

/**
 * API Usage Record (for database)
 */
export interface UsageRecord {
  endpoint: 'text_search' | 'nearby_search';
  categoryId?: string;
  status: 'success' | 'error' | 'quota_exceeded';
  errorMessage?: string;
  location?: LatLng;
  resultsCount?: number;
  responseTimeMs?: number;
}

/**
 * Usage Statistics
 */
export interface UsageStats {
  currentMonth: string;                 // Year-month (YYYY-MM)
  textSearchUsed: number;
  textSearchLimit: number;
  textSearchRemaining: number;
  textSearchPercentUsed: number;
  nearbySearchUsed: number;
  lastUpdated: Date;
}

/**
 * Quota Check Result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  percentUsed: number;
  message?: string;
}

/**
 * Google Places API Request - Nearby Search
 */
export interface NearbySearchRequest {
  location: LatLng;
  radius: number;
  includedTypes?: string[];             // Place types to include
  maxResultCount?: number;              // Max results (1-20)
  languageCode?: string;
  regionCode?: string;
}

/**
 * Google Places API Request - Text Search
 */
export interface TextSearchRequest {
  textQuery: string;                    // Search query
  location?: LatLng;                    // Optional location bias
  radius?: number;                      // Search radius
  includedType?: string;                // Single place type
  minRating?: number;                   // Minimum rating
  maxResultCount?: number;              // Max results (1-20)
  priceLevels?: PRICE_LEVELS[];         // Price level filter
  openNow?: boolean;                    // Only open places
  languageCode?: string;
  regionCode?: string;
}

/**
 * Error Response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}
