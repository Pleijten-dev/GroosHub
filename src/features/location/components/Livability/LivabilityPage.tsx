/**
 * Livability Page Component
 * Displays livability metrics with charts and values
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { UnifiedLocationData, UnifiedDataRow } from '../../data/aggregator/multiLevelAggregator';
import { DensityChart } from '../../../../shared/components/common';
import type { DensityChartData } from '../../../../shared/components/common/DensityChart/DensityChart';
import {
  GeographicLevelSelector,
  ExpandButton,
  DataSection,
  ComparisonTable,
  type GeographicLevel,
  type ComparisonTableRow
} from '../shared';

interface LivabilityPageProps {
  data: UnifiedLocationData;
  locale: 'nl' | 'en';
}

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
            <ComparisonTable
              rows={section.fields.map((field, i) => {
                const selectedValue = getFieldValue(selectedRows, field);
                const comparisonValue = getFieldValue(comparisonRows, field);
                const label = section.fieldLabels?.[locale]?.[i] ?? 'Unknown';
                return {
                  label,
                  selectedValue: selectedValue !== null ? `${selectedValue.toFixed(1)}%` : 'n/a',
                  comparisonValue: comparisonValue !== null ? `${comparisonValue.toFixed(1)}%` : 'n/a'
                };
              })}
              locale={locale}
            />
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
    <div className="h-full w-full flex flex-col bg-white">
      {/* Geographic Level Selector */}
      <GeographicLevelSelector
        selectedLevel={selectedArea}
        comparisonLevel={comparisonLevel}
        availableLevels={availableLevels}
        onSelectedLevelChange={setSelectedArea}
        onComparisonLevelChange={setComparisonLevel}
        levelLabels={LEVEL_LABELS}
        locale={locale}
      />

      {/* Sections */}
      <div className="flex-1 overflow-auto px-6">
        <div className="space-y-0">
          {LIVABILITY_SECTIONS.map((section) => (
            <DataSection
              key={section.id}
              title={section.title[locale]}
              description={section.description[locale]}
              expandButton={
                section.type === 'chart' ? (
                  <ExpandButton
                    isExpanded={expandedSection === section.id}
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  />
                ) : undefined
              }
            >
              {renderSectionContent(section)}
            </DataSection>
          ))}
        </div>
      </div>
    </div>
  );
};
