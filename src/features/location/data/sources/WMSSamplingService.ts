/**
 * WMS Sampling Service
 * Extracts data from WMS layers using three sampling methods:
 * 1. Point sample - single value at exact location
 * 2. Average area sample - average value over circular area
 * 3. Maximum area sample - maximum value within circular area
 */

import type {
  LatLng,
  PointSample,
  AreaSample,
  MaxAreaSample,
  GetFeatureInfoParams,
  GridPoint,
  SamplingConfig,
  DEFAULT_SAMPLING_CONFIG,
} from '../../types/wms-grading';

/**
 * WMS Sampling Service
 * Handles all WMS data extraction operations
 */
export class WMSSamplingService {
  private config: SamplingConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly CONCURRENT_REQUESTS = 5; // Max parallel requests at once

  constructor(config: Partial<SamplingConfig> = {}) {
    this.config = {
      area_radius_meters: config.area_radius_meters ?? 500,
      grid_resolution_meters: config.grid_resolution_meters ?? 50,
      max_samples_per_layer: config.max_samples_per_layer ?? 400,
    };
  }

  /**
   * Perform point sample at exact coordinates
   */
  async pointSample(
    url: string,
    layers: string,
    coordinates: LatLng
  ): Promise<PointSample | null> {
    try {
      const featureInfo = await this.getFeatureInfo(url, layers, coordinates);

      if (!featureInfo || Object.keys(featureInfo).length === 0) {
        return null;
      }

      // Extract numeric value if possible
      const value = this.extractValue(featureInfo);

      return {
        value,
        raw_data: featureInfo,
        timestamp: new Date(),
        coordinates,
      };
    } catch (error) {
      console.error('Point sample error:', error);
      return null;
    }
  }

