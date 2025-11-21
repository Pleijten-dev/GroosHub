/**
 * Generate Building Program Button Component
 * Sends rapport data to Claude AI to generate a detailed building program
 * Now with streaming support and progress tracking
 */

'use client';

import React, { useState } from 'react';
import { exportCompactForLLM } from '../../utils/jsonExportCompact';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';
import { locationDataCache } from '../../data/cache/locationDataCache';
import { GenerationProgressModal, type GenerationStep } from './GenerationProgressModal';

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
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildingProgram | null>(null);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [partialData, setPartialData] = useState<any>(null);

  const initializeSteps = (): GenerationStep[] => {
    return [
      {
        id: 'analyze',
        label: locale === 'nl' ? 'Analyseren locatiegegevens' : 'Analyzing location data',
        status: 'in_progress',
      },
      {
        id: 'location_summary',
        label: locale === 'nl' ? 'Locatiesamenvatting maken' : 'Creating location summary',
        status: 'pending',
      },
      {
        id: 'generalized_pve',
        label: locale === 'nl' ? 'Algemeen PVE opstellen' : 'Generating generalized program',
        status: 'pending',
      },
      {
        id: 'scenario_1',
        label: locale === 'nl' ? 'Scenario 1 uitwerken' : 'Developing Scenario 1',
        status: 'pending',
      },
      {
        id: 'scenario_2',
        label: locale === 'nl' ? 'Scenario 2 uitwerken' : 'Developing Scenario 2',
        status: 'pending',
      },
      {
        id: 'scenario_3',
        label: locale === 'nl' ? 'Scenario 3 uitwerken' : 'Developing Scenario 3',
        status: 'pending',
      },
      {
        id: 'comparative',
        label: locale === 'nl' ? 'Vergelijkende analyse maken' : 'Creating comparative analysis',
        status: 'pending',
      },
      {
        id: 'finalize',
        label: locale === 'nl' ? 'Rapport afronden' : 'Finalizing report',
        status: 'pending',
      },
    ];
  };

  const updateStepStatus = (stepId: string, status: GenerationStep['status'], details?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, details } : step
    ));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setShowModal(true);
      setError(null);
      setResult(null);
      setPartialData(null);

      const initialSteps = initializeSteps();
      setSteps(initialSteps);

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

      updateStepStatus('analyze', 'completed');
      updateStepStatus('location_summary', 'in_progress');

      // Send to API with streaming
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let buildingProgram: BuildingProgram | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON objects from the stream
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // The AI SDK sends data in the format: "0:{partial_json}\n"
            const jsonMatch = line.match(/^\d+:(.+)$/);
            if (jsonMatch) {
              const partial = JSON.parse(jsonMatch[1]);
              setPartialData(partial);

              // Update steps based on what's been generated
              if (partial.location_summary) {
                updateStepStatus('location_summary', 'completed');
                updateStepStatus('generalized_pve', 'in_progress');
              }

              if (partial.generalized_pve) {
                updateStepStatus('generalized_pve', 'completed');
                updateStepStatus('scenario_1', 'in_progress');
              }

              if (partial.scenarios && partial.scenarios.length > 0) {
                updateStepStatus('scenario_1', 'completed');
                if (partial.scenarios.length > 1) {
                  updateStepStatus('scenario_2', 'in_progress');
                }
              }

              if (partial.scenarios && partial.scenarios.length > 1) {
                updateStepStatus('scenario_2', 'completed');
                if (partial.scenarios.length > 2) {
                  updateStepStatus('scenario_3', 'in_progress');
                }
              }

              if (partial.scenarios && partial.scenarios.length > 2) {
                updateStepStatus('scenario_3', 'completed');
                updateStepStatus('comparative', 'in_progress');
              }

              if (partial.comparative_analysis) {
                updateStepStatus('comparative', 'completed');
                updateStepStatus('finalize', 'in_progress');
              }

              // Check if complete
              if (partial.location_summary && partial.scenarios && partial.comparative_analysis) {
                buildingProgram = partial as BuildingProgram;
              }
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
            console.debug('Streaming parse error (expected):', e);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const jsonMatch = buffer.match(/^\d+:(.+)$/);
          if (jsonMatch) {
            const final = JSON.parse(jsonMatch[1]);
            buildingProgram = final as BuildingProgram;
          }
        } catch (e) {
          console.error('Final buffer parse error:', e);
        }
      }

      if (!buildingProgram) {
        throw new Error('Failed to parse complete building program from stream');
      }

      updateStepStatus('finalize', 'completed');
      setResult(buildingProgram);

      // Save rapport to cache
      const locationName =
        data.location.neighborhood?.statnaam ||
        data.location.district?.statnaam ||
        data.location.municipality.statnaam;

      const cacheSuccess = locationDataCache.setRapport(locationName, buildingProgram);

      if (cacheSuccess) {
        console.log('Rapport saved to cache successfully');
        localStorage.setItem('grooshub_current_address', locationName);
      } else {
        console.warn('Failed to save rapport to cache');
      }

      // Download the result as JSON
      const date = new Date().toISOString().split('T')[0];
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

      // Keep modal open for 2 seconds to show completion
      setTimeout(() => {
        setShowModal(false);
      }, 2000);

    } catch (err) {
      console.error('Error generating building program:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      // Mark current in-progress step as error
      setSteps(prev => prev.map(step =>
        step.status === 'in_progress' ? { ...step, status: 'error', details: errorMessage } : step
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseModal = () => {
    if (!isGenerating) {
      setShowModal(false);
    }
  };

  return (
    <>
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

        {error && !showModal && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>{locale === 'nl' ? 'Fout:' : 'Error:'}</strong> {error}
          </div>
        )}

        {result && !error && !showModal && (
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

      <GenerationProgressModal
        isOpen={showModal}
        steps={steps}
        partialData={partialData}
        locale={locale}
      />
    </>
  );
};
