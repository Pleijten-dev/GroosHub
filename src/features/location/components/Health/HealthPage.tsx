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

interface HealthPageProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
}

const LEVEL_LABELS = {
  national: { nl: 'Nederland (Landelijk)', en: 'Netherlands (National)' },
  municipality: { nl: 'Gemeente', en: 'Municipality' },
  district: { nl: 'Wijk', en: 'District' },
  neighborhood: { nl: 'Buurt', en: 'Neighborhood' },
};

interface HealthSection {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  fields: string[]; // The field keys to display
  fieldLabels?: { nl: string[]; en: string[] }; // Human-readable labels for tooltips
  isValue?: boolean; // If true, just display the value instead of a chart
}

const HEALTH_SECTIONS: HealthSection[] = [
  {
    id: 'experienced_health',
    title: { nl: 'ERVAREN GEZONDHEID', en: 'EXPERIENCED HEALTH' },
    description: {
      nl: 'Percentage inwoners met goede of zeer goede ervaren gezondheid.',
      en: 'Percentage of residents with good or very good experienced health.'
    },
    fields: ['ErvarenGezondheidGoedZeerGoed_4'],
    isValue: true
  },
  {
    id: 'sports',
    title: { nl: 'SPORTEN', en: 'SPORTS' },
    description: {
      nl: 'Percentage inwoners dat wekelijks sport.',
      en: 'Percentage of residents who exercise weekly.'
    },
    fields: ['WekelijkseSporters_6'],
    isValue: true
  },
  {
    id: 'weight',
    title: { nl: 'GEWICHT', en: 'WEIGHT' },
    description: {
      nl: 'Verdeling van gewicht onder de bevolking.',
      en: 'Weight distribution among the population.'
    },
    fields: ['Ondergewicht_7', 'NormaalGewicht_8', 'Overgewicht_9', 'ErnstigOvergewicht_10'],
    fieldLabels: {
      nl: ['Ondergewicht', 'Normaal', 'Overgewicht', 'Ernstig overgewicht'],
      en: ['Underweight', 'Normal', 'Overweight', 'Severely overweight']
    }
  },
  {
    id: 'smoker',
    title: { nl: 'ROKER', en: 'SMOKER' },
    description: {
      nl: 'Percentage inwoners dat rookt.',
      en: 'Percentage of residents who smoke.'
    },
    fields: ['Roker_11'],
    isValue: true
  },
  {
    id: 'alcohol',
    title: { nl: 'ALCOHOLGEBRUIK', en: 'ALCOHOL USE' },
    description: {
      nl: 'Verdeling van alcoholgebruik onder de bevolking.',
      en: 'Alcohol consumption distribution among the population.'
    },
    fields: ['VoldoetAanAlcoholRichtlijn_12', 'Drinker_13', 'ZwareDrinker_14', 'OvermatigeDrinker_15'],
    fieldLabels: {
      nl: ['Volgens richtlijn', 'Drinker', 'Zware drinker', 'Overmatig'],
      en: ['Meets guideline', 'Drinker', 'Heavy drinker', 'Excessive']
    }
  },
  {
    id: 'limited_health',
    title: { nl: 'BEPERKT VANWEGE GEZONDHEID', en: 'LIMITED DUE TO HEALTH' },
    description: {
      nl: 'Percentage inwoners beperkt vanwege gezondheid.',
      en: 'Percentage of residents limited due to health.'
    },
    fields: ['BeperktVanwegeGezondheid_17'],
    isValue: true
  },
  {
    id: 'loneliness',
    title: { nl: 'EENZAAM', en: 'LONELINESS' },
    description: {
      nl: 'Verdeling van eenzaamheid onder de bevolking.',
      en: 'Loneliness distribution among the population.'
    },
    fields: ['Eenzaam_27', 'ErnstigZeerErnstigEenzaam_28', 'EmotioneelEenzaam_29', 'SociaalEenzaam_30'],
    fieldLabels: {
      nl: ['Eenzaam', 'Ernstig eenzaam', 'Emotioneel', 'Sociaal'],
      en: ['Lonely', 'Severely lonely', 'Emotional', 'Social']
    }
  },
  {
    id: 'emotional_support',
    title: { nl: 'MIST EMOTIONELE STEUN', en: 'LACKS EMOTIONAL SUPPORT' },
    description: {
      nl: 'Percentage inwoners dat emotionele steun mist.',
      en: 'Percentage of residents lacking emotional support.'
    },
    fields: ['MistEmotioneleSteun_23'],
    isValue: true
  },
  {
    id: 'psychological_health',
    title: { nl: 'PSYCHOLOGISCHE GEZONDHEID', en: 'PSYCHOLOGICAL HEALTH' },
    description: {
      nl: 'Indicatoren voor psychologische gezondheid.',
      en: 'Indicators for psychological health.'
    },
    fields: ['SuicideGedachtenLaatste12Maanden_24', 'HoogRisicoOpAngstOfDepressie_25', 'HeelVeelStressInAfgelopen4Weken_26'],
    fieldLabels: {
      nl: ['Suïcidegedachten', 'Risico angst/depressie', 'Veel stress'],
      en: ['Suicidal thoughts', 'Risk anxiety/depression', 'High stress']
    }
  }
];

/**
 * HealthPage - Displays health data with charts and values
 */
export const HealthPage: React.FC<HealthPageProps> = ({ data, locale }) => {
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
   */
  const getDataForLevel = (level: GeographicLevel): UnifiedDataRow[] => {
    switch (level) {
      case 'national':
        return data.health.national;
      case 'municipality':
        return data.health.municipality;
      case 'district':
        return data.health.district;
      case 'neighborhood':
        return data.health.neighborhood;
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
   * Get the display value for a field as percentage
   */
  const getDisplayValue = (rows: UnifiedDataRow[], fieldKey: string): string => {
    const row = rows.find(r => r.key === fieldKey);
    if (!row || row.relative === null) return '-';
    return `${row.relative.toFixed(1)}%`;
  };

  const selectedData = getDataForLevel(selectedLevel);
  const comparisonData = getDataForLevel(comparisonLevel);

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Only show header and sections when not expanded */}
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

          {/* Main Content - Health Sections */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-0">
              {HEALTH_SECTIONS.map((section) => {
                const chartData = section.isValue
                  ? []
                  : createChartData(section.fields, selectedData);
                const comparisonChartData = section.isValue
                  ? []
                  : createChartData(section.fields, comparisonData);

                // Calculate combined max Y value for consistent scale across both charts
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
                              {getDisplayValue(selectedData, section.fields[0])}
                            </div>
                          </div>

                          {/* Comparison Level Value */}
                          <div className="flex flex-col items-center opacity-60">
                            <div className="text-sm text-gray-500 mb-2">
                              {getLocationName(comparisonLevel)}
                            </div>
                            <div className="text-4xl font-bold text-gray-600">
                              {getDisplayValue(comparisonData, section.fields[0])}
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
                                mode="histogram"
                                showLabels={false}
                                showGrid={false}
                                tooltipLabels={section.fieldLabels?.[locale]}
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
                                mode="histogram"
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
              {locale === 'nl' ? 'Volledige Gezondheids Tabel' : 'Full Health Table'}
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
              defaultSource="health"
              lockSourceFilter={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
