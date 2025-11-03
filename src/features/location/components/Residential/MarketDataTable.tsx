import React from 'react';
import type { ResidentialData } from '../../data/sources/altum-ai/types';
import {
  aggregateMarketData,
  formatNumericValue,
  type AggregatedFieldData,
} from './marketDataAggregator';

interface MarketDataTableProps {
  data: ResidentialData;
  locale?: 'nl' | 'en';
}

/**
 * MarketDataTable - Displays aggregated statistics from reference houses
 * Shows averages for numeric fields, most common for string fields, and counts
 */
export const MarketDataTable: React.FC<MarketDataTableProps> = ({
  data,
  locale = 'nl',
}) => {
  if (!data.hasData || data.referenceHouses.length === 0) {
    return null;
  }

  const aggregatedData = aggregateMarketData(data.referenceHouses);

  const columnHeaders = {
    field: locale === 'nl' ? 'Veld' : 'Field',
    value: locale === 'nl' ? 'Waarde' : 'Value',
    count: locale === 'nl' ? 'Aantal' : 'Count',
    distribution: locale === 'nl' ? 'Verdeling' : 'Distribution',
  };

  /**
   * Format the value cell based on field type
   */
  const formatValueCell = (field: AggregatedFieldData): string => {
    if (field.type === 'string') {
      return field.mostCommon || '-';
    } else if (field.type === 'numeric' || field.type === 'priceRange') {
      return formatNumericValue(field.average, field.type);
    }
    return '-';
  };

  /**
   * Get value description (average vs most common)
   */
  const getValueDescription = (field: AggregatedFieldData): string => {
    if (field.type === 'string') {
      return locale === 'nl' ? 'Meest voorkomend' : 'Most common';
    }
    return locale === 'nl' ? 'Gemiddelde' : 'Average';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {locale === 'nl'
            ? '📊 Marktdata Overzicht'
            : '📊 Market Data Overview'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {locale === 'nl'
            ? `Geaggregeerde statistieken van ${data.referenceHouses.length} referentiewoningen`
            : `Aggregated statistics from ${data.referenceHouses.length} reference houses`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {columnHeaders.field}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {columnHeaders.value}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {columnHeaders.count}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {columnHeaders.distribution}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {aggregatedData.map((field, index) => (
              <tr
                key={field.fieldName}
                className={`hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                {/* Field Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {field.displayName[locale]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getValueDescription(field)}
                  </div>
                </td>

                {/* Value (Average or Most Common) */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-semibold">
                    {formatValueCell(field)}
                  </div>
                </td>

                {/* Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {field.count}
                    <span className="text-xs text-gray-500 ml-1">
                      / {data.referenceHouses.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {field.count === data.referenceHouses.length
                      ? locale === 'nl'
                        ? '100% aanwezig'
                        : '100% present'
                      : locale === 'nl'
                        ? `${Math.round((field.count / data.referenceHouses.length) * 100)}% aanwezig`
                        : `${Math.round((field.count / data.referenceHouses.length) * 100)}% present`}
                  </div>
                </td>

                {/* Distribution (for string fields) */}
                <td className="px-6 py-4">
                  {field.type === 'string' && field.valueDistribution ? (
                    <div className="text-xs space-y-1">
                      {Object.entries(field.valueDistribution)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 5)
                        .map(([value, count]) => (
                          <div
                            key={value}
                            className="flex justify-between items-center"
                          >
                            <span className="text-gray-700 truncate max-w-[150px]">
                              {value}
                            </span>
                            <span className="text-gray-500 ml-2">
                              {count} (
                              {Math.round((count / field.count) * 100)}%)
                            </span>
                          </div>
                        ))}
                      {Object.keys(field.valueDistribution).length > 5 && (
                        <div className="text-gray-400 italic">
                          {locale === 'nl'
                            ? `+${Object.keys(field.valueDistribution).length - 5} meer...`
                            : `+${Object.keys(field.valueDistribution).length - 5} more...`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>{locale === 'nl' ? 'Opmerking:' : 'Note:'}</strong>{' '}
            {locale === 'nl'
              ? 'Prijzen worden berekend op basis van het gemiddelde van de prijs range.'
              : 'Prices are calculated based on the average of the price range.'}
          </p>
          <p>
            {locale === 'nl'
              ? 'Verdeling toont de top 5 meest voorkomende waarden voor categorische velden.'
              : 'Distribution shows the top 5 most common values for categorical fields.'}
          </p>
        </div>
      </div>
    </div>
  );
};
