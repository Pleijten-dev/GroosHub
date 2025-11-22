/**
 * ExpandableAmenityList Component
 * Shows an arrow button that expands to reveal all amenities in a category
 */

'use client';

import React, { useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface AmenityOption {
  id: string;
  name: string;
  area_min_m2: number;
  area_max_m2: number;
  category: string;
}

export interface ExpandableAmenityListProps {
  amenities: AmenityOption[];
  locale?: 'nl' | 'en';
  className?: string;
}

export function ExpandableAmenityList({
  amenities,
  locale = 'nl',
  className,
}: ExpandableAmenityListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const translations = {
    nl: {
      viewAll: 'Bekijk alle opties',
      hide: 'Verberg opties',
      sizeRange: 'Grootte',
    },
    en: {
      viewAll: 'View all options',
      hide: 'Hide options',
      sizeRange: 'Size range',
    },
  };

  const t = translations[locale];

  if (amenities.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Arrow Button */}
      <button
        className="group cursor-pointer bg-transparent border-none p-2 m-0 focus:outline-none transition-transform duration-200 hover:scale-110"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? t.hide : t.viewAll}
      >
        <svg
          width="48"
          height="24"
          viewBox="0 0 48 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(
            'transition-all duration-200',
            isExpanded && 'rotate-90'
          )}
        >
          <path
            d="M16 8 L24 16 L16 24"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-700 group-hover:text-gray-900"
          />
        </svg>
      </button>

      {/* Expanded List */}
      {isExpanded && (
        <div className="w-full mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {t.viewAll}
          </h4>
          <div className="space-y-2">
            {amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="p-3 bg-white rounded border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {amenity.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {t.sizeRange}: {amenity.area_min_m2}m² - {amenity.area_max_m2}m²
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

ExpandableAmenityList.displayName = 'ExpandableAmenityList';

export default ExpandableAmenityList;
