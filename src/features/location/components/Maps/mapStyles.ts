/**
 * Map Style Configurations
 * Defines various tile layer styles for Leaflet maps
 */

export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom?: number;
  minZoom?: number;
  id?: string;
}

/**
 * Available map styles organized by category
 */
export const MapStyle = {
  /**
   * Data visualization focused styles (light backgrounds, muted colors)
   */
  DATAVIZ: {
    /**
     * Light, minimal style optimized for data overlays
     * Uses CartoDB Positron - excellent for data visualization
     */
    LIGHT: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      id: 'dataviz-light',
    } as TileLayerConfig,

    /**
     * Dark style for light-colored data overlays
     */
    DARK: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      id: 'dataviz-dark',
    } as TileLayerConfig,
  },

  /**
   * Standard map styles
   */
  STANDARD: {
    /**
     * OpenStreetMap default style
     */
    OSM: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      id: 'standard-osm',
    } as TileLayerConfig,

    /**
     * Minimal style with no labels
     */
    NO_LABELS: {
      url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      id: 'standard-no-labels',
    } as TileLayerConfig,
  },

  /**
   * Terrain and topographic styles
   */
  TERRAIN: {
    /**
     * Topographic style showing terrain features
     */
    TOPO: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
      id: 'terrain-topo',
    } as TileLayerConfig,
  },
} as const;

/**
 * Get a map style by path (e.g., "DATAVIZ.LIGHT")
 */
export function getMapStyle(path: string): TileLayerConfig {
  const parts = path.split('.');
  let current: any = MapStyle;

  for (const part of parts) {
    current = current[part];
    if (!current) {
      throw new Error(`Map style not found: ${path}`);
    }
  }

  return current as TileLayerConfig;
}

/**
 * Default map style
 */
export const DEFAULT_MAP_STYLE = MapStyle.DATAVIZ.LIGHT;
