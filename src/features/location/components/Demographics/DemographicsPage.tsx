"use client";

import React, { useState, useMemo } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { DensityChart } from '../../../../shared/components/common';
import type { DensityChartData } from '../../../../shared/components/common/DensityChart/DensityChart';
import { MultiLevelDataTable } from '../DataTables';

interface DemographicsPageProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
}

type GeographicLevel = 'national' | 'municipality' | 'district' | 'neighborhood';

const LEVEL_LABELS = {
  national: { nl: 'Nederland (Landelijk)', en: 'Netherlands (National)' },
  municipality: { nl: 'Gemeente', en: 'Municipality' },
  district: { nl: 'Wijk', en: 'District' },
  neighborhood: { nl: 'Buurt', en: 'Neighborhood' },
};

interface DemographicSection {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  fields: string[]; // The field keys to display
  isValue?: boolean; // If true, just display the value instead of a chart
}

const DEMOGRAPHIC_SECTIONS: DemographicSection[] = [
  {
    id: 'age',
    title: { nl: 'LEEFTIJD', en: 'AGE' },
    description: {
      nl: 'Leeftijdsverdeling toont de samenstelling van de bevolking per leeftijdsgroep.',
      en: 'Age distribution shows the population composition by age group.'
    },
    fields: ['k_0Tot15Jaar_8', 'k_15Tot25Jaar_9', 'k_25Tot45Jaar_10', 'k_45Tot65Jaar_11', 'k_65JaarOfOuder_12']
  },
  {
    id: 'status',
    title: { nl: 'BURGERLIJKE STAAT', en: 'STATUS' },
    description: {
      nl: 'Burgerlijke staat geeft inzicht in de huwelijkse samenstelling van de bevolking.',
      en: 'Marital status provides insight into the marital composition of the population.'
    },
    fields: ['Ongehuwd_13', 'Gehuwd_14', 'Gescheiden_15', 'Verweduwd_16']
  },
  {
    id: 'immigration',
    title: { nl: 'MIGRATIE', en: 'IMMIGRATION' },
    description: {
      nl: 'Migratieachtergrond toont de herkomst van inwoners.',
      en: 'Migration background shows the origin of residents.'
    },
    fields: [
      'Autochtoon',
      'WestersTotaal_17',
      'NietWestersTotaal_18',
      'Marokko_19',
      'NederlandseAntillenEnAruba_20',
      'Suriname_21',
      'Turkije_22',
      'OverigNietWesters_23'
    ]
  },
  {
    id: 'family_size',
    title: { nl: 'GEZINSGROOTTE', en: 'FAMILY SIZE' },
    description: {
      nl: 'Gemiddelde gezinsgrootte toont het aantal personen per huishouden.',
      en: 'Average family size shows the number of persons per household.'
    },
    fields: ['GemiddeldeHuishoudensgrootte_32'],
    isValue: true
  },
  {
    id: 'family',
    title: { nl: 'GEZINSTYPE', en: 'FAMILY' },
    description: {
      nl: 'Gezinstype toont de samenstelling van huishoudens.',
      en: 'Family type shows the composition of households.'
    },
    fields: ['Eenpersoonshuishoudens_29', 'HuishoudensZonderKinderen_30', 'HuishoudensMetKinderen_31']
  },
  {
    id: 'income',
    title: { nl: 'INKOMEN', en: 'INCOME' },
    description: {
      nl: 'Gemiddeld inkomen per inwoner in euro\'s per jaar.',
      en: 'Average income per resident in euros per year.'
    },
    fields: ['GemiddeldInkomenPerInwoner_72'],
    isValue: true
  }
];

/**
 * DemographicsPage - Displays demographic data with visual charts and comparisons
 */
