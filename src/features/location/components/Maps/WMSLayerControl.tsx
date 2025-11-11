"use client";

import React, { useState } from 'react';
import { getWMSCategories, getLayersByCategory, WMSLayerConfig } from './wmsLayers';

export interface WMSLayerSelection {
  categoryId: string;
  layerId: string;
  config: WMSLayerConfig;
}

export interface WMSFeatureInfo {
  layerName: string;
  properties: Record<string, unknown>;
  coordinates: [number, number];
}

interface WMSLayerControlProps {
  onLayerChange: (selection: WMSLayerSelection | null) => void;
  onOpacityChange: (opacity: number) => void;
  selectedLayer: WMSLayerSelection | null;
  opacity: number;
  currentZoom?: number;
  featureInfo?: WMSFeatureInfo | null;
  onClearFeatureInfo?: () => void;
}

/**
 * WMS Layer Control Component - Sleek pill-shaped bottom control
 * Provides UI for selecting WMS layers with compact horizontal layout
 */
export const WMSLayerControl: React.FC<WMSLayerControlProps> = ({
  onLayerChange,
  onOpacityChange,
  selectedLayer,
  opacity,
  currentZoom = 15,
  featureInfo,
  onClearFeatureInfo,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  const categories = getWMSCategories();

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);

    // Clear layer selection when category changes
    if (!categoryId) {
      onLayerChange(null);
    }
  };

  const handleLayerChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const layerId = e.target.value;

    if (!layerId || !selectedCategory) {
      onLayerChange(null);
      return;
    }

    const layers = getLayersByCategory(selectedCategory);
    if (layers && layers[layerId]) {
      onLayerChange({
        categoryId: selectedCategory,
        layerId,
        config: layers[layerId],
      });
    }
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onOpacityChange(parseFloat(e.target.value));
  };

  const selectedCategoryLayers = selectedCategory ? getLayersByCategory(selectedCategory) : null;

  // Generate legend URL for WMS layer
  const getLegendUrl = (layer: WMSLayerConfig): string => {
    const params = new URLSearchParams({
      service: 'WMS',
      version: '1.3.0',
      request: 'GetLegendGraphic',
      format: 'image/png',
      layer: layer.layers,
      style: '',
    });
    return `${layer.url}?${params.toString()}`;
  };

  // Process feature properties with field mappings
  const processFeatureProperties = (
    properties: Record<string, unknown>,
    fieldMappings?: { [fieldName: string]: import('./wmsLayers').FieldMapping }
  ): Array<{ key: string; displayName: string; value: string }> => {
    if (!fieldMappings) {
      // No mappings: show all fields with auto-formatted names
      return Object.entries(properties).map(([key, value]) => ({
        key,
        displayName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value: String(value),
      }));
    }

    // With mappings: only show fields that have mappings
    return Object.entries(properties)
      .filter(([key]) => fieldMappings[key]) // Only include fields with mappings
      .map(([key, rawValue]) => {
        const mapping = fieldMappings[key];
        let value = String(rawValue);

        // Apply value mappings (for categorical data)
        if (mapping.valueMappings && rawValue !== null && rawValue !== undefined) {
          const mappedValue = mapping.valueMappings[String(rawValue)];
          if (mappedValue) {
            value = mappedValue;
          }
        }
        // Apply numeric formatting (decimals + unit)
        else if (typeof rawValue === 'number' || !isNaN(Number(rawValue))) {
          const numValue = Number(rawValue);
          if (!isNaN(numValue)) {
            // Round to specified decimals
            const roundedValue =
              mapping.decimals !== undefined
                ? numValue.toFixed(mapping.decimals)
                : String(numValue);
            // Append unit if specified
            value = mapping.unit ? `${roundedValue} ${mapping.unit}` : roundedValue;
          }
        }

        return {
          key,
          displayName: mapping.displayName,
          value,
        };
      });
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      {/* Main Control Pill */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Category:</span>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors min-w-[140px]"
          >
            <option value="">Select...</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        {selectedCategory && <div className="w-px h-6 bg-gray-300" />}

        {/* Layer Dropdown */}
        {selectedCategory && selectedCategoryLayers && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Layer:</span>
            <select
              value={selectedLayer?.layerId || ''}
              onChange={handleLayerChange}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors min-w-[180px]"
            >
              <option value="">Select...</option>
              {Object.entries(selectedCategoryLayers).map(([layerId, config]) => (
                <option key={layerId} value={layerId}>
                  {config.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Divider */}
        {selectedLayer && <div className="w-px h-6 bg-gray-300" />}

        {/* Opacity Slider */}
        {selectedLayer && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Opacity:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={handleOpacityChange}
                className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-xs font-medium text-gray-700 w-8 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Divider */}
        {selectedLayer && <div className="w-px h-6 bg-gray-300" />}

        {/* Zoom Level Indicator */}
        {selectedLayer && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              <path d="M11 8v6M8 11h6" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-medium text-gray-700">{currentZoom}</span>
          </div>
        )}

        {/* Divider */}
        {selectedLayer && <div className="w-px h-6 bg-gray-300" />}

        {/* Info Button */}
        {selectedLayer && (
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Layer Information"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Clear Button */}
        {selectedLayer && (
          <>
            <div className="w-px h-6 bg-gray-300" />
            <button
              onClick={() => {
                setSelectedCategory('');
                onLayerChange(null);
                setShowInfo(false);
              }}
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
              title="Clear Layer"
            >
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Info Popup */}
      {showInfo && selectedLayer && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-96 max-w-[90vw]">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-sm font-semibold text-gray-900">
                {selectedLayer.config.title}
              </h4>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              {selectedLayer.config.description}
            </p>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-2">Legend:</p>
              <img
                src={getLegendUrl(selectedLayer.config)}
                alt="Layer legend"
                className="max-w-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>

            {selectedLayer.config.recommendedZoom && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Recommended zoom:</span>{' '}
                  {selectedLayer.config.recommendedZoom}
                </p>
              </div>
            )}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Feature Info Display - Shows data from clicked location */}
      {featureInfo && selectedLayer && (
        <div className="absolute bottom-full left-0 mb-3 w-96 max-w-[90vw]">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  Location Data
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {featureInfo.coordinates[0].toFixed(6)}, {featureInfo.coordinates[1].toFixed(6)}
                </p>
              </div>
              <button
                onClick={onClearFeatureInfo}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="text-xs text-gray-600">
              {(() => {
                const processedProperties = processFeatureProperties(
                  featureInfo.properties,
                  selectedLayer.config.fieldMappings
                );
                return processedProperties.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {processedProperties.map((prop) => (
                      <div key={prop.key} className="border-b border-gray-100 pb-2 last:border-0">
                        <div className="font-medium text-gray-700 mb-0.5">{prop.displayName}</div>
                        <div className="text-gray-900 pl-2 break-words">
                          {prop.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-center">
                    <p className="text-amber-800 font-medium mb-1">No Data Available</p>
                    <p className="text-xs text-amber-700">
                      This WMS layer may not support feature queries, or there&apos;s no data at this location.
                      Try clicking on a different area or selecting a different layer.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Arrow pointing down to the left */}
          <div className="absolute top-full left-8 -mt-px">
            <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};
