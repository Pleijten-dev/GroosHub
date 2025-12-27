"use client";

import { useState, useCallback } from 'react';
import { locationServices } from '../services';
import type { UnifiedLocationData } from '../data/aggregator/multiLevelAggregator';
import { searchOrchestrator } from '../data/sources/google-places/search-orchestrator';
import type { AmenityMultiCategoryResponse } from '../data/sources/google-places/types';
import { logger } from '@/shared/utils/logger';
import { safeLocalStorage } from '@/shared/utils/safeStorage';

/**
 * Loading state for each data source
 */
export interface LoadingState {
  geocoding: boolean;
  demographics: boolean;
  health: boolean;
  livability: boolean;
  safety: boolean;
  amenities: boolean;
  residential: boolean;
}

/**
 * Error state for each data source
 */
export interface ErrorState {
  geocoding: string | null;
  demographics: string | null;
  health: string | null;
  livability: string | null;
  safety: string | null;
  amenities: string | null;
  residential: string | null;
}

/**
 * Hook return interface
 */
export interface UseLocationDataReturn {
  data: UnifiedLocationData | null;
  amenities: AmenityMultiCategoryResponse | null;
  loading: LoadingState;
  error: ErrorState;
  isLoading: boolean;
  hasError: boolean;
  fromCache: boolean;
  fetchData: (address: string, skipCache?: boolean) => Promise<void>;
  loadSavedData: (locationData: UnifiedLocationData, amenitiesData?: AmenityMultiCategoryResponse | null, address?: string) => void;
  clearData: () => void;
  clearCache: () => void;
}

/**
 * Main hook for fetching and managing location data
 */
