/**
 * HousingRecommendationCard Component
 * Displays a single housing typology recommendation
 */

'use client';

import React from 'react';
import type { HousingRecommendation } from '../../types/program-recommendations';

export interface HousingRecommendationCardProps {
  housing: HousingRecommendation;
  locale?: 'nl' | 'en';
}

export function HousingRecommendationCard({
  housing,
  locale = 'nl',
}: HousingRecommendationCardProps) {
  const translations = {
    nl: {
      quantity: 'Aantal',
      units: 'eenheden',
      totalArea: 'Totaal Oppervlak',
      rationale: 'Rationale',
    },
    en: {
      quantity: 'Quantity',
      units: 'units',
      totalArea: 'Total Area',
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
            {housing.typology_name}
          </h3>

          {/* Stats banners */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">{t.quantity}</p>
              <p className="text-xs font-semibold text-gray-900">
                {housing.quantity} {t.units}
              </p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-600 mb-1">{t.totalArea}</p>
              <p className="text-xs font-semibold text-gray-900">{housing.total_m2} m²</p>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div className="mt-auto">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">{t.rationale}</h4>
          <p className="text-xs text-gray-600 leading-relaxed">{housing.rationale}</p>
        </div>
      </div>
    </div>
  );
}

HousingRecommendationCard.displayName = 'HousingRecommendationCard';

export default HousingRecommendationCard;
