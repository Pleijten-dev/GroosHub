"use client";

import React, { useState, useMemo } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { DensityChart } from '../../../../shared/components/common';
import type { DensityChartData } from '../../../../shared/components/common/DensityChart/DensityChart';
import { MultiLevelDataTable } from '../DataTables';
import {
  GeographicLevelSelector,
  type GeographicLevel
} from '../shared';

interface DemographicsPageProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
}

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
  fieldLabels?: { nl: string[]; en: string[] }; // Human-readable labels for tooltips
  isValue?: boolean; // If true, just display the value instead of a chart
  useBarChart?: boolean; // If true, use histogram/bar mode instead of area
  customAxisLabels?: { start: string; end: string }; // Custom labels for start and end of x-axis
}

const DEMOGRAPHIC_SECTIONS: DemographicSection[] = [
  {
    id: 'age',
    title: { nl: 'LEEFTIJD', en: 'AGE' },
    description: {
      nl: 'Leeftijdsverdeling toont de samenstelling van de bevolking per leeftijdsgroep.',
      en: 'Age distribution shows the population composition by age group.'
    },
    fields: ['k_0Tot15Jaar_8', 'k_15Tot25Jaar_9', 'k_25Tot45Jaar_10', 'k_45Tot65Jaar_11', 'k_65JaarOfOuder_12'],
    fieldLabels: {
      nl: ['0-15 jaar', '15-25 jaar', '25-45 jaar', '45-65 jaar', '65+ jaar'],
      en: ['0-15 years', '15-25 years', '25-45 years', '45-65 years', '65+ years']
    },
    customAxisLabels: { start: '0', end: '65+' }
  },
  {
    id: 'status',
    title: { nl: 'BURGERLIJKE STAAT', en: 'STATUS' },
    description: {
      nl: 'Burgerlijke staat geeft inzicht in de huwelijkse samenstelling van de bevolking.',
      en: 'Marital status provides insight into the marital composition of the population.'
    },
    fields: ['Ongehuwd_13', 'Gehuwd_14', 'Gescheiden_15', 'Verweduwd_16'],
    fieldLabels: {
      nl: ['Ongehuwd', 'Gehuwd', 'Gescheiden', 'Verweduwd'],
      en: ['Unmarried', 'Married', 'Divorced', 'Widowed']
    },
    useBarChart: true
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
    ],
    fieldLabels: {
      nl: ['Autochtoon', 'Westers', 'Niet-Westers', 'Marokko', 'Antillen/Aruba', 'Suriname', 'Turkije', 'Overig Niet-Westers'],
      en: ['Native', 'Western', 'Non-Western', 'Morocco', 'Antilles/Aruba', 'Suriname', 'Turkey', 'Other Non-Western']
    },
    useBarChart: true
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
    fields: ['Eenpersoonshuishoudens_29', 'HuishoudensZonderKinderen_30', 'HuishoudensMetKinderen_31'],
    fieldLabels: {
      nl: ['Eenpersoons', 'Zonder kinderen', 'Met kinderen'],
      en: ['Single person', 'Without children', 'With children']
    },
    useBarChart: true
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
   * Get display name for a geographic level
   */
  const getLocationName = (level: GeographicLevel): string => {
    switch (level) {
      case 'national':
        return locale === 'nl' ? 'Nederland' : 'Netherlands';
      case 'municipality':
        return data.location.municipality?.statnaam || LEVEL_LABELS.municipality[locale];
      case 'district':
        return data.location.district?.statnaam || LEVEL_LABELS.district[locale];
      case 'neighborhood':
        return data.location.neighborhood?.statnaam || LEVEL_LABELS.neighborhood[locale];
    }
  };

  /**
   * Get data rows for a specific level
   * Returns empty array if data is not available for the level
   */
  const getDataForLevel = (level: GeographicLevel): UnifiedDataRow[] => {
    switch (level) {
      case 'national':
        return data.demographics?.national ?? [];
      case 'municipality':
        return data.demographics?.municipality ?? [];
      case 'district':
        return data.demographics?.district ?? [];
      case 'neighborhood':
        return data.demographics?.neighborhood ?? [];
      default:
        return [];
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

    // For income, format as "27.1€ (x1.000)" - data is already in thousands
    if (sectionId === 'income' && row.relative !== null) {
      const value = row.relative.toFixed(1);
      return `${value}€ (x1.000)`;
    }

    return row.displayRelative || row.displayAbsolute || '-';
  };

  const selectedData = getDataForLevel(selectedLevel);
  const comparisonData = getDataForLevel(comparisonLevel);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Only show header and charts when not expanded */}
      {!isExpanded && (
        <>
          {/* Header with Dropdowns - Horizontally Centered */}
          <GeographicLevelSelector
            selectedLevel={selectedLevel}
            comparisonLevel={comparisonLevel}
            availableLevels={availableLevels}
            onSelectedLevelChange={setSelectedLevel}
            onComparisonLevelChange={setComparisonLevel}
            levelLabels={LEVEL_LABELS}
            locale={locale}
          />

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

                // Calculate combined max Y value for consistent scale across both charts
                // Guard against empty arrays to prevent Math.max() returning -Infinity
                const maxYValue = chartData.length > 0 || comparisonChartData.length > 0
                  ? Math.max(...[...chartData, ...comparisonChartData].map(d => d.y))
                  : 100;

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
                        <div className="flex items-center justify-center gap-12">
                          {/* Selected Level Value */}
                          <div className="flex flex-col items-center">
                            <div className="text-sm text-gray-500 mb-2">
                              {getLocationName(selectedLevel)}
                            </div>
                            <div className="text-4xl font-bold text-gray-900">
                              {getDisplayValue(selectedData, section.fields[0], section.id)}
                            </div>
                          </div>

                          {/* Comparison Level Value */}
                          <div className="flex flex-col items-center opacity-60">
                            <div className="text-sm text-gray-500 mb-2">
                              {getLocationName(comparisonLevel)}
                            </div>
                            <div className="text-4xl font-bold text-gray-600">
                              {getDisplayValue(comparisonData, section.fields[0], section.id)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {/* Selected data chart (background) */}
                          {chartData.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-0">
                              <DensityChart
                                data={chartData}
                                width={400}
                                height={120}
                                mode={section.useBarChart ? "histogram" : "area"}
                                showLabels={section.useBarChart ? false : true}
                                showGrid={false}
                                tooltipLabels={section.fieldLabels?.[locale]}
                                customAxisLabels={section.customAxisLabels}
                                maxY={maxYValue}
                              />
                            </div>
                          )}

                          {/* Comparison chart at 30% opacity (foreground) */}
                          {comparisonChartData.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 z-10 pointer-events-none">
                              <DensityChart
                                data={comparisonChartData}
                                width={400}
                                height={120}
                                mode={section.useBarChart ? "histogram" : "area"}
                                showLabels={false}
                                showGrid={false}
                                maxY={maxYValue}
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

      {/* Expanded Table Section - Full Screen */}
      {isExpanded && (
        <div className="flex-1 flex flex-col h-full bg-gray-50">
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
      )}
    </div>
  );
};
