/**
 * WMS Layer Score Card Component
 * Displays grading results for a specific WMS layer
 * Shows point sample, average area, and max area values
 */

'use client';

import React from 'react';
import type { WMSGradingData } from '@/features/location/types/wms-grading';
import type { WMSLayerSelection } from './WMSLayerControl';
import { getLayerConfig } from '@/features/location/data/sources/wmsGradingConfig';

export interface WMSLayerScoreCardProps {
  /** Currently selected WMS layer */
  selectedLayer: WMSLayerSelection | null;
  /** Complete WMS grading data */
  gradingData: WMSGradingData | null;
  /** Is grading currently in progress? */
  isGrading?: boolean;
  /** Locale for translations */
  locale: 'nl' | 'en';
}

export function WMSLayerScoreCard({
  selectedLayer,
  gradingData,
  isGrading = false,
  locale
}: WMSLayerScoreCardProps) {
  const t = {
    nl: {
      noLayerSelected: 'Geen kaartlaag geselecteerd',
      selectLayer: 'Selecteer een kaartlaag om de score te zien',
      analyzing: 'Analyseren...',
      noData: 'Geen data beschikbaar',
      notAnalyzed: 'Nog niet geanalyseerd',
      pointSample: 'Puntwaarde',
      avgSample: 'Gemiddelde waarde',
      maxSample: 'Maximum waarde',
      samples: 'metingen',
      radius: 'straal',
      atLocation: 'op deze locatie',
      inArea: 'in gebied',
    },
    en: {
      noLayerSelected: 'No map layer selected',
      selectLayer: 'Select a map layer to view its score',
      analyzing: 'Analyzing...',
      noData: 'No data available',
      notAnalyzed: 'Not yet analyzed',
      pointSample: 'Point value',
      avgSample: 'Average value',
      maxSample: 'Maximum value',
      samples: 'samples',
      radius: 'radius',
      atLocation: 'at this location',
      inArea: 'in area',
    }
  }[locale];

  // No layer selected
  if (!selectedLayer) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm">
        <div className="text-center py-base">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm text-gray-500 font-medium">{t.noLayerSelected}</p>
          <p className="text-xs text-gray-400 mt-xs">{t.selectLayer}</p>
        </div>
      </div>
    );
  }

  // Grading in progress
  if (isGrading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm">
        <div className="flex items-center gap-sm">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{selectedLayer.config.name}</h4>
            <p className="text-xs text-gray-500">{t.analyzing}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get layer grading data
  const layerGrading = gradingData?.layers?.[selectedLayer.layerId];
  const layerConfig = getLayerConfig(selectedLayer.layerId);

  // No grading data available
  if (!layerGrading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm">
        <h4 className="text-sm font-semibold text-gray-900 mb-xs">{selectedLayer.config.name}</h4>
        <div className="flex items-center gap-xs text-amber-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs font-medium">{t.notAnalyzed}</p>
        </div>
      </div>
    );
  }

  const unit = layerConfig?.unit || '';
  const hasData = !!(layerGrading.point_sample || layerGrading.average_area_sample || layerGrading.max_area_sample);

  // Render grading results
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-base py-sm border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">{selectedLayer.config.name}</h4>
        <p className="text-xs text-gray-600">{selectedLayer.categoryId}</p>
      </div>

      {/* Results */}
      {hasData ? (
        <div className="p-base space-y-sm">
          {/* Point Sample */}
          {layerGrading.point_sample && (
            <div className="flex items-center justify-between py-xs border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-xs">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <span className="text-xs text-gray-600">{t.pointSample}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {typeof layerGrading.point_sample.value === 'number'
                    ? layerGrading.point_sample.value.toFixed(2)
                    : layerGrading.point_sample.value}
                </span>
                {unit && <span className="text-xs text-gray-500 ml-xs">{unit}</span>}
                <p className="text-xs text-gray-400">{t.atLocation}</p>
              </div>
            </div>
          )}

          {/* Average Area Sample */}
          {layerGrading.average_area_sample && (
            <div className="flex items-center justify-between py-xs border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-xs">
                <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-xs text-gray-600">{t.avgSample}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {layerGrading.average_area_sample.value.toFixed(2)}
                </span>
                {unit && <span className="text-xs text-gray-500 ml-xs">{unit}</span>}
                <p className="text-xs text-gray-400">
                  {layerGrading.average_area_sample.sample_count} {t.samples}
                  {' • '}
                  {layerGrading.average_area_sample.radius_meters}m {t.radius}
                </p>
              </div>
            </div>
          )}

          {/* Max Area Sample */}
          {layerGrading.max_area_sample && (
            <div className="flex items-center justify-between py-xs border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-xs">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-xs text-gray-600">{t.maxSample}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900 font-mono">
                  {layerGrading.max_area_sample.value.toFixed(2)}
                </span>
                {unit && <span className="text-xs text-gray-500 ml-xs">{unit}</span>}
                <p className="text-xs text-gray-400">
                  {layerGrading.max_area_sample.sample_count} {t.samples}
                  {' • '}
                  {layerGrading.max_area_sample.radius_meters}m {t.radius}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-base text-center">
          <p className="text-xs text-gray-500">{t.noData}</p>
        </div>
      )}
    </div>
  );
}

export default WMSLayerScoreCard;
