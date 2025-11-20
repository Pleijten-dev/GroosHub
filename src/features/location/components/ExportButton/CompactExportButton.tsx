/**
 * Compact Export Button Component
 * Exports location data in LLM-optimized compact format
 */

import React from 'react';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import { exportCompactForLLM, downloadCompactJSON } from '../../utils/jsonExportCompact';

interface CompactExportButtonProps {
  data: UnifiedLocationData;
  personaScores: PersonaScore[];
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
  };
  locale: 'nl' | 'en';
  amenitiesData: AmenityMultiCategoryResponse | null;
}

export const CompactExportButton: React.FC<CompactExportButtonProps> = ({
  data,
  personaScores,
  scenarios,
  locale,
  amenitiesData,
}) => {
  const handleExport = () => {
    // Get custom scenario from localStorage if available
    let customScenarioPersonaIds: string[] = [];
    try {
      const stored = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
      if (stored) {
        const { scenario, customIds } = JSON.parse(stored);
        if (scenario === 'custom' && customIds && Array.isArray(customIds)) {
          customScenarioPersonaIds = customIds;
        }
      }
    } catch (error) {
      console.error('Failed to load custom scenario from cache:', error);
    }

    const exportData = exportCompactForLLM(data, personaScores, scenarios, locale, customScenarioPersonaIds, amenitiesData);

    // Generate filename
    const locationName =
      data.location.neighborhood?.statnaam ||
      data.location.district?.statnaam ||
      data.location.municipality.statnaam;
    const date = new Date().toISOString().split('T')[0];
    const filename = `${locationName.replace(/\s+/g, '-')}-compact-${date}.json`;

    downloadCompactJSON(exportData, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="font-medium">
        {locale === 'nl' ? 'Export voor LLM (Compact)' : 'Export for LLM (Compact)'}
      </span>
    </button>
  );
};