  /**
   * Perform average area sample over circular area
   */
  async averageAreaSample(
    url: string,
    layers: string,
    center: LatLng
  ): Promise<AreaSample | null> {
    try {
      const gridPoints = this.generateGrid(center, this.config.area_radius_meters);

      // Limit samples for performance
      const samplesToTake = gridPoints.slice(0, this.config.max_samples_per_layer);

      // Fetch samples in batches to avoid overwhelming the server
      const results = await this.fetchInBatches(url, layers, samplesToTake);

      // Extract numeric values from successful samples
      const values: number[] = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const value = this.extractValue(result.value);
          if (typeof value === 'number' && !isNaN(value)) {
            values.push(value);
          }
        }
      });

      if (values.length === 0) {
        return null;
      }

      // Calculate average
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;

      return {
        value: average,
        radius_meters: this.config.area_radius_meters,
        sample_count: values.length,
        grid_resolution_meters: this.config.grid_resolution_meters,
        timestamp: new Date(),
        center,
        sample_values: values,
      };
    } catch (error) {
      console.error('Average area sample error:', error);
      return null;
    }
  }

  /**
   * Perform maximum area sample within circular area
   */
  async maxAreaSample(
    url: string,
    layers: string,
    center: LatLng
  ): Promise<MaxAreaSample | null> {
    try {
      const gridPoints = this.generateGrid(center, this.config.area_radius_meters);

      // Limit samples for performance
      const samplesToTake = gridPoints.slice(0, this.config.max_samples_per_layer);

      // Fetch samples in batches with location tracking
      const results = await this.fetchInBatchesWithLocation(url, layers, samplesToTake);

      // Extract numeric values with locations
      const samplesWithValues: Array<{ value: number; location: LatLng }> = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data) {
          const value = this.extractValue(result.value.data);
          if (typeof value === 'number' && !isNaN(value)) {
            samplesWithValues.push({
              value,
              location: result.value.location,
            });
          }
        }
      });

      if (samplesWithValues.length === 0) {
        return null;
      }

      // Find maximum
      const maxSample = samplesWithValues.reduce((max, current) =>
        current.value > max.value ? current : max
      );

      // Calculate average for comparison
      const allValues = samplesWithValues.map((s) => s.value);
      const average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;

      return {
        value: average, // Store average as the main value
        radius_meters: this.config.area_radius_meters,
        sample_count: allValues.length,
        grid_resolution_meters: this.config.grid_resolution_meters,
        timestamp: new Date(),
        center,
        sample_values: allValues,
        max_location: maxSample.location,
      };
    } catch (error) {
      console.error('Max area sample error:', error);
      return null;
    }
  }

  /**
   * Generate grid of points within circular area
   */
  private generateGrid(center: LatLng, radiusMeters: number): GridPoint[] {
    const points: GridPoint[] = [];

    // Convert radius to approximate degrees
    // At equator: 1 degree ≈ 111km
    // For Netherlands (lat ~52°): 1 degree lat ≈ 111km, 1 degree lng ≈ 69km
    const metersPerDegreeLat = 111000;
    const metersPerDegreeLng = 69000; // Approximate for Netherlands latitude

    const radiusLat = radiusMeters / metersPerDegreeLat;
    const radiusLng = radiusMeters / metersPerDegreeLng;

    const stepLat = this.config.grid_resolution_meters / metersPerDegreeLat;
    const stepLng = this.config.grid_resolution_meters / metersPerDegreeLng;

    // Generate grid
    for (let lat = center.lat - radiusLat; lat <= center.lat + radiusLat; lat += stepLat) {
      for (let lng = center.lng - radiusLng; lng <= center.lng + radiusLng; lng += stepLng) {
        const point: LatLng = { lat, lng };
        const distance = this.calculateDistance(center, point);

        if (distance <= radiusMeters) {
          points.push({
            coordinates: point,
            distance_from_center: distance,
            within_radius: true,
          });
        }
      }
    }

    return points;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Fetch samples in batches to avoid overwhelming the WMS server
   */
  private async fetchInBatches(
    url: string,
    layers: string,
    gridPoints: GridPoint[]
  ): Promise<PromiseSettledResult<Record<string, unknown> | null>[]> {
    const results: PromiseSettledResult<Record<string, unknown> | null>[] = [];

    // Process in batches
    for (let i = 0; i < gridPoints.length; i += this.CONCURRENT_REQUESTS) {
      const batch = gridPoints.slice(i, i + this.CONCURRENT_REQUESTS);
      const batchPromises = batch.map(point =>
        this.getFeatureInfoWithRetry(url, layers, point.coordinates)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + this.CONCURRENT_REQUESTS < gridPoints.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  /**
   * Fetch samples in batches with location tracking (for max area sampling)
   */
  private async fetchInBatchesWithLocation(
    url: string,
    layers: string,
    gridPoints: GridPoint[]
  ): Promise<PromiseSettledResult<{ data: Record<string, unknown> | null; location: LatLng }>[]> {
    const results: PromiseSettledResult<{ data: Record<string, unknown> | null; location: LatLng }>[] = [];

    // Process in batches
    for (let i = 0; i < gridPoints.length; i += this.CONCURRENT_REQUESTS) {
      const batch = gridPoints.slice(i, i + this.CONCURRENT_REQUESTS);
      const batchPromises = batch.map(point =>
        this.getFeatureInfoWithRetry(url, layers, point.coordinates).then(data => ({
          data,
          location: point.coordinates
        }))
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + this.CONCURRENT_REQUESTS < gridPoints.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  /**
   * Get feature info with retry logic and exponential backoff
   */
  private async getFeatureInfoWithRetry(
    url: string,
    layers: string,
    coordinates: LatLng,
    retryCount = 0
  ): Promise<Record<string, unknown> | null> {
    try {
      return await this.getFeatureInfo(url, layers, coordinates);
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = this.RETRY_DELAY_MS * Math.pow(2, retryCount);
        await this.delay(delayMs);
        return this.getFeatureInfoWithRetry(url, layers, coordinates, retryCount + 1);
      }
      // Max retries exceeded, return null
      console.error(`GetFeatureInfo failed after ${this.MAX_RETRIES} retries:`, error);
      return null;
    }
  }

  /**
   * Delay helper for rate limiting and backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform WMS GetFeatureInfo request
   * Throws errors on network failures (retryable), returns null on empty results (not retryable)
   */
  private async getFeatureInfo(
    url: string,
    layers: string,
    coordinates: LatLng
  ): Promise<Record<string, unknown> | null> {
    // Create a small bounding box around the point
    const bbox_size = 0.001; // ~100m at Netherlands latitude
    const bbox: [number, number, number, number] = [
      coordinates.lng - bbox_size,
      coordinates.lat - bbox_size,
      coordinates.lng + bbox_size,
      coordinates.lat + bbox_size,
    ];

    // Map dimensions (pixels)
    const width = 101;
    const height = 101;
    const x = 50; // Center pixel
    const y = 50; // Center pixel

    // Build GetFeatureInfo URL
    const params = new URLSearchParams({
      SERVICE: 'WMS',
      VERSION: '1.3.0',
      REQUEST: 'GetFeatureInfo',
      LAYERS: layers,
      QUERY_LAYERS: layers,
      BBOX: bbox.join(','),
      CRS: 'EPSG:4326',
      WIDTH: width.toString(),
      HEIGHT: height.toString(),
      I: x.toString(),
      J: y.toString(),
      INFO_FORMAT: 'application/json',
    });

    const requestUrl = `${url}?${params.toString()}`;

    // Let fetch throw on network errors (will be caught by retry logic)
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    // HTTP errors (4xx, 5xx) - don't retry, return null
    if (!response.ok) {
      console.warn(`GetFeatureInfo HTTP error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Extract features from response
    if (data.features && data.features.length > 0) {
      return data.features[0].properties || {};
    }

    // No features found - not an error, just no data at this location
    return null;
  }

  /**
   * Extract numeric value from GetFeatureInfo response
   * Tries to find the most relevant numeric field
   */
  private extractValue(data: Record<string, unknown>): number | string | null {
    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    // Priority list of common field names (lowercase)
    const numericFields = [
      'value',
      'waarde',
      'gray_index',
      'pixel_value',
      'concentration',
      'concentratie',
      'percentage',
      'score',
      'niveau',
      'level',
      'aantal',
      'count',
    ];

    // Try priority fields first
    for (const field of numericFields) {
      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes(field)) {
          const numValue = this.parseNumericValue(value);
          if (numValue !== null) {
            return numValue;
          }
        }
      }
    }

    // Try all fields for numeric values
    for (const [key, value] of Object.entries(data)) {
      // Skip ID and name fields
      if (
        key.toLowerCase().includes('id') ||
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('naam')
      ) {
        continue;
      }

      const numValue = this.parseNumericValue(value);
      if (numValue !== null) {
        return numValue;
      }
    }

    // If no numeric value found, return the first string value
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }

    return null;
  }

  /**
   * Parse value as number
   */
  private parseNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      // Remove common units and parse
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }
}

/**
 * Create a WMS sampling service instance
 */
export function createWMSSamplingService(
  config: Partial<SamplingConfig> = {}
): WMSSamplingService {
  return new WMSSamplingService(config);
}
