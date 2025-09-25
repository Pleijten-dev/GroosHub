// src/app/[locale]/location/page.tsx - Fixed Navigation Issues
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';

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
 * Location Analysis Page - Clean wireframe with fixed navigation
 * Uses glass background for sidebar matching main NavigationBar
 */
const LocationPage: React.FC<LocationPageProps> = ({ params }): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabName>('doelgroepen');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [showRightMenu, setShowRightMenu] = useState<boolean>(false);
  const [locale, setLocale] = useState<Locale>('nl');
  const [isScoreExpanded, setIsScoreExpanded] = useState<boolean>(false);

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

  const handleScoreToggle = (): void => {
    setIsScoreExpanded(!isScoreExpanded);
    if (!isScoreExpanded) {
      setActiveTab('score');
    }
  };

  // Helper function to get section text by locale
  const getSectionText = (section: typeof MAIN_SECTIONS[number] | typeof SCORE_SUBSECTIONS[number]): string => {
    return section[locale];
  };

  // Helper function to check if a subsection is active
  const isSubsectionActive = (subsectionId: SectionId): boolean => {
    return SCORE_SUBSECTIONS.some(sub => sub.id === subsectionId) && activeTab === subsectionId;
  };

  const handleSidebarToggle = (): void => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleAddressSearch = (): void => {
    console.log(`Searching for address: ${searchAddress} (locale: ${locale})`);
  };

  const handleRightMenuToggle = (): void => {
    setShowRightMenu(!showRightMenu);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-white">
      
      {/* SIDEBAR - Fixed position with glass background */}
      <aside className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] z-50
        bg-white/80 backdrop-blur-md border-r border-gray-200/50 
        flex flex-col transition-all duration-300 shadow-lg
        ${isSidebarCollapsed ? 'w-16 min-w-16' : 'w-80 min-w-80'}
      `}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/30 min-h-[70px] bg-white/50">
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="p-2 rounded-md hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="text-xl font-semibold text-gray-700">
              {isSidebarCollapsed ? '→' : '←'}
            </span>
          </button>
          
          {!isSidebarCollapsed && (
            <button
              type="button"
              className="p-2 rounded-md hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
              aria-label="Search Options"
            >
              <span className="text-xl">🔍</span>
            </button>
          )}
        </div>

        {/* Sidebar Content - Scrollable */}
        {!isSidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            
            {/* Search Input - No sections, just content */}
            <div className="p-5">
              <h2 className="text-lg font-semibold mb-2 text-gray-900">
                {locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
              </h2>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {locale === 'nl' 
                  ? 'Voer een adres in om locatiegegevens te analyseren.'
                  : 'Enter an address to analyze location data.'
                }
              </p>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder={locale === 'nl' ? 'Voer adres in...' : 'Enter address...'}
                  className="w-full px-4 py-3 border-2 border-gray-300/60 rounded-lg text-sm bg-white/70 text-gray-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-100 focus:outline-none transition-all backdrop-blur-sm"
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 active:transform active:scale-95 transition-all"
                >
                  {locale === 'nl' ? 'Haal Gegevens Op' : 'Get Data'}
                </button>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="p-5 border-t border-gray-200/30">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {locale === 'nl' ? 'Analyse Categorieën' : 'Analysis Categories'}
              </h3>
              <div className="space-y-1">
                {MAIN_SECTIONS.map((section) => (
                  <div key={section.id}>
                    {/* Main Section Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (section.id === 'score') {
                          handleScoreToggle();
                        } else {
                          handleTabChange(section.id);
                        }
                      }}
                      className={`
                        w-full px-3 py-2 text-sm font-medium rounded-md transition-all text-left flex items-center justify-between
                        ${activeTab === section.id || (section.id === 'score' && SCORE_SUBSECTIONS.some(sub => sub.id === activeTab))
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'text-gray-600 hover:bg-gray-100/60 hover:text-gray-900'
                        }
                      `}
                    >
                      <span>{getSectionText(section)}</span>
                      {section.id === 'score' && (
                        <span className={`transition-transform text-xs ${isScoreExpanded ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                      )}
                    </button>
                    
                    {/* Score Subsections */}
                    {section.id === 'score' && isScoreExpanded && (
                      <div className="mt-1 ml-4 space-y-1">
                        {SCORE_SUBSECTIONS.map((subsection) => (
                          <button
                            key={subsection.id}
                            type="button"
                            onClick={() => handleTabChange(subsection.id)}
                            className={`
                              w-full px-3 py-1.5 text-xs font-medium rounded-md transition-all text-left
                              ${activeTab === subsection.id 
                                ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                              }
                            `}
                          >
                            {getSectionText(subsection)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT - Adjusted margins */}
      <main className={`
        flex-1 flex flex-col overflow-hidden bg-white transition-all duration-300
        ${isSidebarCollapsed ? 'ml-16' : 'ml-80'}
      `}>

        {/* Content Area - No tab navigation here */}
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
        fixed right-0 top-16 h-[calc(100vh-4rem)] z-40
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
          <div className="p-5 overflow-y-auto h-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {locale === 'nl' ? 'Analyse Tools' : 'Analysis Tools'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {locale === 'nl' 
                ? 'Snelle toegang tot analyse-opties en instellingen.'
                : 'Quick access to analysis options and settings.'
              }
            </p>
            
            <div className="space-y-4">
              <div className="bg-white/60 rounded-lg p-4 border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-2">
                  {locale === 'nl' ? 'Export Opties' : 'Export Options'}
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• PDF {locale === 'nl' ? 'Rapport' : 'Report'}</li>
                  <li>• Excel {locale === 'nl' ? 'Gegevens' : 'Data'}</li>
                  <li>• {locale === 'nl' ? 'Afbeelding Export' : 'Image Export'}</li>
                </ul>
              </div>
              
              <div className="bg-white/60 rounded-lg p-4 border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-2">
                  {locale === 'nl' ? 'Weergave Instellingen' : 'View Settings'}
                </h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• {locale === 'nl' ? 'Kaartlagen' : 'Map Layers'}</li>
                  <li>• {locale === 'nl' ? 'Gegevensfilters' : 'Data Filters'}</li>
                  <li>• {locale === 'nl' ? 'Tijdsbereik' : 'Time Range'}</li>
                </ul>
              </div>
              
              <div className="bg-white/60 rounded-lg p-4 border border-gray-200/50">
                <h4 className="font-medium text-gray-900 mb-2">
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