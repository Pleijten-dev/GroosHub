/**
 * Material Benchmark Component
 *
 * Visual bar showing where a material's GWP falls within its category range.
 * Shows percentile position, color coding (green/yellow/red), and statistics.
 *
 * @module features/lca/components/editor
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BenchmarkStats {
  count: number;
  min_gwp: number;
  max_gwp: number;
  avg_gwp: number;
  median_gwp: number;
  percentiles: {
    p25: number;
    p75: number;
    p90: number;
  };
}

export interface MaterialBenchmarkProps {
  /** Current material's GWP value */
  gwpValue: number;
  /** Category statistics */
  stats: BenchmarkStats;
  /** Category name for display */
  categoryName?: string;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Compact mode for inline display */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    benchmark: 'Benchmark',
    categoryRange: 'Categorie bereik',
    yourMaterial: 'Uw materiaal',
    belowAverage: 'Onder gemiddelde',
    average: 'Gemiddelde',
    aboveAverage: 'Boven gemiddelde',
    excellent: 'Uitstekend',
    good: 'Goed',
    moderate: 'Matig',
    poor: 'Hoog',
    min: 'Min',
    max: 'Max',
    avg: 'Gem',
    median: 'Mediaan',
    percentile: 'percentiel',
    materials: 'materialen',
    lowerThan: 'lager dan',
    ofMaterials: 'van de materialen',
  },
  en: {
    benchmark: 'Benchmark',
    categoryRange: 'Category range',
    yourMaterial: 'Your material',
    belowAverage: 'Below average',
    average: 'Average',
    aboveAverage: 'Above average',
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    poor: 'High',
    min: 'Min',
    max: 'Max',
    avg: 'Avg',
    median: 'Median',
    percentile: 'percentile',
    materials: 'materials',
    lowerThan: 'lower than',
    ofMaterials: 'of materials',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate the percentile position of a value within a range
 */
function calculatePercentile(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const percentile = ((value - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, percentile));
}

/**
 * Determine rating based on percentile (lower GWP is better)
 */
function getRating(percentile: number): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (percentile <= 25) return 'excellent';
  if (percentile <= 50) return 'good';
  if (percentile <= 75) return 'moderate';
  return 'poor';
}

/**
 * Get color classes based on rating
 */
function getColorClasses(rating: 'excellent' | 'good' | 'moderate' | 'poor') {
  switch (rating) {
    case 'excellent':
      return {
        bg: 'bg-green-500',
        text: 'text-green-700',
        bgLight: 'bg-green-50',
        border: 'border-green-200',
      };
    case 'good':
      return {
        bg: 'bg-lime-500',
        text: 'text-lime-700',
        bgLight: 'bg-lime-50',
        border: 'border-lime-200',
      };
    case 'moderate':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        bgLight: 'bg-amber-50',
        border: 'border-amber-200',
      };
    case 'poor':
      return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        bgLight: 'bg-red-50',
        border: 'border-red-200',
      };
  }
}

/**
 * Format GWP value for display
 */
function formatGwp(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

// ============================================
// COMPONENT
// ============================================

/**
 * Material Benchmark Component
 *
 * @example
 * ```tsx
 * <MaterialBenchmark
 *   gwpValue={12.5}
 *   stats={{
 *     count: 156,
 *     min_gwp: 0.8,
 *     max_gwp: 45.2,
 *     avg_gwp: 15.5,
 *     median_gwp: 12.3,
 *     percentiles: { p25: 4.2, p75: 22.5, p90: 35.0 }
 *   }}
 *   categoryName="Insulation"
 *   locale="en"
 * />
 * ```
 */
export function MaterialBenchmark({
  gwpValue,
  stats,
  categoryName,
  locale = 'nl',
  compact = false,
  className,
}: MaterialBenchmarkProps) {
  const t = TRANSLATIONS[locale];

  // Calculate position and rating
  const percentile = calculatePercentile(gwpValue, stats.min_gwp, stats.max_gwp);
  const rating = getRating(percentile);
  const colors = getColorClasses(rating);

  // Calculate marker positions for the visual bar
  const avgPosition = calculatePercentile(stats.avg_gwp, stats.min_gwp, stats.max_gwp);
  const medianPosition = calculatePercentile(stats.median_gwp, stats.min_gwp, stats.max_gwp);
  const p25Position = calculatePercentile(stats.percentiles.p25, stats.min_gwp, stats.max_gwp);
  const p75Position = calculatePercentile(stats.percentiles.p75, stats.min_gwp, stats.max_gwp);

  // Compact version for inline display
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Mini bar */}
        <div className="relative w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-amber-400 to-red-400" />
          {/* Position marker */}
          <div
            className="absolute top-0 w-1 h-full bg-gray-900"
            style={{ left: `${percentile}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        {/* Rating badge */}
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', colors.bgLight, colors.text)}>
          {t[rating]}
        </span>
      </div>
    );
  }

  // Full version with details
  return (
    <div className={cn('p-3 rounded-lg border', colors.bgLight, colors.border, className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t.benchmark}
          </span>
          {categoryName && (
            <span className="text-xs text-gray-400">• {categoryName}</span>
          )}
        </div>
        <span className={cn('text-sm font-semibold px-2 py-0.5 rounded', colors.bg, 'text-white')}>
          {t[rating]}
        </span>
      </div>

      {/* Visual Bar */}
      <div className="relative h-6 mb-3">
        {/* Track background */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-gradient-to-r from-green-200 via-amber-200 to-red-200 rounded-full" />

        {/* Interquartile range (P25-P75) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 bg-gray-300/50 rounded"
          style={{
            left: `${p25Position}%`,
            width: `${p75Position - p25Position}%`,
          }}
        />

        {/* Average marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-500"
          style={{ left: `${avgPosition}%` }}
          title={`${t.avg}: ${formatGwp(stats.avg_gwp)}`}
        />

        {/* Median marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-700"
          style={{ left: `${medianPosition}%` }}
          title={`${t.median}: ${formatGwp(stats.median_gwp)}`}
        />

        {/* Current material marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transform -translate-x-1/2"
          style={{ left: `${percentile}%` }}
        >
          <div className={cn('w-4 h-4 rounded-full border-2 border-white shadow-md', colors.bg)} />
          {/* Value tooltip above */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap">
            <div className={cn('text-xs font-bold px-1.5 py-0.5 rounded', colors.bg, 'text-white')}>
              {formatGwp(gwpValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{formatGwp(stats.min_gwp)}</span>
        <span className="text-gray-400">{t.avg}: {formatGwp(stats.avg_gwp)}</span>
        <span>{formatGwp(stats.max_gwp)}</span>
      </div>

      {/* Summary text */}
      <div className="text-xs text-gray-600">
        <span className={cn('font-medium', colors.text)}>
          {t.lowerThan} {Math.round(100 - percentile)}% {t.ofMaterials}
        </span>
        <span className="text-gray-400 ml-1">
          ({stats.count} {t.materials})
        </span>
      </div>
    </div>
  );
}

MaterialBenchmark.displayName = 'MaterialBenchmark';

export default MaterialBenchmark;
