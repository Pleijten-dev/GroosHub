/**
 * Residential Page Component
 * Displays housing market data with simplified layout
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { ResidentialData } from '../../data/sources/altum-ai/types';
import { DensityChart } from '../../../../shared/components/common';
import type { DensityChartData } from '../../../../shared/components/common/DensityChart/DensityChart';
import { aggregateMarketData } from './marketDataAggregator';
import { ResidentialGrid } from './ResidentialGrid';

interface ResidentialPageProps {
  data: ResidentialData | null;
  locale: 'nl' | 'en';
}

interface ResidentialSection {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  type: 'chart' | 'value';
  field: string;
}

const RESIDENTIAL_SECTIONS: ResidentialSection[] = [
  {
    id: 'house_type',
    title: { nl: 'WONINGTYPE', en: 'HOUSE TYPE' },
    description: {
      nl: 'Verdeling van woningtypes in de referentiewoningen',
      en: 'Distribution of house types in reference properties'
    },
    type: 'chart',
    field: 'HouseType'
  },
  {
    id: 'build_year',
    title: { nl: 'GEMIDDELDE BOUWJAAR', en: 'AVERAGE BUILD YEAR' },
    description: {
      nl: 'Gemiddeld bouwjaar van de referentiewoningen',
      en: 'Average build year of reference properties'
    },
    type: 'value',
    field: 'BuildYear'
  },
  {
    id: 'inner_surface',
    title: { nl: 'GEMIDDELDE WOONOPPERVLAKTE', en: 'AVERAGE LIVING AREA' },
    description: {
      nl: 'Gemiddelde woonoppervlakte in vierkante meters',
      en: 'Average living area in square meters'
    },
    type: 'value',
    field: 'InnerSurfaceArea'
  },
  {
    id: 'energy_label',
    title: { nl: 'ENERGIELABEL', en: 'ENERGY LABEL' },
    description: {
      nl: 'Verdeling van energielabels in de referentiewoningen',
      en: 'Distribution of energy labels in reference properties'
    },
    type: 'chart',
    field: 'DefinitiveEnergyLabel'
  },
  {
    id: 'transaction_price',
    title: { nl: 'GEMIDDELDE TRANSACTIEPRIJS', en: 'AVERAGE TRANSACTION PRICE' },
    description: {
      nl: 'Gemiddelde geïndexeerde transactieprijs',
      en: 'Average indexed transaction price'
    },
    type: 'value',
    field: 'IndexedTransactionPrice'
  }
];

/**
 * Format value for display based on field type
 */
function formatValue(value: number | null, field: string): string {
  if (value === null) return '-';

  if (field === 'BuildYear') {
    return Math.round(value).toString();
  } else if (field === 'InnerSurfaceArea') {
    return `${Math.round(value)} m²`;
  } else if (field === 'IndexedTransactionPrice') {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  return value.toFixed(1);
}

/**
 * ResidentialPage - Displays housing market data with simplified layout
 */
export const ResidentialPage: React.FC<ResidentialPageProps> = ({ data, locale }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Aggregate market data
  const aggregatedData = useMemo(() => {
    if (!data || !data.hasData) return null;
    return aggregateMarketData(data.referenceHouses);
  }, [data]);

  if (!data || !data.hasData || !aggregatedData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-gray-600">
            {locale === 'nl'
              ? 'Geen woningmarkt gegevens beschikbaar'
              : 'No housing market data available'}
          </p>
        </div>
      </div>
    );
  }

  /**
   * Get field data from aggregated data
   */
  const getFieldData = (fieldName: string) => {
    return aggregatedData.find(f => f.fieldName === fieldName);
  };

  /**
   * Convert distribution to chart data with percentages
   */
  const createChartData = (fieldName: string): { data: DensityChartData[], labels: string[] } => {
    const field = getFieldData(fieldName);
    if (!field || field.type !== 'string' || !field.valueDistribution) {
      return { data: [], labels: [] };
    }

    const entries = Object.entries(field.valueDistribution)
      .sort(([, a], [, b]) => b - a);

    const labels = entries.map(([label]) => label);
    const chartData = entries.map(([, count], index) => ({
      x: index,
      y: (count / field.count) * 100
    }));

    return { data: chartData, labels };
  };

  /**
   * Render section content
   */
  const renderSectionContent = (section: ResidentialSection) => {
    const field = getFieldData(section.field);

    if (!field) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-gray-400 text-sm">
            {locale === 'nl' ? 'Geen data beschikbaar' : 'No data available'}
          </span>
        </div>
      );
    }

    if (section.type === 'chart') {
      // Bar chart visualization
      const { data: chartData, labels } = createChartData(section.field);

      if (chartData.length === 0) {
        return (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-400 text-sm">
              {locale === 'nl' ? 'Geen data beschikbaar' : 'No data available'}
            </span>
          </div>
        );
      }

      return (
        <div className="flex-1 flex items-center justify-center">
          <DensityChart
            data={chartData}
            width={600}
            height={200}
            mode="histogram"
            tooltipLabels={labels}
            showLabels={false}
            showGrid={false}
          />
        </div>
      );
    }

    if (section.type === 'value') {
      // Simple value display
      const value = field.average;
      const displayValue = formatValue(value ?? null, section.field);

      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">
              {displayValue}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Only show sections when not expanded */}
      {!isExpanded && (
        <>
          {/* Main Content - Residential Sections */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-0">
              {RESIDENTIAL_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-6 py-4"
                  style={{ minHeight: '12vh' }}
                >
                  {/* Title - 25% width */}
                  <div className="flex-shrink-0 w-[25%] max-w-[40%]">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {section.title[locale]}
                    </h2>
                  </div>

                  {/* Description - 20% width */}
                  <div className="flex-shrink-0 w-[20%]">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {section.description[locale]}
                    </p>
                  </div>

                  {/* Chart or Value - remaining space */}
                  {renderSectionContent(section)}
                </div>
              ))}
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

      {/* Expanded Reference Houses Section - Full Screen */}
      {isExpanded && (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
          {/* Close button */}
          <div className="flex-shrink-0 flex justify-between items-center p-4 bg-white border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {locale === 'nl' ? 'Referentiewoningen' : 'Reference Properties'}
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              {locale === 'nl' ? 'Sluiten' : 'Close'}
            </button>
          </div>

          {/* Reference houses grid */}
          <div className="flex-1 overflow-auto p-6">
            <ResidentialGrid data={data} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
};