export const DemographicsPage: React.FC<DemographicsPageProps> = ({ data, locale }) => {
  const [selectedLevel, setSelectedLevel] = useState<GeographicLevel>('neighborhood');
  const [comparisonLevel, setComparisonLevel] = useState<GeographicLevel>('municipality');
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Get available geographic levels based on location data
   */
  const availableLevels = useMemo(() => {
    const levels: GeographicLevel[] = ['national', 'municipality'];
    if (data.location.district) levels.push('district');
    if (data.location.neighborhood) levels.push('neighborhood');
    return levels;
  }, [data.location]);

  /**
   * Get data rows for a specific level
   */
  const getDataForLevel = (level: GeographicLevel): UnifiedDataRow[] => {
    switch (level) {
      case 'national':
        return data.demographics.national;
      case 'municipality':
        return data.demographics.municipality;
      case 'district':
        return data.demographics.district;
      case 'neighborhood':
        return data.demographics.neighborhood;
    }
  };

  /**
   * Get a specific field value from a dataset
   */
  const getFieldValue = (rows: UnifiedDataRow[], fieldKey: string): number | null => {
    const row = rows.find(r => r.key === fieldKey);
    return row?.relative ?? null;
  };

  /**
   * Convert field data to DensityChart format
   */
  const createChartData = (fields: string[], rows: UnifiedDataRow[]): DensityChartData[] => {
    const data: DensityChartData[] = [];

    fields.forEach((field, index) => {
      const value = getFieldValue(rows, field);
      if (value !== null) {
        data.push({ x: index, y: value });
      }
    });

    return data;
  };

  /**
   * Get the display value for a field (handles special formatting)
   */
  const getDisplayValue = (rows: UnifiedDataRow[], fieldKey: string, sectionId: string): string => {
    const row = rows.find(r => r.key === fieldKey);
    if (!row) return '-';

    // For family_size, use absolute value
    if (sectionId === 'family_size') {
      return row.displayAbsolute || '-';
    }

    // For income, format as "27.1€ (x1.000)"
    if (sectionId === 'income' && row.relative !== null) {
      const value = (row.relative / 1000).toFixed(1);
      return `${value}€ (x1.000)`;
    }

    return row.displayRelative || row.displayAbsolute || '-';
  };

  const selectedData = getDataForLevel(selectedLevel);
  const comparisonData = getDataForLevel(comparisonLevel);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header with Dropdowns - Horizontally Centered */}
      <div className="flex-shrink-0 flex justify-center items-center gap-6 p-6 border-b border-gray-200">
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-600">
            {locale === 'nl' ? 'Gebied' : 'Area'}
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as GeographicLevel)}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur-md text-sm min-w-[180px] shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          >
            {availableLevels.map(level => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level][locale]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2 text-gray-600">
            {locale === 'nl' ? 'Vergelijken met' : 'Compare to'}
          </label>
          <select
            value={comparisonLevel}
            onChange={(e) => setComparisonLevel(e.target.value as GeographicLevel)}
            className="px-4 py-2 rounded-full border border-gray-200 bg-white/80 backdrop-blur-md text-sm min-w-[180px] shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          >
            {availableLevels.map(level => (
              <option key={level} value={level}>
                {LEVEL_LABELS[level][locale]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content - Demographic Sections */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-0">
          {DEMOGRAPHIC_SECTIONS.map((section) => {
            const chartData = section.isValue
              ? []
              : createChartData(section.fields, selectedData);
            const comparisonChartData = section.isValue
              ? []
              : createChartData(section.fields, comparisonData);

            return (
              <div
                key={section.id}
                className="flex items-center gap-6 py-4"
                style={{ minHeight: '12vh' }}
              >
                {/* Title - 12% height, max 40% width */}
                <div className="flex-shrink-0 w-[25%] max-w-[40%]">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {section.title[locale]}
                  </h2>
                </div>

                {/* Description - 12% height, 20% width */}
                <div className="flex-shrink-0 w-[20%]">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {section.description[locale]}
                  </p>
                </div>

                {/* Chart or Value - remaining space */}
                <div className="flex-1 flex items-center justify-center relative">
                  {section.isValue ? (
                    <div className="text-4xl font-bold text-gray-900">
                      {getDisplayValue(selectedData, section.fields[0], section.id)}
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Comparison chart at 30% opacity (background) */}
                      {comparisonChartData.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                          <DensityChart
                            data={comparisonChartData}
                            width={400}
                            height={120}
                            mode="area"
                            showLabels={false}
                            showGrid={false}
                          />
                        </div>
                      )}

                      {/* Selected data chart (foreground) */}
                      {chartData.length > 0 && (
                        <div className="relative z-10">
                          <DensityChart
                            data={chartData}
                            width={400}
                            height={120}
                            mode="area"
                            showLabels={true}
                            showGrid={false}
                          />
                        </div>
                      )}

                      {chartData.length === 0 && (
                        <span className="text-gray-400 text-sm">
                          {locale === 'nl' ? 'Geen data beschikbaar' : 'No data available'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Arrow Button */}
      {!isExpanded && (
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
      )}

      {/* Expanded Table Section */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden border-t border-gray-200 bg-gray-50">
          <div className="h-full flex flex-col">
            {/* Close button */}
            <div className="flex-shrink-0 flex justify-between items-center p-4 bg-white border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {locale === 'nl' ? 'Volledige Demografische Tabel' : 'Full Demographics Table'}
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                {locale === 'nl' ? 'Sluiten' : 'Close'}
              </button>
            </div>

            {/* Table content */}
            <div className="flex-1 overflow-auto p-6">
              <MultiLevelDataTable
                data={data}
                locale={locale}
                defaultSource="demographics"
                lockSourceFilter={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
