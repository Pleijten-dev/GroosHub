/**
 * Material Alternatives Component
 *
 * Displays a list of lower-carbon alternative materials in the same category.
 * Allows users to quickly switch to a better-performing material.
 *
 * @module features/lca/components/editor
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { Material } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AlternativeMaterial {
  id: string;
  name_nl: string | null;
  name_en: string | null;
  name_de: string | null;
  gwp_a1_a3: number;
  quality_rating: number;
  declared_unit: string;
  density: number | null;
  subcategory: string | null;
  is_generic: boolean;
}

export interface MaterialAlternativesProps {
  /** List of alternative materials */
  alternatives: AlternativeMaterial[];
  /** Current material's GWP for comparison */
  currentGwp: number;
  /** Callback when an alternative is selected */
  onSelectAlternative: (material: Material) => void;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Show loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'Alternatieven met lagere CO₂',
    noAlternatives: 'Geen alternatieven beschikbaar',
    savings: 'besparing',
    useThis: 'Gebruik dit',
    loading: 'Alternatieven laden...',
    generic: 'Generiek',
    specific: 'Specifiek',
    quality: 'Kwaliteit',
    perUnit: 'per',
  },
  en: {
    title: 'Lower carbon alternatives',
    noAlternatives: 'No alternatives available',
    savings: 'savings',
    useThis: 'Use this',
    loading: 'Loading alternatives...',
    generic: 'Generic',
    specific: 'Specific',
    quality: 'Quality',
    perUnit: 'per',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get material name based on locale
 */
function getMaterialName(material: AlternativeMaterial, locale: 'nl' | 'en'): string {
  if (locale === 'nl' && material.name_nl) return material.name_nl;
  if (locale === 'en' && material.name_en) return material.name_en;
  return material.name_de || material.name_nl || material.name_en || 'Unknown';
}

/**
 * Format GWP value for display
 */
function formatGwp(value: number): string {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * Calculate percentage savings
 */
function calculateSavings(current: number, alternative: number): number {
  if (current === 0) return 0;
  return Math.round(((current - alternative) / current) * 100);
}

/**
 * Get quality stars display
 */
function getQualityStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// ============================================
// COMPONENT
// ============================================

/**
 * Material Alternatives Component
 *
 * @example
 * ```tsx
 * <MaterialAlternatives
 *   alternatives={alternativesList}
 *   currentGwp={12.5}
 *   onSelectAlternative={(material) => handleMaterialChange(material)}
 *   locale="en"
 * />
 * ```
 */
export function MaterialAlternatives({
  alternatives,
  currentGwp,
  onSelectAlternative,
  locale = 'nl',
  isLoading = false,
  className,
}: MaterialAlternativesProps) {
  const t = TRANSLATIONS[locale];

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('p-3 rounded-lg border border-gray-200 bg-gray-50', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t.loading}</span>
        </div>
      </div>
    );
  }

  // No alternatives
  if (alternatives.length === 0) {
    return (
      <div className={cn('p-3 rounded-lg border border-gray-200 bg-gray-50', className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">{t.noAlternatives}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-3 py-2 bg-green-50 border-b border-green-100">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span className="text-sm font-medium text-green-800">{t.title}</span>
          <span className="text-xs text-green-600">({alternatives.length})</span>
        </div>
      </div>

      {/* Alternatives list */}
      <ul className="divide-y divide-gray-100">
        {alternatives.map((alt) => {
          const savings = calculateSavings(currentGwp, alt.gwp_a1_a3);
          const name = getMaterialName(alt, locale);

          return (
            <li
              key={alt.id}
              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => onSelectAlternative(alt as unknown as Material)}
            >
              <div className="flex-1 min-w-0">
                {/* Material name */}
                <div className="font-medium text-gray-900 truncate text-sm" title={name}>
                  {name}
                </div>
                {/* Details row */}
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className={alt.is_generic ? 'text-gray-400' : 'text-blue-500'}>
                    {alt.is_generic ? t.generic : t.specific}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-amber-500" title={`${t.quality}: ${alt.quality_rating}/5`}>
                    {getQualityStars(alt.quality_rating)}
                  </span>
                </div>
              </div>

              {/* GWP and savings */}
              <div className="flex items-center gap-3">
                {/* GWP value */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatGwp(alt.gwp_a1_a3)}
                  </div>
                  <div className="text-xs text-gray-400">kg CO₂-eq</div>
                </div>

                {/* Savings badge */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="text-xs font-semibold">-{savings}%</span>
                </div>

                {/* Use button (visible on hover) */}
                <button
                  type="button"
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    'bg-primary text-white',
                    'opacity-0 group-hover:opacity-100 transition-opacity'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAlternative(alt as unknown as Material);
                  }}
                >
                  {t.useThis}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

MaterialAlternatives.displayName = 'MaterialAlternatives';

export default MaterialAlternatives;
