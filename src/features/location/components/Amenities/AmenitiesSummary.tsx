import React from 'react';
import type { AmenityMultiCategoryResponse } from './types';
import { distanceCalculator } from '../../data/sources/google-places/distance-calculator';

interface AmenitiesSummaryProps {
  data: AmenityMultiCategoryResponse;
  locale?: 'nl' | 'en';
  onViewAll?: () => void;
}

/**
 * AmenitiesSummary - Compact summary of amenities data
 * Displays below the main data table for quick overview
 */
export const AmenitiesSummary: React.FC<AmenitiesSummaryProps> = ({
  data,
  locale = 'nl',
  onViewAll,
}) => {
  // Get essential services
  const essentialServices = data.results.filter(
    r => r.category.priority === 'essential' && r.places.length > 0
  );

  // Get closest places across all categories
  const allPlacesWithDistance = data.results
    .flatMap(r => r.places)
    .filter(p => p.distance !== undefined)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    .slice(0, 5);

  // Calculate overall statistics
  const totalPlaces = data.results.reduce((sum, r) => sum + r.places.length, 0);
  const categoriesWithData = data.results.filter(r => r.places.length > 0).length;
  const essentialWithinWalkingDistance = essentialServices.filter(
    r => r.places[0]?.distance && r.places[0].distance <= 1000
  ).length;

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {locale === 'nl' ? '🏪 Voorzieningen Overzicht' : '🏪 Amenities Overview'}
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
        {/* Card 1: Overview */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {locale === 'nl' ? 'Algemeen' : 'Overview'}
          </h4>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-700">{totalPlaces}</p>
            <p className="text-xs text-blue-800">
              {locale === 'nl' ? 'voorzieningen' : 'amenities'} {locale === 'nl' ? 'in' : 'in'}{' '}
              {categoriesWithData} {locale === 'nl' ? 'categorieën' : 'categories'}
            </p>
          </div>
        </div>

        {/* Card 2: Essential Services */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            {locale === 'nl' ? 'Essentiële Diensten' : 'Essential Services'}
          </h4>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-700">
              {essentialWithinWalkingDistance}/{essentialServices.length}
            </p>
            <p className="text-xs text-green-800">
              {locale === 'nl' ? 'binnen loopafstand (1km)' : 'within walking distance (1km)'}
            </p>
          </div>
        </div>

        {/* Card 3: Quota Status */}
        <div className={`rounded-lg p-4 border ${
          data.quotaStatus && data.quotaStatus.percentUsed >= 100
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
            : data.quotaStatus && data.quotaStatus.percentUsed >= 80
            ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200'
            : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
        }`}>
          <h4 className={`text-sm font-medium mb-2 ${
            data.quotaStatus && data.quotaStatus.percentUsed >= 100 ? 'text-red-900' :
            data.quotaStatus && data.quotaStatus.percentUsed >= 80 ? 'text-yellow-900' :
            'text-purple-900'
          }`}>
            {locale === 'nl' ? 'API Quota' : 'API Quota'}
          </h4>
          <div className="space-y-1">
            {data.quotaStatus ? (
              <>
                <p className={`text-2xl font-bold ${
                  data.quotaStatus.percentUsed >= 100 ? 'text-red-700' :
                  data.quotaStatus.percentUsed >= 80 ? 'text-yellow-700' :
                  'text-purple-700'
                }`}>
                  {data.quotaStatus.percentUsed.toFixed(0)}%
                </p>
                <p className={`text-xs ${
                  data.quotaStatus.percentUsed >= 100 ? 'text-red-800' :
                  data.quotaStatus.percentUsed >= 80 ? 'text-yellow-800' :
                  'text-purple-800'
                }`}>
                  {data.quotaStatus.textSearchRemaining} {locale === 'nl' ? 'resterende zoekopdrachten' : 'searches remaining'}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-purple-700">✓</p>
                <p className="text-xs text-purple-800">
                  {locale === 'nl' ? 'Beschikbaar' : 'Available'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Essential Services List */}
      {essentialServices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {locale === 'nl' ? '📍 Essentiële Diensten Dichtbij' : '📍 Essential Services Nearby'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {essentialServices.map((service) => (
              <div key={service.category.id} className="flex items-center gap-2 text-sm">
                <span className="text-lg">{service.category.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {service.category.displayName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {service.places[0].name} -{' '}
                    {distanceCalculator.formatDistance(service.places[0].distance || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closest Places */}
      {allPlacesWithDistance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {locale === 'nl' ? '🎯 5 Dichtsbijzijnde Voorzieningen' : '🎯 5 Closest Amenities'}
          </h4>
          <ul className="space-y-2">
            {allPlacesWithDistance.map((place, idx) => (
              <li key={place.placeId} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-mono">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{place.name}</p>
                  <p className="text-xs text-gray-600">
                    {distanceCalculator.formatDistance(place.distance || 0)}
                    {place.rating && ` • ⭐ ${place.rating.toFixed(1)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
