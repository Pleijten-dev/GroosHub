import type {
  PlaceResult,
  LatLng,
  NearbySearchRequest,
  TextSearchRequest,
  AmenityCategory,
  GoogleNearbySearchResponse,
  GoogleTextSearchResponse,
  GoogleNearbySearchRequestBody,
  GoogleTextSearchRequestBody
} from './types';
import { PRICE_LEVELS } from './types';
import { responseParser } from './response-parser';
import { errorHandler } from './error-handler';
import { DEFAULT_SEARCH_CONFIG } from './amenity-search-config';
import { logger } from '@/shared/utils/logger';

/**
 * Google Places API Client
 * Handles communication with Google Places API (New)
 */
export class GooglePlacesClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://places.googleapis.com/v1/places';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('Google Places API key not configured');
    }
  }

  /**
   * Search for nearby places
   * Uses Places API (New) - Nearby Search endpoint
   */
  async searchNearby(
    location: LatLng,
    category: AmenityCategory
  ): Promise<PlaceResult[]> {
    try {
      logger.dataFetch(`amenities (${category.displayName})`, 'api', {
        strategy: 'nearby',
        radius: category.defaultRadius
      });

      const request: NearbySearchRequest = {
        location,
        radius: category.defaultRadius,
        includedTypes: category.placeTypes,
        maxResultCount: DEFAULT_SEARCH_CONFIG.maxResults,
        languageCode: DEFAULT_SEARCH_CONFIG.languageCode,
        regionCode: DEFAULT_SEARCH_CONFIG.region
      };

      const response = await this.makeNearbySearchRequest(request);
      const places = responseParser.parsePlaces(response.places || [], location);

      logger.success(`Found ${places.length} places for ${category.displayName}`);

      return responseParser.sortAndLimit(places, DEFAULT_SEARCH_CONFIG.maxResults);
    } catch (error) {
      errorHandler.logError(`Nearby Search - ${category.displayName}`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Search using text query
   * Uses Places API (New) - Text Search endpoint
   * Supports price level filtering
   */
  async searchWithText(
    location: LatLng,
    category: AmenityCategory,
    textQuery?: string,
    priceLevels?: PRICE_LEVELS[]
  ): Promise<PlaceResult[]> {
    try {
      logger.dataFetch(`amenities (${category.displayName})`, 'api', {
        strategy: 'text',
        radius: category.defaultRadius
      });

      const query = textQuery || category.textQuery || category.keywords.join(' ');

      // Special handling for restaurant categories:
      // - Budget & Upscale: Send price filters to Google API so it finds restaurants with those price levels
      // - Mid-range: Don't send price filter to capture ALL restaurants, then exclude budget/expensive locally
      //   This ensures restaurants without price data end up in mid-range
      const isBudgetRestaurant = category.id === 'restaurants_budget';
      const isMidRangeRestaurant = category.id === 'restaurants_midrange';
      const isUpscaleRestaurant = category.id === 'restaurants_upscale';

      // Only mid-range skips the price filter
      const shouldSkipPriceFilter = isMidRangeRestaurant;

      const request: TextSearchRequest = {
        textQuery: query,
        location,
        radius: category.defaultRadius,
        maxResultCount: DEFAULT_SEARCH_CONFIG.maxResults,
        priceLevels: shouldSkipPriceFilter ? undefined : (priceLevels || category.priceLevels),
        languageCode: DEFAULT_SEARCH_CONFIG.languageCode,
        regionCode: DEFAULT_SEARCH_CONFIG.region
      };

      const response = await this.makeTextSearchRequest(request);
      let places = responseParser.parsePlaces(response.places || [], location);

      // Post-filter for mid-range: exclude budget (1,2) and expensive (4,5) restaurants
      // This keeps MODERATE (3), undefined (no price data), and any other price levels
      if (isMidRangeRestaurant) {
        const budgetLevels = [PRICE_LEVELS.FREE, PRICE_LEVELS.INEXPENSIVE];
        const upscaleLevels = [PRICE_LEVELS.EXPENSIVE, PRICE_LEVELS.VERY_EXPENSIVE];

        places = places.filter(place => {
          // Include restaurants without price data (default to mid-range)
          if (place.priceLevel === undefined) return true;
          // Exclude budget and expensive restaurants
          return !budgetLevels.includes(place.priceLevel) && !upscaleLevels.includes(place.priceLevel);
        });
      }

      logger.success(`Found ${places.length} places for ${category.displayName}`);

      return responseParser.sortAndLimit(places, DEFAULT_SEARCH_CONFIG.maxResults);
    } catch (error) {
      errorHandler.logError(`Text Search - ${category.displayName}`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Make Nearby Search API request
   */
  private async makeNearbySearchRequest(request: NearbySearchRequest): Promise<GoogleNearbySearchResponse> {
    const url = `${this.baseUrl}:searchNearby`;

    const body: GoogleNearbySearchRequestBody = {
      locationRestriction: {
        circle: {
          center: {
            latitude: request.location.lat,
            longitude: request.location.lng
          },
          radius: request.radius
        }
      },
      maxResultCount: request.maxResultCount || 20
    };

    if (request.includedTypes && request.includedTypes.length > 0) {
      body.includedTypes = request.includedTypes;
    }

    if (request.languageCode) {
      body.languageCode = request.languageCode;
    }

    if (request.regionCode) {
      body.regionCode = request.regionCode;
    }

    return this.makeRequest(url, body);
  }

  /**
   * Make Text Search API request
   */
  private async makeTextSearchRequest(request: TextSearchRequest): Promise<GoogleTextSearchResponse> {
    const url = `${this.baseUrl}:searchText`;

    const body: GoogleTextSearchRequestBody = {
      textQuery: request.textQuery,
      maxResultCount: request.maxResultCount || 20
    };

    // Location bias (optional)
    if (request.location) {
      body.locationBias = {
        circle: {
          center: {
            latitude: request.location.lat,
            longitude: request.location.lng
          },
          radius: request.radius || 5000
        }
      };
    }

    // Price level filter (only works with Text Search)
    if (request.priceLevels && request.priceLevels.length > 0) {
      body.priceLevels = request.priceLevels;
    }

    if (request.includedType) {
      body.includedType = request.includedType;
    }

    if (request.minRating) {
      body.minRating = request.minRating;
    }

    if (request.openNow !== undefined) {
      body.openNow = request.openNow;
    }

    if (request.languageCode) {
      body.languageCode = request.languageCode;
    }

    if (request.regionCode) {
      body.regionCode = request.regionCode;
    }

    return this.makeRequest(url, body);
  }

  /**
   * Make HTTP request to Google Places API
   */
  private async makeRequest(
    url: string,
    body: GoogleNearbySearchRequestBody | GoogleTextSearchRequestBody
  ): Promise<GoogleNearbySearchResponse | GoogleTextSearchResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': this.getFieldMask()
        },
        body: JSON.stringify(body)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          statusText: response.statusText,
          response: {
            data: errorData
          }
        };
      }

      const data = await response.json();

      logger.info(`Google Places request completed`, { durationMs: responseTime });

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Google Places request failed`, error instanceof Error ? error : undefined, { durationMs: responseTime });
      throw error;
    }
  }

  /**
   * Get field mask for API requests
   * Only request the fields we need to minimize costs
   */
  private getFieldMask(): string {
    return [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.types',
      'places.rating',
      'places.userRatingCount',
      'places.priceLevel',
      'places.regularOpeningHours',
      'places.businessStatus'
    ].join(',');
  }
}
