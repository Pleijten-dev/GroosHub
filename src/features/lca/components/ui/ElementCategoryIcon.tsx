/**
 * Element Category Icon Component
 *
 * Displays an icon representing a building element category.
 * Maps element types (wall, floor, roof, etc.) to appropriate icons.
 *
 * Uses semantic SVG icons with consistent sizing and colors.
 *
 * @module features/lca/components/ui
 */

'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { ElementCategory } from '@/features/lca/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ElementCategoryIconProps {
  /** Building element category */
  category: ElementCategory;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  colorVariant?: 'default' | 'muted' | 'accent';
  /** Whether to show label text */
  showLabel?: boolean;
  /** Locale for translations */
  locale?: 'nl' | 'en';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    exterior_wall: 'Buitenwand',
    interior_wall: 'Binnenwand',
    floor: 'Vloer',
    roof: 'Dak',
    foundation: 'Fundering',
    windows: 'Ramen',
    doors: 'Deuren',
    mep: 'Installaties',
    finishes: 'Afwerking',
    other: 'Overig',
  },
  en: {
    exterior_wall: 'Exterior Wall',
    interior_wall: 'Interior Wall',
    floor: 'Floor',
    roof: 'Roof',
    foundation: 'Foundation',
    windows: 'Windows',
    doors: 'Doors',
    mep: 'MEP',
    finishes: 'Finishes',
    other: 'Other',
  },
};

// Icon paths (simple SVG paths)
const ICON_PATHS: Record<ElementCategory, string> = {
  exterior_wall: 'M3 12h2v9H3v-9zm4 0h2v9H7v-9zm4 0h2v9h-2v-9zm4 0h2v9h-2v-9zm4 0h2v9h-2v-9z',
  interior_wall: 'M12 3v18M6 6v12m12-12v12',
  floor: 'M3 12h18M3 12l3-3m-3 3l3 3m12-3l-3-3m3 3l-3 3',
  roof: 'M3 20l9-17 9 17H3zm9-14v10',
  foundation: 'M3 19h18v2H3v-2zm0-4h18v2H3v-2zM7 11h10v2H7v-2z',
  windows: 'M3 3h18v18H3V3zm3 3v12m6-12v12m6-12v12M3 9h18M3 15h18',
  doors: 'M4 3h16v18H4V3zm12 9h2v2h-2v-2z',
  mep: 'M12 2v20M6 8l6-6 6 6m-12 8l6 6 6-6',
  finishes: 'M3 17h18v4H3v-4zM3 10h18v4H3v-4zM3 3h18v4H3V3z',
  other: 'M12 3v18m-9-9h18',
};

// Category-specific colors (design system compliant)
const CATEGORY_COLORS: Record<ElementCategory, { default: string; muted: string; accent: string }> = {
  exterior_wall: {
    default: 'text-blue-600',
    muted: 'text-blue-400',
    accent: 'text-blue-700',
  },
  interior_wall: {
    default: 'text-sky-600',
    muted: 'text-sky-400',
    accent: 'text-sky-700',
  },
  floor: {
    default: 'text-amber-600',
    muted: 'text-amber-400',
    accent: 'text-amber-700',
  },
  roof: {
    default: 'text-red-600',
    muted: 'text-red-400',
    accent: 'text-red-700',
  },
  foundation: {
    default: 'text-stone-600',
    muted: 'text-stone-400',
    accent: 'text-stone-700',
  },
  windows: {
    default: 'text-cyan-600',
    muted: 'text-cyan-400',
    accent: 'text-cyan-700',
  },
  doors: {
    default: 'text-teal-600',
    muted: 'text-teal-400',
    accent: 'text-teal-700',
  },
  mep: {
    default: 'text-purple-600',
    muted: 'text-purple-400',
    accent: 'text-purple-700',
  },
  finishes: {
    default: 'text-pink-600',
    muted: 'text-pink-400',
    accent: 'text-pink-700',
  },
  other: {
    default: 'text-gray-600',
    muted: 'text-gray-400',
    accent: 'text-gray-700',
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * Element Category Icon Component
 *
 * @example
 * ```tsx
 * <ElementCategoryIcon
 *   category="exterior_wall"
 *   size="md"
 *   colorVariant="default"
 *   showLabel={true}
 *   locale="nl"
 * />
 * ```
 */
export function ElementCategoryIcon({
  category,
  size = 'md',
  colorVariant = 'default',
  showLabel = false,
  locale = 'nl',
  className,
}: ElementCategoryIconProps) {
  const t = TRANSLATIONS[locale];
  const label = t[category];
  const iconPath = ICON_PATHS[category];
  const color = CATEGORY_COLORS[category][colorVariant];

  // ============================================
  // SIZE-BASED STYLES
  // ============================================

  const sizeStyles = {
    sm: {
      icon: 'h-4 w-4',
      text: 'text-xs',
      gap: 'gap-1',
    },
    md: {
      icon: 'h-6 w-6',
      text: 'text-sm',
      gap: 'gap-1.5',
    },
    lg: {
      icon: 'h-8 w-8',
      text: 'text-base',
      gap: 'gap-2',
    },
  };

  const currentSize = sizeStyles[size];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      className={cn(
        'inline-flex items-center',
        currentSize.gap,
        className
      )}
      aria-label={label}
    >
      {/* Icon SVG */}
      <svg
        className={cn(
          currentSize.icon,
          color,
          'flex-shrink-0'
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={iconPath} />
      </svg>

      {/* Label text */}
      {showLabel && (
        <span className={cn(currentSize.text, 'font-medium text-gray-700')}>
          {label}
        </span>
      )}
    </div>
  );
}

ElementCategoryIcon.displayName = 'ElementCategoryIcon';

export default ElementCategoryIcon;
