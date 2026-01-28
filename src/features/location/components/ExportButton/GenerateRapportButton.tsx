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
import { AI_TOOLS, buildToolPayload } from '@/features/ai-assistant/utils/aiToolsPayloadBuilder';
import {
  generateBuildingProgramStaged,
  isRapportCached,
  type StagedGenerationProgress,
  type StagedGenerationResult,
} from '../../utils/stagedGenerationOrchestrator';
import { generateInputHash, type CachedRapportData } from '../../data/cache/rapportCache';
import { captureAllScenarioCubes } from '../../utils/cubeCapture';
import { captureRegisteredPVEBar } from '../../utils/pveCapture';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { PersonaScore } from '../../utils/targetGroupScoring';
import type { WMSGradingData } from '../../types/wms-grading';
import { downloadWMSTile, downloadWMSLegend, type MapCapture, type LegendCapture } from '../../utils/mapExport';
import { WMS_CATEGORIES, type WMSLayerConfig } from '../Maps/wmsLayers';
import { getPersonaCubePosition } from '../../utils/cubePositionMapping';
import housingPersonasJson from '../../data/sources/housing-personas.json';

/**
 * Call the LLM API to generate the building program analysis
 */
async function generateBuildingProgramWithLLM(
  locationData: CompactLocationExport,
  locale: 'nl' | 'en'
): Promise<LLMBuildingProgram> {
  // Find the building program tool
  const tool = AI_TOOLS.find(t => t.id === 'rapport-building-program');
  if (!tool) {
    throw new Error('Building program tool not found');
  }

  // Build the complete payload with context data
  const payload = buildToolPayload(tool, locationData, locale);

  console.log('[GenerateRapport] Calling LLM API for building program...');

  // Call the execute-tool API endpoint
  const response = await fetch('/api/ai-assistant/execute-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolId: tool.id,
      locationData,
      locale,
      customMessage: payload.userPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GenerateRapport] LLM API error:', errorText);
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  // Parse the streaming response
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  // Read the streamed response
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    // Parse the Vercel AI SDK streaming protocol
    // Format: 0:"text chunk"\n or other message types
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('0:')) {
        // Text chunk - parse the JSON string
        try {
          const textContent = JSON.parse(line.slice(2));
          fullText += textContent;
        } catch {
          // If parsing fails, try to extract text directly
          const match = line.match(/^0:"(.*)"/);
          if (match) {
            fullText += match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
        }
      }
    }
  }

  console.log('[GenerateRapport] LLM response length:', fullText.length);

  // Try to extract JSON from the response
  // The LLM might include markdown code blocks or extra text
  let jsonString = fullText.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonString = jsonMatch[1].trim();
  }

  // Try to find JSON object in the response
  const jsonStartIndex = jsonString.indexOf('{');
  const jsonEndIndex = jsonString.lastIndexOf('}');
  if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
    jsonString = jsonString.slice(jsonStartIndex, jsonEndIndex + 1);
  }

  try {
    const buildingProgram = JSON.parse(jsonString) as LLMBuildingProgram;
    console.log('[GenerateRapport] Successfully parsed building program');
    return buildingProgram;
  } catch (parseError) {
    console.error('[GenerateRapport] Failed to parse LLM response as JSON:', parseError);
    console.error('[GenerateRapport] Raw response:', fullText.slice(0, 500));
    throw new Error('Failed to parse LLM response as JSON. The AI may not have returned valid JSON.');
  }
}

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
  projectId?: string; // If provided, also saves PDF to R2 storage
  className?: string;
}

type GenerationStage =
  | 'idle'
  | 'preparing'
  | 'exporting-json'
  | 'generating-llm'
  | 'stage1-location'
  | 'stage2-personas'
  | 'stage3-pve'
  | 'capturing-visuals'
  | 'building-pdf'
  | 'uploading-r2'
  | 'complete'
  | 'error';

