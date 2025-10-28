import React, { useState } from 'react';
import type { ResidentialData, ReferenceHouse } from './types';
import { ReferenceCard } from './ReferenceCard';

interface ResidentialGridProps {
  data: ResidentialData;
  locale?: 'nl' | 'en';
}

type FilterCategory = 'all' | 'within1km' | 'within5km' | 'houseType';
type SortBy = 'distance' | 'price' | 'similarity' | 'buildYear';

/**
 * ResidentialGrid - Detailed grid view of reference houses
 * Displays in the woningmarkt tab with filtering and sorting
 */
export const ResidentialGrid: React.FC<ResidentialGridProps> = ({
  data,
  locale = 'nl',
}) => {
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [selectedHouseType, setSelectedHouseType] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('distance');

  if (!data.hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <p className="text-lg text-gray-600">
            {locale === 'nl'
              ? 'Geen woningmarkt gegevens beschikbaar'
              : 'No housing market data available'}
          </p>
        </div>
      </div>
    );
  }

  // Filter references based on active filter
  const getFilteredReferences = (): ReferenceHouse[] => {
    let filtered = [...data.referenceHouses];

    if (filterCategory === 'within1km') {
      filtered = filtered.filter((ref) => ref.Distance <= 1000);
    } else if (filterCategory === 'within5km') {
      filtered = filtered.filter((ref) => ref.Distance <= 5000);
    } else if (filterCategory === 'houseType' && selectedHouseType) {
      filtered = filtered.filter((ref) => ref.HouseType === selectedHouseType);
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => a.Distance - b.Distance);
        break;
      case 'price': {
        const getPrice = (priceStr: string) => {
          const parts = priceStr.split('-');
          return (parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2;
        };
        filtered.sort(
          (a, b) =>
            getPrice(b.IndexedTransactionPrice) - getPrice(a.IndexedTransactionPrice)
        );
        break;
      }
      case 'similarity':
        filtered.sort(
          (a, b) =>
            (b.VisualSimilarityScore || 0) - (a.VisualSimilarityScore || 0)
        );
        break;
      case 'buildYear':
        filtered.sort((a, b) => b.BuildYear - a.BuildYear);
        break;
    }

    return filtered;
  };

  const filteredReferences = getFilteredReferences();
  const houseTypes = Object.keys(data.marketStatistics.houseTypeDistribution);

  return (
    <div className="space-y-6">
      {/* Header with Target Property Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {locale === 'nl' ? '🏡 Woningmarkt Analyse' : '🏡 Housing Market Analysis'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {locale === 'nl' ? 'Gezochte Woning' : 'Target Property'}
            </h3>
            <p className="text-lg font-medium text-gray-900">
              {data.targetProperty.address.postcode}{' '}
              {data.targetProperty.address.houseNumber}
              {data.targetProperty.address.houseAddition}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
              <span className="bg-white px-2 py-1 rounded">
                🏠 {data.targetProperty.characteristics.houseType}
              </span>
              <span className="bg-white px-2 py-1 rounded">
                📅 {data.targetProperty.characteristics.buildYear}
              </span>
              <span className="bg-white px-2 py-1 rounded">
                📐 {data.targetProperty.characteristics.innerSurfaceArea} m²
              </span>
              {data.targetProperty.characteristics.energyLabel && (
                <span className="bg-white px-2 py-1 rounded">
                  ⚡ Label {data.targetProperty.characteristics.energyLabel}
                </span>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {locale === 'nl' ? 'Marktoverzicht' : 'Market Overview'}
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {locale === 'nl' ? 'Referentiewoningen:' : 'Reference houses:'}
                </span>
                <span className="font-semibold">{data.marketStatistics.totalReferences}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {locale === 'nl' ? 'Binnen 1 km:' : 'Within 1 km:'}
                </span>
                <span className="font-semibold">
                  {data.marketStatistics.withinRadius.oneKm}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {locale === 'nl' ? 'Binnen 5 km:' : 'Within 5 km:'}
                </span>
                <span className="font-semibold">
                  {data.marketStatistics.withinRadius.fiveKm}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filter Tabs */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {locale === 'nl' ? 'Filter' : 'Filter'}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setFilterCategory('all');
                  setSelectedHouseType(null);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {locale === 'nl' ? 'Alle' : 'All'} ({data.referenceHouses.length})
              </button>
              <button
                onClick={() => setFilterCategory('within1km')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterCategory === 'within1km'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📍 &lt; 1 km ({data.marketStatistics.withinRadius.oneKm})
              </button>
              <button
                onClick={() => setFilterCategory('within5km')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterCategory === 'within5km'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📍 &lt; 5 km ({data.marketStatistics.withinRadius.fiveKm})
              </button>
            </div>

            {/* House Type Filter */}
            {houseTypes.length > 0 && (
              <div className="mt-3">
                <select
                  value={selectedHouseType || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setFilterCategory('houseType');
                      setSelectedHouseType(value);
                    } else {
                      setFilterCategory('all');
                      setSelectedHouseType(null);
                    }
                  }}
                  className="block w-full md:w-auto px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {locale === 'nl' ? 'Filter op woningtype' : 'Filter by house type'}
                  </option>
                  {houseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type} ({data.marketStatistics.houseTypeDistribution[type]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sort Controls */}
          <div className="md:w-48">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              {locale === 'nl' ? 'Sorteren op' : 'Sort by'}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="block w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">
                {locale === 'nl' ? 'Afstand' : 'Distance'}
              </option>
              <option value="price">{locale === 'nl' ? 'Prijs' : 'Price'}</option>
              <option value="similarity">
                {locale === 'nl' ? 'Gelijkenis' : 'Similarity'}
              </option>
              <option value="buildYear">
                {locale === 'nl' ? 'Bouwjaar' : 'Build Year'}
              </option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          {locale === 'nl' ? 'Toont' : 'Showing'} {filteredReferences.length}{' '}
          {locale === 'nl' ? 'woningen' : 'properties'}
        </div>
      </div>

      {/* Reference Houses Grid */}
      {filteredReferences.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReferences.map((ref, idx) => (
            <ReferenceCard
              key={`${ref.PostCode}-${ref.HouseNumber}-${ref.HouseAddition}-${idx}`}
              reference={ref}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            {locale === 'nl'
              ? 'Geen woningen gevonden met de geselecteerde filters'
              : 'No properties found with the selected filters'}
          </p>
        </div>
      )}
    </div>
  );
};
