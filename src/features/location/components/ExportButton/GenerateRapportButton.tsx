'use client';

/**
 * GenerateRapportButton - Consolidated report generation button
 *
 * This component replaces multiple export buttons with a single unified workflow:
 * 1. Export JSON for LLM (compact)
 * 2. Send to LLM for building program generation (or use placeholder)
 * 3. Capture maps, cube visualizations, legends
 * 4. Construct complete PDF booklet
 */

import React, { useState, useCallback } from 'react';
import {
  generateUnifiedRapport,
  loadPlaceholderBuildingProgram,
  loadPlaceholderCompactData,
  type LLMBuildingProgram,
  type CompactExportData,
  type CubeCaptureResult,
  type MapCaptureResult,
} from '../../utils/unifiedRapportGenerator';
import { generateCompactExportData } from '../../utils/jsonExportCompact';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { PersonaScore } from '../../data/scoring/calculatePersonaScores';

interface GenerateRapportButtonProps {
  locale: 'nl' | 'en';
  data: UnifiedLocationData;
  amenitiesData: AmenityMultiCategoryResponse | null;
  personaScores: PersonaScore[];
  cubeRef?: React.RefObject<HTMLDivElement | null>;
  scenarios?: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
    customScenario?: number[];
  };
  pveData?: {
    totalM2: number;
    percentages: {
      apartments: number;
      commercial: number;
      hospitality: number;
      social: number;
      communal: number;
      offices: number;
    };
  };
  usePlaceholder?: boolean; // Use placeholder JSON instead of LLM call
  className?: string;
}

type GenerationStage =
  | 'idle'
  | 'preparing'
  | 'exporting-json'
  | 'generating-llm'
  | 'capturing-visuals'
  | 'building-pdf'
  | 'complete'
  | 'error';

const STAGE_MESSAGES = {
  nl: {
    idle: 'Genereer Rapport',
    preparing: 'Voorbereiden...',
    'exporting-json': 'Data exporteren...',
    'generating-llm': 'AI analyse genereren...',
    'capturing-visuals': 'Visualisaties vastleggen...',
    'building-pdf': 'PDF samenstellen...',
    complete: 'Voltooid!',
    error: 'Fout opgetreden',
  },
  en: {
    idle: 'Generate Report',
    preparing: 'Preparing...',
    'exporting-json': 'Exporting data...',
    'generating-llm': 'Generating AI analysis...',
    'capturing-visuals': 'Capturing visualizations...',
    'building-pdf': 'Building PDF...',
    complete: 'Complete!',
    error: 'Error occurred',
  },
};

export function GenerateRapportButton({
  locale,
  data,
  amenitiesData,
  personaScores,
  cubeRef,
  scenarios,
  pveData,
  usePlaceholder = true, // Default to placeholder to save LLM costs
  className,
}: GenerateRapportButtonProps) {
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const messages = STAGE_MESSAGES[locale];

  // Capture cube visualization
  const captureCube = useCallback(async (
    scenarioName: string
  ): Promise<CubeCaptureResult | null> => {
    // TODO: Implement cube capture from cubeRef
    // For now, return null and let the PDF handle missing cubes gracefully
    return null;
  }, [cubeRef]);

  // Generate the report
  const handleGenerate = useCallback(async () => {
    if (stage !== 'idle' && stage !== 'error' && stage !== 'complete') return;

    setStage('preparing');
    setProgress(0);
    setError(null);

    try {
      // Stage 1: Prepare/export JSON data
      setStage('exporting-json');
      setProgress(10);

      let compactData: CompactExportData;
      let buildingProgram: LLMBuildingProgram;

      if (usePlaceholder) {
        // Use placeholder files to avoid LLM costs
        compactData = await loadPlaceholderCompactData();
        buildingProgram = await loadPlaceholderBuildingProgram();
      } else {
        // Generate real data
        // TODO: Implement real LLM call
        const exportData = generateCompactExportData(data, amenitiesData, personaScores, pveData);
        compactData = exportData as unknown as CompactExportData;

        // Stage 2: Call LLM for building program
        setStage('generating-llm');
        setProgress(30);

        // TODO: Implement actual LLM API call
        // For now, use placeholder
        buildingProgram = await loadPlaceholderBuildingProgram();
      }

      setProgress(50);

      // Stage 3: Capture visualizations
      setStage('capturing-visuals');
      setProgress(60);

      // Capture cube visualizations
      const cubeCaptures: Record<string, CubeCaptureResult> = {};

      // TODO: Implement actual cube captures
      // For now, we'll generate the PDF without cube images

      // Capture map screenshots if available
      const mapCaptures: MapCaptureResult[] = [];

      // TODO: Implement map captures from the Kaarten tab

      setProgress(70);

      // Stage 4: Build PDF
      setStage('building-pdf');
      setProgress(80);

      const pdfBlob = await generateUnifiedRapport(
        compactData,
        buildingProgram,
        cubeCaptures,
        mapCaptures,
        {
          locale,
          includeMapAnalysis: mapCaptures.length > 0,
          includeCubeVisualizations: Object.keys(cubeCaptures).length > 0,
        }
      );

      setProgress(95);

      // Download the PDF
      const date = new Date().toISOString().split('T')[0];
      const locationName = compactData.metadata.location || 'location';
      const filename = `${locationName.replace(/\s+/g, '-')}-rapport-${date}.pdf`;

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStage('complete');

      // Reset after a delay
      setTimeout(() => {
        setStage('idle');
        setProgress(0);
      }, 2000);

    } catch (err) {
      console.error('Report generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStage('error');
    }
  }, [stage, usePlaceholder, data, amenitiesData, personaScores, pveData, locale]);

  const isGenerating = stage !== 'idle' && stage !== 'error' && stage !== 'complete';

  return (
    <div className={className}>
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={`
          relative w-full px-4 py-3 rounded-lg font-medium text-white
          transition-all duration-200 overflow-hidden
          ${isGenerating
            ? 'bg-primary/70 cursor-wait'
            : stage === 'error'
              ? 'bg-red-500 hover:bg-red-600'
              : stage === 'complete'
                ? 'bg-green-500'
                : 'bg-primary hover:bg-primary-hover active:scale-[0.98]'
          }
        `}
      >
        {/* Progress bar background */}
        {isGenerating && (
          <div
            className="absolute inset-0 bg-primary-hover transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Button content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isGenerating && (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          {stage === 'complete' && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}

          {stage === 'error' && (
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}

          <span>{messages[stage]}</span>

          {isGenerating && (
            <span className="text-sm opacity-75">({progress}%)</span>
          )}
        </span>
      </button>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Stage description */}
      {isGenerating && (
        <p className="mt-2 text-sm text-gray-500 text-center">
          {locale === 'nl'
            ? 'Dit kan enkele seconden duren...'
            : 'This may take a few seconds...'}
        </p>
      )}
    </div>
  );
}

export default GenerateRapportButton;
