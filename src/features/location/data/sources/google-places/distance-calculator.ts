import { distance as turfDistance, point } from '@turf/turf';
import type { LatLng } from './types';

/**
 * Distance Calculator
 * Calculates distances between geographic coordinates
 */
export class DistanceCalculator {
  /**
   * Calculate distance between two points using Turf.js
   * @param from Origin point
   * @param to Destination point
   * @returns Distance in meters
   */
  calculateDistance(from: LatLng, to: LatLng): number {
    const point1 = point([from.lng, from.lat]);
    const point2 = point([to.lng, to.lat]);

    // Turf.distance returns kilometers by default
    const distanceKm = turfDistance(point1, point2, { units: 'kilometers' });

    // Convert to meters
    return Math.round(distanceKm * 1000);
  }

  /**
   * Calculate distance in kilometers (rounded to 2 decimals)
   */
  calculateDistanceKm(from: LatLng, to: LatLng): number {
    const meters = this.calculateDistance(from, to);
    return Math.round((meters / 1000) * 100) / 100;
  }

  /**
   * Sort places by distance from a reference point
   * Modifies the array in place and returns it
   */
  sortByDistance<T extends { location: LatLng; distance?: number }>(
    places: T[],
    from: LatLng
  ): T[] {
    // Calculate and assign distances
    places.forEach(place => {
      place.distance = this.calculateDistance(from, place.location);
    });

    // Sort by distance (ascending)
    return places.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  /**
   * Filter places within a certain radius
   */
  filterByRadius<T extends { location: LatLng }>(
    places: T[],
    center: LatLng,
    radiusMeters: number
  ): T[] {
    return places.filter(place => {
      const distance = this.calculateDistance(center, place.location);
      return distance <= radiusMeters;
    });
  }

  /**
   * Find the closest place to a reference point
   */
  findClosest<T extends { location: LatLng }>(
    places: T[],
    from: LatLng
  ): T | null {
    if (places.length === 0) return null;

    let closest = places[0];
    let minDistance = this.calculateDistance(from, places[0].location);

    for (let i = 1; i < places.length; i++) {
      const distance = this.calculateDistance(from, places[i].location);
      if (distance < minDistance) {
        minDistance = distance;
        closest = places[i];
      }
    }

    return closest;
  }

  /**
   * Calculate average distance for a list of places
   */
  calculateAverageDistance(places: Array<{ distance?: number }>): number {
    const validDistances = places
      .map(p => p.distance)
      .filter((d): d is number => d !== undefined);

    if (validDistances.length === 0) return 0;

    const sum = validDistances.reduce((acc, d) => acc + d, 0);
    return Math.round(sum / validDistances.length);
  }

  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters} m`;
    } else {
      const km = Math.round((meters / 1000) * 10) / 10;
      return `${km} km`;
    }
  }
}

// Singleton instance
export const distanceCalculator = new DistanceCalculator();
