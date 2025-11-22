/**
 * CategoryRadialChart Component
 * Wrapper around RadialChart for displaying m2 distribution by category
 */

'use client';

import React from 'react';
import RadialChart from '@/shared/components/common/RadialChart/RadialChart';

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
}: CategoryRadialChartProps) {
  // Transform category data for RadialChart
  const chartData = categories.map((cat, index) => ({
    name: cat.name,
    value: cat.m2,
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
      <RadialChart
        data={chartData}
        width={width}
        height={height}
        isSimple={false}
        showLabels={true}
      />

      {/* Total m2 label */}
      <div className="text-center mt-2">
        <p className="text-xs text-gray-600">{t.total}</p>
        <p className="text-lg font-semibold text-gray-900">{totalM2} m²</p>
      </div>
    </div>
  );
}

CategoryRadialChart.displayName = 'CategoryRadialChart';

export default CategoryRadialChart;
