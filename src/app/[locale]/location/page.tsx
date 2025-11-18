// src/app/[locale]/location/page.tsx - Integrated with Data Fetching
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';
import { Sidebar, useSidebar } from '../../../shared/components/UI/Sidebar';
import { useLocationSidebarSections } from '../../../features/location/components/LocationSidebar';
import { useLocationData } from '../../../features/location/hooks/useLocationData';
import { MultiLevelDataTable } from '../../../features/location/components/DataTables';
import { AmenitiesGrid, AmenitiesSummary } from '../../../features/location/components/Amenities';
import { ResidentialSummary, ResidentialGrid } from '../../../features/location/components/Residential';
import { DoelgroepenGrid } from '../../../features/location/components/Doelgroepen';
import { DemographicsPage } from '../../../features/location/components/Demographics';
import { SafetyPage } from '../../../features/location/components/Safety';
import { HealthPage } from '../../../features/location/components/Health';
import { LivabilityPage } from '../../../features/location/components/Livability';
import { ExportButton, CompactExportButton } from '../../../features/location/components/ExportButton';
import { RadialChart, BarChart, DensityChart } from '../../../shared/components/common';
import { extractLocationScores } from '../../../features/location/utils/extractLocationScores';
import { LocationAnimation } from '../../../features/location/components/LocationAnimation';
import { DoelgroepenResult } from '../../../features/location/components/DoelgroepenResult';
import { generateGradientColors } from '../../../features/location/utils/cubePatterns';
import { calculatePersonaScores } from '../../../features/location/utils/targetGroupScoring';
import { getPersonaCubePosition } from '../../../features/location/utils/cubePositionMapping';
import { calculateConnections, calculateScenarios } from '../../../features/location/utils/connectionCalculations';
import housingPersonasData from '../../../features/location/data/sources/housing-personas.json';
import { LocationMap, MapStyle, WMSLayerControl, WMSLayerSelection, WMSFeatureInfo } from '../../../features/location/components/Maps';

// Main sections configuration with dual language support
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'score', nl: 'Score', en: 'Score' },
  { id: 'voorzieningen', nl: 'Voorzieningen', en: 'Amenities' },
  { id: 'kaarten', nl: 'Kaarten', en: 'Maps' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' },
  { id: 'genereer-rapport', nl: 'Genereer Rapport', en: 'Generate Report' }
] as const;

// Score subsections with dual language support
const SCORE_SUBSECTIONS = [
  { id: 'demografie', nl: 'Demografie', en: 'Demographics' },
  { id: 'woningmarkt', nl: 'Woningmarkt', en: 'Housing Market' },
  { id: 'veiligheid', nl: 'Veiligheid', en: 'Safety' },
  { id: 'gezondheid', nl: 'Gezondheid', en: 'Health' },
  { id: 'leefbaarheid', nl: 'Leefbaarheid', en: 'Livability' }
] as const;

