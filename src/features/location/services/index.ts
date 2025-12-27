/**
 * Singleton service instances for location data
 *
 * Best Practice (2025): Create service instances once and reuse them
 * to prevent recreation on every component render.
 *
 * This improves performance by:
 * - Reducing memory allocations
 * - Enabling proper memoization
 * - Preventing unnecessary re-renders
 */

import { LocationGeocoderService } from '../data/sources/LocationGeocoderService';
import { CBSDemographicsClient } from '../data/sources/CBSDemographicsClient';
import { RIVMHealthClient } from '../data/sources/RIVMHealthClient';
import { CBSLivabilityClient } from '../data/sources/CBSLivabilityClient';
import { PolitieSafetyClient } from '../data/sources/PolitieSafetyClient';
import { AltumAIClient } from '../data/sources/AltumAIClient';
import { MultiLevelAggregator } from '../data/aggregator/MultiLevelAggregator';
import { LocationDataCache } from '../data/cache/locationDataCache';

/**
 * Singleton instances of all location services
 * These are created once and reused throughout the application
 */
export const locationServices = {
  // Geocoding
  geocoder: new LocationGeocoderService(),

  // Data clients
  demographics: new CBSDemographicsClient(),
  health: new RIVMHealthClient(),
  livability: new CBSLivabilityClient(),
  safety: new PolitieSafetyClient(),
  residential: new AltumAIClient(),

  // Utilities
  aggregator: new MultiLevelAggregator(),

  // Cache
  cache: new LocationDataCache({
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 5 * 1024 * 1024, // 5MB
  }),
} as const;

/**
 * Type-safe access to services
 */
export type LocationServices = typeof locationServices;
