"use client";

import React from 'react';

export interface CacheIndicatorProps {
  fromCache: boolean;
  locale: 'nl' | 'en';
}

/**
 * Displays a badge indicating when data was loaded from cache
 */
export const CacheIndicator: React.FC<CacheIndicatorProps> = ({
  fromCache,
  locale,
}) => {
  if (!fromCache) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-xs px-sm py-xs bg-green-50 border border-green-200 rounded text-xs text-green-800">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span className="font-medium">
        {locale === 'nl'
          ? 'Geladen uit cache (geen API aanroep)'
          : 'Loaded from cache (no API call)'}
      </span>
    </div>
  );
};
