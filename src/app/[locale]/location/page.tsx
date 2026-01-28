// src/app/[locale]/location/page.tsx - Integrated with Data Fetching
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';
import { Sidebar, useSidebar } from '../../../shared/components/UI/Sidebar';
import { MainLayout } from '../../../shared/components/UI/MainLayout';
import { useLocationSidebarSections } from '../../../features/location/components/LocationSidebar';
import { useLocationData } from '../../../features/location/hooks/useLocationData';
import { MultiLevelDataTable } from '../../../features/location/components/DataTables';
import { AmenitiesGrid, AmenitiesSummary } from '../../../features/location/components/Amenities';
import { ResidentialSummary, ResidentialGrid, ResidentialPage } from '../../../features/location/components/Residential';
import { DoelgroepenGrid } from '../../../features/location/components/Doelgroepen';
import { DemographicsPage } from '../../../features/location/components/Demographics';
import { SafetyPage } from '../../../features/location/components/Safety';
import { HealthPage } from '../../../features/location/components/Health';
import { LivabilityPage } from '../../../features/location/components/Livability';
import { ExportButton, CompactExportButton, GenerateProgramButton, GenerateRapportButton } from '../../../features/location/components/ExportButton';
import { RadialChart, BarChart, DensityChart } from '../../../shared/components/common';
import { extractLocationScores } from '../../../features/location/utils/extractLocationScores';
import { LocationAnimation } from '../../../features/location/components/LocationAnimation';
import { DoelgroepenResult } from '../../../features/location/components/DoelgroepenResult';
import { generateGradientColors } from '../../../features/location/utils/cubePatterns';
import { calculatePersonaScores } from '../../../features/location/utils/targetGroupScoring';
import { getPersonaCubePosition } from '../../../features/location/utils/cubePositionMapping';
import { calculateConnections, calculateScenarios } from '../../../features/location/utils/connectionCalculations';
import housingPersonasData from '../../../features/location/data/sources/housing-personas.json';
import { LocationMap, MapStyle, WMSLayerControl, WMSLayerSelection, WMSFeatureInfo, WMSGradingScoreCard, WMSLayerScoreCard } from '../../../features/location/components/Maps';
import { calculateAllAmenityScores, type AmenityScore } from '../../../features/location/data/scoring/amenityScoring';
import { getOmgevingChartData } from '../../../features/location/utils/calculateOmgevingScores';
import { PVEQuestionnaire } from '../../../features/location/components/PVE';
import { MapExportButton } from '../../../features/location/components/MapExport';
import type { AccessibleLocation } from '../../../features/location/types/saved-locations';
import { useWMSGrading } from '../../../features/location/hooks/useWMSGrading';
import { pveConfigCache } from '../../../features/location/data/cache/pveConfigCache';
import type { WMSGradingData } from '../../../features/location/types/wms-grading';
import { AIAssistantProvider, useAIAssistantOptional } from '../../../features/ai-assistant/hooks/useAIAssistant';
import { exportCompactForLLM } from '../../../features/location/utils/jsonExportCompact';

// Main sections configuration with dual language support
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'omgeving', nl: 'Omgeving', en: 'Environment' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' },
  { id: 'genereer-rapport', nl: 'Genereer Rapport', en: 'Generate Report' }
] as const;

// Omgeving subsections with dual language support
const OMGEVING_SUBSECTIONS = [
  { id: 'score', nl: 'Score', en: 'Score' },
  { id: 'demografie', nl: 'Demografie', en: 'Demographics' },
  { id: 'woningmarkt', nl: 'Woningmarkt', en: 'Housing Market' },
  { id: 'veiligheid', nl: 'Veiligheid', en: 'Safety' },
  { id: 'gezondheid', nl: 'Gezondheid', en: 'Health' },
  { id: 'leefbaarheid', nl: 'Leefbaarheid', en: 'Livability' },
  { id: 'voorzieningen', nl: 'Voorzieningen', en: 'Amenities' },
  { id: 'kaarten', nl: 'Kaarten', en: 'Maps' }
] as const;

// Rapport subsections with dual language support
const RAPPORT_SUBSECTIONS = [
  { id: 'housing', nl: 'Woningen', en: 'Housing' },
  { id: 'community', nl: 'Gemeenschappelijk', en: 'Community' },
  { id: 'public', nl: 'Publiek', en: 'Public' }
] as const;

