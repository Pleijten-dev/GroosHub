/**
 * Geographic Level Selector Component
 * Shared component for selecting and comparing geographic levels across data pages
 */

'use client';

import React from 'react';

export type GeographicLevel = 'national' | 'municipality' | 'district' | 'neighborhood';

export interface GeographicLevelSelectorProps {
  selectedLevel: GeographicLevel;
  comparisonLevel: GeographicLevel;
  availableLevels: GeographicLevel[];
  onSelectedLevelChange: (level: GeographicLevel) => void;
  onComparisonLevelChange: (level: GeographicLevel) => void;
  levelLabels: Record<GeographicLevel, { nl: string; en: string }>;
  locale: 'nl' | 'en';
}

export const GeographicLevelSelector: React.FC<GeographicLevelSelectorProps> = ({
  selectedLevel,
  comparisonLevel,
  availableLevels,
  onSelectedLevelChange,
  onComparisonLevelChange,
  levelLabels,
  locale
}) => {
  return (
    <div className="flex-shrink-0 flex justify-center items-center gap-6 p-6 border-b border-gray-200">
      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600">
          {locale === 'nl' ? 'Gebied' : 'Area'}
        </label>
        <select
          value={selectedLevel}
          onChange={(e) => onSelectedLevelChange(e.target.value as GeographicLevel)}
          className="px-4 py-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur-md text-sm min-w-[180px] shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        >
          {availableLevels.map(level => (
            <option key={level} value={level}>
              {levelLabels[level][locale]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-2 text-gray-600">
          {locale === 'nl' ? 'Vergelijken met' : 'Compare to'}
        </label>
        <select
          value={comparisonLevel}
          onChange={(e) => onComparisonLevelChange(e.target.value as GeographicLevel)}
          className="px-4 py-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur-md text-sm min-w-[180px] shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        >
          {availableLevels.map(level => (
            <option key={level} value={level}>
              {levelLabels[level][locale]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
