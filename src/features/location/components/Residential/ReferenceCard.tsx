import React from 'react';
import type { ReferenceHouse } from './types';
import { parsePriceRange } from '../../data/sources/altum-ai/parser';

interface ReferenceCardProps {
  reference: ReferenceHouse;
  locale?: 'nl' | 'en';
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
 * Format transaction date from YYYYMM to readable format
 */
function formatTransactionDate(yyyymm: number): string {
  const str = yyyymm.toString();
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  return `${month}/${year}`;
}

/**
 * ReferenceCard - Displays a single reference house
 */
export const ReferenceCard: React.FC<ReferenceCardProps> = ({
  reference,
  locale = 'nl',
}) => {
  const transactionPrice = parsePriceRange(reference.TransactionPrice);
  const indexedPrice = parsePriceRange(reference.IndexedTransactionPrice);

  // Format prices
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Determine distance color
  const getDistanceColor = () => {
    if (reference.Distance <= 1000) return 'text-green-600 bg-green-50';
    if (reference.Distance <= 5000) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Determine weight indicator
  const getWeightBadge = () => {
    if (reference.Weight >= 0.9) return { label: 'Hoog', color: 'bg-green-500' };
    if (reference.Weight >= 0.5) return { label: 'Gemiddeld', color: 'bg-yellow-500' };
    return { label: 'Laag', color: 'bg-gray-400' };
  };

  const weightBadge = getWeightBadge();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header with Image or Placeholder */}
      {reference.Image ? (
        <div className="mb-3 rounded-md overflow-hidden">
          <img
            src={reference.Image}
            alt={`${reference.Street} ${reference.HouseNumber}`}
            className="w-full h-32 object-cover"
          />
        </div>
      ) : (
        <div className="mb-3 rounded-md bg-gray-100 h-32 flex items-center justify-center">
          <span className="text-4xl">🏠</span>
        </div>
      )}

      {/* Address */}
      <div className="mb-2">
        <h4 className="font-semibold text-gray-900">
          {reference.Street} {reference.HouseNumber}
          {reference.HouseAddition}
        </h4>
        <p className="text-sm text-gray-600">
          {reference.PostCode} {reference.City}
        </p>
      </div>

      {/* Distance Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getDistanceColor()}`}>
          📍 {formatDistance(reference.Distance)}
        </span>
      </div>

      {/* Property Details */}
      <div className="space-y-1 text-sm text-gray-700 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-600">{locale === 'nl' ? 'Type:' : 'Type:'}</span>
          <span className="font-medium">{reference.HouseType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{locale === 'nl' ? 'Bouwjaar:' : 'Build Year:'}</span>
          <span className="font-medium">{reference.BuildYear}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{locale === 'nl' ? 'Oppervlakte:' : 'Surface:'}</span>
          <span className="font-medium">{reference.InnerSurfaceArea} m²</span>
        </div>
        {reference.DefinitiveEnergyLabel && (
          <div className="flex justify-between">
            <span className="text-gray-600">{locale === 'nl' ? 'Energielabel:' : 'Energy Label:'}</span>
            <span className="font-medium">{reference.DefinitiveEnergyLabel}</span>
          </div>
        )}
      </div>

      {/* Price Information */}
      <div className="border-t border-gray-200 pt-3 space-y-2">
        <div>
          <p className="text-xs text-gray-600">
            {locale === 'nl' ? 'Transactieprijs' : 'Transaction Price'} ({formatTransactionDate(reference.Transactiondate)})
          </p>
          <p className="font-semibold text-gray-900">
            {formatPrice(transactionPrice.min)} - {formatPrice(transactionPrice.max)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">
            {locale === 'nl' ? 'Geïndexeerde prijs (nu)' : 'Indexed Price (now)'}
          </p>
          <p className="font-bold text-blue-700 text-lg">
            {formatPrice(indexedPrice.min)} - {formatPrice(indexedPrice.max)}
          </p>
        </div>
      </div>

      {/* Footer with Similarity and Weight */}
      <div className="border-t border-gray-200 pt-3 mt-3 flex items-center justify-between">
        {reference.VisualSimilarityScore !== null && (
          <div className="text-xs">
            <span className="text-gray-600">{locale === 'nl' ? 'Gelijkenis:' : 'Similarity:'}</span>
            <span className="ml-1 font-medium">{reference.VisualSimilarityScore.toFixed(0)}%</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${weightBadge.color}`}></div>
          <span className="text-xs text-gray-600">{weightBadge.label}</span>
        </div>
      </div>

      {/* Source Badge */}
      <div className="mt-2">
        <span className="text-xs text-gray-500">
          {locale === 'nl' ? 'Bron:' : 'Source:'} {reference.Source}
        </span>
      </div>
    </div>
  );
};
