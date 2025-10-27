import type { PlaceResult, LatLng, PRICE_LEVELS } from './types';
import { distanceCalculator } from './distance-calculator';

/**
 * Response Parser for Google Places API
 * Transforms API responses into our PlaceResult format
 */
export class ResponseParser {
  /**
   * Parse a single place from Google Places API response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsePlace(rawPlace: any, searchLocation?: LatLng): PlaceResult {
    // Extract location
    const location: LatLng = {
      lat: rawPlace.location?.latitude || rawPlace.geometry?.location?.lat || 0,
      lng: rawPlace.location?.longitude || rawPlace.geometry?.location?.lng || 0
    };

    // Extract name (handle both old and new API formats)
    const name = rawPlace.displayName?.text || rawPlace.name || 'Unknown';

    // Extract place ID
    const placeId = rawPlace.id || rawPlace.place_id || '';

    // Extract types
    const types: string[] = rawPlace.types || [];

    // Extract opening hours
    const openingHours = rawPlace.regularOpeningHours || rawPlace.opening_hours
      ? {
          openNow: rawPlace.regularOpeningHours?.openNow || rawPlace.opening_hours?.open_now,
          weekdayText: rawPlace.regularOpeningHours?.weekdayDescriptions || rawPlace.opening_hours?.weekday_text
        }
      : undefined;

    // Parse price level
    let priceLevel: PRICE_LEVELS | undefined;
    if (rawPlace.priceLevel !== undefined && rawPlace.priceLevel !== null) {
      priceLevel = rawPlace.priceLevel as PRICE_LEVELS;
    } else if (rawPlace.price_level !== undefined && rawPlace.price_level !== null) {
      priceLevel = rawPlace.price_level as PRICE_LEVELS;
    }

    const place: PlaceResult = {
      placeId,
      name,
      displayName: rawPlace.displayName,
      location,
      types,
      formattedAddress: rawPlace.formattedAddress || rawPlace.formatted_address,
      rating: rawPlace.rating,
      userRatingsTotal: rawPlace.userRatingCount || rawPlace.user_ratings_total,
      priceLevel,
      openingHours,
      businessStatus: rawPlace.businessStatus || rawPlace.business_status
    };

    // Calculate distance if search location provided
    if (searchLocation) {
      place.distance = distanceCalculator.calculateDistance(searchLocation, location);
      place.distanceKm = distanceCalculator.calculateDistanceKm(searchLocation, location);
    }

    return place;
  }

  /**
   * Parse multiple places from API response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsePlaces(rawPlaces: any[], searchLocation?: LatLng): PlaceResult[] {
    if (!Array.isArray(rawPlaces)) {
      console.warn('⚠️  [Response Parser] Expected array, got:', typeof rawPlaces);
      return [];
    }

    return rawPlaces
      .map(rawPlace => {
        try {
          return this.parsePlace(rawPlace, searchLocation);
        } catch (error) {
          console.error('❌ [Response Parser] Error parsing place:', error);
          return null;
        }
      })
      .filter((place): place is PlaceResult => place !== null);
  }

  /**
   * Sort places by distance and limit results
   */
  sortAndLimit(places: PlaceResult[], maxResults: number = 20): PlaceResult[] {
    // Sort by distance (if available)
    const sorted = places.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    // Limit to max results
    return sorted.slice(0, maxResults);
  }

  /**
   * Deduplicate places by place_id
   * Useful when combining results from multiple search strategies
   */
  deduplicatePlaces(places: PlaceResult[]): PlaceResult[] {
    const seen = new Set<string>();
    return places.filter(place => {
      if (seen.has(place.placeId)) {
        return false;
      }
      seen.add(place.placeId);
      return true;
    });
  }

  /**
   * Merge results from nearby and text search
   * Removes duplicates and sorts by distance
   */
  mergeResults(
    nearbyResults: PlaceResult[],
    textResults: PlaceResult[],
    maxResults: number = 20
  ): PlaceResult[] {
    const combined = [...nearbyResults, ...textResults];
    const deduplicated = this.deduplicatePlaces(combined);
    return this.sortAndLimit(deduplicated, maxResults);
  }

  /**
   * Filter places by business status (exclude permanently closed)
   */
  filterActive(places: PlaceResult[]): PlaceResult[] {
    return places.filter(place => {
      return place.businessStatus !== 'CLOSED_PERMANENTLY';
    });
  }

  /**
   * Parse error response from Google Places API
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseError(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error.message || 'Unknown API error';
    }

    if (error.message) {
      return error.message;
    }

    return 'An unknown error occurred';
  }
}

// Singleton instance
export const responseParser = new ResponseParser();
