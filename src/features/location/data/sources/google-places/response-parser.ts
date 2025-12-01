import type { PlaceResult, LatLng, PRICE_LEVELS, GooglePlaceRaw } from './types';
import { distanceCalculator } from './distance-calculator';
import { logger } from '@/shared/utils/logger';

/**
 * Response Parser for Google Places API
 * Transforms API responses into our PlaceResult format
 */
export class ResponseParser {
  /**
   * Parse a single place from Google Places API response
   */
  parsePlace(rawPlace: GooglePlaceRaw, searchLocation?: LatLng): PlaceResult {
    // Extract location
    const location: LatLng = {
      lat: rawPlace.location?.latitude || 0,
      lng: rawPlace.location?.longitude || 0
    };

    // Extract name
    const name = rawPlace.displayName?.text || 'Unknown';

    // Extract place ID
    const placeId = rawPlace.id || '';

    // Extract types
    const types: string[] = rawPlace.types || [];

    // Extract opening hours
    const openingHours = rawPlace.currentOpeningHours
      ? {
          openNow: rawPlace.currentOpeningHours.openNow,
          weekdayText: rawPlace.currentOpeningHours.weekdayDescriptions
        }
      : undefined;

    // Parse price level
    let priceLevel: PRICE_LEVELS | undefined;
    if (rawPlace.priceLevel !== undefined && rawPlace.priceLevel !== null) {
      priceLevel = rawPlace.priceLevel as PRICE_LEVELS;
    }

    const place: PlaceResult = {
      placeId,
      name,
      displayName: rawPlace.displayName,
      location,
      types,
      formattedAddress: rawPlace.formattedAddress,
      rating: rawPlace.rating,
      userRatingsTotal: rawPlace.userRatingCount,
      priceLevel,
      openingHours,
      businessStatus: rawPlace.businessStatus
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
  parsePlaces(rawPlaces: GooglePlaceRaw[], searchLocation?: LatLng): PlaceResult[] {
    if (!Array.isArray(rawPlaces)) {
      logger.warn('Expected array of places', { receivedType: typeof rawPlaces });
      return [];
    }

    return rawPlaces
      .map(rawPlace => {
        try {
          return this.parsePlace(rawPlace, searchLocation);
        } catch (error) {
          logger.error('Error parsing place', error instanceof Error ? error : undefined);
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
  parseError(error: unknown): string {
    const err = error as {
      response?: {
        data?: {
          error?: {
            message?: string;
          };
        };
      };
      message?: string;
    };

    if (err.response?.data?.error) {
      return err.response.data.error.message || 'Unknown API error';
    }

    if (err.message) {
      return err.message;
    }

    return 'An unknown error occurred';
  }
}

// Singleton instance
export const responseParser = new ResponseParser();
