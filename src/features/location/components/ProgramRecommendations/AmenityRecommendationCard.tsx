/**
 * AmenityRecommendationCard Component
 * Displays a single amenity/space recommendation
 */

'use client';

import React from 'react';
import type { SpaceRecommendation } from '../../types/program-recommendations';

export interface AmenityRecommendationCardProps {
  space: SpaceRecommendation;
  locale?: 'nl' | 'en';
}

export function AmenityRecommendationCard({
  space,
  locale = 'nl',
}: AmenityRecommendationCardProps) {
  const translations = {
    nl: {
      area: 'Oppervlak',
      rationale: 'Rationale',
    },
    en: {
      area: 'Area',
      rationale: 'Rationale',
    },
  };

  const t = translations[locale];

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow duration-200 flex flex-col h-full overflow-hidden">
      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">
            {space.amenity_name}
          </h3>

          {/* Area banner */}
          <div className="bg-gray-50 rounded p-2 mb-3">
            <p className="text-xs text-gray-600 mb-1">{t.area}</p>
            <p className="text-xs font-semibold text-gray-900">{space.size_m2} m²</p>
          </div>
        </div>

        {/* Rationale */}
        <div className="mt-auto">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">{t.rationale}</h4>
          <p className="text-xs text-gray-600 leading-relaxed">{space.rationale}</p>
        </div>
      </div>
    </div>
  );
}

AmenityRecommendationCard.displayName = 'AmenityRecommendationCard';

export default AmenityRecommendationCard;
