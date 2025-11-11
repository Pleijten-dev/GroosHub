/**
 * Livability Page Component
 * Displays livability metrics with charts and values
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { DensityChart } from '../../../../shared/components/common';
import type { DensityChartData } from '../../../../shared/components/common/DensityChart/DensityChart';

interface LivabilityPageProps {
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

interface LivabilitySection {
  id: string;
  title: { nl: string; en: string };
  description: { nl: string; en: string };
  type: 'chart' | 'value' | 'score';
  fields?: string[];
  field?: string;
  fieldLabels?: { nl: string[]; en: string[] };
  source: 'livability' | 'health';
}

const LIVABILITY_SECTIONS: LivabilitySection[] = [
  {
    id: 'onderhoud',
    title: { nl: 'ONDERHOUD', en: 'MAINTENANCE' },
    description: {
      nl: 'Tevredenheid over onderhoud van de openbare ruimte',
      en: 'Satisfaction with maintenance of public spaces'
    },
    type: 'chart',
    fields: ['OnderhoudStoepenStratenEnPleintjes_1', 'OnderhoudVanPlantsoenenEnParken_2'],
    fieldLabels: {
      nl: ['Stoepen, straten en pleintjes', 'Plantsoenen en parken'],
      en: ['Sidewalks, streets and squares', 'Parks and gardens']
    },
    source: 'livability'
  },
  {
    id: 'street_lighting',
    title: { nl: 'STRAATVERLICHTING', en: 'STREET LIGHTING' },
    description: {
      nl: 'Tevredenheid over de straatverlichting',
      en: 'Satisfaction with street lighting'
    },
    type: 'value',
    field: 'Straatverlichting_3',
    source: 'livability'
  },
  {
    id: 'youth_facilities',
    title: { nl: 'JEUGDVOORZIENINGEN', en: 'YOUTH FACILITIES' },
    description: {
      nl: 'Tevredenheid over voorzieningen voor kinderen en jongeren',
      en: 'Satisfaction with facilities for children and youth'
    },
    type: 'chart',
    fields: ['SpeelplekkenVoorKinderen_4', 'VoorzieningenVoorJongeren_5'],
    fieldLabels: {
      nl: ['Speelplekken voor kinderen', 'Voorzieningen voor jongeren'],
      en: ['Play areas for children', 'Facilities for youth']
    },
    source: 'livability'
  },
  {
    id: 'contact',
    title: { nl: 'CONTACT', en: 'CONTACT' },
    description: {
      nl: 'Sociale contacten en interacties in de buurt',
      en: 'Social contacts and interactions in the neighborhood'
    },
    type: 'chart',
    fields: [
      'MensenKennenElkaarNauwelijks_7',
      'MensenGaanPrettigMetElkaarOm_8',
      'GezelligeBuurtWaarMenElkaarHelpt_9',
      'VeelContactMetAndereBuurtbewoners_11'
    ],
    fieldLabels: {
      nl: [
        'Mensen kennen elkaar nauwelijks',
        'Mensen gaan prettig met elkaar om',
        'Gezellige buurt waar men elkaar helpt',
        'Veel contact met buurtbewoners'
      ],
      en: [
        'People barely know each other',
        'People get along well',
        'Friendly neighborhood where people help',
        'Much contact with neighbors'
      ]
    },
    source: 'livability'
  },
  {
    id: 'volunteers',
    title: { nl: 'VRIJWILLIGERS', en: 'VOLUNTEERS' },
    description: {
      nl: 'Percentage dat vrijwilligerswerk doet',
      en: 'Percentage doing volunteer work'
    },
    type: 'value',
    field: 'Vrijwilligerswerk_32',
    source: 'health'
  },
  {
    id: 'social_cohesion',
    title: { nl: 'SOCIALE COHESIE', en: 'SOCIAL COHESION' },
    description: {
      nl: 'Schaalscore voor sociale cohesie in de buurt',
      en: 'Scale score for social cohesion in the neighborhood'
    },
    type: 'score',
    field: 'SocialeCohesieSchaalscore_15',
    source: 'livability'
  },
  {
    id: 'livability_score',
    title: { nl: 'LEEFBAARHEID SCORE', en: 'LIVABILITY SCORE' },
    description: {
      nl: 'Rapportcijfer voor de leefbaarheid van de woonbuurt',
      en: 'Grade for the livability of the residential area'
    },
    type: 'score',
    field: 'RapportcijferLeefbaarheidWoonbuurt_18',
    source: 'livability'
  }
];

export const LivabilityPage: React.FC<LivabilityPageProps> = ({ data, locale }) => {
  const [selectedArea, setSelectedArea] = useState<GeographicLevel>('neighborhood');
  const [comparisonLevel, setComparisonLevel] = useState<GeographicLevel>('municipality');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Get available geographic levels from both livability and health data
  const availableLevels = useMemo<GeographicLevel[]>(() => {
    const levels: GeographicLevel[] = ['municipality'];
    if (data.location.district) levels.push('district');
    if (data.location.neighborhood) levels.push('neighborhood');
    return levels;
  }, [data.location]);

  // Auto-select highest available level
  React.useEffect(() => {
    if (availableLevels.length > 0 && !availableLevels.includes(selectedArea)) {
      setSelectedArea(availableLevels[0]);
    }
  }, [availableLevels, selectedArea]);

  /**
   * Get data rows for a specific level and source
   * Note: livability only has national and municipality levels
   */
  const getDataForLevel = (level: GeographicLevel, source: 'livability' | 'health'): UnifiedDataRow[] => {
    if (source === 'livability') {
      // Livability only has national and municipality
      switch (level) {
        case 'national':
          return data.livability.national;
        case 'municipality':
        case 'district':
        case 'neighborhood':
          // Fall back to municipality for district/neighborhood
          return data.livability.municipality;
      }
    } else {
      // Health has all levels
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
  const convertToChartData = (rows: UnifiedDataRow[], fields: string[]): DensityChartData[] => {
    return fields.map((field, i) => ({
      x: i,
      y: getFieldValue(rows, field) || 0
    }));
  };

  // Helper to format score values
  const formatScore = (value: number | null): string => {
    if (value === null) return 'n/a';
    return `${value.toFixed(1)}/10`;
  };

  // Render section content
  const renderSectionContent = (section: LivabilitySection) => {
    const isExpanded = expandedSection === section.id;

    // Get data for selected area and comparison level
    const selectedRows = getDataForLevel(selectedArea, section.source);
    const comparisonRows = getDataForLevel(comparisonLevel, section.source);

    if (section.type === 'chart' && section.fields && section.fieldLabels) {
      // Bar chart visualization
      const selectedData = convertToChartData(selectedRows, section.fields);
      const comparisonData = convertToChartData(comparisonRows, section.fields);

      // Calculate max Y for consistent scaling
      const maxY = Math.max(
        ...selectedData.map(d => d.y),
        ...comparisonData.map(d => d.y),
        100
      );

      return (
        <div className="flex-1 flex flex-col">
          {!isExpanded && (
            <div className="relative h-[200px]">
              {/* Main chart */}
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <DensityChart
                  data={selectedData}
                  width={600}
                  height={200}
                  mode="histogram"
                  tooltipLabels={section.fieldLabels[locale]}
                  maxY={maxY}
                />
              </div>
              {/* Comparison chart overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 z-10 pointer-events-none">
                <DensityChart
                  data={comparisonData}
                  width={600}
                  height={200}
                  mode="histogram"
                  maxY={maxY}
                />
              </div>
            </div>
          )}

          {/* Expandable table */}
          {isExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left p-2 text-sm font-semibold text-gray-700">
                      {locale === 'nl' ? 'Categorie' : 'Category'}
                    </th>
                    <th className="text-right p-2 text-sm font-semibold text-gray-700">
                      {locale === 'nl' ? 'Geselecteerd' : 'Selected'}
                    </th>
                    <th className="text-right p-2 text-sm font-semibold text-gray-700">
                      {locale === 'nl' ? 'Vergelijking' : 'Comparison'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map((field, i) => {
                    const selectedValue = getFieldValue(selectedRows, field);
                    const comparisonValue = getFieldValue(comparisonRows, field);
                    const label = section.fieldLabels?.[locale]?.[i] ?? 'Unknown';
                    return (
                      <tr key={field} className="border-b border-gray-200">
                        <td className="p-2 text-sm text-gray-700">{label}</td>
                        <td className="p-2 text-sm text-right text-gray-900">
                          {selectedValue !== null ? `${selectedValue.toFixed(1)}%` : 'n/a'}
                        </td>
                        <td className="p-2 text-sm text-right text-gray-600">
                          {comparisonValue !== null ? `${comparisonValue.toFixed(1)}%` : 'n/a'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    if (section.type === 'value' && section.field) {
      // Simple percentage value display
      const selectedValue = getFieldValue(selectedRows, section.field);
      const comparisonValue = getFieldValue(comparisonRows, section.field);

      return (
        <div className="flex-1 flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'nl' ? 'Geselecteerd' : 'Selected'}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {selectedValue !== null ? `${selectedValue.toFixed(1)}%` : 'n/a'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'nl' ? 'Vergelijking' : 'Comparison'}
            </div>
            <div className="text-3xl font-bold text-gray-600">
              {comparisonValue !== null ? `${comparisonValue.toFixed(1)}%` : 'n/a'}
            </div>
          </div>
        </div>
      );
    }

    if (section.type === 'score' && section.field) {
      // Score value display (x/10 format)
      const selectedValue = getFieldValue(selectedRows, section.field);
      const comparisonValue = getFieldValue(comparisonRows, section.field);

      return (
        <div className="flex-1 flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'nl' ? 'Geselecteerd' : 'Selected'}
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {formatScore(selectedValue)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">
              {locale === 'nl' ? 'Vergelijking' : 'Comparison'}
            </div>
            <div className="text-3xl font-bold text-gray-600">
              {formatScore(comparisonValue)}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-lg overflow-auto h-full">
      {/* Header */}
      <div className="mb-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {locale === 'nl' ? 'Leefbaarheid' : 'Livability'}
        </h1>
        <p className="text-sm text-gray-600">
          {locale === 'nl'
            ? 'Analyse van leefbaarheidsindicatoren voor het geselecteerde gebied'
            : 'Analysis of livability indicators for the selected area'}
        </p>
      </div>

      {/* Dropdowns */}
      <div className="flex gap-4 mb-lg">
        {/* Area selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === 'nl' ? 'Selecteer gebied' : 'Select area'}
          </label>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value as GeographicLevel)}
            className="w-full px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-gray-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableLevels.includes('neighborhood') && (
              <option value="neighborhood">
                {data.location.neighborhood?.statnaam || LEVEL_LABELS.neighborhood[locale]}
              </option>
            )}
            {availableLevels.includes('district') && (
              <option value="district">
                {data.location.district?.statnaam || LEVEL_LABELS.district[locale]}
              </option>
            )}
            {availableLevels.includes('municipality') && (
              <option value="municipality">
                {data.location.municipality.statnaam || LEVEL_LABELS.municipality[locale]}
              </option>
            )}
          </select>
        </div>

        {/* Comparison level selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {locale === 'nl' ? 'Vergelijk met' : 'Compare with'}
          </label>
          <select
            value={comparisonLevel}
            onChange={(e) => setComparisonLevel(e.target.value as GeographicLevel)}
            className="w-full px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-gray-200/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="national">{LEVEL_LABELS.national[locale]}</option>
            {availableLevels.includes('municipality') && (
              <option value="municipality">
                {data.location.municipality.statnaam || LEVEL_LABELS.municipality[locale]}
              </option>
            )}
            {availableLevels.includes('district') && (
              <option value="district">
                {data.location.district?.statnaam || LEVEL_LABELS.district[locale]}
              </option>
            )}
            {availableLevels.includes('neighborhood') && (
              <option value="neighborhood">
                {data.location.neighborhood?.statnaam || LEVEL_LABELS.neighborhood[locale]}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-0">
        {LIVABILITY_SECTIONS.map((section) => (
          <div
            key={section.id}
            className="flex gap-4 py-6 border-b border-gray-200 last:border-b-0"
          >
            {/* Title - 25% width */}
            <div className="w-1/4 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{section.title[locale]}</h2>
            </div>

            {/* Description - 20% width */}
            <div className="w-1/5 flex-shrink-0">
              <p className="text-sm text-gray-600">{section.description[locale]}</p>
            </div>

            {/* Content area - remaining space */}
            {renderSectionContent(section)}

            {/* Expand/collapse arrow (only for charts) */}
            {section.type === 'chart' && (
              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label={expandedSection === section.id ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
