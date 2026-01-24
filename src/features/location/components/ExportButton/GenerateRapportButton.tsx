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
  type FullMapCaptureResult,
  type PersonaBasic,
} from '../../utils/unifiedRapportGenerator';
import { exportCompactForLLM, type CompactLocationExport } from '../../utils/jsonExportCompact';
import { captureAllScenarioCubes } from '../../utils/cubeCapture';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { WMSGradingData } from '../../types/wms-grading';
import { downloadWMSTile, downloadWMSLegend, type MapCapture, type LegendCapture } from '../../utils/mapExport';
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
   * Direct mapping from persona ID to actual image filename
   * Based on actual files in /public/personas/
   */
  const PERSONA_IMAGE_MAP: Record<string, string> = {
    'actieve-jonge-gezinnen': 'Actieve_Jonge_Gezinnen.png',
    'ambitieuze-singles': 'Ambitieuze_singles.png',
    'bescheiden-stellen': 'Bescheiden_Stellen.png',
    'carriere-stampers': 'Carriere_Stampers.png',
    'carrierestarter': 'Carrierestarter.png',
    'de-balanszoekers': 'De_Balanszoekers.png',
    'de-doorzetter': 'De_Doorzetter.png',
    'de-groeiers': 'De_Groeiers.png',
    'de-groeigezinnen': 'De_Groeigezinnen.png',
    'de-levensgenieters': 'De_Levensgenieters.png',
    'de-rentenier': 'De_Rentenier.png',
    'de-zwitserlevers': 'De_Zwitserlevers.png',
    'gezellige-nesthouders': 'Gezellige_Nesthouders.png',
    'grenzeloos-duo': 'Grenzeloos_Duo.png',
    'hard-van-start': 'Hard_van_Start.png',
    'jonge-starters': 'Jonge_Starters.png',
    'knusse-gezinnen': 'Knusse_Gezinnen.png',
    'laat-bloeiers': 'Laat_Bloeiers.png',
    'samen-starters': 'Samen_Starters.png',
    'senior-op-budget': 'Senior_op_Budget.png',
    'senioren-met-thuiswonende-kinderen': 'Senioren_met_Thuiswonende_Kinderen.png',
    'stabiele-gezinnen': 'Stabiele_Gezinnen.png',
    'succesvolle-singles': 'Succesvolle_singles.png',
    'vermogende-gezinnen': 'Vermogende_Gezinnen.png',
    'welvarende-bourgondiers': 'Welvarende_Bourgondiers.png',
    'zelfbewuste-solisten': 'Zelfbewuste_Solisten.png',
    'zelfstandige-senior': 'Zelfstandige_Senior.png',
  };

  /**
   * Crop image to target aspect ratio (center crop) and return as data URL
   */
  const cropImageToAspectRatio = (
    imageDataUrl: string,
    targetAspectRatio: number = 3 / 4 // width/height for portrait (0.75)
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        const srcWidth = img.width;
        const srcHeight = img.height;
        const srcAspect = srcWidth / srcHeight;

        let cropWidth: number;
        let cropHeight: number;
        let cropX: number;
        let cropY: number;

        if (srcAspect > targetAspectRatio) {
          // Image is wider than target - crop sides
          cropHeight = srcHeight;
          cropWidth = srcHeight * targetAspectRatio;
          cropX = (srcWidth - cropWidth) / 2;
          cropY = 0;
        } else {
          // Image is taller than target - crop top/bottom
          cropWidth = srcWidth;
          cropHeight = srcWidth / targetAspectRatio;
          cropX = 0;
          cropY = (srcHeight - cropHeight) / 2;
        }

        // Output at reasonable resolution for PDF (150 DPI at 20mm width ≈ 118px)
        const outputWidth = 200;
        const outputHeight = Math.round(outputWidth / targetAspectRatio);

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,  // source rectangle
          0, 0, outputWidth, outputHeight        // destination rectangle
        );

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  };

  /**
   * Fetch persona image, crop to portrait aspect ratio, and convert to data URL
   */
  const fetchPersonaImage = async (personaId: string): Promise<string | undefined> => {
    try {
      const filename = PERSONA_IMAGE_MAP[personaId];
      if (!filename) {
        console.warn(`No image mapping for persona: ${personaId}`);
        return undefined;
      }

      const response = await fetch(`/personas/${filename}`);
      if (!response.ok) {
        console.warn(`Persona image not found: /personas/${filename}`);
        return undefined;
      }

      const blob = await response.blob();
      const rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
      });

      // Crop to portrait aspect ratio (3:4)
      const croppedDataUrl = await cropImageToAspectRatio(rawDataUrl, 3 / 4);
      return croppedDataUrl;
    } catch (err) {
      console.warn(`Failed to fetch/crop persona image for ${personaId}:`, err);
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

      // Capture WMS map screenshots with aerial photos and legends
      // Use ALL WMS layers from WMS_CATEGORIES (matching comprehensivePdfExport.ts)
      const mapCaptures: MapCaptureResult[] = [];
      const fullMapCaptures: FullMapCaptureResult[] = [];

      if (coordinates) {
        const [lat, lon] = coordinates;

        // Get ALL WMS layers from WMS_CATEGORIES (not just graded ones)
        const wmsLayers = Object.entries(WMS_CATEGORIES).flatMap(([catId, cat]) =>
          Object.entries(cat.layers).map(([layerId, config]) => ({ catId, layerId, config }))
        );

        // Filter out amenity layers (they use markers, not WMS)
        const validLayers = wmsLayers.filter(l => !l.config.url.startsWith('amenity://'));
        console.log(`Processing ${validLayers.length} WMS layers for PDF export`);

        // Download aerial photos for each unique zoom level FIRST
        const aerialPhotoWMS = {
          url: 'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0',
          layers: 'Actueel_orthoHR'
        };
        const uniqueZooms = [...new Set(validLayers.map(l => l.config.recommendedZoom || 15))];
        const aerialPhotoCache: Record<number, MapCapture> = {};

        console.log(`Downloading aerial photos for zoom levels: ${uniqueZooms.join(', ')}`);
        for (const zoom of uniqueZooms) {
          try {
            const aerialPhoto = await downloadWMSTile({
              url: aerialPhotoWMS.url,
              layers: aerialPhotoWMS.layers,
              layerTitle: `Aerial - Zoom ${zoom}`,
              center: [lat, lon],
              zoom,
              width: 800,
              height: 800
            });
            aerialPhotoCache[zoom] = aerialPhoto;
          } catch (err) {
            console.warn(`Failed to download aerial photo for zoom ${zoom}:`, err);
          }
        }

        setProgress(55);

        // Download each WMS layer with its legend
        let successCount = 0;
        let failCount = 0;
        const totalLayers = validLayers.length;

        for (let i = 0; i < validLayers.length; i++) {
          const { layerId, config: layerConfig } = validLayers[i];

          // Update progress as we go (55-78% range for WMS downloads)
          const layerProgress = 55 + Math.floor((i / totalLayers) * 23);
          setProgress(layerProgress);

          try {
            console.log(`Downloading WMS layer ${i + 1}/${totalLayers}: ${layerConfig.title}`);

            // Download map tile and legend in parallel
            const [mapCapture, legend] = await Promise.all([
              downloadWMSTile({
                url: layerConfig.url,
                layers: layerConfig.layers,
                layerTitle: layerConfig.title,
                center: [lat, lon],
                zoom: layerConfig.recommendedZoom || 15,
                width: 800,
                height: 800,
              }),
              downloadWMSLegend(
                layerConfig.url,
                layerConfig.layers,
                layerConfig.title
              ).catch(err => {
                console.warn(`Failed to download legend for ${layerConfig.title}:`, err);
                return null;
              })
            ]);

            const aerialPhoto = aerialPhotoCache[layerConfig.recommendedZoom || 15];

            // Look up grading data if available
            const gradingResult = wmsGradingData?.layers?.[layerId];

            // Simple map capture for backwards compatibility
            mapCaptures.push({
              name: layerConfig.title,
              dataUrl: mapCapture.dataUrl,
            });

            // Full map capture with all data for new WMS pages
            fullMapCaptures.push({
              name: layerConfig.title,
              dataUrl: mapCapture.dataUrl,
              aerialPhotoDataUrl: aerialPhoto?.dataUrl,
              legendDataUrl: legend?.dataUrl,
              legendWidth: legend?.width,
              legendHeight: legend?.height,
              layerConfig: {
                title: layerConfig.title,
                description: layerConfig.description || '',
                layers: layerConfig.layers,
                url: layerConfig.url,
                recommendedZoom: layerConfig.recommendedZoom,
              },
              gradingResult: gradingResult ? {
                layer_id: layerId,
                average_area_sample: gradingResult.average_area_sample
                  ? { value: gradingResult.average_area_sample.value }
                  : undefined,
                max_area_sample: gradingResult.max_area_sample
                  ? { value: gradingResult.max_area_sample.value }
                  : undefined,
                point_sample: gradingResult.point_sample
                  ? { value: typeof gradingResult.point_sample.value === 'number' ? gradingResult.point_sample.value : null }
                  : undefined,
              } : undefined,
            });

            successCount++;

            // Yield to browser every 5 layers to prevent freezing
            if (i > 0 && i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          } catch (captureError) {
            console.warn(`Failed to capture WMS layer ${layerId}:`, captureError);
            failCount++;
          }
        }

        console.log(`WMS capture complete: ${successCount} successful, ${failCount} failed`);
      }

      setProgress(78);

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
          includeMapAnalysis: mapCaptures.length > 0 || fullMapCaptures.length > 0,
          includeCubeVisualizations: Object.keys(cubeCaptures).length > 0,
        },
        fullMapCaptures
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
  }, [stage, usePlaceholder, data, amenitiesData, personaScores, pveData, locale, coordinates, wmsGradingData, scenarios, cubeColors]);

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
