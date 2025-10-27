import type {
  PlaceResult,
  LatLng,
  NearbySearchRequest,
  TextSearchRequest,
  AmenityCategory,
  PRICE_LEVELS
} from './types';
import { responseParser } from './response-parser';
import { errorHandler } from './error-handler';
import { DEFAULT_SEARCH_CONFIG } from './amenity-search-config';

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
      console.warn('⚠️  [Google Places Client] API key not configured');
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
      console.log(`🔍 [Google Places] Nearby search: ${category.displayName}`);

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

      console.log(`✅ [Google Places] Found ${places.length} places for ${category.displayName}`);

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
      console.log(`🔍 [Google Places] Text search: ${category.displayName}`);

      const query = textQuery || category.textQuery || category.keywords.join(' ');

      const request: TextSearchRequest = {
        textQuery: query,
        location,
        radius: category.defaultRadius,
        maxResultCount: DEFAULT_SEARCH_CONFIG.maxResults,
        priceLevels: priceLevels || category.priceLevels,
        languageCode: DEFAULT_SEARCH_CONFIG.languageCode,
        regionCode: DEFAULT_SEARCH_CONFIG.region
      };

      const response = await this.makeTextSearchRequest(request);
      const places = responseParser.parsePlaces(response.places || [], location);

      console.log(`✅ [Google Places] Found ${places.length} places for ${category.displayName}`);

      return responseParser.sortAndLimit(places, DEFAULT_SEARCH_CONFIG.maxResults);
    } catch (error) {
      errorHandler.logError(`Text Search - ${category.displayName}`, error);
      return []; // Return empty array on error
    }
  }

  /**
   * Make Nearby Search API request
   */
  private async makeNearbySearchRequest(request: NearbySearchRequest): Promise<any> {
    const url = `${this.baseUrl}:searchNearby`;

    const body: any = {
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
  private async makeTextSearchRequest(request: TextSearchRequest): Promise<any> {
    const url = `${this.baseUrl}:searchText`;

    const body: any = {
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
  private async makeRequest(url: string, body: any): Promise<any> {
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

      console.log(`⏱️  [Google Places] Request completed in ${responseTime}ms`);

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ [Google Places] Request failed after ${responseTime}ms`);
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
