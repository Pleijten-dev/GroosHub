import React from 'react';
import type { AmenitySearchResult } from './types';
import { distanceCalculator } from '../../data/sources/google-places/distance-calculator';
import { calculateAmenityScore } from '../../data/scoring/amenityScoring';

interface AmenityDetailModalProps {
  result: AmenitySearchResult;
  isOpen: boolean;
  onClose: () => void;
  locale?: 'nl' | 'en';
}

/**
 * Helper to get score color and styling
 */
function getScoreColor(score: number): string {
  if (score >= 0.67) return 'bg-green-100 text-green-800 border-green-200';
  if (score >= 0.33) return 'bg-green-50 text-green-700 border-green-100';
  if (score > 0) return 'bg-yellow-50 text-yellow-700 border-yellow-100';
  if (score === 0) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (score > -0.33) return 'bg-orange-50 text-orange-700 border-orange-100';
  if (score > -0.67) return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

/**
 * Format score for display
 */
function formatScore(score: number): string {
  return score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}

/**
 * AmenityDetailModal - Shows all amenities for a category in a modal
 */
export const AmenityDetailModal: React.FC<AmenityDetailModalProps> = ({
  result,
  isOpen,
  onClose,
  locale = 'nl'
}) => {
  const { category, places } = result;
  const amenityScore = React.useMemo(() => calculateAmenityScore(result), [result]);

  // Helper to find matching place types between our search criteria and what Google assigned
  const getMatchingPlaceTypes = (place: any): string[] => {
    const categoryTypes = category.placeTypes.map((t: string) => t.toLowerCase());
    const placeTypes = (place.types || []).map((t: string) => t.toLowerCase());
    return placeTypes.filter((type: string) => categoryTypes.includes(type));
  };

  // Don't render if not open
  if (!isOpen) return null;

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-6 border-b border-gray-200"
            style={{ borderLeftColor: category.color, borderLeftWidth: '6px' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{category.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {category.displayName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {places.length} {locale === 'nl' ? 'voorzieningen gevonden' : 'amenities found'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scores Summary */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              {/* Count Score */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">
                  {locale === 'nl' ? 'Aantal Score' : 'Count Score'}
                </p>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded border ${getScoreColor(amenityScore.countScore)}`}>
                  {formatScore(amenityScore.countScore)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {amenityScore.totalCount} {locale === 'nl' ? 'binnen' : 'within'} {
                    amenityScore.countRadius >= 1000
                      ? `${(amenityScore.countRadius / 1000).toFixed(1).replace('.0', '')}km`
                      : `${amenityScore.countRadius}m`
                  }
                </p>
              </div>

              {/* Proximity Bonus */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">
                  {locale === 'nl' ? 'Nabijheid Bonus' : 'Proximity Bonus'}
                </p>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded border ${
                  amenityScore.proximityBonus === 1
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                }`}>
                  {amenityScore.proximityBonus === 1 ? '+1' : '0'}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {amenityScore.proximityCount} {locale === 'nl' ? 'binnen 250m' : 'within 250m'}
                </p>
              </div>

              {/* Combined Score */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">
                  {locale === 'nl' ? 'Gecombineerd' : 'Combined'}
                </p>
                <span className="inline-block px-3 py-1 text-sm font-semibold text-purple-700">
                  {(amenityScore.combinedScore * 100).toFixed(0)}%
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  {locale === 'nl' ? 'Totale score' : 'Total score'}
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable list */}
          <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-6">
            {places.length > 0 ? (
              <div className="space-y-3">
                {places.map((place, index) => (
                  <div
                    key={place.placeId}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Place info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {place.name}
                          </h3>
                        </div>

                        {place.formattedAddress && (
                          <p className="text-sm text-gray-600 mb-2">
                            📍 {place.formattedAddress}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                          {/* Distance */}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              {locale === 'nl' ? 'Afstand:' : 'Distance:'}
                            </span>
                            <span className={
                              place.distance && place.distance <= 250
                                ? 'text-green-600 font-semibold'
                                : place.distance && place.distance <= amenityScore.countRadius
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }>
                              {distanceCalculator.formatDistance(place.distance || 0)}
                            </span>
                            {place.distance && place.distance <= 250 && (
                              <span className="ml-1 text-green-600">✓ {locale === 'nl' ? 'Dichtbij' : 'Nearby'}</span>
                            )}
                          </div>

                          {/* Rating */}
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">
                                {locale === 'nl' ? 'Beoordeling:' : 'Rating:'}
                              </span>
                              <span className="text-yellow-600">
                                ⭐ {place.rating.toFixed(1)}
                              </span>
                              {place.userRatingsTotal && (
                                <span className="text-gray-500">
                                  ({place.userRatingsTotal})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Business Status */}
                          {place.businessStatus && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">
                                {locale === 'nl' ? 'Status:' : 'Status:'}
                              </span>
                              <span className={
                                place.businessStatus === 'OPERATIONAL'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }>
                                {place.businessStatus === 'OPERATIONAL'
                                  ? (locale === 'nl' ? 'Open' : 'Open')
                                  : (locale === 'nl' ? 'Gesloten' : 'Closed')}
                              </span>
                            </div>
                          )}

                          {/* Opening Hours */}
                          {place.openingHours?.openNow !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className={place.openingHours.openNow ? 'text-green-600' : 'text-red-600'}>
                                {place.openingHours.openNow
                                  ? (locale === 'nl' ? '🟢 Nu open' : '🟢 Open now')
                                  : (locale === 'nl' ? '🔴 Nu gesloten' : '🔴 Closed now')
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Place Types - Highlight matching search criteria */}
                        {place.types && place.types.length > 0 && (
                          <div className="mt-3">
                            <div className="text-xs text-gray-600 mb-1">
                              {locale === 'nl' ? 'Type voorziening:' : 'Place types:'}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const matchingTypes = getMatchingPlaceTypes(place);
                                return place.types.slice(0, 8).map((type: string) => {
                                  const isMatch = matchingTypes.includes(type.toLowerCase());
                                  return (
                                    <span
                                      key={type}
                                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                                        isMatch
                                          ? 'bg-green-100 text-green-800 font-semibold border border-green-300'
                                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                                      }`}
                                      title={isMatch ? (locale === 'nl' ? 'Komt overeen met zoekcriteria' : 'Matches search criteria') : ''}
                                    >
                                      {isMatch && '✓ '}{type.replace(/_/g, ' ')}
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Search Criteria Used */}
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
                          <div className="text-xs">
                            <div className="font-semibold text-blue-900 mb-1">
                              {locale === 'nl' ? '🔍 Zoekcriteria:' : '🔍 Search criteria:'}
                            </div>
                            <div className="text-blue-800">
                              <span className="font-medium">
                                {locale === 'nl' ? 'Strategie:' : 'Strategy:'}
                              </span>{' '}
                              {result.searchStrategy === 'text' && (locale === 'nl' ? 'Tekst zoeken' : 'Text search')}
                              {result.searchStrategy === 'nearby' && (locale === 'nl' ? 'Nabij zoeken' : 'Nearby search')}
                              {result.searchStrategy === 'both' && (locale === 'nl' ? 'Beide' : 'Both')}
                            </div>
                            {(result.searchStrategy === 'text' || result.searchStrategy === 'both') && category.keywords && category.keywords.length > 0 && (
                              <div className="text-blue-800 mt-1">
                                <span className="font-medium">
                                  {locale === 'nl' ? 'Zoektermen:' : 'Keywords:'}
                                </span>{' '}
                                {category.keywords.slice(0, 5).join(', ')}
                                {category.keywords.length > 5 && ` +${category.keywords.length - 5}`}
                              </div>
                            )}
                            {(result.searchStrategy === 'nearby' || result.searchStrategy === 'both') && category.placeTypes && category.placeTypes.length > 0 && (
                              <div className="text-blue-800 mt-1">
                                <span className="font-medium">
                                  {locale === 'nl' ? 'Type filters:' : 'Type filters:'}
                                </span>{' '}
                                {category.placeTypes.slice(0, 5).map((t: string) => t.replace(/_/g, ' ')).join(', ')}
                                {category.placeTypes.length > 5 && ` +${category.placeTypes.length - 5}`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Coordinates */}
                      <div className="text-right text-xs text-gray-500">
                        <div>{place.location.lat.toFixed(6)}</div>
                        <div>{place.location.lng.toFixed(6)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {locale === 'nl'
                    ? 'Geen voorzieningen gevonden in deze categorie'
                    : 'No amenities found in this category'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div>
                {locale === 'nl' ? 'Gezocht op' : 'Searched at'}{' '}
                {new Date(result.searchedAt).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-US')}
              </div>
              <div>
                {locale === 'nl' ? 'Zoekstraal:' : 'Search radius:'} {result.searchRadius}m
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
