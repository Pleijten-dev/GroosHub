/**
 * Phase Breakdown Mini Chart Component
 *
 * A compact horizontal stacked bar chart showing LCA phase impacts.
 * Displays phases: A1-A3, A4, A5, B4, C (combined C1-C4), and D.
 *
 * Handles positive and negative values (D phase typically negative).
 * Color-coded segments with optional tooltips.
 *
 * @module features/lca/components/charts
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface PhaseBreakdownMiniProps {
  /** LCA phase values in kg CO₂-eq */
  phases: {
    a1a3: number;    // Production
    a4: number;      // Transport to site
    a5: number;      // Construction-installation
    b4: number;      // Replacement
    c: number;       // End-of-life (C1-C4 combined)
    d: number;       // Benefits beyond system boundary
  };
  /** Total GWP for percentage calculation */
  totalGwp: number;
  /** Whether to show value labels on segments */
  showLabels?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

interface PhaseSegment {
  key: string;
  label: string;
  value: number;
  color: string;
  percentage: number;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    phases: {
      a1a3: 'A1-A3: Productie',
      a4: 'A4: Transport',
      a5: 'A5: Bouw',
      b4: 'B4: Vervanging',
      c: 'C: Einde levensduur',
      d: 'D: Hergebruik voordelen',
    },
    total: 'Totaal',
  },
  en: {
    phases: {
      a1a3: 'A1-A3: Production',
      a4: 'A4: Transport',
      a5: 'A5: Construction',
      b4: 'B4: Replacement',
      c: 'C: End-of-life',
      d: 'D: Benefits',
    },
    total: 'Total',
  },
};

// Design system compliant colors for each phase
const PHASE_COLORS = {
  a1a3: {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-blue-50',
    hex: '#3b82f6', // For calculations
  },
  a4: {
    bg: 'bg-cyan-500',
    border: 'border-cyan-600',
    text: 'text-cyan-50',
    hex: '#06b6d4',
  },
  a5: {
    bg: 'bg-teal-500',
    border: 'border-teal-600',
    text: 'text-teal-50',
    hex: '#14b8a6',
  },
  b4: {
    bg: 'bg-orange-500',
    border: 'border-orange-600',
    text: 'text-orange-50',
    hex: '#f97316',
  },
  c: {
    bg: 'bg-red-500',
    border: 'border-red-600',
    text: 'text-red-50',
    hex: '#ef4444',
  },
  d: {
    bg: 'bg-green-500',
    border: 'border-green-600',
    text: 'text-green-50',
    hex: '#10b981',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Formats a number for display with appropriate precision
 *
 * @param value - The number to format
 * @returns Formatted string
 */
function formatValue(value: number): string {
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(2);
  }
  return value.toFixed(2);
}

/**
 * Calculates percentage width for each phase segment
 *
 * @param phases - Phase values
 * @param totalGwp - Total GWP (absolute value)
 * @returns Array of phase segments with percentages
 */
function calculateSegments(
  phases: PhaseBreakdownMiniProps['phases'],
  totalGwp: number,
  locale: 'nl' | 'en'
): PhaseSegment[] {
  const t = TRANSLATIONS[locale];
  const phaseKeys: Array<keyof typeof phases> = ['a1a3', 'a4', 'a5', 'b4', 'c', 'd'];

  // Calculate absolute total for percentage calculation (exclude D if negative)
  const absoluteTotal = Math.abs(totalGwp) || 1; // Avoid division by zero

  return phaseKeys
    .map((key) => {
      const value = phases[key];
      const percentage = (Math.abs(value) / absoluteTotal) * 100;

      return {
        key,
        label: t.phases[key],
        value,
        color: key,
        percentage,
      };
    })
    .filter((segment) => segment.percentage > 0.5); // Filter out very small segments
}

// ============================================
// COMPONENT
// ============================================

/**
 * Phase Breakdown Mini Chart Component
 *
 * @example
 * ```tsx
 * <PhaseBreakdownMini
 *   phases={{
 *     a1a3: 1500,
 *     a4: 50,
 *     a5: 100,
 *     b4: 200,
 *     c: 500,
 *     d: -200
 *   }}
 *   totalGwp={2150}
 *   showLabels={true}
 *   locale="nl"
 * />
 * ```
 */
export function PhaseBreakdownMini({
  phases,
  totalGwp,
  showLabels = false,
  height = 40,
  locale = 'nl',
  className,
}: PhaseBreakdownMiniProps) {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const segments = calculateSegments(phases, totalGwp, locale);
  const t = TRANSLATIONS[locale];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn('w-full', className)}>
      {/* Chart container */}
      <div
        className="relative w-full overflow-hidden rounded-base border border-gray-200 bg-gray-50"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`${t.total}: ${formatValue(totalGwp)} kg CO₂-eq`}
      >
        <div className="flex h-full w-full">
          {segments.map((segment) => {
            const phaseColor = PHASE_COLORS[segment.key as keyof typeof PHASE_COLORS];
            const isHovered = hoveredSegment === segment.key;
            const isNegative = segment.value < 0;

            return (
              <div
                key={segment.key}
                className={cn(
                  'relative flex items-center justify-center transition-all duration-200',
                  phaseColor.bg,
                  isHovered && 'opacity-90 ring-2 ring-inset ring-white',
                  isNegative && 'opacity-75'
                )}
                style={{ width: `${segment.percentage}%` }}
                onMouseEnter={() => setHoveredSegment(segment.key)}
                onMouseLeave={() => setHoveredSegment(null)}
                title={`${segment.label}: ${formatValue(segment.value)} kg CO₂-eq (${segment.percentage.toFixed(1)}%)`}
              >
                {/* Label (only show if segment is wide enough) */}
                {showLabels && segment.percentage > 10 && (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      phaseColor.text,
                      'pointer-events-none select-none'
                    )}
                  >
                    {segment.key.toUpperCase()}
                  </span>
                )}

                {/* Negative indicator for D phase */}
                {isNegative && segment.percentage > 5 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="h-0.5 w-3/4 bg-white opacity-50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend (optional, below chart) */}
      {hoveredSegment && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <div
            className={cn(
              'h-3 w-3 rounded-sm',
              PHASE_COLORS[hoveredSegment as keyof typeof PHASE_COLORS].bg
            )}
          />
          <span className="font-medium">
            {segments.find((s) => s.key === hoveredSegment)?.label}
          </span>
          <span className="text-gray-500">
            {formatValue(phases[hoveredSegment as keyof typeof phases])} kg CO₂-eq
          </span>
        </div>
      )}
    </div>
  );
}

PhaseBreakdownMini.displayName = 'PhaseBreakdownMini';

export default PhaseBreakdownMini;
