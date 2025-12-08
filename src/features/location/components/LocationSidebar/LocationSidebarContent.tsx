// src/features/location/components/LocationSidebar/LocationSidebarContent.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Locale } from '../../../../lib/i18n/config';
import { SidebarSection } from '../../../../shared/components/UI/Sidebar/types';
import { Button } from '../../../../shared/components/UI';
import { cn } from '../../../../shared/utils/cn';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { locationDataCache } from '../../data/cache/locationDataCache';
import { SaveLocationToProject } from '../SavedLocations/SaveLocationToProject';
import { ProjectSnapshotsList } from '../SavedLocations/ProjectSnapshotsList';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { AccessibleLocation } from '../../types/saved-locations';

// Types for location analysis sections
const MAIN_SECTIONS = [
  { id: 'doelgroepen', nl: 'Doelgroepen', en: 'Target Groups' },
  { id: 'omgeving', nl: 'Omgeving', en: 'Environment' },
  { id: 'pve', nl: 'Programma van Eisen', en: 'Requirements Program' },
  { id: 'genereer-rapport', nl: 'Genereer Rapport', en: 'Generate Report' }
] as const;

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

const RAPPORT_SUBSECTIONS = [
  { id: 'housing', nl: 'Woningen', en: 'Housing' },
  { id: 'community', nl: 'Gemeenschappelijk', en: 'Community' },
  { id: 'public', nl: 'Publiek', en: 'Public' }
] as const;

type SectionId = typeof MAIN_SECTIONS[number]['id'] | typeof OMGEVING_SUBSECTIONS[number]['id'] | typeof RAPPORT_SUBSECTIONS[number]['id'];

interface LocationSidebarContentProps {
  locale: Locale;
  activeTab: SectionId;
  onTabChange: (tab: SectionId) => void;
  onAddressSearch?: (address: string) => void;
  isSearching?: boolean;
  currentAddress?: string | null;
  locationData?: UnifiedLocationData | null;
  amenitiesData?: AmenityMultiCategoryResponse | null;
  onLoadSavedLocation?: (location: AccessibleLocation) => void;
}

export type { LocationSidebarContentProps };