const STAGE_MESSAGES = {
  nl: {
    idle: 'Genereer Rapport',
    'idle-cached': 'Download Rapport (gecached)',
    preparing: 'Voorbereiden...',
    'exporting-json': 'Data exporteren...',
    'generating-llm': 'Rapport ophalen uit cache...',
    'stage1-location': 'Stap 1/3: Locatie analyseren...',
    'stage2-personas': 'Stap 2/3: Doelgroepen analyseren...',
    'stage3-pve': 'Stap 3/3: Bouwprogramma genereren...',
    'capturing-visuals': 'Visualisaties vastleggen...',
    'building-pdf': 'PDF samenstellen...',
    'uploading-r2': 'PDF opslaan naar cloud...',
    complete: 'Voltooid!',
    error: 'Fout opgetreden',
  },
  en: {
    idle: 'Generate Report',
    'idle-cached': 'Download Report (cached)',
    preparing: 'Preparing...',
    'exporting-json': 'Exporting data...',
    'generating-llm': 'Loading from cache...',
    'stage1-location': 'Step 1/3: Analyzing location...',
    'stage2-personas': 'Step 2/3: Analyzing personas...',
    'stage3-pve': 'Step 3/3: Generating building program...',
    'capturing-visuals': 'Capturing visualizations...',
    'building-pdf': 'Building PDF...',
    'uploading-r2': 'Saving PDF to cloud...',
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
  usePlaceholder = false, // Use real LLM backend for rapport generation
  projectId,
  className,
}: GenerateRapportButtonProps) {
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [lastGenerationFromCache, setLastGenerationFromCache] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const messages = STAGE_MESSAGES[locale];

  // Check cache status when data changes
  React.useEffect(() => {
    if (data && personaScores.length > 0 && scenarios) {
      try {
        const exportData = exportCompactForLLM(
          data,
          personaScores,
          scenarios,
          locale,
          [],
          amenitiesData,
          null
        );
        const cached = isRapportCached(exportData as CompactLocationExport, locale);
        setIsCached(cached);
        if (cached) {
          console.log('[GenerateRapport] Cached rapport data available');
        }
      } catch (e) {
        // Ignore errors during cache check
        setIsCached(false);
      }
    }
  }, [data, personaScores, scenarios, locale, amenitiesData]);

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
   * Note: Some persona images are 5-9MB, so timeout is generous
   */
  const fetchAllPersonaImages = async (personaIds: string[]): Promise<Record<string, string>> => {
    const images: Record<string, string> = {};

    const fetchWithTimeout = async (id: string): Promise<{ id: string; dataUrl: string | undefined }> => {
      try {
        // 15 second timeout - some images are 9MB+
        const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 15000));
        const fetchPromise = fetchPersonaImage(id);
        const dataUrl = await Promise.race([fetchPromise, timeoutPromise]);
        if (!dataUrl) {
          console.warn(`Persona image timed out or failed for: ${id}`);
        }
        return { id, dataUrl };
      } catch (err) {
        console.warn(`Failed to fetch persona image for ${id}:`, err);
        return { id, dataUrl: undefined };
      }
    };

    // Fetch in batches of 5 to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < personaIds.length; i += batchSize) {
      const batch = personaIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchWithTimeout));

      batchResults.forEach(({ id, dataUrl }) => {
        if (dataUrl) {
          images[id] = dataUrl;
        }
      });
    }

    console.log(`Successfully loaded ${Object.keys(images).length}/${personaIds.length} persona images`);
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
   * Uses direct import as reliable fallback
   */
  const loadHousingPersonas = (): Record<string, HousingPersonaData> => {
    // Use directly imported JSON - most reliable approach
    const data = housingPersonasJson as { nl?: { housing_personas: Array<{
      id: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageUrl?: string;
      income_level?: string;
      household_type?: string;
      age_group?: string;
    }> }; en?: { housing_personas: Array<{
      id: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageUrl?: string;
      income_level?: string;
      household_type?: string;
      age_group?: string;
    }> } };

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

    console.log(`Loaded ${Object.keys(result).length} housing personas for locale ${locale}`);
    return result;
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
        // Generate real data from current location
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

        // Use staged generation for better token efficiency
        // Stage 1: Location Analysis, Stage 2: Persona Analysis, Stage 3: PVE Allocation
        // Now with caching - if data is cached, skips LLM calls entirely
        const handleStagedProgress = (stagedProgress: StagedGenerationProgress) => {
          // Map staged generation progress to button progress (10-50% range)
          const mappedProgress = 10 + Math.floor(stagedProgress.progress * 0.4);
          setProgress(mappedProgress);

          // Update stage based on staged generation stage
          if (stagedProgress.stage === 'stage1-location') {
            setStage('stage1-location');
          } else if (stagedProgress.stage === 'stage2-personas') {
            setStage('stage2-personas');
          } else if (stagedProgress.stage === 'stage3-pve') {
            setStage('stage3-pve');
          }
        };

        // Check if we have cached data first (unless force regenerate is enabled)
        const isCached = !forceRegenerate && isRapportCached(exportData as CompactLocationExport, locale);
        if (isCached) {
          console.log('[GenerateRapport] Using cached rapport data - no LLM calls needed');
          setStage('generating-llm'); // Show generic stage for cache retrieval
          setProgress(15);
        } else {
          if (forceRegenerate) {
            console.log('[GenerateRapport] Force regenerate enabled - skipping cache');
          }
          setStage('stage1-location');
          setProgress(15);
        }

        // Call the staged generation pipeline (checks cache automatically unless skipCache is true)
        const stagedResult = await generateBuildingProgramStaged(
          exportData as CompactLocationExport,
          locale,
          handleStagedProgress,
          { saveToCache: true, skipCache: forceRegenerate } // Skip cache if force regenerate
        );

        if (stagedResult.fromCache) {
          console.log('[GenerateRapport] Report generated from cache - saved LLM costs!');
          setLastGenerationFromCache(true);
        } else {
          console.log(`[GenerateRapport] Report generated via LLM in ${stagedResult.generationTimeMs}ms`);
          setLastGenerationFromCache(false);
          // Update cache status since we just generated new data
          setIsCached(true);
        }

        // Convert staged program to LLMBuildingProgram format
        buildingProgram = stagedResult.program as unknown as LLMBuildingProgram;
      }

      setProgress(50);

      // Stage 3: Capture visualizations
      setStage('capturing-visuals');
      setProgress(55);

      // Fetch persona images and full housing data first (needed for cube capture)
      const allPersonas = compactData.allPersonas || [];
      const personaIds = allPersonas.map(p => p.id);

      // Load housing personas data synchronously (direct import)
      const housingPersonasData = loadHousingPersonas();

      // Fetch persona images asynchronously
      const personaImages = await fetchAllPersonaImages(personaIds);

      setProgress(60);

      // Capture cube visualizations
      let cubeCaptures: Record<string, CubeCaptureResult> = {};

      // Debug logging for cube capture
      console.log('=== CUBE CAPTURE DEBUG ===');
      console.log('scenarios:', scenarios);
      console.log('cubeColors length:', cubeColors?.length);
      console.log('personaScores length:', personaScores.length);
      console.log('housingPersonasData keys:', Object.keys(housingPersonasData));

      if (scenarios && cubeColors && cubeColors.length > 0 && personaScores.length > 0) {
        try {
          // Sort personas by rRank position to match scenario positions
          const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
          console.log('sortedPersonas (first 5):', sortedPersonas.slice(0, 5).map(p => ({
            id: p.personaId,
            rRankPosition: p.rRankPosition
          })));

          // Helper function to convert rRankPositions to cube indices (0-26)
          const positionsToCubeIndices = (positions: number[]): number[] => {
            console.log('Converting positions:', positions);
            return positions.map(pos => {
              const persona = sortedPersonas[pos - 1]; // positions are 1-indexed
              console.log(`Position ${pos} -> persona:`, persona?.personaId);
              if (persona) {
                // Get characteristics from housing personas data
                const personaData = housingPersonasData[persona.personaId];
                console.log(`Persona ${persona.personaId} data:`, personaData);
                if (personaData?.income_level && personaData?.household_type && personaData?.age_group) {
                  const { index } = getPersonaCubePosition({
                    income_level: personaData.income_level,
                    household_type: personaData.household_type,
                    age_group: personaData.age_group,
                  });
                  console.log(`Cube index for ${persona.personaId}: ${index}`);
                  return index;
                } else {
                  console.warn(`Missing characteristics for ${persona.personaId}:`, {
                    income_level: personaData?.income_level,
                    household_type: personaData?.household_type,
                    age_group: personaData?.age_group,
                  });
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

          console.log('Cube indices - scenario1:', cubeIndicesScenario1);
          console.log('Cube indices - scenario2:', cubeIndicesScenario2);
          console.log('Cube indices - scenario3:', cubeIndicesScenario3);
          console.log('Cube indices - custom:', cubeIndicesCustom);

          const cubeCaptureResult = await captureAllScenarioCubes(
            {
              scenario1: cubeIndicesScenario1,
              scenario2: cubeIndicesScenario2,
              scenario3: cubeIndicesScenario3,
              customScenario: cubeIndicesCustom,
            },
            cubeColors,
            { width: 400, height: 400, backgroundColor: '#ffffff' }
          );
          console.log('Cube capture result keys:', Object.keys(cubeCaptureResult));
          console.log('scenario1 dataUrl length:', cubeCaptureResult.scenario1?.dataUrl?.length);

          cubeCaptures = {
            scenario1: cubeCaptureResult.scenario1,
            scenario2: cubeCaptureResult.scenario2,
            scenario3: cubeCaptureResult.scenario3,
            ...(cubeCaptureResult.customScenario && { customScenario: cubeCaptureResult.customScenario }),
          };
          console.log('Final cubeCaptures keys:', Object.keys(cubeCaptures));
        } catch (err) {
          console.error('Failed to capture cube visualizations:', err);
        }
      } else {
        console.warn('Skipping cube capture - missing data:', {
          hasScenarios: !!scenarios,
          cubeColorsLength: cubeColors?.length,
          personaScoresLength: personaScores.length,
        });
      }
      console.log('=== END CUBE CAPTURE DEBUG ===');

      // Capture PVE stacked bar visualization
      let pveBarImage: string | undefined;
      try {
        console.log('Capturing PVE stacked bar...');
        const capturedPveBar = await captureRegisteredPVEBar({ scale: 2 });
        if (capturedPveBar) {
          pveBarImage = capturedPveBar;
          console.log('PVE bar captured successfully, length:', capturedPveBar.length);
        } else {
          console.warn('PVE bar element not registered for capture');
        }
      } catch (err) {
        console.warn('Failed to capture PVE bar:', err);
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

        // Download each WMS layer with its legend
        let successCount = 0;
        let failCount = 0;
        const totalLayers = validLayers.length;

        for (let i = 0; i < validLayers.length; i++) {
          const { layerId, config: layerConfig } = validLayers[i];

          // Update progress as we go (70-78% range for WMS downloads)
          const layerProgress = 70 + Math.floor((i / totalLayers) * 8);
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
          pveBarImage,
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

      // Upload to R2 if projectId is provided
      if (projectId) {
        setStage('uploading-r2');
        setProgress(96);

        try {
          const formData = new FormData();
          formData.append('file', pdfBlob, filename);
          formData.append('projectId', projectId);
          formData.append('filename', filename);

          const uploadResponse = await fetch('/api/rapport/upload-pdf', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            console.log('[GenerateRapport] PDF uploaded to R2:', uploadResult.data?.fileKey);
          } else {
            // Don't fail the whole operation if R2 upload fails - the PDF was already downloaded
            console.warn('[GenerateRapport] Failed to upload PDF to R2:', await uploadResponse.text());
          }
        } catch (uploadErr) {
          // Don't fail the whole operation if R2 upload fails
          console.warn('[GenerateRapport] Error uploading PDF to R2:', uploadErr);
        }
      }

      setProgress(100);
      setStage('complete');

      // Reset after a delay
      setTimeout(() => {
        setStage('idle');
        setProgress(0);
        setForceRegenerate(false); // Reset force regenerate checkbox
      }, 2000);

    } catch (err) {
      console.error('Report generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStage('error');
    }
  }, [stage, usePlaceholder, data, amenitiesData, personaScores, pveData, locale, coordinates, wmsGradingData, scenarios, cubeColors, projectId, forceRegenerate]);

  const isGenerating = stage !== 'idle' && stage !== 'error' && stage !== 'complete';

  return (
    <div className={className}>
      {/* Force regenerate checkbox - only show when cached */}
      {stage === 'idle' && isCached && (
        <label className="flex items-center gap-2 mb-2 cursor-pointer text-xs text-gray-600 hover:text-gray-800">
          <input
            type="checkbox"
            checked={forceRegenerate}
            onChange={(e) => setForceRegenerate(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
          />
          <span>{locale === 'nl' ? 'Rapport opnieuw genereren (nieuwe AI analyse)' : 'Regenerate report (new AI analysis)'}</span>
        </label>
      )}

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

          <span>
            {stage === 'idle' && isCached
              ? (messages['idle-cached'] || messages.idle)
              : messages[stage]}
          </span>

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
          {isCached
            ? (locale === 'nl' ? 'Rapport ophalen uit cache...' : 'Loading report from cache...')
            : (locale === 'nl' ? 'Dit kan enkele seconden duren...' : 'This may take a few seconds...')}
        </p>
      )}

      {/* Cache indicator when idle */}
      {stage === 'idle' && isCached && (
        <p className="mt-2 text-xs text-green-600 text-center flex items-center justify-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {locale === 'nl' ? 'Gecached - geen AI kosten' : 'Cached - no AI costs'}
        </p>
      )}
    </div>
  );
}

export default GenerateRapportButton;
