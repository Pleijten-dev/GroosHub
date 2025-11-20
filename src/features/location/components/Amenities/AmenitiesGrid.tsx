import React, { useState, useMemo } from 'react';
import { AmenityCard } from './AmenityCard';
import type { AmenityMultiCategoryResponse } from './types';
import { distanceCalculator } from '../../data/sources/google-places/distance-calculator';

interface AmenitiesGridProps {
  data: AmenityMultiCategoryResponse;
  locale?: 'nl' | 'en';
}

type FilterOption = 'all' | 'essential' | 'high' | 'medium' | 'low';

/**
 * AmenitiesGrid - Displays all amenity categories in a responsive grid
 */
export const AmenitiesGrid: React.FC<AmenitiesGridProps> = ({ data, locale = 'nl' }) => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [search, setSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter results based on priority and search
  const filteredResults = useMemo(() => {
    let filtered = data.results;

    // Filter by priority
    if (filter !== 'all') {
      filtered = filtered.filter(r => r.category.priority === filter);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.category.displayName.toLowerCase().includes(searchLower) ||
        r.category.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [data.results, filter, search]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCategories = data.results.length;
    const categoriesWithResults = data.results.filter(r => r.places.length > 0).length;
    const totalPlaces = data.results.reduce((sum, r) => sum + r.places.length, 0);

    return {
      totalCategories,
      categoriesWithResults,
      totalPlaces,
      percentSuccess: Math.round((categoriesWithResults / totalCategories) * 100),
    };
  }, [data.results]);

  // Get essential amenities for overview
  const essentialAmenities = useMemo(() => {
    return data.results
      .filter(r => r.category.priority === 'essential')
      .map(r => ({
        name: r.category.displayName,
        icon: r.category.icon,
        count: r.places.length,
        closestDistance: r.places[0]?.distance || null,
        hasResults: r.places.length > 0,
      }));
  }, [data.results]);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Only show overview when not expanded */}
      {!isExpanded && (
        <>
          {/* Essential Amenities Overview Section */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {locale === 'nl' ? 'VOORZIENINGEN OVERZICHT' : 'AMENITIES OVERVIEW'}
              </h2>

              {essentialAmenities.map((amenity) => (
                <div
                  key={amenity.name}
                  className="flex items-center gap-6 py-4 border-b border-gray-200 last:border-b-0"
                  style={{ minHeight: '10vh' }}
                >
                  {/* Title - 25% width */}
                  <div className="flex-shrink-0 w-[25%]">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {amenity.name.toUpperCase()}
                    </h3>
                  </div>

                  {/* Description - 20% width */}
                  <div className="flex-shrink-0 w-[20%]">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {locale === 'nl'
                        ? 'Essentiële voorziening in de buurt'
                        : 'Essential amenity nearby'}
                    </p>
                  </div>

                  {/* Stats - remaining space */}
                  <div className="flex-1 flex items-center justify-center gap-12">
                    {/* Count */}
                    <div className="flex flex-col items-center">
                      <div className="text-sm text-gray-500 mb-2">
                        {locale === 'nl' ? 'Aantal' : 'Count'}
                      </div>
                      <div className="text-4xl font-bold text-gray-900">
                        {amenity.count}
                      </div>
                    </div>

                    {/* Closest Distance */}
                    <div className="flex flex-col items-center opacity-60">
                      <div className="text-sm text-gray-500 mb-2">
                        {locale === 'nl' ? 'Dichtsbijzijnde' : 'Closest'}
                      </div>
                      <div className="text-4xl font-bold text-gray-600">
                        {amenity.closestDistance
                          ? distanceCalculator.formatDistance(amenity.closestDistance).replace(/\s/g, '')
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* General Stats Row */}
              <div
                className="flex items-center gap-6 py-4 border-b border-gray-200"
                style={{ minHeight: '10vh' }}
              >
                {/* Title - 25% width */}
                <div className="flex-shrink-0 w-[25%]">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {locale === 'nl' ? 'TOTAAL' : 'TOTAL'}
                  </h3>
                </div>

                {/* Description - 20% width */}
                <div className="flex-shrink-0 w-[20%]">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {locale === 'nl'
                      ? 'Totaal aantal voorzieningen in alle categorieën'
                      : 'Total amenities across all categories'}
                  </p>
                </div>

                {/* Stats - remaining space */}
                <div className="flex-1 flex items-center justify-center gap-12">
                  {/* Total Places */}
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-gray-500 mb-2">
                      {locale === 'nl' ? 'Voorzieningen' : 'Places'}
                    </div>
                    <div className="text-4xl font-bold text-gray-900">
                      {stats.totalPlaces}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex flex-col items-center opacity-60">
                    <div className="text-sm text-gray-500 mb-2">
                      {locale === 'nl' ? 'Categorieën' : 'Categories'}
                    </div>
                    <div className="text-4xl font-bold text-gray-600">
                      {stats.categoriesWithResults}/{stats.totalCategories}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Arrow Button */}
          <div className="flex-shrink-0 flex justify-center py-4 border-t border-gray-200">
            <button
              className="group cursor-pointer bg-transparent border-none p-0 m-0 focus:outline-none transition-transform duration-200 hover:scale-110"
              onClick={() => setIsExpanded(true)}
            >
              <svg
                width="48"
                height="24"
                viewBox="0 0 48 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-colors duration-200"
              >
                <path
                  d="M12 8 L24 20 L36 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-700 group-hover:text-gray-900"
                />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Expanded Cards Section - Full Screen */}
      {isExpanded && (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
          {/* Close button and filters */}
          <div className="flex-shrink-0 flex flex-col gap-4 p-4 bg-white border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'nl' ? 'Alle Voorzieningen' : 'All Amenities'}
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {locale === 'nl' ? 'Sluiten' : 'Close'}
              </button>
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md rounded-full border border-gray-200 shadow-lg">
                {(['all', 'essential', 'high', 'medium', 'low'] as FilterOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                      filter === option
                        ? 'bg-gradient-3-mid text-gray-900 shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option === 'all' ? (locale === 'nl' ? 'Alle' : 'All') :
                     option === 'essential' ? (locale === 'nl' ? 'Essentieel' : 'Essential') :
                     option === 'high' ? (locale === 'nl' ? 'Hoog' : 'High') :
                     option === 'medium' ? (locale === 'nl' ? 'Gemiddeld' : 'Medium') :
                     (locale === 'nl' ? 'Laag' : 'Low')}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder={locale === 'nl' ? 'Zoek categorie...' : 'Search category...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            {/* Quota warning if exists */}
            {data.quotaStatus && data.quotaStatus.percentUsed > 80 && (
              <div className={`rounded-lg p-3 border text-sm ${
                data.quotaStatus.percentUsed >= 100
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                {locale === 'nl' ? 'API Quota' : 'API Quota'}: {
                  data.quotaStatus.percentUsed >= 100
                    ? (locale === 'nl' ? 'Limiet bereikt' : 'Limit reached')
                    : `${data.quotaStatus.textSearchRemaining} ${locale === 'nl' ? 'resterende zoekopdrachten' : 'searches remaining'}`
                }
              </div>
            )}
          </div>

          {/* Cards grid */}
          <div className="flex-1 overflow-auto p-6">
            {filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredResults.map((result) => (
                  <AmenityCard key={result.category.id} result={result} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">
                  {locale === 'nl'
                    ? 'Geen resultaten gevonden voor deze filters'
                    : 'No results found for these filters'}
                </p>
              </div>
            )}

            {/* Footer info */}
            <div className="text-xs text-gray-500 text-center pt-8 mt-8 border-t border-gray-200">
              {locale === 'nl' ? 'Data opgehaald op' : 'Data fetched on'}{' '}
              {new Date(data.searchedAt).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-US')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
