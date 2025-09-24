// src/app/[locale]/location/page.tsx (Tailwind v4 version)
"use client";

import React, { JSX, useState } from 'react';
import { Locale } from '../../../lib/i18n/config';

// Tab configuration
const TABS = [
  'Doelgroepen',
  'Score', 
  'Demografie',
  'Woningmarkt', 
  'Veiligheid',
  'Gezondheid',
  'Leefbaarheid',
  'Voorzieningen',
  'Kaarten',
  'Programma van Eisen'
] as const;

type TabName = typeof TABS[number];

interface LocationPageProps {
  params: { locale: Locale };
}

/**
 * Location Analysis Page with Tailwind v4
 * Clean, modern design using Tailwind utilities
 */
const LocationPage: React.FC<LocationPageProps> = ({ params: { locale } }): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabName>('Doelgroepen');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [showRightMenu, setShowRightMenu] = useState<boolean>(false);

  const handleTabChange = (tab: TabName): void => {
    setActiveTab(tab);
    console.log(`Tab changed to: ${tab} (locale: ${locale})`);
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
      
      {/* SIDEBAR */}
      <aside className={`
        bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 z-20 relative
        ${isSidebarCollapsed ? 'w-16 min-w-16' : 'w-80 min-w-80'}
      `}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 min-h-[70px]">
          <button
            type="button"
            onClick={handleSidebarToggle}
            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="text-xl">
              {isSidebarCollapsed ? '→' : '←'}
            </span>
          </button>
          
          {!isSidebarCollapsed && (
            <button
              type="button"
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Search Options"
            >
              <span className="text-xl">🔍</span>
            </button>
          )}
        </div>

        {/* Sidebar Content */}
        {!isSidebarCollapsed && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            
            {/* Search Section */}
            <section className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold mb-2 text-gray-900">Location Analysis</h2>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Enter an address to analyze location data.
                <br />
                <strong className="text-blue-600">Future:</strong> LocationSearch component
              </p>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Enter address..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:border-blue-500 focus:ring-3 focus:ring-blue-100 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddressSearch}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 active:transform active:scale-95 transition-all"
                >
                  Get Data
                </button>
              </div>
            </section>

            {/* Controls Section */}
            <section className="p-5 flex-1">
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <p className="font-semibold text-gray-600 mb-3">Future Components:</p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>LocationFilters</li>
                  <li>DataSourceSelector</li>
                  <li>ExportControls</li>
                </ul>
              </div>
            </section>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {/* Tab Navigation */}
        <nav className="bg-gray-50 border-b-2 border-gray-300 overflow-x-auto">
          <div className="flex items-center min-w-full px-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`
                  px-5 py-4 text-sm font-medium border-b-3 transition-all whitespace-nowrap flex-shrink-0
                  ${activeTab === tab 
                    ? 'text-blue-500 border-blue-500 bg-blue-50' 
                    : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-blue-25'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-white">
          <div className="p-10 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              TabContent: {activeTab}
            </h1>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-left max-w-2xl mx-auto">
              <p className="mb-3 text-base">
                <strong className="text-blue-600">Future Component:</strong> {getComponentName(activeTab)}
              </p>
              <p className="text-base text-gray-700">
                <strong className="text-blue-600">Description:</strong> {getComponentDescription(activeTab)}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* RIGHT MENU */}
      <aside className={`
        absolute right-0 top-0 h-full bg-gray-50 border-l border-gray-200 transition-transform duration-300 w-70 z-10 flex flex-col
        ${showRightMenu ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <button
          type="button"
          onClick={handleRightMenuToggle}
          className="absolute -left-10 top-1/2 -translate-y-1/2 bg-blue-500 text-white w-10 h-15 rounded-l-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 text-base font-bold z-20"
        >
          {showRightMenu ? '→' : '←'}
        </button>
        
        {showRightMenu && (
          <div className="p-5 overflow-y-auto h-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Right Menu</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong className="text-blue-600">Future:</strong> RightNavMenu Component
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="py-2 border-b border-gray-200">Data Export Options</li>
              <li className="py-2 border-b border-gray-200">View Settings</li>
              <li className="py-2 border-b border-gray-200">Help & Documentation</li>
              <li className="py-2">Feedback Form</li>
            </ul>
          </div>
        )}
      </aside>

      {/* LOCALE INDICATOR */}
      <div className="absolute top-3 right-3 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold z-50 pointer-events-none shadow-md">
        {locale.toUpperCase()}
      </div>
    </div>
  );
};

// Helper functions
const getComponentName = (tab: TabName): string => {
  const componentMap: Record<TabName, string> = {
    'Doelgroepen': 'DoelgroepenTabContent',
    'Score': 'ScoringTabContent', 
    'Demografie': 'DemografieTabContent',
    'Woningmarkt': 'WoningmarktTabContent',
    'Veiligheid': 'VeiligheidTabContent',
    'Gezondheid': 'GezondheidTabContent',
    'Leefbaarheid': 'LeefbaarheidTabContent',
    'Voorzieningen': 'VoorzieningenTabContent',
    'Kaarten': 'KaartenTabContent',
    'Programma van Eisen': 'PVETabContent'
  };
  return componentMap[tab];
};

const getComponentDescription = (tab: TabName): string => {
  const descriptionMap: Record<TabName, string> = {
    'Doelgroepen': 'Target group analysis and visualization with 3D cube',
    'Score': 'Overall location scoring dashboard',
    'Demografie': 'CBS demographic data charts and analysis',
    'Woningmarkt': 'Housing market data and trends',
    'Veiligheid': 'Safety statistics and crime data',
    'Gezondheid': 'Health metrics and medical facility access',
    'Leefbaarheid': 'Livability index and quality of life metrics',
    'Voorzieningen': 'Amenities and facilities mapping',
    'Kaarten': 'Interactive maps with WMS layers',
    'Programma van Eisen': 'Requirements program and specifications'
  };
  return descriptionMap[tab];
};

export default LocationPage;