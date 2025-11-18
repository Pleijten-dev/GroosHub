// src/features/location/components/LocationSidebar/LocationSidebarContent.tsx
'use client';

import React, { useState } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { SidebarSection } from '../../../../shared/components/UI/Sidebar/types';
import { Button } from '../../../../shared/components/UI';
import { cn } from '../../../../shared/utils/cn';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';

// Types for location analysis sections
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'score', nl: 'Score', en: 'Score' },
  { id: 'voorzieningen', nl: 'Voorzieningen', en: 'Amenities' },
  { id: 'kaarten', nl: 'Kaarten', en: 'Maps' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' },
  { id: 'genereer-rapport', nl: 'Genereer Rapport', en: 'Generate Report' }
] as const;

const SCORE_SUBSECTIONS = [
  { id: 'demografie', nl: 'Demografie', en: 'Demographics' },
  { id: 'woningmarkt', nl: 'Woningmarkt', en: 'Housing Market' },
  { id: 'veiligheid', nl: 'Veiligheid', en: 'Safety' },
  { id: 'gezondheid', nl: 'Gezondheid', en: 'Health' },
  { id: 'leefbaarheid', nl: 'Leefbaarheid', en: 'Livability' }
] as const;

type SectionId = typeof MAIN_SECTIONS[number]['id'] | typeof SCORE_SUBSECTIONS[number]['id'];

interface LocationSidebarContentProps {
  locale: Locale;
  activeTab: SectionId;
  onTabChange: (tab: SectionId) => void;
  onAddressSearch?: (address: string) => void;
  isSearching?: boolean;
}

export type { LocationSidebarContentProps };

export const useLocationSidebarSections = ({
  locale,
  activeTab,
  onTabChange,
  onAddressSearch,
  isSearching = false,
}: LocationSidebarContentProps): SidebarSection[] => {
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isScoreExpanded, setIsScoreExpanded] = useState<boolean>(false);

  const handleAddressSearch = (): void => {
    if (searchAddress.trim() && onAddressSearch) {
      onAddressSearch(searchAddress.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleAddressSearch();
    }
  };

  const handleScoreToggle = (): void => {
    setIsScoreExpanded(!isScoreExpanded);
    if (!isScoreExpanded) {
      onTabChange('score');
    }
  };

  const getSectionText = (section: typeof MAIN_SECTIONS[number] | typeof SCORE_SUBSECTIONS[number]): string => {
    return section[locale];
  };

  // Search section content
  const searchSection = (
    <div className="space-y-md">
      <AddressAutocomplete
        placeholder={locale === 'nl' ? 'Voer adres in...' : 'Enter address...'}
        value={searchAddress}
        onChange={setSearchAddress}
        onSelect={(address) => {
          setSearchAddress(address);
          if (onAddressSearch) {
            onAddressSearch(address);
          }
        }}
        onKeyPress={handleKeyPress}
        className="w-full"
        disabled={isSearching}
      />
      <Button
        onClick={handleAddressSearch}
        variant="primary"
        className="w-full"
        disabled={isSearching || !searchAddress.trim()}
      >
        {isSearching
          ? (locale === 'nl' ? 'Bezig met laden...' : 'Loading...')
          : (locale === 'nl' ? 'Haal Gegevens Op' : 'Get Data')}
      </Button>
    </div>
  );

  // Navigation section content
  const navigationSection = (
    <div className="space-y-xs">
      {MAIN_SECTIONS.map((section) => (
        <div key={section.id}>
          {/* Main Section Button */}
          <Button
            onClick={() => {
              if (section.id === 'score') {
                handleScoreToggle();
              } else {
                onTabChange(section.id);
              }
            }}
            variant="ghost"
            className={cn(
              'w-full justify-between text-left p-sm rounded-md',
              (activeTab === section.id || 
               (section.id === 'score' && SCORE_SUBSECTIONS.some(sub => sub.id === activeTab)))
                ? 'bg-primary-light text-primary border border-primary'
                : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
            )}
          >
            <span className="font-medium">{getSectionText(section)}</span>
            {section.id === 'score' && (
              <svg 
                className={cn(
                  'w-4 h-4 transition-transform duration-fast',
                  isScoreExpanded ? 'rotate-90' : 'rotate-0'
                )}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            )}
          </Button>
          
          {/* Score Subsections */}
          {section.id === 'score' && isScoreExpanded && (
            <div className="mt-xs ml-md space-y-xs">
              {SCORE_SUBSECTIONS.map((subsection) => (
                <Button
                  key={subsection.id}
                  onClick={() => onTabChange(subsection.id)}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-left p-sm rounded-md text-sm',
                    activeTab === subsection.id
                      ? 'bg-primary-light text-primary border border-primary'
                      : 'text-text-muted hover:bg-gray-50 hover:text-text-secondary'
                  )}
                >
                  {getSectionText(subsection)}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Define sidebar sections
  const sections: SidebarSection[] = [
    {
      id: 'search',
      title: locale === 'nl' ? 'Adres Zoeken' : 'Address Search',
      description: locale === 'nl' 
        ? 'Voer een adres in om locatiegegevens te analyseren.'
        : 'Enter an address to analyze location data.',
      content: searchSection,
    },
    {
      id: 'navigation',
      title: locale === 'nl' ? 'Analyse Categorieën' : 'Analysis Categories',
      content: navigationSection,
    },
  ];

  return sections;
};

export default useLocationSidebarSections;