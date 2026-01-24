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
  type PersonaBasic,
} from '../../utils/unifiedRapportGenerator';
import { exportCompactForLLM, type CompactLocationExport } from '../../utils/jsonExportCompact';
import { captureAllScenarioCubes } from '../../utils/cubeCapture';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { WMSGradingData } from '../../types/wms-grading';
import { downloadWMSTile, type MapCapture } from '../../utils/mapExport';
import { WMS_CATEGORIES, type WMSLayerConfig } from '../Maps/wmsLayers';
import { getPersonaCubePosition } from '../../utils/cubePositionMapping';

interface GenerateRapportButtonProps {
  locale: 'nl' | 'en';
  data: UnifiedLocationData;
  amenitiesData: AmenityMultiCategoryResponse | null;
  personaScores: PersonaScore[];
  coordinates?: [number, number];
  cubeRef?: React.RefObject<HTMLDivElement | null>;
  scenarios?: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
    customScenario?: number[];
  };
  cubeColors?: string[];
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
  wmsGradingData?: WMSGradingData | null;
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
  coordinates,
  cubeRef,
  scenarios,
  cubeColors,
  pveData,
  wmsGradingData,
  usePlaceholder = true, // Default to placeholder to save LLM costs
  className,
}: GenerateRapportButtonProps) {
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const messages = STAGE_MESSAGES[locale];

  /**
   * Convert persona ID to image filename
   * e.g., "jonge-starters" → "Jonge_Starters.png"
   */
  const personaIdToFilename = (id: string): string => {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_') + '.png';
  };

  /**
   * Fetch persona image and convert to data URL
   */
  const fetchPersonaImage = async (personaId: string): Promise<string | undefined> => {
    try {
      const filename = personaIdToFilename(personaId);
      const response = await fetch(`/personas/${filename}`);
      if (!response.ok) return undefined;

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  /**
   * Pre-fetch all persona images for use in PDF
   */
  const fetchAllPersonaImages = async (personaIds: string[]): Promise<Record<string, string>> => {
    const images: Record<string, string> = {};

    const fetchWithTimeout = async (id: string): Promise<{ id: string; dataUrl: string | undefined }> => {
      try {
        const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2000));
        const fetchPromise = fetchPersonaImage(id);
        const dataUrl = await Promise.race([fetchPromise, timeoutPromise]);
        return { id, dataUrl };
      } catch {
        return { id, dataUrl: undefined };
      }
    };

    const results = await Promise.all(personaIds.map(fetchWithTimeout));

    results.forEach(({ id, dataUrl }) => {
      if (dataUrl) {
        images[id] = dataUrl;
      }
    });

    return images;
  };

  interface HousingPersonaData {
    current_property_types?: string[];
    desired_property_types?: string[];
    imageUrl?: string;
    income_level?: string;
    household_type?: string;
    age_group?: string;
  }

  /**
   * Load full housing personas data with property types and characteristics
   */
  const loadHousingPersonas = async (): Promise<Record<string, HousingPersonaData>> => {
    try {
      const response = await fetch('/api/location/housing-personas');
      if (!response.ok) {
        // Try loading directly from public folder as fallback
        const directResponse = await fetch('/housing-personas.json');
        if (!directResponse.ok) return {};
        const data = await directResponse.json();
        const personas = data[locale]?.housing_personas || data['nl']?.housing_personas || [];
        const result: Record<string, HousingPersonaData> = {};
        for (const p of personas) {
          result[p.id] = {
            current_property_types: p.current_property_types,
            desired_property_types: p.desired_property_types,
            imageUrl: p.imageUrl,
            income_level: p.income_level,
            household_type: p.household_type,
            age_group: p.age_group,
          };
        }
        return result;
      }
      const data = await response.json();
      const personas = data[locale]?.housing_personas || data['nl']?.housing_personas || [];
      const result: Record<string, HousingPersonaData> = {};
      for (const p of personas) {
        result[p.id] = {
          current_property_types: p.current_property_types,
          desired_property_types: p.desired_property_types,
          imageUrl: p.imageUrl,
          income_level: p.income_level,
          household_type: p.household_type,
          age_group: p.age_group,
        };
      }
      return result;
    } catch {
      return {};
    }
  };

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
        const exportData = exportCompactForLLM(
          data,
          personaScores,
          scenarios || { scenario1: [], scenario2: [], scenario3: [] },
          locale,
          [],
          amenitiesData,
          null
        );
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
      setProgress(55);

      // Fetch persona images and full housing data first (needed for cube capture)
      const allPersonas = compactData.allPersonas || [];
      const personaIds = allPersonas.map(p => p.id);
      const [personaImages, housingPersonasData] = await Promise.all([
        fetchAllPersonaImages(personaIds),
        loadHousingPersonas(),
      ]);

      setProgress(60);

      // Capture cube visualizations
      let cubeCaptures: Record<string, CubeCaptureResult> = {};
      if (scenarios && cubeColors && cubeColors.length > 0 && personaScores.length > 0) {
        try {
          // Sort personas by rRank position to match scenario positions
          const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

          // Helper function to convert rRankPositions to cube indices (0-26)
          const positionsToCubeIndices = (positions: number[]): number[] => {
            return positions.map(pos => {
              const persona = sortedPersonas[pos - 1]; // positions are 1-indexed
              if (persona) {
                // Get characteristics from housing personas data
                const personaData = housingPersonasData[persona.personaId];
                if (personaData?.income_level && personaData?.household_type && personaData?.age_group) {
                  const { index } = getPersonaCubePosition({
                    income_level: personaData.income_level,
                    household_type: personaData.household_type,
                    age_group: personaData.age_group,
                  });
                  return index;
                }
              }
              return -1;
            }).filter(i => i >= 0);
          };

          // Convert scenario positions to cube indices
          const cubeIndicesScenario1 = positionsToCubeIndices(scenarios.scenario1);
          const cubeIndicesScenario2 = positionsToCubeIndices(scenarios.scenario2);
          const cubeIndicesScenario3 = positionsToCubeIndices(scenarios.scenario3);
          const cubeIndicesCustom = scenarios.customScenario
            ? positionsToCubeIndices(scenarios.customScenario)
            : undefined;

          const cubeCaptureResult = await captureAllScenarioCubes(
            {
              scenario1: cubeIndicesScenario1,
              scenario2: cubeIndicesScenario2,
              scenario3: cubeIndicesScenario3,
              customScenario: cubeIndicesCustom,
            },
            cubeColors,
            { width: 400, height: 400, backgroundColor: '#1a1a2e' }
          );
          cubeCaptures = {
            scenario1: cubeCaptureResult.scenario1,
            scenario2: cubeCaptureResult.scenario2,
            scenario3: cubeCaptureResult.scenario3,
            ...(cubeCaptureResult.customScenario && { customScenario: cubeCaptureResult.customScenario }),
          };
        } catch (err) {
          console.warn('Failed to capture cube visualizations:', err);
        }
      }

      setProgress(70);

      // Add images and housing data to personas
      const personasWithFullData: PersonaBasic[] = allPersonas.map(p => ({
        ...p,
        imageDataUrl: personaImages[p.id],
        imageUrl: housingPersonasData[p.id]?.imageUrl,
        current_property_types: housingPersonasData[p.id]?.current_property_types,
        desired_property_types: housingPersonasData[p.id]?.desired_property_types,
      }));

      // Update compactData with enriched personas
      compactData = {
        ...compactData,
        allPersonas: personasWithFullData,
      };

      // Capture WMS map screenshots if coordinates are available
      const mapCaptures: MapCaptureResult[] = [];

      // Helper function to find a WMS layer config by its ID
      const findLayerConfig = (layerId: string): WMSLayerConfig | null => {
        for (const category of Object.values(WMS_CATEGORIES)) {
          if (category.layers[layerId]) {
            return category.layers[layerId];
          }
        }
        return null;
      };

      if (coordinates && wmsGradingData) {
        const [lat, lon] = coordinates;
        // Get available layer IDs from grading data
        const gradedLayers = Object.values(wmsGradingData.layers || {});

        // Capture each graded WMS layer (limit to 6 for performance)
        for (const gradedLayer of gradedLayers.slice(0, 6)) {
          const layerConfig = findLayerConfig(gradedLayer.layer_id);
          if (!layerConfig) continue;
          // Skip amenity layers (they use a special URL scheme)
          if (layerConfig.url.startsWith('amenity://')) continue;

          try {
            const mapCapture: MapCapture = await downloadWMSTile({
              url: layerConfig.url,
              layers: layerConfig.layers,
              layerTitle: layerConfig.title,
              center: [lat, lon],
              zoom: layerConfig.recommendedZoom || 14,
              width: 600,
              height: 400,
            });

            mapCaptures.push({
              name: layerConfig.title,
              dataUrl: mapCapture.dataUrl,
            });
          } catch (captureError) {
            console.warn(`Failed to capture WMS layer ${gradedLayer.layer_id}:`, captureError);
          }
        }
      }

      setProgress(75);

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
