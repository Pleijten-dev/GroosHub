/**
 * Generate Building Program Button Component
 * Sends rapport data to Claude AI to generate a detailed building program
 */

'use client';

import React, { useState } from 'react';
import { exportCompactForLLM } from '../../utils/jsonExportCompact';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';

export interface GenerateProgramButtonProps {
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

export const GenerateProgramButton: React.FC<GenerateProgramButtonProps> = ({
  data,
  personaScores,
  scenarios,
  locale,
  amenitiesData,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingProgram | null>(null);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);

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
      } catch (err) {
        console.error('Failed to load custom scenario from cache:', err);
      }

      // Generate the compact rapport data
      const rapportData = exportCompactForLLM(data, personaScores, scenarios, locale, customScenarioPersonaIds, amenitiesData);

      // Send to API
      const response = await fetch('/api/generate-building-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rapportData,
          locale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate building program');
      }

      const buildingProgram = await response.json();
      setResult(buildingProgram);

      // Download the result as JSON
      const date = new Date().toISOString().split('T')[0];
      const locationName =
        data.location.neighborhood?.statnaam ||
        data.location.district?.statnaam ||
        data.location.municipality.statnaam;
      const filename = `${locationName.replace(/\s+/g, '-')}-building-program-${date}.json`;

      const jsonString = JSON.stringify(buildingProgram, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating building program:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">
              {locale === 'nl' ? 'Genereren...' : 'Generating...'}
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-medium">
              {locale === 'nl' ? 'Genereer Bouwprogramma met AI' : 'Generate Building Program with AI'}
            </span>
          </>
        )}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <strong>{locale === 'nl' ? 'Fout:' : 'Error:'}</strong> {error}
        </div>
      )}

      {result && !error && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>{locale === 'nl' ? '✓ Succes!' : '✓ Success!'}</strong>
          {' '}
          {locale === 'nl'
            ? 'Bouwprogramma gegenereerd en gedownload.'
            : 'Building program generated and downloaded.'}
        </div>
      )}

      {result && (
        <div className="text-xs text-gray-600 mt-2">
          <p>
            {locale === 'nl'
              ? `${result.scenarios?.length || 0} scenario's gegenereerd`
              : `${result.scenarios?.length || 0} scenarios generated`}
          </p>
        </div>
      )}
    </div>
  );
};
