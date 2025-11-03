"use client";

import { useState, useCallback } from 'react';
import { LocationGeocoderService } from '../data/services/locationGeocoder';
import { CBSDemographicsClient } from '../data/sources/cbs-demographics/client';
import { RIVMHealthClient } from '../data/sources/rivm-health/client';
import { CBSLivabilityClient } from '../data/sources/cbs-livability/client';
import { PolitieSafetyClient } from '../data/sources/politie-safety/client';
import { AltumAIClient } from '../data/sources/altum-ai/client';
import {
  MultiLevelAggregator,
  type UnifiedLocationData,
} from '../data/aggregator/multiLevelAggregator';
import { searchOrchestrator } from '../data/sources/google-places/search-orchestrator';
import type { AmenityMultiCategoryResponse } from '../data/sources/google-places/types';

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
  fetchData: (address: string) => Promise<void>;
  clearData: () => void;
}

/**
 * Main hook for fetching and managing location data
 */
export function useLocationData(): UseLocationDataReturn {
  const [data, setData] = useState<UnifiedLocationData | null>(null);
  const [amenities, setAmenities] = useState<AmenityMultiCategoryResponse | null>(null);
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

  // Initialize services
  const geocoderService = new LocationGeocoderService();
  const demographicsClient = new CBSDemographicsClient();
  const healthClient = new RIVMHealthClient();
  const livabilityClient = new CBSLivabilityClient();
  const safetyClient = new PolitieSafetyClient();
  const residentialClient = new AltumAIClient();
  const aggregator = new MultiLevelAggregator();

  /**
   * Fetch all location data for a given address
   */
  const fetchData = useCallback(
    async (address: string) => {
      // Reset state
      setData(null);
      setAmenities(null);
      setError({
        geocoding: null,
        demographics: null,
        health: null,
        livability: null,
        safety: null,
        amenities: null,
        residential: null,
      });

      // Start geocoding
      setLoading((prev) => ({ ...prev, geocoding: true }));

      try {
        // Step 1: Geocode address and get location codes
        const locationData = await geocoderService.geocodeAddress(address);

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
          demographicsClient.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          healthClient.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          livabilityClient.fetchMultiLevel(municipalityCode),
          safetyClient.fetchMultiLevel(
            municipalityCode,
            districtCode,
            neighborhoodCode
          ),
          searchOrchestrator.searchAllCategories({
            lat: locationData.coordinates.wgs84.latitude,
            lng: locationData.coordinates.wgs84.longitude,
          }),
          residentialClient.fetchReferenceData(locationData),
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

        // Set errors if any
        if (demographicsData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            demographics: 'Failed to fetch demographics data',
          }));
        }
        if (healthData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            health: 'Failed to fetch health data',
          }));
        }
        if (livabilityData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            livability: 'Failed to fetch livability data',
          }));
        }
        if (safetyData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            safety: 'Failed to fetch safety data',
          }));
        }
        if (amenitiesData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            amenities: 'Failed to fetch amenities data',
          }));
        }
        if (residentialData.status === 'rejected') {
          setError((prev) => ({
            ...prev,
            residential: 'Failed to fetch residential data',
          }));
        }

        // Store amenities data separately
        if (amenitiesData.status === 'fulfilled') {
          setAmenities(amenitiesData.value);
        }

        // Get residential data (or null if failed)
        const residential =
          residentialData.status === 'fulfilled' ? residentialData.value : null;

        // Step 3: Aggregate all data
        const unifiedData = await aggregator.aggregate(
          locationData,
          demographics,
          health,
          livability,
          safety,
          residential
        );

        setData(unifiedData);
      } catch (err) {
        console.error('Error fetching location data:', err);
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
    [geocoderService, demographicsClient, healthClient, livabilityClient, safetyClient, residentialClient, aggregator]
  );

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setData(null);
    setAmenities(null);
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
    fetchData,
    clearData,
  };
}
