// src/app/[locale]/location/page.tsx - Updated with Reusable Sidebar
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';
import { Sidebar, useSidebar } from '../../../shared/components/UI/Sidebar';
import { useLocationSidebarSections } from '../../../features/location/components/LocationSidebar';

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
 * Location Analysis Page - Using reusable Sidebar component
 */
const LocationPage: React.FC<LocationPageProps> = ({ params }): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabName>('doelgroepen');
  const [locale, setLocale] = useState<Locale>('nl');
  const [showRightMenu, setShowRightMenu] = useState<boolean>(false);

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
    console.log(`Tab changed to: ${tab} (locale: ${locale})`);
  };

  const handleRightMenuToggle = (): void => {
    setShowRightMenu(!showRightMenu);
  };

  // Get sidebar sections from useLocationSidebarSections hook
  const sidebarSections = useLocationSidebarSections({
    locale,
    activeTab,
    onTabChange: handleTabChange,
  });

  // Calculate main content margin based on sidebar state
  const mainContentMargin = isCollapsed ? 'ml-[60px]' : 'ml-[320px]';

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

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="p-10 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              {getCurrentTabDisplayName(activeTab, locale)} {locale === 'nl' ? 'Analyse' : 'Analysis'}
            </h1>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left max-w-2xl mx-auto">
              <p className="mb-3 text-base">
                <strong className="text-blue-600">{locale === 'nl' ? 'Component:' : 'Component:'}</strong> {getComponentName(activeTab)}
              </p>
              <p className="text-base text-gray-700">
                <strong className="text-blue-600">{locale === 'nl' ? 'Beschrijving:' : 'Description:'}</strong> {getComponentDescription(activeTab, locale)}
              </p>
              <p className="text-sm text-gray-500 mt-3">
                <strong>{locale === 'nl' ? 'Huidige Tab:' : 'Current Tab:'}</strong> {getCurrentTabDisplayName(activeTab, locale)} | <strong>{locale === 'nl' ? 'Taal:' : 'Locale:'}</strong> {locale.toUpperCase()}
              </p>
            </div>

            {/* Sample content area */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {locale === 'nl' ? 'Datavisualisatie' : 'Data Visualization'}
                </h3>
                <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-gray-600">
                    {locale === 'nl' ? 'Grafiek Component Hier' : 'Chart Component Here'}
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {locale === 'nl' ? 'Kernmetrieken' : 'Key Metrics'}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{locale === 'nl' ? 'Score' : 'Score'}</span>
                    <span className="font-medium text-blue-600">8.5/10</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">{locale === 'nl' ? 'Trend' : 'Trend'}</span>
                    <span className="font-medium text-green-600">↗ +2.3%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">{locale === 'nl' ? 'Ranking' : 'Ranking'}</span>
                    <span className="font-medium text-gray-900">
                      {locale === 'nl' ? '#3 in regio' : '#3 in region'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
              
              <div className="bg-white/60 rounded-lg p-base border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-sm">
                  {locale === 'nl' ? 'Weergave Instellingen' : 'View Settings'}
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• {locale === 'nl' ? 'Kaartlagen' : 'Map Layers'}</li>
                  <li>• {locale === 'nl' ? 'Gegevensfilters' : 'Data Filters'}</li>
                  <li>• {locale === 'nl' ? 'Tijdsbereik' : 'Time Range'}</li>
                </ul>
              </div>
              
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

// Helper functions
const getCurrentTabDisplayName = (tabId: TabName, locale: Locale): string => {
  // Find the section in main sections first
  const mainSection = MAIN_SECTIONS.find(section => section.id === tabId);
  if (mainSection) {
    return mainSection[locale];
  }
  
  // If not found, check subsections
  const subSection = SCORE_SUBSECTIONS.find(section => section.id === tabId);
  return subSection ? subSection[locale] : tabId;
};

const getComponentName = (tabId: TabName): string => {
  const componentMap: Record<TabName, string> = {
    'doelgroepen': 'DoelgroepenTabContent',
    'score': 'ScoringTabContent', 
    'demografie': 'DemografieTabContent',
    'woningmarkt': 'WoningmarktTabContent',
    'veiligheid': 'VeiligheidTabContent',
    'gezondheid': 'GezondheidTabContent',
    'leefbaarheid': 'LeefbaarheidTabContent',
    'voorzieningen': 'VoorzieningenTabContent',
    'kaarten': 'KaartenTabContent',
    'pve': 'PVETabContent'
  };
  return componentMap[tabId];
};

const getComponentDescription = (tabId: TabName, locale: Locale): string => {
  const descriptionMap: Record<Locale, Record<TabName, string>> = {
    nl: {
      'doelgroepen': 'Doelgroep analyse en visualisatie met 3D kubus',
      'score': 'Algemene locatie scoring dashboard met uitklapbare sub-categorieën',
      'demografie': 'CBS demografische data grafieken en analyse',
      'woningmarkt': 'Woningmarkt gegevens en trends',
      'veiligheid': 'Veiligheidsstatistieken en misdaadgegevens',
      'gezondheid': 'Gezondheidsmetrieken en toegang tot medische voorzieningen',
      'leefbaarheid': 'Leefbaarheidsindex en kwaliteit van leven metrieken',
      'voorzieningen': 'Voorzieningen en faciliteiten mapping',
      'kaarten': 'Interactieve kaarten met WMS lagen',
      'pve': 'Programma van eisen en specificaties'
    },
    en: {
      'doelgroepen': 'Target group analysis and visualization with 3D cube',
      'score': 'Overall location scoring dashboard with expandable sub-categories',
      'demografie': 'CBS demographic data charts and analysis',
      'woningmarkt': 'Housing market data and trends',
      'veiligheid': 'Safety statistics and crime data',
      'gezondheid': 'Health metrics and medical facility access',
      'leefbaarheid': 'Livability index and quality of life metrics',
      'voorzieningen': 'Amenities and facilities mapping',
      'kaarten': 'Interactive maps with WMS layers',
      'pve': 'Requirements program and specifications'
    }
  };
  return descriptionMap[locale][tabId] || tabId;
};

export default LocationPage;