/**
 * WMS Grading Score Card Component
 * Displays WMS layer grading results with scores, loading states, and detailed breakdowns
 */

'use client';

import React from 'react';
import type { WMSGradingData } from '@/features/location/types/wms-grading';
import { getCriticalLayers, getLayerConfig } from '@/features/location/data/sources/wmsGradingConfig';

export interface WMSGradingScoreCardProps {
  /** WMS grading data (if available) */
  gradingData?: WMSGradingData | null;
  /** Is grading currently in progress? */
  isGrading?: boolean;
  /** Grading progress (0-100) */
  progress?: number;
  /** Number of layers completed */
  layersCompleted?: number;
  /** Total layers to grade */
  layersTotal?: number;
  /** Locale for translations */
  locale: 'nl' | 'en';
  /** Compact mode for smaller display */
  compact?: boolean;
}

export function WMSGradingScoreCard({
  gradingData,
  isGrading = false,
  progress = 0,
  layersCompleted = 0,
  layersTotal = 25,
  locale,
  compact = false
}: WMSGradingScoreCardProps) {
  const t = {
    nl: {
      title: 'WMS Kaartlagen Analyse',
      loading: 'Kaartlagen analyseren...',
      completed: 'Analyse voltooid',
      completedWithErrors: 'Analyse voltooid met waarschuwingen',
      notStarted: 'Nog niet geanalyseerd',
      criticalLayers: 'Kritieke lagen',
      allLayers: 'Alle lagen',
      layersComplete: 'lagen voltooid',
      startGrading: 'Start analyse',
      viewDetails: 'Bekijk details',
      airQuality: 'Luchtkwaliteit',
      noise: 'Geluid',
      nature: 'Groen',
      climate: 'Klimaat',
      value: 'Waarde',
      maxValue: 'Max waarde',
      avgValue: 'Gem. waarde',
      pointValue: 'Punt waarde',
      noData: 'Geen data',
      failedLayers: 'Mislukte lagen',
      layersFailed: 'lagen mislukt',
      retryFailed: 'Probeer opnieuw',
    },
    en: {
      title: 'WMS Map Layer Analysis',
      loading: 'Analyzing map layers...',
      completed: 'Analysis complete',
      completedWithErrors: 'Analysis completed with warnings',
      notStarted: 'Not yet analyzed',
      criticalLayers: 'Critical layers',
      allLayers: 'All layers',
      layersComplete: 'layers complete',
      startGrading: 'Start analysis',
      viewDetails: 'View details',
      airQuality: 'Air Quality',
      noise: 'Noise',
      nature: 'Green Space',
      climate: 'Climate',
      value: 'Value',
      maxValue: 'Max value',
      avgValue: 'Avg value',
      pointValue: 'Point value',
      noData: 'No data',
      failedLayers: 'Failed layers',
      layersFailed: 'layers failed',
      retryFailed: 'Retry failed',
    }
  }[locale];

  // Loading state
  if (isGrading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm">
        <div className="flex items-center gap-sm mb-base">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          <h3 className="text-lg font-semibold text-gray-900">{t.loading}</h3>
        </div>

        {/* Progress bar */}
        <div className="mb-sm">
          <div className="flex justify-between text-sm text-gray-600 mb-xs">
            <span>{layersCompleted} / {layersTotal} {t.layersComplete}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {locale === 'nl'
            ? 'Dit kan enkele minuten duren. U kunt ondertussen de andere tabs bekijken.'
            : 'This may take a few minutes. You can explore other tabs in the meantime.'}
        </p>
      </div>
    );
  }

  // No data state
  if (!gradingData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-sm">{t.title}</h3>
        <p className="text-sm text-gray-500 mb-base">{t.notStarted}</p>
        <button className="px-base py-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm font-medium">
          {t.startGrading}
        </button>
      </div>
    );
  }

  // Get critical layer results
  const criticalLayerIds = getCriticalLayers().map(l => l.layerId);
  const criticalResults = Object.values(gradingData.layers).filter(layer =>
    criticalLayerIds.includes(layer.layer_id)
  );

  // Calculate summary statistics
  const totalLayers = Object.keys(gradingData.layers).length;
  const successfulLayers = Object.values(gradingData.layers).filter(
    layer => layer.point_sample || layer.average_area_sample || layer.max_area_sample
  ).length;
  const failedLayers = Object.values(gradingData.layers).filter(
    layer => !layer.point_sample && !layer.average_area_sample && !layer.max_area_sample && layer.errors && layer.errors.length > 0
  );

  // Group critical layers by category
  const criticalByCategory: Record<string, typeof criticalResults> = {};
  criticalResults.forEach(layer => {
    const config = getLayerConfig(layer.layer_id);
    if (config) {
      const category = config.category;
      if (!criticalByCategory[category]) {
        criticalByCategory[category] = [];
      }
      criticalByCategory[category].push(layer);
    }
  });

  // Compact mode - just show summary
  if (compact) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-sm shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{t.title}</h4>
            <p className="text-xs text-gray-500">
              {successfulLayers} / {totalLayers} {t.layersComplete}
            </p>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg font-bold text-green-700">
                {Math.round((successfulLayers / totalLayers) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full mode - show detailed results
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 p-base shadow-sm space-y-base">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
          <p className="text-sm text-gray-500">
            {successfulLayers} / {totalLayers} {t.layersComplete}
          </p>
        </div>
        <div className="flex items-center gap-xs">
          {failedLayers.length > 0 ? (
            <>
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-amber-700">{t.completedWithErrors}</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-700">{t.completed}</span>
            </>
          )}
        </div>
      </div>

      {/* Critical Layers by Category */}
      <div className="space-y-sm">
        <h4 className="text-sm font-semibold text-gray-700">{t.criticalLayers}</h4>

        {Object.entries(criticalByCategory).map(([category, layers]) => (
          <div key={category} className="border border-gray-200 rounded-md p-sm">
            <h5 className="text-sm font-medium text-gray-700 mb-xs capitalize">
              {category === 'airQuality' ? t.airQuality :
               category === 'noise' ? t.noise :
               category === 'nature' ? t.nature :
               category === 'climate' ? t.climate :
               category}
            </h5>

            <div className="space-y-xs">
              {layers.map(layer => {
                const config = getLayerConfig(layer.layer_id);
                const maxSample = layer.max_area_sample;
                const avgSample = layer.average_area_sample;
                const pointSample = layer.point_sample;

                const displayValue = maxSample?.value ?? avgSample?.value ?? pointSample?.value ?? t.noData;
                const unit = config?.unit || '';

                return (
                  <div key={layer.layer_id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 flex-1">{layer.layer_name}</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue}
                      {unit && typeof displayValue === 'number' ? ` ${unit}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Failed Layers */}
      {failedLayers.length > 0 && (
        <div className="space-y-sm">
          <div className="flex items-center gap-xs">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h4 className="text-sm font-semibold text-amber-700">{t.failedLayers}</h4>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-sm space-y-xs">
            {failedLayers.map(layer => (
              <div key={layer.layer_id} className="text-xs">
                <div className="font-medium text-amber-900">{layer.layer_name}</div>
                {layer.errors && layer.errors.length > 0 && (
                  <div className="text-amber-700 mt-xs">
                    {layer.errors.map((error, idx) => (
                      <div key={idx}>• {error}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className={`grid ${failedLayers.length > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-sm pt-sm border-t border-gray-200`}>
        <div>
          <div className="text-xs text-gray-500">{t.allLayers}</div>
          <div className="text-lg font-bold text-gray-900">{totalLayers}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{t.completed}</div>
          <div className="text-lg font-bold text-green-600">{successfulLayers}</div>
        </div>
        {failedLayers.length > 0 && (
          <div>
            <div className="text-xs text-gray-500">{t.layersFailed}</div>
            <div className="text-lg font-bold text-amber-600">{failedLayers.length}</div>
          </div>
        )}
      </div>

      {/* View Details Button */}
      <button className="w-full px-base py-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-sm font-medium">
        {t.viewDetails}
      </button>
    </div>
  );
}

export default WMSGradingScoreCard;
