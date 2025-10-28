import React from 'react';
import type { ResidentialData } from './types';

interface ResidentialSummaryProps {
  data: ResidentialData;
  locale?: 'nl' | 'en';
  onViewAll?: () => void;
}

/**
 * Format distance in meters to human-readable string
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format price to currency
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * ResidentialSummary - Compact summary of residential data
 * Displays below the main data table for quick overview
 */
export const ResidentialSummary: React.FC<ResidentialSummaryProps> = ({
  data,
  locale = 'nl',
  onViewAll,
}) => {
  if (!data.hasData) {
    return null;
  }

  // Get the 5 closest reference houses
  const closestReferences = data.referenceHouses.slice(0, 5);

  // Get most common house type
  const houseTypeEntries = Object.entries(data.marketStatistics.houseTypeDistribution);
  const mostCommonType = houseTypeEntries.length > 0
    ? houseTypeEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
    : locale === 'nl' ? 'Onbekend' : 'Unknown';

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {locale === 'nl' ? '🏡 Woningmarkt Overzicht' : '🏡 Housing Market Overview'}
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {locale === 'nl' ? 'Bekijk alle →' : 'View all →'}
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Reference Price Mean */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
          <h4 className="text-sm font-medium text-indigo-900 mb-2">
            {locale === 'nl' ? 'Gemiddelde Referentieprijs' : 'Average Reference Price'}
          </h4>
          <div className="space-y-1">
            <p className="text-xl font-bold text-indigo-700">
              {formatPrice(data.referencePriceMean.average)}
            </p>
            <p className="text-xs text-indigo-800">
              {formatPrice(data.referencePriceMean.min)} - {formatPrice(data.referencePriceMean.max)}
            </p>
          </div>
        </div>

        {/* Card 2: Reference Houses */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <h4 className="text-sm font-medium text-purple-900 mb-2">
            {locale === 'nl' ? 'Vergelijkbare Woningen' : 'Comparable Properties'}
          </h4>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-purple-700">
              {data.marketStatistics.totalReferences}
            </p>
            <p className="text-xs text-purple-800">
              {locale === 'nl' ? 'Gemiddelde afstand:' : 'Average distance:'}{' '}
              {formatDistance(data.marketStatistics.averageDistance)}
            </p>
          </div>
        </div>

        {/* Card 3: Market Activity */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-200">
          <h4 className="text-sm font-medium text-pink-900 mb-2">
            {locale === 'nl' ? 'Marktactiviteit' : 'Market Activity'}
          </h4>
          <div className="space-y-1">
            <p className="text-lg font-bold text-pink-700">{mostCommonType}</p>
            <p className="text-xs text-pink-800">
              {locale === 'nl' ? 'Meest voorkomend type' : 'Most common type'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {locale === 'nl' ? '📊 Markt Statistieken' : '📊 Market Statistics'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{locale === 'nl' ? 'Binnen 1 km' : 'Within 1 km'}</p>
            <p className="font-semibold text-gray-900">
              {data.marketStatistics.withinRadius.oneKm}{' '}
              {locale === 'nl' ? 'woningen' : 'properties'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{locale === 'nl' ? 'Binnen 5 km' : 'Within 5 km'}</p>
            <p className="font-semibold text-gray-900">
              {data.marketStatistics.withinRadius.fiveKm}{' '}
              {locale === 'nl' ? 'woningen' : 'properties'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">
              {locale === 'nl' ? 'Gem. Oppervlakte' : 'Avg. Surface'}
            </p>
            <p className="font-semibold text-gray-900">
              {data.marketStatistics.averageSurfaceArea} m²
            </p>
          </div>
          <div>
            <p className="text-gray-600">
              {locale === 'nl' ? 'Gem. Bouwjaar' : 'Avg. Build Year'}
            </p>
            <p className="font-semibold text-gray-900">
              {data.marketStatistics.averageBuildYear}
            </p>
          </div>
        </div>
      </div>

      {/* Closest References */}
      {closestReferences.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {locale === 'nl'
              ? '🏠 5 Meest Vergelijkbare Woningen'
              : '🏠 5 Most Comparable Properties'}
          </h4>
          <ul className="space-y-3">
            {closestReferences.map((ref, idx) => {
              const price = parseInt(ref.IndexedTransactionPrice.split('-')[0], 10);
              const avgPrice = price + parseInt(ref.IndexedTransactionPrice.split('-')[1], 10);
              const formattedPrice = formatPrice(avgPrice / 2);

              return (
                <li key={`${ref.PostCode}-${ref.HouseNumber}-${idx}`} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <span className="text-gray-400 font-mono text-sm mt-0.5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {ref.Street} {ref.HouseNumber}
                          {ref.HouseAddition}
                        </p>
                        <p className="text-xs text-gray-600">
                          {ref.PostCode} {ref.City}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-700 text-sm">
                          {formattedPrice}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>📍 {formatDistance(ref.Distance)}</span>
                      <span>🏠 {ref.HouseType}</span>
                      <span>📅 {ref.BuildYear}</span>
                      <span>📐 {ref.InnerSurfaceArea} m²</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
