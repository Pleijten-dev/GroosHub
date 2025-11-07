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
import { RadialChart, BarChart, DensityChart } from '../../../shared/components/common';
import { extractLocationScores } from '../../../features/location/utils/extractLocationScores';
import { LocationWelcome } from '../../../features/location/components/LocationWelcome';

// Main sections configuration with dual language support
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'score', nl: 'Score', en: 'Score' },
  { id: 'voorzieningen', nl: 'Voorzieningen', en: 'Amenities' },
  { id: 'kaarten', nl: 'Kaarten', en: 'Maps' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' }
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

  // Use location data hook
  const { data, amenities, loading, error, isLoading, hasError, fetchData, clearData } = useLocationData();

  // Use sidebar hook for state management
  const { isCollapsed, toggle, setCollapsed } = useSidebar({
    defaultCollapsed: true, // Start collapsed
    persistState: true,
    storageKey: 'location-sidebar-collapsed',
    autoCollapseMobile: true,
  });

  // Force sidebar to collapse when no data
  React.useEffect(() => {
    if (!data && !isLoading) {
      setCollapsed(true);
    }
  }, [data, isLoading, setCollapsed]);

  // Resolve params on mount
  React.useEffect(() => {
    params.then(({ locale: resolvedLocale }) => {
      setLocale(resolvedLocale);
    });
  }, [params]);

  const handleTabChange = (tab: TabName): void => {
    setActiveTab(tab);
  };

  const handleRightMenuToggle = (): void => {
    setShowRightMenu(!showRightMenu);
  };

  const handleAddressSearch = async (address: string): Promise<void> => {
    await fetchData(address);
    // Auto-switch to score overview tab when data is loaded
    setActiveTab('score');
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
    // Show loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-base"></div>
            <p className="text-lg text-text-secondary">
              {locale === 'nl' ? 'Gegevens ophalen...' : 'Fetching data...'}
            </p>
            <div className="mt-base space-y-xs text-sm text-text-muted">
              {loading.geocoding && (
                <p>✓ {locale === 'nl' ? 'Adres geocoderen...' : 'Geocoding address...'}</p>
              )}
              {loading.demographics && (
                <p>→ {locale === 'nl' ? 'CBS Demografie ophalen...' : 'Fetching CBS Demographics...'}</p>
              )}
              {loading.health && (
                <p>→ {locale === 'nl' ? 'RIVM Gezondheid ophalen...' : 'Fetching RIVM Health...'}</p>
              )}
              {loading.livability && (
                <p>→ {locale === 'nl' ? 'CBS Leefbaarheid ophalen...' : 'Fetching CBS Livability...'}</p>
              )}
              {loading.safety && (
                <p>→ {locale === 'nl' ? 'Politie Veiligheid ophalen...' : 'Fetching Police Safety...'}</p>
              )}
              {loading.amenities && (
                <p>→ {locale === 'nl' ? 'Google Voorzieningen ophalen...' : 'Fetching Google Amenities...'}</p>
              )}
              {loading.residential && (
                <p>→ {locale === 'nl' ? 'Altum AI Woningmarkt ophalen...' : 'Fetching Altum AI Housing Data...'}</p>
              )}
            </div>
          </div>
        </div>
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
      // For Doelgroepen tab - show housing personas
      if (activeTab === 'doelgroepen') {
        // Extract location scores for target group calculations
        const locationScores = extractLocationScores(data);

        return (
          <div className="p-lg overflow-auto h-full">
            <DoelgroepenGrid locale={locale} locationScores={locationScores} />
          </div>
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

      // For Demographics tab - show only demographics data
      if (activeTab === 'demografie') {
        return (
          <div className="p-lg overflow-auto h-full">
            <MultiLevelDataTable
              data={data}
              locale={locale}
              defaultSource="demographics"
              lockSourceFilter={true}
            />
          </div>
        );
      }

      // For Safety tab - show only safety data
      if (activeTab === 'veiligheid') {
        return (
          <div className="p-lg overflow-auto h-full">
            <MultiLevelDataTable
              data={data}
              locale={locale}
              defaultSource="safety"
              lockSourceFilter={true}
            />
          </div>
        );
      }

      // For Health tab - show only health data
      if (activeTab === 'gezondheid') {
        return (
          <div className="p-lg overflow-auto h-full">
            <MultiLevelDataTable
              data={data}
              locale={locale}
              defaultSource="health"
              lockSourceFilter={true}
            />
          </div>
        );
      }

      // For Livability tab - show only livability data
      if (activeTab === 'leefbaarheid') {
        return (
          <div className="p-lg overflow-auto h-full">
            <MultiLevelDataTable
              data={data}
              locale={locale}
              defaultSource="livability"
              lockSourceFilter={true}
            />
          </div>
        );
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

      // For other tabs - just show data table
      return (
        <div className="p-lg overflow-auto h-full">
          <MultiLevelDataTable data={data} locale={locale} />
        </div>
      );
    }

    // Show welcome state when no data is available
    return (
      <LocationWelcome
        locale={locale}
        onAddressSearch={handleAddressSearch}
        isSearching={isLoading}
      />
    );
  };

  return (
    <div className="page-background h-screen w-screen overflow-hidden relative">

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
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• PDF {locale === 'nl' ? 'Rapport' : 'Report'}</li>
                  <li>• Excel {locale === 'nl' ? 'Gegevens' : 'Data'}</li>
                  <li>• {locale === 'nl' ? 'Afbeelding Export' : 'Image Export'}</li>
                </ul>
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
