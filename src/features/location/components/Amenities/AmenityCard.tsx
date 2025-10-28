import React from 'react';
import type { AmenitySearchResult } from './types';
import { distanceCalculator } from '../../data/sources/google-places/distance-calculator';

interface AmenityCardProps {
  result: AmenitySearchResult;
  locale?: 'nl' | 'en';
}

/**
 * AmenityCard - Displays amenity data for a single category
 */
export const AmenityCard: React.FC<AmenityCardProps> = ({ result, locale = 'nl' }) => {
  const { category, places, searchStrategy, error } = result;

  // Calculate statistics
  const hasPlaces = places.length > 0;
  const closestPlace = places[0]; // Already sorted by distance
  const averageDistance = hasPlaces
    ? distanceCalculator.calculateAverageDistance(places)
    : 0;
  const withinWalkingDistance = places.filter(p => (p.distance || 0) <= 1000).length;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow duration-200"
      style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {category.displayName}
            </h3>
            <p className="text-xs text-gray-500">
              {places.length} {locale === 'nl' ? 'gevonden' : 'found'}
            </p>
          </div>
        </div>

        {/* Priority badge */}
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            category.priority === 'essential' ? 'bg-red-100 text-red-700' :
            category.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            category.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}
        >
          {category.priority === 'essential' ? (locale === 'nl' ? 'Essentieel' : 'Essential') :
           category.priority === 'high' ? (locale === 'nl' ? 'Hoog' : 'High') :
           category.priority === 'medium' ? (locale === 'nl' ? 'Gemiddeld' : 'Medium') :
           (locale === 'nl' ? 'Laag' : 'Low')}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
          <p className="text-xs text-red-700">
            ⚠️ {locale === 'nl' ? 'Fout bij ophalen data' : 'Error fetching data'}
          </p>
        </div>
      )}

      {/* Statistics */}
      {hasPlaces ? (
        <div className="space-y-2">
          {/* Closest place */}
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-600 mb-1">
              {locale === 'nl' ? 'Dichtsbijzijnde' : 'Closest'}:
            </p>
            <p className="font-medium text-sm text-gray-900 truncate">
              {closestPlace.name}
            </p>
            <p className="text-xs text-gray-600">
              📍 {distanceCalculator.formatDistance(closestPlace.distance || 0)}
              {closestPlace.rating && (
                <span className="ml-2">
                  ⭐ {closestPlace.rating.toFixed(1)}
                </span>
              )}
            </p>
            {closestPlace.openingHours?.openNow !== undefined && (
              <p className="text-xs mt-1">
                <span className={closestPlace.openingHours.openNow ? 'text-green-600' : 'text-red-600'}>
                  {closestPlace.openingHours.openNow
                    ? (locale === 'nl' ? '🟢 Nu open' : '🟢 Open now')
                    : (locale === 'nl' ? '🔴 Gesloten' : '🔴 Closed')
                  }
                </span>
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 rounded p-2">
              <p className="text-gray-600">{locale === 'nl' ? 'Gem. afstand' : 'Avg. distance'}</p>
              <p className="font-semibold text-blue-700">
                {distanceCalculator.formatDistance(averageDistance)}
              </p>
            </div>
            <div className="bg-green-50 rounded p-2">
              <p className="text-gray-600">{locale === 'nl' ? 'Loopafstand' : 'Walking dist.'}</p>
              <p className="font-semibold text-green-700">
                {withinWalkingDistance} {locale === 'nl' ? 'binnen 1km' : 'within 1km'}
              </p>
            </div>
          </div>

          {/* Show next 2-3 places */}
          {places.length > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">
                {locale === 'nl' ? 'Andere opties:' : 'Other options:'}
              </p>
              <ul className="space-y-1">
                {places.slice(1, 4).map((place, idx) => (
                  <li key={place.placeId} className="text-xs text-gray-700 truncate">
                    {idx + 2}. {place.name} - {distanceCalculator.formatDistance(place.distance || 0)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            {locale === 'nl' ? 'Geen resultaten gevonden' : 'No results found'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {locale === 'nl' ? 'Binnen' : 'Within'} {category.defaultRadius}m
          </p>
        </div>
      )}

      {/* Search strategy indicator */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {searchStrategy === 'text' ? '🔍 ' : '📍 '}
          {searchStrategy === 'text'
            ? (locale === 'nl' ? 'Tekst zoeken' : 'Text search')
            : (locale === 'nl' ? 'Nabij zoeken' : 'Nearby search')
          }
        </p>
      </div>
    </div>
  );
};