export function useLocationData(): UseLocationDataReturn {
  const [data, setData] = useState<UnifiedLocationData | null>(null);
  const [amenities, setAmenities] = useState<AmenityMultiCategoryResponse | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState<LoadingState>({
    geocoding: false,
    demographics: false,
    health: false,
    livability: false,
    safety: false,
    amenities: false,
    residential: false,
  });
  const [error, setError] = useState<ErrorState>({
    geocoding: null,
    demographics: null,
    health: null,
    livability: null,
    safety: null,
    amenities: null,
    residential: null,
  });

  // Use singleton services from locationServices
  // Best Practice (2025): Services are created once and reused to prevent
  // recreation on every render, which improves performance and enables proper memoization

  /**
   * Fetch all location data for a given address
   */
  const fetchData = useCallback(
    async (address: string, skipCache: boolean = false) => {
      // Reset state
      setData(null);
      setAmenities(null);
      setFromCache(false);
      setError({
        geocoding: null,
        demographics: null,
        health: null,
        livability: null,
        safety: null,
        amenities: null,
        residential: null,
      });

      // Check cache first (unless skipCache is true)
      if (!skipCache) {
        const cached = locationServices.cache.get(address);
        if (cached) {
          logger.dataFetch('location data', 'cache', { address });
          setData(cached.data);
          setAmenities(cached.amenities);
          setFromCache(true);
          // Store the search address for later use (e.g., saving rapport)
          safeLocalStorage.setItem('grooshub_current_address', address);
          return;
        }
      }

      // Start geocoding
      setLoading((prev) => ({ ...prev, geocoding: true }));

      try {
        // Step 1: Geocode address and get location codes
        const locationData = await locationServices.geocoder.geocodeAddress(address);

        if (!locationData) {
          setError((prev) => ({
            ...prev,
            geocoding: 'Could not geocode address',
          }));
          setLoading((prev) => ({ ...prev, geocoding: false }));
          return;
        }

        setLoading((prev) => ({ ...prev, geocoding: false }));

        // Step 2: Fetch all data sources in parallel
        const municipalityCode = locationData.municipality.statcode;
        const districtCode = locationData.district?.statcode || null;
        const neighborhoodCode = locationData.neighborhood?.statcode || null;

        // Set all loading states to true
        setLoading({
          geocoding: false,
          demographics: true,
          health: true,
          livability: true,
          safety: true,
          amenities: true,
          residential: true,
        });

        const [
          demographicsData,
          healthData,
          livabilityData,
          safetyData,
          amenitiesData,
          residentialData,
        ] = await Promise.allSettled([
          locationServices.demographics.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          locationServices.health.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          locationServices.livability.fetchMultiLevel(municipalityCode),
          locationServices.safety.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          searchOrchestrator.searchAllCategories({
            lat: locationData.coordinates.wgs84.latitude,
            lng: locationData.coordinates.wgs84.longitude,
          }),
          locationServices.residential.fetchReferenceData(locationData),
        ]);

        // Update loading states
        setLoading({
          geocoding: false,
          demographics: false,
          health: false,
          livability: false,
          safety: false,
          amenities: false,
          residential: false,
        });

        // Handle results and errors
        const demographics =
          demographicsData.status === 'fulfilled'
            ? demographicsData.value
            : {
                national: null,
                municipality: null,
                district: null,
                neighborhood: null,
              };

        const health =
          healthData.status === 'fulfilled'
            ? healthData.value
            : {
                national: null,
                municipality: null,
                district: null,
                neighborhood: null,
              };

        const livability =
          livabilityData.status === 'fulfilled'
            ? livabilityData.value
            : { national: null, municipality: null };

        const safety =
          safetyData.status === 'fulfilled'
            ? safetyData.value
            : {
                national: null,
                municipality: null,
                district: null,
                neighborhood: null,
              };

        // Set errors if any (include actual error messages for debugging)
        if (demographicsData.status === 'rejected') {
          const errorMsg = demographicsData.reason?.message || 'Unknown error';
          logger.error('Demographics fetch failed', { error: demographicsData.reason });
          setError((prev) => ({
            ...prev,
            demographics: `Failed to fetch demographics data: ${errorMsg}`,
          }));
        }
        if (healthData.status === 'rejected') {
          const errorMsg = healthData.reason?.message || 'Unknown error';
          logger.error('Health data fetch failed', { error: healthData.reason });
          setError((prev) => ({
            ...prev,
            health: `Failed to fetch health data: ${errorMsg}`,
          }));
        }
        if (livabilityData.status === 'rejected') {
          const errorMsg = livabilityData.reason?.message || 'Unknown error';
          logger.error('Livability data fetch failed', { error: livabilityData.reason });
          setError((prev) => ({
            ...prev,
            livability: `Failed to fetch livability data: ${errorMsg}`,
          }));
        }
        if (safetyData.status === 'rejected') {
          const errorMsg = safetyData.reason?.message || 'Unknown error';
          logger.error('Safety data fetch failed', { error: safetyData.reason });
          setError((prev) => ({
            ...prev,
            safety: `Failed to fetch safety data: ${errorMsg}`,
          }));
        }
        if (amenitiesData.status === 'rejected') {
          const errorMsg = amenitiesData.reason?.message || 'Unknown error';
          logger.error('Amenities data fetch failed', { error: amenitiesData.reason });
          setError((prev) => ({
            ...prev,
            amenities: `Failed to fetch amenities data: ${errorMsg}`,
          }));
        }
        if (residentialData.status === 'rejected') {
          const errorMsg = residentialData.reason?.message || 'Unknown error';
          logger.error('Residential data fetch failed', { error: residentialData.reason });
          setError((prev) => ({
            ...prev,
            residential: `Failed to fetch residential data: ${errorMsg}`,
          }));
        }

        // Store amenities data separately
        if (amenitiesData.status === 'fulfilled') {
          setAmenities(amenitiesData.value);
        }

        // Get residential data (or null if failed)
        const residential =
          residentialData.status === 'fulfilled' ? residentialData.value : null;

        // Get amenities data (or null if failed)
        const amenitiesResult = amenitiesData.status === 'fulfilled' ? amenitiesData.value : null;

        // Step 3: Aggregate all data
        const unifiedData = await locationServices.aggregator.aggregate(
          locationData,
          demographics,
          health,
          livability,
          safety,
          residential,
          amenitiesResult
        );

        // Store in cache
        const cached = locationServices.cache.set(address, unifiedData, amenitiesResult);
        if (cached) {
          logger.success('Stored location data in cache', { address });
          // Store the search address for later use (e.g., saving rapport)
          safeLocalStorage.setItem('grooshub_current_address', address);
        }

        setData(unifiedData);
        setFromCache(false);
      } catch (err) {
        logger.error('Failed to fetch location data', err, { address });
        setError((prev) => ({
          ...prev,
          geocoding: err instanceof Error ? err.message : 'Unknown error',
        }));
        setLoading({
          geocoding: false,
          demographics: false,
          health: false,
          livability: false,
          safety: false,
          amenities: false,
          residential: false,
        });
      }
    },
    [] // Empty dependency array - locationServices are stable singleton instances
  );

  /**
   * Load saved data directly without making API calls
   */
  const loadSavedData = useCallback((locationData: UnifiedLocationData, amenitiesData?: AmenityMultiCategoryResponse | null, address?: string) => {
    logger.dataFetch('location data', 'saved', { address: address || 'unknown' });
    setData(locationData);
    setAmenities(amenitiesData || null);
    setFromCache(false); // This is from database, not cache
    setError({
      geocoding: null,
      demographics: null,
      health: null,
      livability: null,
      safety: null,
      amenities: null,
      residential: null,
    });
    setLoading({
      geocoding: false,
      demographics: false,
      health: false,
      livability: false,
      safety: false,
      amenities: false,
      residential: false,
    });

    // Store in cache to prevent unnecessary API calls if data is refetched
    if (address) {
      const cached = locationServices.cache.set(address, locationData, amenitiesData || null);
      if (cached) {
        logger.success('Stored saved data in cache', { address });
      }
    }
  }, []);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setData(null);
    setAmenities(null);
    setFromCache(false);
    setError({
      geocoding: null,
      demographics: null,
      health: null,
      livability: null,
      safety: null,
      amenities: null,
      residential: null,
    });
  }, []);

  /**
   * Clear all cached location data
   */
  const clearCache = useCallback(() => {
    locationDataCache.clearAll();
    logger.info('Cache cleared');
  }, []);

  // Computed properties
  const isLoading = Object.values(loading).some((l) => l);
  const hasError = Object.values(error).some((e) => e !== null);

  return {
    data,
    amenities,
    loading,
    error,
    isLoading,
    hasError,
    fromCache,
    fetchData,
    loadSavedData,
    clearData,
    clearCache,
  };
}
