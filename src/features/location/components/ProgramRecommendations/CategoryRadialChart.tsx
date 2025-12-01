/**
 * CategoryRadialChart Component
 * Wrapper around RadialProgressBar for displaying m2 distribution by category
 */

'use client';

import React from 'react';
import RadialProgressBar from '@/shared/components/common/RadialProgressBar/RadialProgressBar';

export interface CategoryData {
  name: string;
  m2: number;
  percentage: number;
}

export interface CategoryRadialChartProps {
  categories: CategoryData[];
  totalM2: number;
  width?: number;
  height?: number;
  locale?: 'nl' | 'en';
  showPercentage?: boolean;
}

// Green color palette for categories
const CATEGORY_COLORS = [
  '#477638', // Primary green
  '#5a8f47', // Lighter green
  '#6ea856', // Even lighter
  '#82c165', // Light green
  '#96da74', // Very light green
  '#86a67d', // Secondary green (from design system)
  '#a3b896', // Muted green
  '#c0cab0', // Very muted green
];

export function CategoryRadialChart({
  categories,
  totalM2,
  width = 400,
  height = 350,
  locale = 'nl',
  showPercentage = true,
}: CategoryRadialChartProps) {
  // Transform category data for RadialProgressBar
  const chartData = categories.map((cat, index) => ({
    name: cat.name,
    value: cat.m2,
    maxValue: totalM2,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));

  const translations = {
    nl: {
      total: 'Totaal',
      noData: 'Geen gegevens beschikbaar',
    },
    en: {
      total: 'Total',
      noData: 'No data available',
    },
  };

  const t = translations[locale];

  if (categories.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400"
        style={{ width, height }}
      >
        <p className="text-sm">{t.noData}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <RadialProgressBar
        data={chartData}
        width={width}
        height={height}
        showLabels={true}
        showPercentage={showPercentage}
        strokeWidth={25}
      />

      {/* Total m2 label */}
      <div className="text-center mt-4">
        <p className="text-xs text-gray-600">{t.total}</p>
        <p className="text-lg font-semibold text-gray-900">{totalM2} m²</p>
      </div>
    </div>
  );
}

CategoryRadialChart.displayName = 'CategoryRadialChart';

export default CategoryRadialChart;
