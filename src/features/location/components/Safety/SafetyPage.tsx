"use client";

import React, { useState, useMemo } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { MultiLevelDataTable } from '../DataTables';

interface SafetyPageProps {
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

interface SafetySection {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  field: string; // The field key to display
  source: 'safety' | 'livability'; // Which data source to use
}

const SAFETY_SECTIONS: SafetySection[] = [
  {
    id: 'total_crimes',
    title: { nl: 'TOTAAL MISDRIJVEN', en: 'TOTAL CRIMES' },
    description: {
      nl: 'Het totale aantal geregistreerde misdrijven per 100 inwoners.',
      en: 'The total number of registered crimes per 100 residents.'
    },
    field: 'Crime_0.0.0',
    source: 'safety'
  },
  {
    id: 'burglary',
    title: { nl: 'INBRAAK WONING', en: 'BURGLARY' },
    description: {
      nl: 'Aantal woninginbraken per 100 inwoners.',
      en: 'Number of home burglaries per 100 residents.'
    },
    field: 'Crime_1.1.1',
    source: 'safety'
  },
  {
    id: 'pickpocketing',
    title: { nl: 'ZAKKENROLLERIJ', en: 'PICKPOCKETING' },
    description: {
      nl: 'Aantal zakkenrollerijen per 100 inwoners.',
      en: 'Number of pickpocketing incidents per 100 residents.'
    },
    field: 'Crime_1.2.4',
    source: 'safety'
  },
  {
    id: 'accidents',
    title: { nl: 'ONGEVALLEN (WEG)', en: 'ACCIDENTS (ROAD)' },
    description: {
      nl: 'Aantal verkeersongevallen per 100 inwoners.',
      en: 'Number of traffic accidents per 100 residents.'
    },
    field: 'Crime_1.3.1',
    source: 'safety'
  },
  {
    id: 'feels_unsafe',
    title: { nl: 'VOELT ZICH WELEENS ONVEILIG', en: 'FEELS UNSAFE SOMETIMES' },
    description: {
      nl: 'Percentage inwoners dat zich weleens onveilig voelt.',
      en: 'Percentage of residents who sometimes feel unsafe.'
    },
    field: 'VoeltZichWeleensOnveilig_43',
    source: 'livability'
  },
  {
    id: 'street_lighting',
    title: { nl: 'STRAATVERLICHTING', en: 'STREET LIGHTING' },
    description: {
      nl: 'Tevredenheid over straatverlichting in de buurt.',
      en: 'Satisfaction with street lighting in the neighborhood.'
    },
    field: 'Straatverlichting_3',
    source: 'livability'
  }
];

/**
 * SafetyPage - Displays safety data with value comparisons
 */
export const SafetyPage: React.FC<SafetyPageProps> = ({ data, locale }) => {
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
   * Get data rows for a specific level and source
   */
  const getDataForLevel = (level: GeographicLevel, source: 'safety' | 'livability'): UnifiedDataRow[] => {
    if (source === 'safety') {
      switch (level) {
        case 'national':
          return data.safety.national;
        case 'municipality':
          return data.safety.municipality;
        case 'district':
          return data.safety.district;
        case 'neighborhood':
          return data.safety.neighborhood;
      }
    } else {
      // Livability only has national and municipality levels
      switch (level) {
        case 'national':
          return data.livability.national;
        case 'municipality':
        case 'district':
        case 'neighborhood':
          return data.livability.municipality;
      }
    }
  };

  /**
   * Get the display value for a field as percentage
   */
  const getDisplayValue = (level: GeographicLevel, fieldKey: string, source: 'safety' | 'livability'): string => {
    const rows = getDataForLevel(level, source);
    const row = rows.find(r => r.key === fieldKey);

    if (!row || row.relative === null) return '-';

    // Display as percentage with 1 decimal place
    return `${row.relative.toFixed(1)}%`;
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Only show header and sections when not expanded */}
      {!isExpanded && (
        <>
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

          {/* Main Content - Safety Sections */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-0">
              {SAFETY_SECTIONS.map((section) => {
                const selectedValue = getDisplayValue(selectedLevel, section.field, section.source);
                const comparisonValue = getDisplayValue(comparisonLevel, section.field, section.source);

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

                    {/* Values - remaining space */}
                    <div className="flex-1 flex items-center justify-center gap-12">
                      {/* Selected Level Value */}
                      <div className="flex flex-col items-center">
                        <div className="text-sm text-gray-500 mb-2">
                          {LEVEL_LABELS[selectedLevel][locale]}
                        </div>
                        <div className="text-4xl font-bold text-gray-900">
                          {selectedValue}
                        </div>
                      </div>

                      {/* Comparison Level Value */}
                      <div className="flex flex-col items-center opacity-60">
                        <div className="text-sm text-gray-500 mb-2">
                          {LEVEL_LABELS[comparisonLevel][locale]}
                        </div>
                        <div className="text-4xl font-bold text-gray-600">
                          {comparisonValue}
                        </div>
                      </div>
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
              {locale === 'nl' ? 'Volledige Veiligheids Tabel' : 'Full Safety Table'}
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
              defaultSource="safety"
              lockSourceFilter={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
