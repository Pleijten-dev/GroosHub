// src/app/[locale]/location/page.tsx - Integrated with Data Fetching
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';
import { Sidebar, useSidebar } from '../../../shared/components/UI/Sidebar';
import { useLocationSidebarSections } from '../../../features/location/components/LocationSidebar';
import { useLocationData } from '../../../features/location/hooks/useLocationData';
import { MultiLevelDataTable } from '../../../features/location/components/DataTables';
import { AmenitiesGrid, AmenitiesSummary } from '../../../features/location/components/Amenities';

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
  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: false,
    persistState: true,
    storageKey: 'location-sidebar-collapsed',
    autoCollapseMobile: true,
  });

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
    // Auto-switch to demographics tab when data is loaded
    setActiveTab('demografie');
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
      // For Demographics, Health, Safety, Livability tabs - show data table with amenities summary
      if (activeTab === 'demografie' || activeTab === 'gezondheid' || activeTab === 'veiligheid' || activeTab === 'leefbaarheid') {
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

      // For other tabs - just show data table
      return (
        <div className="p-lg overflow-auto h-full">
          <MultiLevelDataTable data={data} locale={locale} />
        </div>
      );
    }

    // Show welcome message if no data yet
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-2xl px-base">
          <div className="text-6xl mb-base">🗺️</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-base">
            {locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
          </h1>
          <p className="text-lg text-text-secondary mb-base">
            {locale === 'nl'
              ? 'Voer een adres in de zoekbalk links om data op te halen van:'
              : 'Enter an address in the search bar on the left to fetch data from:'}
          </p>
          <div className="grid grid-cols-2 gap-base text-left bg-gray-50 rounded-lg p-base">
            <div>
              <h3 className="font-semibold text-text-primary mb-xs">
                {locale === 'nl' ? 'Data Bronnen' : 'Data Sources'}
              </h3>
              <ul className="space-y-xs text-sm text-text-muted">
                <li>• CBS Demografie (84583NED)</li>
                <li>• RIVM Gezondheid (50120NED)</li>
                <li>• CBS Leefbaarheid (85146NED)</li>
                <li>• Politie Veiligheid (47018NED)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary mb-xs">
                {locale === 'nl' ? 'Geografische Niveaus' : 'Geographic Levels'}
              </h3>
              <ul className="space-y-xs text-sm text-text-muted">
                <li>• NL00 (Nederland)</li>
                <li>• GMxxxx (Gemeente)</li>
                <li>• WKxxxxxx (Wijk)</li>
                <li>• BUxxxxxxxx (Buurt)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-white">

      {/* SIDEBAR - Using reusable component */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sidebarSections}
        title={locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
        subtitle={locale === 'nl' ? 'Adres & Data Analyse' : 'Address & Data Analysis'}
        position="left"
        expandedWidth="320px"
        collapsedWidth="60px"
      />

      {/* MAIN CONTENT - Adjusted margins */}
      <main className={`
        flex-1 flex flex-col overflow-hidden bg-white transition-all duration-300
        ${mainContentMargin}
      `}>
        {renderMainContent()}
      </main>

      {/* RIGHT MENU - Fixed in proper position */}
      <aside className={`
        fixed right-0 top-navbar h-[calc(100vh-var(--navbar-height))] z-40
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
