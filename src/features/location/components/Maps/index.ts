/**
 * Maps Components
 * Export all map-related components and utilities
 */

export { LocationMap } from './LocationMap';
export type { WMSFeatureInfo } from './WMSLayerControl';
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
export { WMSGradingScoreCard } from './WMSGradingScoreCard';
export type { WMSGradingScoreCardProps } from './WMSGradingScoreCard';
export { WMSLayerScoreCard } from './WMSLayerScoreCard';
export type { WMSLayerScoreCardProps } from './WMSLayerScoreCard';
