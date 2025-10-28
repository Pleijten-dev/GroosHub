import React, { useState, useMemo } from 'react';
import { AmenityCard } from './AmenityCard';
import type { AmenityMultiCategoryResponse } from './types';

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

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {locale === 'nl' ? '🏪 Voorzieningen in de Buurt' : '🏪 Nearby Amenities'}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{locale === 'nl' ? 'Categorieën' : 'Categories'}</p>
            <p className="font-semibold text-lg">
              {stats.categoriesWithResults}/{stats.totalCategories}
            </p>
          </div>
          <div>
            <p className="text-gray-600">{locale === 'nl' ? 'Voorzieningen' : 'Places'}</p>
            <p className="font-semibold text-lg">{stats.totalPlaces}</p>
          </div>
          <div>
            <p className="text-gray-600">{locale === 'nl' ? 'Dekking' : 'Coverage'}</p>
            <p className="font-semibold text-lg">{stats.percentSuccess}%</p>
          </div>
        </div>
      </div>

      {/* Quota warning if exists */}
      {data.quotaStatus && data.quotaStatus.percentUsed > 80 && (
        <div className={`rounded-lg p-4 border ${
          data.quotaStatus.percentUsed >= 100
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <p className={`text-sm font-medium ${
            data.quotaStatus.percentUsed >= 100 ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {data.quotaStatus.percentUsed >= 100 ? '⚠️ ' : '⚡ '}
            {locale === 'nl' ? 'API Quota' : 'API Quota'}: {
              data.quotaStatus.percentUsed >= 100
                ? (locale === 'nl' ? 'Limiet bereikt' : 'Limit reached')
                : `${data.quotaStatus.textSearchRemaining} ${locale === 'nl' ? 'resterende zoekopdrachten' : 'searches remaining'}`
            }
          </p>
          {data.quotaStatus.percentUsed >= 100 && (
            <p className="text-xs text-red-600 mt-1">
              {locale === 'nl'
                ? 'Restaurant prijsfilters zijn tijdelijk niet beschikbaar. Andere voorzieningen werken nog steeds.'
                : 'Restaurant price filters are temporarily unavailable. Other amenities still work.'}
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm font-medium text-gray-700">
          {locale === 'nl' ? 'Filter:' : 'Filter:'}
        </label>
        {(['all', 'essential', 'high', 'medium', 'low'] as FilterOption[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === option
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option === 'all' ? (locale === 'nl' ? 'Alle' : 'All') :
             option === 'essential' ? (locale === 'nl' ? 'Essentieel' : 'Essential') :
             option === 'high' ? (locale === 'nl' ? 'Hoog' : 'High') :
             option === 'medium' ? (locale === 'nl' ? 'Gemiddeld' : 'Medium') :
             (locale === 'nl' ? 'Laag' : 'Low')}
          </button>
        ))}

        <input
          type="text"
          placeholder={locale === 'nl' ? 'Zoek categorie...' : 'Search category...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid of amenity cards */}
      {filteredResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResults.map((result) => (
            <AmenityCard key={result.category.id} result={result} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {locale === 'nl'
              ? 'Geen resultaten gevonden voor deze filters'
              : 'No results found for these filters'}
          </p>
        </div>
      )}

      {/* Footer info */}
      <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
        {locale === 'nl' ? 'Data opgehaald op' : 'Data fetched on'}{' '}
        {new Date(data.searchedAt).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-US')}
      </div>
    </div>
  );
};