type SectionId = typeof MAIN_SECTIONS[number]['id'] |
                 typeof OMGEVING_SUBSECTIONS[number]['id'] |
                 typeof RAPPORT_SUBSECTIONS[number]['id'];
type TabName = SectionId;

interface LocationPageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Location Analysis Page - With integrated data fetching
 */
const LocationPage: React.FC<LocationPageProps> = ({ params }): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabName>('doelgroepen');
  const [locale, setLocale] = useState<Locale>('nl');
  const [animationStage, setAnimationStage] = useState<'welcome' | 'loading' | 'result'>('welcome');

  // WMS layer state
  const [selectedWMSLayer, setSelectedWMSLayer] = useState<WMSLayerSelection | null>(null);
  const [wmsOpacity, setWMSOpacity] = useState<number>(0.7);
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [featureInfo, setFeatureInfo] = useState<WMSFeatureInfo | null>(null);

  // Snapshot data state (for loaded snapshots)
  const [loadedSnapshotId, setLoadedSnapshotId] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [loadedWMSGradingData, setLoadedWMSGradingData] = useState<WMSGradingData | null>(null);

  // Generate cube colors once and share across all components for consistency
  const cubeColors = React.useMemo(() => generateGradientColors(), []);

  // Use location data hook
  const { data, amenities, loading, error, isLoading, hasError, fetchData, loadSavedData, clearData } = useLocationData();

  // Use WMS grading hook
  const wmsGrading = useWMSGrading({
    snapshotId: loadedSnapshotId,
    latitude: data?.location?.coordinates?.wgs84?.latitude,
    longitude: data?.location?.coordinates?.wgs84?.longitude,
    address: data?.location?.address,
    existingGradingData: loadedWMSGradingData,
    autoGrade: true, // Auto-start grading when location is loaded
  });

  // Use sidebar hook for state management
  const { isCollapsed, toggle, setCollapsed } = useSidebar({
    defaultCollapsed: true, // Start collapsed
    persistState: true,
    storageKey: 'location-sidebar-collapsed',
    autoCollapseMobile: true,
  });

  // Force sidebar to collapse when no data, reset animation stage
  React.useEffect(() => {
    if (!data && !isLoading) {
      setCollapsed(true);
      setAnimationStage('welcome');
      // Clear snapshot data when no data (new search)
      setLoadedSnapshotId(null);
      setLoadedProjectId(null);
      setLoadedWMSGradingData(null);
    }
  }, [data, isLoading, setCollapsed]);

  // Handle animation stage transitions
  React.useEffect(() => {
    if (isLoading && animationStage !== 'loading') {
      // Start loading animation when data fetching begins
      setAnimationStage('loading');
    } else if (data && !isLoading) {
      if (animationStage === 'loading') {
        // When data loads after loading animation, wait 3 seconds for cube to complete its cycle
        const transitionTimer = setTimeout(() => {
          setAnimationStage('result');
        }, 3000);
        return () => clearTimeout(transitionTimer);
      } else if (animationStage === 'welcome') {
        // Data loaded from cache - go directly to result (no animation needed)
        setAnimationStage('result');
      }
    }
  }, [isLoading, data, animationStage]);

  // Resolve params on mount
  React.useEffect(() => {
    params.then(({ locale: resolvedLocale }) => {
      setLocale(resolvedLocale);
    });
  }, [params]);

  // Check for snapshot data in sessionStorage and load it
  React.useEffect(() => {
    const snapshotDataStr = sessionStorage.getItem('grooshub_load_snapshot');
    if (snapshotDataStr) {
      try {
        const { snapshotId, projectId, address, locationData, amenitiesData, wmsGradingData } = JSON.parse(snapshotDataStr);
        // Clear from sessionStorage after reading
        sessionStorage.removeItem('grooshub_load_snapshot');

        // Store snapshot metadata for WMS grading and AI assistant
        if (snapshotId) {
          setLoadedSnapshotId(snapshotId);
        }
        if (projectId) {
          setLoadedProjectId(projectId);
        }
        if (wmsGradingData) {
          setLoadedWMSGradingData(wmsGradingData);
        }

        // Load the snapshot data
        loadSavedData(locationData, amenitiesData, address);
        // Expand sidebar to show data
        setCollapsed(false);
        // Set to result stage
        setAnimationStage('result');
      } catch (error) {
        console.error('Failed to load snapshot from sessionStorage:', error);
      }
    }
  }, [loadSavedData, setCollapsed]);

  // Update map zoom when WMS layer changes
  React.useEffect(() => {
    if (selectedWMSLayer?.config?.recommendedZoom) {
      setMapZoom(selectedWMSLayer.config.recommendedZoom);
    } else {
      // Reset to default zoom when no layer is selected
      setMapZoom(15);
    }
  }, [selectedWMSLayer]);

  const handleTabChange = (tab: TabName): void => {
    setActiveTab(tab);
  };

  const handleAddressSearch = async (address: string): Promise<void> => {
    // Trigger loading stage which will move cube to center
    setAnimationStage('loading');

    // Wait for cube to complete its movement to center (1000ms animation duration)
    await new Promise(resolve => setTimeout(resolve, 1000));

    await fetchData(address);
    // Auto-switch to doelgroepen tab when data is loaded
    setActiveTab('doelgroepen');
  };

  // Get current address from localStorage
  const [currentAddress, setCurrentAddress] = React.useState<string | null>(null);

  React.useEffect(() => {
    const address = localStorage.getItem('grooshub_current_address');
    setCurrentAddress(address);
  }, [data]);

  // Memoize coordinates and sampling area at top level (not conditionally!)
  // This ensures hooks are always called in the same order (Rules of Hooks)
  const coordinates: [number, number] | null = React.useMemo(() => {
    if (!data?.location?.coordinates?.wgs84) return null;
    return [
      data.location.coordinates.wgs84.latitude,
      data.location.coordinates.wgs84.longitude
    ];
  }, [data?.location?.coordinates?.wgs84?.latitude, data?.location?.coordinates?.wgs84?.longitude]);

  const samplingArea = React.useMemo(() => {
    if (!selectedWMSLayer || !wmsGrading.gradingData || !coordinates) return null;

    const layerGrading = wmsGrading.gradingData.layers[selectedWMSLayer.layerId];
    if (!layerGrading) return null;

    // Get radius from any available sample (prefer area samples)
    const radius =
      layerGrading.average_area_sample?.radius_meters ||
      layerGrading.max_area_sample?.radius_meters;

    if (!radius) return null;

    return {
      center: coordinates,
      radius: radius
    };
  }, [selectedWMSLayer?.layerId, coordinates, wmsGrading.gradingData]);

  // Memoize score calculations to prevent recalculation when data is cached
  const calculatedScores = React.useMemo(() => {
    if (!data) return null;

    const locationScores = extractLocationScores(data);
    const personas = housingPersonasData[locale].housing_personas;
    const personaScores = calculatePersonaScores(personas, locationScores);
    const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
    const connections = calculateConnections(personas);
    const scenarios = calculateScenarios(personas, sortedPersonas, connections);

    // Read custom scenario selection from localStorage
    let customScenario: number[] | undefined;
    try {
      const stored = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
      if (stored) {
        const { customIds } = JSON.parse(stored);
        if (customIds && Array.isArray(customIds) && customIds.length > 0) {
          // Convert persona IDs to R-rank positions
          customScenario = customIds
            .map((id: string) => {
              const score = personaScores.find(ps => ps.personaId === id);
              return score?.rRankPosition;
            })
            .filter((pos: number | undefined): pos is number => pos !== undefined);
        }
      }
    } catch (error) {
      console.error('Failed to load custom scenario from cache:', error);
    }

    return {
      locationScores,
      personas,
      personaScores,
      sortedPersonas,
      connections,
      scenarios: {
        ...scenarios,
        customScenario
      }
    };
  }, [data, locale]);

  // Memoize amenity scores calculation
  const amenityScores = React.useMemo(() => {
    if (!amenities) return null;
    return calculateAllAmenityScores(amenities.results);
  }, [amenities]);


  // Handle loading a saved location
  const handleLoadSavedLocation = async (location: AccessibleLocation) => {
    try {
      console.log('🔄 Loading saved location from database:', location.address);

      // Store the current address
      const address = location.address;
      localStorage.setItem('grooshub_current_address', address);

      // Store snapshot ID for reference
      setLoadedSnapshotId(location.id);

      // Restore WMS grading data if available (prevents re-grading)
      if (location.wmsGradingData) {
        console.log('📊 Restoring saved WMS grading data');
        setLoadedWMSGradingData(location.wmsGradingData as WMSGradingData);
      } else {
        // Clear any previous WMS grading data if not available
        setLoadedWMSGradingData(null);
      }

      // Restore PVE data to cache if available
      if (location.pveData) {
        console.log('📋 Restoring saved PVE configuration');
        pveConfigCache.setFinalPVE(location.pveData);

        // Also populate the regular PVE config cache so PVEQuestionnaire can read it on mount
        // This ensures FSI and housing categories are properly restored
        pveConfigCache.set({
          totalM2: location.pveData.totalM2,
          percentages: location.pveData.percentages,
          disabledCategories: [], // Not stored in PVEFinalState, default to empty
          lockedCategories: [], // Not stored in PVEFinalState, default to empty
          fsi: location.pveData.fsi,
          housingCategories: location.pveData.housingCategories,
        });
      }

      // Restore custom scenario selection if available in PVE data
      if (location.pveData?.customScenarioIds && Array.isArray(location.pveData.customScenarioIds)) {
        console.log('🎯 Restoring custom scenario selection');
        localStorage.setItem('grooshub_doelgroepen_scenario_selection', JSON.stringify({
          scenario: 'custom',
          customIds: location.pveData.customScenarioIds
        }));
      } else {
        // Clear custom scenario if not in snapshot (prevents stale data from previous sessions)
        localStorage.removeItem('grooshub_doelgroepen_scenario_selection');
      }

      // Load the saved data directly without making API calls
      // The location.locationData contains UnifiedLocationData
      // Pass the address so it gets stored in cache to prevent unnecessary refetches
      loadSavedData(location.locationData, location.amenitiesData || null, address);

      // Set animation stage to result to show the data immediately
      setAnimationStage('result');

      // Expand the sidebar after loading
      setCollapsed(false);

      // Switch to doelgroepen tab
      setActiveTab('doelgroepen');
    } catch (error) {
      console.error('❌ Error loading saved location:', error);
    }
  };

  // Get sidebar sections from useLocationSidebarSections hook
  const sidebarSections = useLocationSidebarSections({
    locale,
    activeTab,
    onTabChange: handleTabChange,
    onAddressSearch: handleAddressSearch,
    isSearching: isLoading,
    currentAddress,
    locationData: data,
    amenitiesData: amenities,
    wmsGradingData: wmsGrading.gradingData,
    onLoadSavedLocation: handleLoadSavedLocation,
  });

  /**
   * Render main content based on active tab and data state
   */
  const renderMainContent = (): JSX.Element => {
    // Show welcome or loading animation (single cube instance)
    if (animationStage === 'welcome' || animationStage === 'loading') {
      return (
        <LocationAnimation
          locale={locale}
          cubeColors={cubeColors}
          stage={animationStage}
          onAddressSearch={handleAddressSearch}
          isSearching={isLoading}
        />
      );
    }

    // Show error state
    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-lg">
            <div className="text-red-500 text-6xl mb-base">⚠️</div>
            <h2 className="text-2xl font-bold text-text-primary mb-base">
              {locale === 'nl' ? 'Fout bij ophalen gegevens' : 'Error fetching data'}
            </h2>
            <div className="space-y-sm text-sm text-text-muted mb-base">
              {error.geocoding && <p>• {error.geocoding}</p>}
              {error.demographics && <p>• {error.demographics}</p>}
              {error.health && <p>• {error.health}</p>}
              {error.livability && <p>• {error.livability}</p>}
              {error.safety && <p>• {error.safety}</p>}
              {error.amenities && <p>• {error.amenities}</p>}
              {error.residential && <p>• {error.residential}</p>}
            </div>
            <button
              onClick={clearData}
              className="px-base py-sm bg-primary text-white rounded-md hover:bg-primary-hover"
            >
              {locale === 'nl' ? 'Opnieuw proberen' : 'Try again'}
            </button>
          </div>
        </div>
      );
    }

    // Show data if available
    if (data && calculatedScores) {
      // For Doelgroepen tab - show result with cube and scenarios
      if (activeTab === 'doelgroepen') {
        // Use memoized score calculations (prevents recalculation for cached data)
        const { locationScores, personas, personaScores, sortedPersonas, connections, scenarios } = calculatedScores;

        // Create scenario mappings based on calculated positions
        const getScenarioData = (scenario: string) => {
          let positions: number[] = [];

          switch (scenario) {
            case 'scenario1':
              positions = scenarios.scenario1;
              break;
            case 'scenario2':
              positions = scenarios.scenario2;
              break;
            case 'scenario3':
              positions = scenarios.scenario3;
              break;
            case 'custom':
              positions = []; // None selected
              break;
          }

          // Get persona IDs and cube indices for selected positions
          const selectedPersonas = positions
            .map(pos => sortedPersonas[pos - 1]) // Convert 1-based to 0-based
            .filter(p => p !== undefined);

          const cubeIndices = selectedPersonas.map(persona => {
            const personaData = personas.find(p => p.id === persona.personaId);
            if (!personaData) return -1;

            const { index } = getPersonaCubePosition({
              income_level: personaData.income_level,
              age_group: personaData.age_group,
              household_type: personaData.household_type,
            });
            return index;
          }).filter(idx => idx !== -1);

          return {
            cubeIndices,
            personas: selectedPersonas,
          };
        };

        return (
          <DoelgroepenResult
            key={`doelgroepen-${loadedSnapshotId || 'new'}`}
            locale={locale}
            cubeColors={cubeColors}
            allPersonas={personas}
            allPersonaScores={sortedPersonas}
            getScenarioData={getScenarioData}
          />
        );
      }

      // For Score tab - show Omgeving overview with clickable RadialChart
      if (activeTab === 'score') {
        // Calculate Voorzieningen score from amenities data
        let voorzieningenScore = 75; // Default value if no amenities data

        if (amenityScores) {
          // Use memoized amenity scores (prevents recalculation for cached data)
          // Sum up all countScore and proximityBonus values
          const rawScore = amenityScores.reduce((sum: number, score: AmenityScore) => {
            return sum + score.countScore + score.proximityBonus;
          }, 0);

          // Map from [-21, 42] range to [10, 100] range
          // Formula: ((rawScore + 21) / 63) * 90 + 10
          voorzieningenScore = Math.round(((rawScore + 21) / 63) * 90 + 10);
        }

        // Calculate all 5 omgeving category scores from actual data
        // This uses the real data from health, safety, livability, and residential sources
        const omgevingData = getOmgevingChartData(data, voorzieningenScore, locale);

        // Map category names to tab IDs
        const categoryToTab: Record<string, TabName> = {
          'Betaalbaarheid': 'woningmarkt',
          'Affordability': 'woningmarkt',
          'Veiligheid': 'veiligheid',
          'Safety': 'veiligheid',
          'Gezondheid': 'gezondheid',
          'Health': 'gezondheid',
          'Leefbaarheid': 'leefbaarheid',
          'Livability': 'leefbaarheid',
          'Voorzieningen': 'voorzieningen',
          'Amenities': 'voorzieningen'
        };

        const handleCategoryClick = (categoryName: string) => {
          const targetTab = categoryToTab[categoryName];
          if (targetTab) {
            setActiveTab(targetTab);
          }
        };

        return (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
              <div className="flex justify-center mb-base">
                <RadialChart
                  data={omgevingData}
                  width={600}
                  height={500}
                  showLabels={true}
                  isSimple={false}
                  onSliceClick={handleCategoryClick}
                />
              </div>
              <h2 className="text-3xl font-bold text-text-primary">
                {locale === 'nl' ? 'Score Overzicht' : 'Score Overview'}
              </h2>
            </div>
          </div>
        );
      }

      // For Demographics tab - show new demographics page with charts
      if (activeTab === 'demografie') {
        return <DemographicsPage data={data} locale={locale} />;
      }

      // For Safety tab - show new safety page with values
      if (activeTab === 'veiligheid') {
        return <SafetyPage data={data} locale={locale} />;
      }

      // For Health tab - show new health page with charts and values
      if (activeTab === 'gezondheid') {
        return <HealthPage data={data} locale={locale} />;
      }

      // For Livability tab - show new livability page with charts and values
      if (activeTab === 'leefbaarheid') {
        return <LivabilityPage data={data} locale={locale} />;
      }

      // For Voorzieningen tab - show full amenities grid
      if (activeTab === 'voorzieningen') {
        return (
          <div className="p-lg overflow-auto h-full">
            {amenities ? (
              <AmenitiesGrid data={amenities} locale={locale} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-base">🏪</div>
                  <p className="text-lg text-text-secondary">
                    {locale === 'nl'
                      ? 'Voorzieningen gegevens niet beschikbaar'
                      : 'Amenities data not available'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      // For Woningmarkt tab - show residential page with simplified layout
      if (activeTab === 'woningmarkt') {
        return <ResidentialPage data={data.residential} locale={locale} />;
      }

      // For Kaarten tab - show Leaflet map with WMS layer support
      if (activeTab === 'kaarten') {
        // Guard: coordinates must be available
        if (!coordinates) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500">
                  {locale === 'nl' ? 'Locatiegegevens laden...' : 'Loading location data...'}
                </p>
              </div>
            </div>
          );
        }

        // Build location name
        const locationName = [
          data.location.neighborhood?.statnaam,
          data.location.district?.statnaam,
          data.location.municipality?.statnaam,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <div className="h-full w-full relative">
            <LocationMap
              center={coordinates}
              zoom={mapZoom}
              marker={coordinates}
              locationName={locationName}
              style={MapStyle.DATAVIZ.LIGHT}
              wmsLayer={selectedWMSLayer?.config || null}
              wmsOpacity={wmsOpacity}
              onFeatureClick={setFeatureInfo}
              onZoomChange={setMapZoom}
              amenities={amenities}
              samplingArea={samplingArea}
            >
              {/* WMS Layer Control - Sleek pill at bottom center */}
              <WMSLayerControl
                onLayerChange={setSelectedWMSLayer}
                onOpacityChange={setWMSOpacity}
                selectedLayer={selectedWMSLayer}
                opacity={wmsOpacity}
                currentZoom={mapZoom}
                featureInfo={featureInfo}
                onClearFeatureInfo={() => setFeatureInfo(null)}
              />
            </LocationMap>

            {/* WMS Score Cards - Top right overlay */}
            <div className="absolute top-4 right-4 z-[1000] max-w-sm space-y-sm">
              {/* Overall Summary Card */}
              <WMSGradingScoreCard
                gradingData={wmsGrading.gradingData}
                isGrading={wmsGrading.isGrading}
                progress={wmsGrading.progress}
                layersCompleted={wmsGrading.layersCompleted}
                layersTotal={wmsGrading.layersTotal}
                locale={locale}
                compact={true}
              />

              {/* Selected Layer Score Card */}
              <WMSLayerScoreCard
                selectedLayer={selectedWMSLayer}
                gradingData={wmsGrading.gradingData}
                isGrading={wmsGrading.isGrading}
                locale={locale}
              />
            </div>
          </div>
        );
      }

      // For PVE (Programma van Eisen) tab - show interactive questionnaire
      if (activeTab === 'pve') {
        // Extract address density from demographics (neighborhood level preferred, then municipality)
        const getAddressDensity = (): number | undefined => {
          // Try neighborhood level first
          const neighborhoodRow = data.demographics.neighborhood.find(
            row => row.key === 'Omgevingsadressendichtheid_116'
          );
          if (neighborhoodRow?.absolute !== null && neighborhoodRow?.absolute !== undefined) {
            return neighborhoodRow.absolute;
          }
          // Fall back to municipality level
          const municipalityRow = data.demographics.municipality.find(
            row => row.key === 'Omgevingsadressendichtheid_116'
          );
          if (municipalityRow?.absolute !== null && municipalityRow?.absolute !== undefined) {
            return municipalityRow.absolute;
          }
          return undefined;
        };

        return <PVEQuestionnaire key={`pve-${loadedSnapshotId || 'new'}`} locale={locale} addressDensity={getAddressDensity()} />;
      }

      // For Generate Report tab - show export options
      if (activeTab === 'genereer-rapport') {
        // Extract location scores and calculate persona scores
        const locationScores = extractLocationScores(data);
        const personas = housingPersonasData[locale].housing_personas;
        const personaScores = calculatePersonaScores(personas, locationScores);
        const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
        const connections = calculateConnections(personas);
        const baseScenarios = calculateScenarios(personas, sortedPersonas, connections);

        // Read custom scenario selection from localStorage
        let customScenario: number[] | undefined;
        try {
          const stored = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
          if (stored) {
            const { customIds } = JSON.parse(stored);
            if (customIds && Array.isArray(customIds) && customIds.length > 0) {
              // Convert persona IDs to R-rank positions
              customScenario = customIds
                .map((id: string) => {
                  const score = personaScores.find(ps => ps.personaId === id);
                  return score?.rRankPosition;
                })
                .filter((pos: number | undefined): pos is number => pos !== undefined);
            }
          }
        } catch (error) {
          console.error('Failed to load custom scenario from cache:', error);
        }

        const scenarios = {
          ...baseScenarios,
          customScenario
        };

        return (
          <div className="p-lg overflow-auto h-full">
            <div className="max-w-4xl mx-auto space-y-lg">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-base">
                  {locale === 'nl' ? 'Genereer Rapport' : 'Generate Report'}
                </h2>
                <p className="text-sm text-text-secondary mb-lg">
                  {locale === 'nl'
                    ? 'Exporteer alle verzamelde gegevens inclusief nationale en buurt-niveau data, doelgroepen scores, en scenario analyses.'
                    : 'Export all collected data including national and neighborhood level data, target group scores, and scenario analyses.'}
                </p>
              </div>

              {/* Export Section */}
              <div className="bg-white rounded-lg shadow-sm p-base border border-gray-200">
                <h3 className="text-lg font-semibold text-text-primary mb-base">
                  {locale === 'nl' ? 'Data Export' : 'Data Export'}
                </h3>
                <p className="text-sm text-text-secondary mb-base">
                  {locale === 'nl'
                    ? 'Het rapport bevat:'
                    : 'The report includes:'}
                </p>
                <ul className="space-y-2 text-sm text-gray-700 mb-base ml-5">
                  <li className="list-disc">
                    {locale === 'nl'
                      ? 'Nationale niveau data (demografie, gezondheid, leefbaarheid, veiligheid)'
                      : 'National level data (demographics, health, livability, safety)'}
                  </li>
                  <li className="list-disc">
                    {locale === 'nl'
                      ? 'Buurt-niveau data (demografie, gezondheid, leefbaarheid, veiligheid, voorzieningen)'
                      : 'Neighborhood level data (demographics, health, livability, safety, amenities)'}
                  </li>
                  <li className="list-disc">
                    {locale === 'nl'
                      ? 'Woningmarkt data van Altum AI'
                      : 'Housing market data from Altum AI'}
                  </li>
                  <li className="list-disc">
                    {locale === 'nl'
                      ? 'Gedetailleerde doelgroepen scores'
                      : 'Detailed target group scores'}
                  </li>
                  <li className="list-disc">
                    {locale === 'nl'
                      ? 'Alle scenario analyses (3 automatische + custom)'
                      : 'All scenario analyses (3 automatic + custom)'}
                  </li>
                </ul>

                {/* Generate Unified Rapport Button */}
                <GenerateRapportButton
                  locale={locale}
                  data={data}
                  amenitiesData={amenities}
                  personaScores={sortedPersonas}
                  scenarios={scenarios}
                  cubeColors={cubeColors}
                  coordinates={coordinates || undefined}
                  wmsGradingData={wmsGrading.gradingData}
                  pveData={(() => {
                    const cached = pveConfigCache.get();
                    if (!cached) return undefined;
                    return {
                      totalM2: cached.totalM2,
                      percentages: cached.percentages,
                    };
                  })()}
                  className="mt-base"
                />

                <div className="mt-base pt-base border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    {locale === 'nl' ? 'Alternatieve exports:' : 'Alternative exports:'}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CompactExportButton
                        data={data}
                        personaScores={sortedPersonas}
                        scenarios={scenarios}
                        locale={locale}
                        amenitiesData={amenities}
                      />
                      <div className="flex-1 text-xs text-gray-500">
                        {locale === 'nl'
                          ? 'JSON voor LLM analyse'
                          : 'JSON for LLM analysis'}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ExportButton
                        data={data}
                        personaScores={sortedPersonas}
                        scenarios={scenarios}
                        customScenarioPersonaIds={[]}
                        locale={locale}
                      />
                      <div className="flex-1 text-xs text-gray-500">
                        {locale === 'nl'
                          ? 'Volledige JSON dataset'
                          : 'Complete JSON dataset'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Export Section */}
              <div className="bg-white rounded-lg shadow-sm p-base border border-gray-200">
                <h3 className="text-lg font-semibold text-text-primary mb-base">
                  {locale === 'nl' ? 'Kaarten Export' : 'Maps Export'}
                </h3>
                <p className="text-sm text-text-secondary mb-base">
                  {locale === 'nl'
                    ? 'Exporteer alle WMS kaartlagen als PNG afbeeldingen voor gebruik in presentaties of rapporten.'
                    : 'Export all WMS map layers as PNG images for use in presentations or reports.'}
                </p>

                <MapExportButton
                  locale={locale}
                  coordinates={
                    data.location?.coordinates?.wgs84
                      ? [
                          data.location.coordinates.wgs84.latitude,
                          data.location.coordinates.wgs84.longitude,
                        ]
                      : [0, 0]
                  }
                  locationName={[
                    data.location?.neighborhood?.statnaam,
                    data.location?.district?.statnaam,
                    data.location?.municipality?.statnaam,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                />
              </div>

              {/* Additional Information */}
              <div className="bg-blue-50 rounded-lg p-base border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {locale === 'nl' ? 'Informatie' : 'Information'}
                </h4>
                <p className="text-sm text-blue-800">
                  {locale === 'nl'
                    ? 'Het rapport wordt geëxporteerd als JSON bestand met alle verzamelde gegevens. U kunt dit bestand gebruiken voor verdere analyse of importeren in andere systemen.'
                    : 'The report is exported as a JSON file with all collected data. You can use this file for further analysis or import it into other systems.'}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // For other tabs - just show data table
      return (
        <div className="p-lg overflow-auto h-full">
          <MultiLevelDataTable data={data} locale={locale} />
        </div>
      );
    }

    // Fallback - should not normally be reached
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-text-secondary">
          {locale === 'nl' ? 'Laden...' : 'Loading...'}
        </p>
      </div>
    );
  };

  // Component to sync activeTab and location data to AI context
  const AIContextSync = () => {
    const ai = useAIAssistantOptional();

    // Build compact export for AI tools (memoized to avoid rebuilding on every render)
    const locationExport = React.useMemo(() => {
      if (!data || !calculatedScores) return undefined;
      try {
        return exportCompactForLLM(
          data,
          calculatedScores.sortedPersonas,
          calculatedScores.scenarios,
          locale,
          [], // customScenarioPersonaIds
          amenities || null,
          wmsGrading.gradingData || null
        );
      } catch (error) {
        console.error('[AIContextSync] Failed to build compact export:', error);
        return undefined;
      }
    }, [data, calculatedScores, locale, amenities, wmsGrading.gradingData]);

    React.useEffect(() => {
      if (ai) {
        ai.setContext({
          locationExport,
          currentView: {
            location: {
              address: currentAddress || undefined,
              hasCompletedAnalysis: !!data,
              activeTab,
            },
          },
        });
      }
    }, [ai, activeTab, currentAddress, data, locationExport]);
    return null;
  };

  return (
    <AIAssistantProvider
      feature="location"
      projectId={loadedProjectId || undefined}
      initialContext={{
        currentView: {
          location: {
            address: currentAddress || undefined,
            hasCompletedAnalysis: !!data,
            activeTab,
          },
        },
      }}
    >
      {/* Sync active tab to AI context */}
      <AIContextSync />

      <MainLayout
        isCollapsed={isCollapsed}
        sidebar={
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={toggle}
            sections={sidebarSections}
            title={locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
            subtitle={locale === 'nl' ? 'Adres & Data Analyse' : 'Address & Data Analysis'}
            position="left"
          />
        }
      >
        {renderMainContent()}
      </MainLayout>
    </AIAssistantProvider>
  );
};

export default LocationPage;
