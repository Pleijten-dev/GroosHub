/**
 * HorizontalStackedBarChart Component
 *
 * A single horizontal bar divided into colored segments.
 * Used for showing distribution (e.g., open tasks per user).
 *
 * Features:
 * - Stacked segments with colors
 * - Hover tooltips showing user name and count
 * - Legend below the bar
 * - Responsive width
 */

'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// Types
// ============================================================================

export interface StackedBarSegment {
  /** Unique identifier */
  id: string;
  /** Display label (e.g., user name) */
  label: string;
  /** Numeric value (e.g., task count) */
  value: number;
  /** Segment color */
  color: string;
}

export interface HorizontalStackedBarChartProps {
  /** Data segments to display */
  data: StackedBarSegment[];
  /** Height of the bar in pixels */
  height?: number;
  /** Show legend below the bar */
  showLegend?: boolean;
  /** Show values in segments (if wide enough) */
  showValues?: boolean;
  /** Additional class names */
  className?: string;
  /** Called when a segment is clicked */
  onSegmentClick?: (segment: StackedBarSegment) => void;
  /** Current locale for translations */
  locale?: 'nl' | 'en';
  /** Override the total value displayed (useful when segments overlap/double-count) */
  totalOverride?: number;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    noData: 'Geen gegevens',
    total: 'Totaal',
  },
  en: {
    noData: 'No data',
    total: 'Total',
  },
};

// ============================================================================
// Default Colors
// ============================================================================

const DEFAULT_COLORS = [
  '#477638', // Primary green
  '#48806a', // Teal green
  '#8a976b', // Sage green
  '#d4af37', // Gold
  '#6b7280', // Gray
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#f59e0b', // Orange
  '#10b981', // Emerald
  '#8b5cf6', // Purple
];

// ============================================================================
// Component
// ============================================================================

export function HorizontalStackedBarChart({
  data,
  height = 32,
  showLegend = true,
  showValues = true,
  className,
  onSegmentClick,
  locale = 'nl',
  totalOverride,
}: HorizontalStackedBarChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const t = translations[locale];

  // Calculate total and percentages
  const { total, segments } = useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    if (totalValue === 0) {
      return { total: 0, segments: [] };
    }

    const segs = data
      .filter((item) => item.value > 0)
      .map((item, index) => ({
        ...item,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        percentage: (item.value / totalValue) * 100,
      }));

    return { total: totalValue, segments: segs };
  }, [data]);

  if (total === 0) {
    return (
      <div className={cn('text-center text-sm text-gray-400 py-base', className)}>
        {t.noData}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Bar */}
      <div
        className="w-full rounded-md overflow-hidden flex relative"
        style={{ height }}
      >
        {segments.map((segment, index) => {
          const isHovered = hoveredSegment === segment.id;
          const showLabel = segment.percentage >= 10 && showValues;

          return (
            <div
              key={segment.id}
              className={cn(
                'relative flex items-center justify-center transition-all duration-200 cursor-pointer',
                isHovered && 'brightness-110 scale-y-105'
              )}
              style={{
                width: `${segment.percentage}%`,
                backgroundColor: segment.color,
                zIndex: isHovered ? 10 : index,
              }}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              onClick={() => onSegmentClick?.(segment)}
              title={`${segment.label}: ${segment.value}`}
            >
              {showLabel && (
                <span className="text-xs font-medium text-white truncate px-1">
                  {segment.value}
                </span>
              )}

              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50"
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="font-medium">{segment.label}</div>
                  <div className="text-gray-300">
                    {segment.value} ({segment.percentage.toFixed(1)}%)
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-sm flex flex-wrap gap-x-base gap-y-1">
          {segments.map((segment) => (
            <button
              key={segment.id}
              type="button"
              onClick={() => onSegmentClick?.(segment)}
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={cn(
                'flex items-center gap-1 text-xs transition-opacity',
                hoveredSegment && hoveredSegment !== segment.id && 'opacity-50'
              )}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-gray-700 truncate max-w-[100px]">
                {segment.label}
              </span>
              <span className="text-gray-400">({segment.value})</span>
            </button>
          ))}

          {/* Total */}
          <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
            <span className="font-medium">{t.total}:</span>
            <span>{totalOverride ?? total}</span>
          </div>
        </div>
      )}
    </div>
  );
}

HorizontalStackedBarChart.displayName = 'HorizontalStackedBarChart';

export default HorizontalStackedBarChart;
