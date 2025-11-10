"use client";

import React, { useState } from 'react';
import { getWMSCategories, getLayersByCategory, WMSLayerConfig } from './wmsLayers';
import styles from './WMSLayerControl.module.css';

export interface WMSLayerSelection {
  categoryId: string;
  layerId: string;
  config: WMSLayerConfig;
}

interface WMSLayerControlProps {
  onLayerChange: (selection: WMSLayerSelection | null) => void;
  onOpacityChange: (opacity: number) => void;
  selectedLayer: WMSLayerSelection | null;
  opacity: number;
}

/**
 * WMS Layer Control Component
 * Provides UI for selecting WMS layers and adjusting opacity
 */
export const WMSLayerControl: React.FC<WMSLayerControlProps> = ({
  onLayerChange,
  onOpacityChange,
  selectedLayer,
  opacity,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  const handleClearLayer = (): void => {
    setSelectedCategory('');
    onLayerChange(null);
  };

  const selectedCategoryLayers = selectedCategory ? getLayersByCategory(selectedCategory) : null;

  return (
    <div className={styles.controlContainer}>
      <div className={styles.controlHeader}>
        <h3 className={styles.controlTitle}>Map Layers</h3>
        <button
          className={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse layer control' : 'Expand layer control'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.controlContent}>
          {/* Category Selection */}
          <div className={styles.selectGroup}>
            <label htmlFor="category-select" className={styles.label}>
              Category
            </label>
            <select
              id="category-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className={styles.select}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layer Selection */}
          {selectedCategory && selectedCategoryLayers && (
            <div className={styles.selectGroup}>
              <label htmlFor="layer-select" className={styles.label}>
                Layer
              </label>
              <select
                id="layer-select"
                value={selectedLayer?.layerId || ''}
                onChange={handleLayerChange}
                className={styles.select}
              >
                <option value="">Select a layer</option>
                {Object.entries(selectedCategoryLayers).map(([layerId, config]) => (
                  <option key={layerId} value={layerId}>
                    {config.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Opacity Control */}
          {selectedLayer && (
            <>
              <div className={styles.opacityGroup}>
                <label htmlFor="opacity-slider" className={styles.label}>
                  Opacity: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  id="opacity-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={handleOpacityChange}
                  className={styles.slider}
                />
              </div>

              {/* Clear Button */}
              <button onClick={handleClearLayer} className={styles.clearButton}>
                Clear Layer
              </button>
            </>
          )}

          {/* Layer Info */}
          {selectedLayer && (
            <div className={styles.layerInfo}>
              <h4 className={styles.layerInfoTitle}>{selectedLayer.config.title}</h4>
              <p className={styles.layerInfoDescription}>{selectedLayer.config.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