type SectionId = typeof MAIN_SECTIONS[number]['id'] | typeof SCORE_SUBSECTIONS[number]['id'];
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
  const [showRightMenu, setShowRightMenu] = useState<boolean>(false);
  const [animationStage, setAnimationStage] = useState<'welcome' | 'loading' | 'result'>('welcome');

  // WMS layer state
  const [selectedWMSLayer, setSelectedWMSLayer] = useState<WMSLayerSelection | null>(null);
  const [wmsOpacity, setWMSOpacity] = useState<number>(0.7);
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [featureInfo, setFeatureInfo] = useState<WMSFeatureInfo | null>(null);

  // Generate cube colors once and share across all components for consistency
  const cubeColors = React.useMemo(() => generateGradientColors(), []);

  // Use location data hook
  const { data, amenities, loading, error, isLoading, hasError, fetchData, clearData } = useLocationData();

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

  const handleRightMenuToggle = (): void => {
    setShowRightMenu(!showRightMenu);
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

  // Get sidebar sections from useLocationSidebarSections hook
  const sidebarSections = useLocationSidebarSections({
    locale,
    activeTab,
    onTabChange: handleTabChange,
    onAddressSearch: handleAddressSearch,
    isSearching: isLoading,
  });

  // Calculate main content margin based on sidebar state
  const mainContentMargin = isCollapsed ? 'ml-[60px]' : 'ml-[320px]';

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
    if (data) {
      // For Doelgroepen tab - show result with cube and scenarios
      if (activeTab === 'doelgroepen') {
        // Extract location scores and calculate persona scores
        const locationScores = extractLocationScores(data);
        const personas = housingPersonasData[locale].housing_personas;
        const personaScores = calculatePersonaScores(personas, locationScores);

        // Sort by R-rank position (1 = best)
        const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

        // Calculate connections between personas
        const connections = calculateConnections(personas, sortedPersonas);

        // Calculate scenarios using R-rank and connection cross-reference
        const scenarios = calculateScenarios(personas, sortedPersonas, connections);

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
            locale={locale}
            cubeColors={cubeColors}
            allPersonas={personas}
            allPersonaScores={sortedPersonas}
            getScenarioData={getScenarioData}
          />
        );
      }

      // For Score tab - show overview with all data
      if (activeTab === 'score') {
        return (
          <div className="p-lg overflow-auto h-full">
            <MultiLevelDataTable data={data} locale={locale} />
            {amenities && (
              <AmenitiesSummary
                data={amenities}
                locale={locale}
                onViewAll={() => setActiveTab('voorzieningen')}
              />
            )}
            {data.residential && (
              <ResidentialSummary
                data={data.residential}
                locale={locale}
                onViewAll={() => setActiveTab('woningmarkt')}
              />
            )}
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

      // For Woningmarkt tab - show full residential grid
      if (activeTab === 'woningmarkt') {
        return (
          <div className="p-lg overflow-auto h-full">
            {data.residential ? (
              <ResidentialGrid data={data.residential} locale={locale} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-base">🏠</div>
                  <p className="text-lg text-text-secondary">
                    {locale === 'nl'
                      ? 'Woningmarkt gegevens niet beschikbaar'
                      : 'Housing market data not available'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }

      // For Kaarten tab - show Leaflet map with WMS layer support
      if (activeTab === 'kaarten') {
        // Use exact geocoded coordinates from the address search
        // These are already in WGS84 format (latitude/longitude)
        const coordinates: [number, number] = [
          data.location.coordinates.wgs84.latitude,
          data.location.coordinates.wgs84.longitude,
        ];

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
          </div>
        );
      }

      // For PVE (Programma van Eisen) tab - show charts with dummy data
      if (activeTab === 'pve') {
        // Dummy data for RadialChart
        const radialData = [
          { name: 'Veiligheid', value: 85, color: '#48806a' },
          { name: 'Toegankelijkheid', value: 72, color: '#477638' },
          { name: 'Voorzieningen', value: 90, color: '#8a976b' },
          { name: 'Groen', value: 65, color: '#0c211a' },
          { name: 'Mobiliteit', value: 78, color: '#48806a' },
          { name: 'Sociale cohesie', value: 68, color: '#477638' },
          { name: 'Leefbaarheid', value: 82, color: '#8a976b' },
          { name: 'Duurzaamheid', value: 74, color: '#0c211a' }
        ];

        // Dummy data for BarChart
        const barData = [
          { name: 'Week 1', value: 45, color: '#48806a' },
          { name: 'Week 2', value: 62, color: '#477638' },
          { name: 'Week 3', value: 58, color: '#8a976b' },
          { name: 'Week 4', value: 71, color: '#0c211a' },
          { name: 'Week 5', value: 55, color: '#48806a' },
          { name: 'Week 6', value: 68, color: '#477638' }
        ];

        return (
          <div className="p-lg overflow-auto h-full">
            <div className="space-y-lg">
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-base">
                  {locale === 'nl' ? 'Programma van Eisen - Analyse' : 'Requirements Program - Analysis'}
                </h2>
                <p className="text-sm text-text-secondary mb-lg">
                  {locale === 'nl'
                    ? 'Visualisaties van de belangrijkste criteria en trends.'
                    : 'Visualizations of key criteria and trends.'}
                </p>
              </div>

              {/* Radial Chart Section */}
              <div className="bg-white rounded-lg shadow-sm p-base border border-gray-200">
                <h3 className="text-lg font-semibold text-text-primary mb-base">
                  {locale === 'nl' ? 'Score Overzicht' : 'Score Overview'}
                </h3>
                <div className="flex justify-center">
                  <RadialChart
                    data={radialData}
                    width={600}
                    height={500}
                    showLabels={true}
                    isSimple={false}
                  />
                </div>
              </div>

              {/* Bar Chart Section */}
              <div className="bg-white rounded-lg shadow-sm p-base border border-gray-200">
                <h3 className="text-lg font-semibold text-text-primary mb-base">
                  {locale === 'nl' ? 'Trend Analyse' : 'Trend Analysis'}
                </h3>
                <div className="flex justify-center">
                  <BarChart
                    data={barData}
                    width={700}
                    height={400}
                    showLabels={true}
                    showAverageLine={true}
                    minValue={0}
                    maxValue={100}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      }

      // For Generate Report tab - show export options
      if (activeTab === 'genereer-rapport') {
        // Extract location scores and calculate persona scores
        const locationScores = extractLocationScores(data);
        const personas = housingPersonasData[locale].housing_personas;
        const personaScores = calculatePersonaScores(personas, locationScores);
        const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
        const connections = calculateConnections(personas, sortedPersonas);
        const scenarios = calculateScenarios(personas, sortedPersonas, connections);

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

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {locale === 'nl' ? 'Kies export formaat:' : 'Choose export format:'}
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <CompactExportButton
                          data={data}
                          personaScores={sortedPersonas}
                          scenarios={scenarios}
                          locale={locale}
                        />
                        <div className="flex-1 text-sm text-gray-600">
                          <strong className="block mb-1">
                            {locale === 'nl' ? '✓ Aanbevolen voor LLM' : '✓ Recommended for LLM'}
                          </strong>
                          {locale === 'nl'
                            ? 'Geoptimaliseerd formaat (~500 regels) met samenvattingen en highlights. Perfect voor rapportgeneratie met AI.'
                            : 'Optimized format (~500 lines) with summaries and highlights. Perfect for AI report generation.'}
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
                        <div className="flex-1 text-sm text-gray-600">
                          <strong className="block mb-1">
                            {locale === 'nl' ? 'Volledig export' : 'Complete export'}
                          </strong>
                          {locale === 'nl'
                            ? 'Complete dataset met alle individuele datapunten en metadata. Voor verdere verwerking of analyse.'
                            : 'Complete dataset with all individual data points and metadata. For further processing or analysis.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

  return (
    <div className="page-background h-[calc(100vh-var(--navbar-height))] w-screen overflow-hidden relative">

      {/* SIDEBAR - Using reusable component (position: fixed, out of flow) */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sidebarSections}
        title={locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
        subtitle={locale === 'nl' ? 'Adres & Data Analyse' : 'Address & Data Analysis'}
        position="left"
        expandedWidth="320px"
        collapsedWidth="60px"
        className="!top-[var(--navbar-height)] !bottom-0 !h-auto"
      />

      {/* MAIN CONTENT - Margin adjusted for fixed sidebar */}
      <main className={`
        flex flex-col overflow-auto h-[calc(100vh-var(--navbar-height))]
        ${mainContentMargin}
      `}>
        {renderMainContent()}
      </main>

      {/* RIGHT MENU - Fixed in proper position */}
      <aside className={`
        fixed right-0 top-0 h-screen z-40
        bg-white/80 backdrop-blur-md border-l border-gray-200/50
        transition-transform duration-300 w-70 flex flex-col shadow-lg
        ${showRightMenu ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <button
          type="button"
          onClick={handleRightMenuToggle}
          className="absolute -left-10 top-1/2 -translate-y-1/2 bg-blue-500 text-white w-10 h-15 rounded-l-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-base font-bold z-20 shadow-lg"
        >
          {showRightMenu ? '→' : '←'}
        </button>

        {showRightMenu && (
          <div className="p-lg overflow-y-auto h-full">
            <h3 className="text-lg font-semibold mb-base text-gray-900">
              {locale === 'nl' ? 'Analyse Tools' : 'Analysis Tools'}
            </h3>
            <p className="text-sm text-gray-600 mb-base">
              {locale === 'nl'
                ? 'Snelle toegang tot analyse-opties en instellingen.'
                : 'Quick access to analysis options and settings.'
              }
            </p>

            <div className="space-y-base">
              <div className="bg-white/60 rounded-lg p-base border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-sm">
                  {locale === 'nl' ? 'Export Opties' : 'Export Options'}
                </h4>
                {activeTab === 'doelgroepen' && data ? (
                  <div className="space-y-2">
                    <ExportButton
                      data={data}
                      personaScores={(() => {
                        const locationScores = extractLocationScores(data);
                        const personas = housingPersonasData[locale].housing_personas;
                        return calculatePersonaScores(personas, locationScores).sort((a, b) => a.rRankPosition - b.rRankPosition);
                      })()}
                      scenarios={(() => {
                        const locationScores = extractLocationScores(data);
                        const personas = housingPersonasData[locale].housing_personas;
                        const personaScores = calculatePersonaScores(personas, locationScores);
                        const sortedPersonas = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);
                        const connections = calculateConnections(personas, sortedPersonas);
                        return calculateScenarios(personas, sortedPersonas, connections);
                      })()}
                      customScenarioPersonaIds={[]}
                      locale={locale}
                    />
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• PDF {locale === 'nl' ? 'Rapport' : 'Report'}</li>
                    <li>• Excel {locale === 'nl' ? 'Gegevens' : 'Data'}</li>
                    <li>• {locale === 'nl' ? 'Afbeelding Export' : 'Image Export'}</li>
                  </ul>
                )}
              </div>

              {data && (
                <div className="bg-white/60 rounded-lg p-base border border-gray-200/50">
                  <h4 className="font-medium text-gray-900 mb-sm">
                    {locale === 'nl' ? 'Huidige Locatie' : 'Current Location'}
                  </h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• {data.location.municipality.statnaam}</li>
                    {data.location.district && <li>• {data.location.district.statnaam}</li>}
                    {data.location.neighborhood && <li>• {data.location.neighborhood.statnaam}</li>}
                  </ul>
                </div>
              )}

              <div className="bg-white/60 rounded-lg p-base border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-sm">
                  {locale === 'nl' ? 'Help & Ondersteuning' : 'Help & Support'}
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• {locale === 'nl' ? 'Documentatie' : 'Documentation'}</li>
                  <li>• {locale === 'nl' ? 'Tutorials' : 'Tutorials'}</li>
                  <li>• {locale === 'nl' ? 'Contact Support' : 'Contact Support'}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default LocationPage;
