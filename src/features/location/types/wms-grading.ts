/**
 * WMS Grading System Types
 * Defines types for point, average area, and maximum area sampling of WMS layers
 */

/**
 * Coordinates structure (lat/lng)
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Point sample result - single value at exact location
 */
export interface PointSample {
  /** Sampled value (can be numeric or categorical) */
  value: number | string | null;
  /** Raw data from GetFeatureInfo response */
  raw_data: Record<string, unknown>;
  /** When the sample was taken */
  timestamp: Date;
  /** Coordinates where sample was taken */
  coordinates: LatLng;
}

/**
 * Area sample result - aggregated values over circular area
 */
export interface AreaSample {
  /** Aggregated value (average or maximum) */
  value: number | null;
  /** Radius of sampling area in meters */
  radius_meters: number;
  /** Number of samples taken in the area */
  sample_count: number;
  /** Grid resolution used (distance between sample points in meters) */
  grid_resolution_meters: number;
  /** When the sample was taken */
  timestamp: Date;
  /** Center coordinates of sampling area */
  center: LatLng;
  /** All sample values collected (for debugging/analysis) */
  sample_values?: number[];
}

/**
 * Maximum area sample result - includes location of maximum value
 */
export interface MaxAreaSample extends AreaSample {
  /** Coordinates where the maximum value was found */
  max_location: LatLng;
}

/**
 * Complete grading data for a single WMS layer
 */
export interface WMSLayerGrading {
  /** WMS layer identifier */
  layer_id: string;
  /** Display name of the layer */
  layer_name: string;
  /** WMS layer name (technical identifier) */
  wms_layer_name: string;

  /** Point sample at exact location */
  point_sample: PointSample | null;

  /** Average value over circular area */
  average_area_sample: AreaSample | null;

  /** Maximum value within circular area */
  max_area_sample: MaxAreaSample | null;

  /** Any errors encountered during sampling */
  errors?: string[];
}

/**
 * Complete WMS grading data for all layers at a location
 */
export interface WMSGradingData {
  /** Location where grading was performed */
  location: LatLng;
  /** Address of the location */
  address: string;

  /** Grading results for each WMS layer */
  layers: Record<string, WMSLayerGrading>;

  /** When the grading was performed */
  graded_at: Date;

  /** Configuration used for area sampling */
  sampling_config: SamplingConfig;

  /** Overall statistics */
  statistics: {
    total_layers: number;
    successful_layers: number;
    failed_layers: number;
    total_samples_taken: number;
  };
}

/**
 * Configuration for area sampling
 */
export interface SamplingConfig {
  /** Radius for area sampling in meters (default: 500) */
  area_radius_meters: number;

  /** Grid resolution - distance between sample points in meters (default: 50) */
  grid_resolution_meters: number;

  /** Maximum number of samples to take per layer (safety limit) */
  max_samples_per_layer: number;
}

/**
 * WMS GetFeatureInfo request parameters
 */
export interface GetFeatureInfoParams {
  /** WMS service base URL */
  url: string;
  /** WMS layer name(s) */
  layers: string;
  /** Map bounding box [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number];
  /** Map width in pixels */
  width: number;
  /** Map height in pixels */
  height: number;
  /** Click X coordinate in pixels */
  x: number;
  /** Click Y coordinate in pixels */
  y: number;
  /** Coordinate reference system (default: EPSG:4326) */
  srs?: string;
  /** Response format (default: application/json) */
  info_format?: string;
}

/**
 * Grid point for area sampling
 */
export interface GridPoint {
  /** Coordinates of the grid point */
  coordinates: LatLng;
  /** Distance from center in meters */
  distance_from_center: number;
  /** Whether this point is within the sampling circle */
  within_radius: boolean;
}

/**
 * API request/response types
 */

export interface WMSGradingRequest {
  /** Location to grade */
  latitude: number;
  longitude: number;
  /** Address of the location */
  address: string;
  /** Array of WMS layer IDs to grade (empty = all layers) */
  layer_ids?: string[];
  /** Sampling configuration (optional, uses defaults if not provided) */
  sampling_config?: Partial<SamplingConfig>;
}

export interface WMSGradingResponse {
  success: boolean;
  data?: WMSGradingData;
  error?: string;
}

/**
 * Default sampling configuration
 */
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  area_radius_meters: 500, // 500m radius (covers ~0.78 km²)
  grid_resolution_meters: 50, // Sample every 50 meters
  max_samples_per_layer: 400, // Safety limit: 20x20 grid
};
