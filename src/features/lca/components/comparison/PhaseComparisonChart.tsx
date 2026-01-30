/**
 * Phase Comparison Chart Component
 *
 * Stacked bar chart showing the distribution of LCA phases across projects.
 * Uses Recharts for visualization.
 *
 * @module features/lca/components/comparison
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/shared/utils/cn';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface PhaseData {
  id: string;
  name: string;
  a1_a3: number;
  a4: number;
  a5: number;
  b4: number;
  c: number;
  d: number;
  total: number;
  isCompliant: boolean;
}

export interface PhaseComparisonChartProps {
  /** Projects with phase data */
  data: PhaseData[];
  /** Chart type: stacked or grouped */
  chartType?: 'stacked' | 'grouped';
  /** Show values in tons or kg */
  unit?: 'tons' | 'kg';
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Chart height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    production: 'Productie (A1-A3)',
    transport: 'Transport (A4)',
    construction: 'Bouw (A5)',
    replacement: 'Vervanging (B4)',
    endOfLife: 'Einde levensduur (C)',
    benefits: 'Voordelen (D)',
    total: 'Totaal',
    emissions: 'CO₂-eq uitstoot',
  },
  en: {
    production: 'Production (A1-A3)',
    transport: 'Transport (A4)',
    construction: 'Construction (A5)',
    replacement: 'Replacement (B4)',
    endOfLife: 'End of Life (C)',
    benefits: 'Benefits (D)',
    total: 'Total',
    emissions: 'CO₂-eq emissions',
  },
};

// Phase colors - consistent with other LCA visualizations
const PHASE_COLORS = {
  a1_a3: '#3B82F6', // Blue - Production
  a4: '#8B5CF6',    // Purple - Transport
  a5: '#F59E0B',    // Amber - Construction
  b4: '#10B981',    // Green - Replacement
  c: '#EF4444',     // Red - End of Life
  d: '#06B6D4',     // Cyan - Benefits (often negative)
};

// ============================================
// HELPER COMPONENTS
// ============================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  locale: 'nl' | 'en';
  unit: 'tons' | 'kg';
}

function CustomTooltip({ active, payload, label, locale, unit }: CustomTooltipProps) {
  const t = TRANSLATIONS[locale];

  if (!active || !payload || !payload.length) return null;

  const formatValue = (value: number) => {
    if (unit === 'tons') {
      return `${(value / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} t`;
    }
    return `${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kg`;
  };

  const phaseLabels: Record<string, string> = {
    a1_a3: t.production,
    a4: t.transport,
    a5: t.construction,
    b4: t.replacement,
    c: t.endOfLife,
    d: t.benefits,
  };

  // Filter out zero values and sort by absolute value
  const sortedPayload = [...payload]
    .filter((entry) => entry.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const total = sortedPayload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
      <p className="font-semibold text-gray-900 mb-2 border-b border-gray-100 pb-1">
        {label}
      </p>
      <div className="space-y-1">
        {sortedPayload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">
                {phaseLabels[entry.dataKey] || entry.name}
              </span>
            </div>
            <span className={cn(
              'text-sm font-medium',
              entry.value < 0 ? 'text-green-600' : 'text-gray-900'
            )}>
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
        <span className="text-sm font-semibold text-gray-600">{t.total}</span>
        <span className="text-sm font-bold text-gray-900">{formatValue(total)}</span>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export function PhaseComparisonChart({
  data,
  chartType = 'stacked',
  unit = 'tons',
  locale = 'nl',
  height = 400,
  className,
}: PhaseComparisonChartProps) {
  const t = TRANSLATIONS[locale];

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200', className)} style={{ height }}>
        <p className="text-gray-500">{locale === 'nl' ? 'Geen data beschikbaar' : 'No data available'}</p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((project) => ({
    name: project.name,
    a1_a3: project.a1_a3,
    a4: project.a4,
    a5: project.a5,
    b4: project.b4,
    c: project.c,
    d: project.d,
    isCompliant: project.isCompliant,
  }));

  // Format Y-axis ticks
  const formatYAxis = (value: number) => {
    if (unit === 'tons') {
      return `${(value / 1000).toFixed(0)}t`;
    }
    return `${(value / 1000).toFixed(0)}k`;
  };

  // Find best performer (lowest total)
  const bestIndex = data.reduce(
    (best, project, index) =>
      project.total < data[best].total ? index : best,
    0
  );

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 justify-center">
        {Object.entries(PHASE_COLORS).map(([key, color]) => {
          const labels: Record<string, string> = {
            a1_a3: t.production,
            a4: t.transport,
            a5: t.construction,
            b4: t.replacement,
            c: t.endOfLife,
            d: t.benefits,
          };
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600">{labels[key]}</span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: '#6B7280', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: t.emissions,
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#9CA3AF', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip locale={locale} unit={unit} />} />

          {/* Stacked bars for each phase */}
          <Bar
            dataKey="a1_a3"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.a1_a3}
            radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-a1a3-${index}`}
                fill={PHASE_COLORS.a1_a3}
                stroke={index === bestIndex ? '#059669' : undefined}
                strokeWidth={index === bestIndex ? 2 : 0}
              />
            ))}
          </Bar>
          <Bar
            dataKey="a4"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.a4}
          />
          <Bar
            dataKey="a5"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.a5}
          />
          <Bar
            dataKey="b4"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.b4}
          />
          <Bar
            dataKey="c"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.c}
          />
          <Bar
            dataKey="d"
            stackId={chartType === 'stacked' ? 'stack' : undefined}
            fill={PHASE_COLORS.d}
            radius={chartType === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Best performer indicator */}
      <div className="mt-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          {locale === 'nl' ? 'Beste prestatie' : 'Best performer'}: <strong>{data[bestIndex].name}</strong>
        </span>
      </div>
    </div>
  );
}

PhaseComparisonChart.displayName = 'PhaseComparisonChart';

export default PhaseComparisonChart;
