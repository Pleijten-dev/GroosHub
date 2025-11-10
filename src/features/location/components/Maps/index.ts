/**
 * Maps Components
 * Export all map-related components and utilities
 */

export { LocationMap } from './LocationMap';
export type { WMSFeatureInfo } from './LocationMap';
export { MapStyle, getMapStyle, DEFAULT_MAP_STYLE } from './mapStyles';
export type { TileLayerConfig } from './mapStyles';
export { WMSLayerControl } from './WMSLayerControl';
export type { WMSLayerSelection } from './WMSLayerControl';
export {
  WMS_CATEGORIES,
  getWMSCategories,
  getLayersByCategory,
  getWMSLayer,
} from './wmsLayers';
export type { WMSLayerConfig, WMSCategory } from './wmsLayers';