export const useLocationSidebarSections = ({
  locale,
  activeTab,
  onTabChange,
  onAddressSearch,
  isSearching = false,
  currentAddress = null,
  locationData = null,
  amenitiesData = null,
  onLoadSavedLocation,
}: LocationSidebarContentProps): SidebarSection[] => {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isOmgevingExpanded, setIsOmgevingExpanded] = useState<boolean>(false);
  const [isRapportExpanded, setIsRapportExpanded] = useState<boolean>(false);
  const [hasRapport, setHasRapport] = useState<boolean>(false);
  const [savedLocationsRefresh, setSavedLocationsRefresh] = useState<number>(0);

  // Check if rapport exists
  React.useEffect(() => {
    const checkRapport = () => {
      try {
        const cachedAddress = localStorage.getItem('grooshub_current_address');
        if (cachedAddress) {
          const rapport = locationDataCache.getRapport(cachedAddress);
          setHasRapport(!!rapport);
        }
      } catch (error) {
        console.error('Error checking rapport:', error);
      }
    };

    checkRapport();
    // Check periodically in case rapport is generated
    const interval = setInterval(checkRapport, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand Omgeving dropdown when activeTab is one of its subsections
  React.useEffect(() => {
    const isOmgevingSubsection = OMGEVING_SUBSECTIONS.some(sub => sub.id === activeTab);
    if (isOmgevingSubsection && !isOmgevingExpanded) {
      setIsOmgevingExpanded(true);
    }
  }, [activeTab, isOmgevingExpanded]);

  // Auto-expand Rapport dropdown when activeTab is one of its subsections
  React.useEffect(() => {
    const isRapportSubsection = RAPPORT_SUBSECTIONS.some(sub => sub.id === activeTab);
    if (isRapportSubsection && !isRapportExpanded) {
      setIsRapportExpanded(true);
    }
  }, [activeTab, isRapportExpanded]);

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

  const handleOmgevingToggle = (): void => {
    setIsOmgevingExpanded(!isOmgevingExpanded);
    if (!isOmgevingExpanded) {
      onTabChange('score');
    }
  };

  const handleRapportToggle = (): void => {
    if (hasRapport) {
      // If rapport exists, toggle dropdown
      setIsRapportExpanded(!isRapportExpanded);
      if (!isRapportExpanded) {
        // Navigate to housing page
        router.push(`/${locale}/location/housing`);
      }
    } else {
      // If no rapport, navigate to genereer-rapport section on main page
      onTabChange('genereer-rapport');
    }
  };

  const handleRapportPageNav = (page: string): void => {
    router.push(`/${locale}/location/${page}`);
  };

  const getSectionText = (section: typeof MAIN_SECTIONS[number] | typeof OMGEVING_SUBSECTIONS[number]): string => {
    return section[locale];
  };

  // Handle save location callback
  const handleSaveLocation = (): void => {
    // Trigger refresh of saved locations list
    setSavedLocationsRefresh(prev => prev + 1);
  };

  // Handle load saved location
  const handleLoadSavedLocation = (location: AccessibleLocation): void => {
    onLoadSavedLocation?.(location);
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
              if (section.id === 'omgeving') {
                handleOmgevingToggle();
              } else if (section.id === 'genereer-rapport') {
                handleRapportToggle();
              } else {
                onTabChange(section.id);
              }
            }}
            variant="ghost"
            className={cn(
              'w-full justify-between text-left p-sm rounded-md',
              (activeTab === section.id ||
               (section.id === 'omgeving' && OMGEVING_SUBSECTIONS.some(sub => sub.id === activeTab)) ||
               (section.id === 'genereer-rapport' && RAPPORT_SUBSECTIONS.some(sub => sub.id === activeTab)))
                ? 'bg-primary-light text-primary border border-primary'
                : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
            )}
          >
            <span className="font-medium">{getSectionText(section)}</span>
            {section.id === 'omgeving' && (
              <svg
                className={cn(
                  'w-4 h-4 transition-transform duration-fast',
                  isOmgevingExpanded ? 'rotate-90' : 'rotate-0'
                )}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            )}
            {section.id === 'genereer-rapport' && hasRapport && (
              <svg
                className={cn(
                  'w-4 h-4 transition-transform duration-fast',
                  isRapportExpanded ? 'rotate-90' : 'rotate-0'
                )}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            )}
          </Button>

          {/* Omgeving Subsections */}
          {section.id === 'omgeving' && isOmgevingExpanded && (
            <div className="mt-xs ml-md space-y-xs">
              {OMGEVING_SUBSECTIONS.map((subsection) => (
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

          {/* Rapport Subsections */}
          {section.id === 'genereer-rapport' && isRapportExpanded && hasRapport && (
            <div className="mt-xs ml-md space-y-xs">
              {RAPPORT_SUBSECTIONS.map((subsection) => (
                <Button
                  key={subsection.id}
                  onClick={() => handleRapportPageNav(subsection.id)}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-left p-sm rounded-md text-sm',
                    activeTab === subsection.id
                      ? 'bg-primary-light text-primary border border-primary'
                      : 'text-text-muted hover:bg-gray-50 hover:text-text-secondary'
                  )}
                >
                  {subsection[locale]}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Save location to project section (NEW: Project-based system)
  const saveLocationSection = (
    <SaveLocationToProject
      locale={locale}
      address={currentAddress}
      latitude={currentLocation?.lat || 0}
      longitude={currentLocation?.lng || 0}
      locationData={locationData}
      amenitiesData={amenitiesData}
      onSaveSuccess={() => {
        // Refresh the snapshots list
        setSavedLocationsRefresh(prev => prev + 1);
      }}
    />
  );

  // Project snapshots list section (NEW: Project-based with version control)
  const savedLocationsListSection = (
    <ProjectSnapshotsList
      locale={locale}
      onLoadSnapshot={handleLoadSavedLocation}
      refreshTrigger={savedLocationsRefresh}
    />
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
    {
      id: 'save-location',
      title: locale === 'nl' ? 'Opslaan naar Project' : 'Save to Project',
      description: locale === 'nl'
        ? 'Sla deze locatie op in een project voor versiecontrole.'
        : 'Save this location to a project for version control.',
      content: saveLocationSection,
    },
    {
      id: 'saved-locations',
      title: locale === 'nl' ? 'Project Snapshots' : 'Project Snapshots',
      description: locale === 'nl'
        ? 'Bekijk en laad opgeslagen locatie snapshots per project.'
        : 'View and load saved location snapshots by project.',
      content: savedLocationsListSection,
    },
  ];

  return sections;
};

export default useLocationSidebarSections;