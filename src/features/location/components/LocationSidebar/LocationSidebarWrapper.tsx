/**
 * LocationSidebarWrapper Component
 * Standalone sidebar wrapper that detects current route and manages navigation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { Button } from '@/shared/components/UI';
import { cn } from '@/shared/utils/cn';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { locationDataCache } from '../../data/cache/locationDataCache';

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

export interface LocationSidebarWrapperProps {
  locale: Locale;
}

export function LocationSidebarWrapper({ locale }: LocationSidebarWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isOmgevingExpanded, setIsOmgevingExpanded] = useState<boolean>(false);
  const [isRapportExpanded, setIsRapportExpanded] = useState<boolean>(false);
  const [hasRapport, setHasRapport] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<SectionId>('doelgroepen');

  // Detect active section from pathname
  useEffect(() => {
    if (pathname.includes('/location/housing')) {
      setActiveSection('housing');
      setIsRapportExpanded(true);
    } else if (pathname.includes('/location/community')) {
      setActiveSection('community');
      setIsRapportExpanded(true);
    } else if (pathname.includes('/location/public')) {
      setActiveSection('public');
      setIsRapportExpanded(true);
    } else if (pathname.endsWith('/location')) {
      // Default to doelgroepen for main location page
      setActiveSection('doelgroepen');
    }
  }, [pathname]);

  // Check if rapport exists
  useEffect(() => {
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
    const interval = setInterval(checkRapport, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand Omgeving dropdown when activeSection is one of its subsections
  useEffect(() => {
    const isOmgevingSubsection = OMGEVING_SUBSECTIONS.some(sub => sub.id === activeSection);
    if (isOmgevingSubsection && !isOmgevingExpanded) {
      setIsOmgevingExpanded(true);
    }
  }, [activeSection, isOmgevingExpanded]);

  // Auto-expand Rapport dropdown when activeSection is one of its subsections
  useEffect(() => {
    const isRapportSubsection = RAPPORT_SUBSECTIONS.some(sub => sub.id === activeSection);
    if (isRapportSubsection && !isRapportExpanded) {
      setIsRapportExpanded(true);
    }
  }, [activeSection, isRapportExpanded]);

  const handleAddressSearch = async (): Promise<void> => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    try {
      // Navigate to location page with search query
      router.push(`/${locale}/location?address=${encodeURIComponent(searchAddress.trim())}`);
    } catch (error) {
      console.error('Error navigating to location:', error);
    } finally {
      setIsSearching(false);
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
      router.push(`/${locale}/location#score`);
    }
  };

  const handleRapportToggle = (): void => {
    if (hasRapport) {
      setIsRapportExpanded(!isRapportExpanded);
      if (!isRapportExpanded) {
        router.push(`/${locale}/location/housing`);
      }
    } else {
      router.push(`/${locale}/location#genereer-rapport`);
    }
  };

  const handleSectionClick = (sectionId: SectionId): void => {
    router.push(`/${locale}/location#${sectionId}`);
  };

  const handleSubsectionClick = (subsectionId: SectionId): void => {
    router.push(`/${locale}/location#${subsectionId}`);
  };

  const handleRapportPageNav = (page: string): void => {
    router.push(`/${locale}/location/${page}`);
  };

  const getSectionText = (section: typeof MAIN_SECTIONS[number] | typeof OMGEVING_SUBSECTIONS[number]): string => {
    return section[locale];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="p-4 border-b border-gray-200">
        <AddressAutocomplete
          placeholder={locale === 'nl' ? 'Voer adres in...' : 'Enter address...'}
          value={searchAddress}
          onChange={setSearchAddress}
          onSelect={(address) => {
            setSearchAddress(address);
            handleAddressSearch();
          }}
          onKeyPress={handleKeyPress}
          className="w-full mb-3"
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

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
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
                    handleSectionClick(section.id);
                  }
                }}
                variant="ghost"
                className={cn(
                  'w-full justify-between text-left p-3 rounded-md',
                  (activeSection === section.id ||
                   (section.id === 'omgeving' && OMGEVING_SUBSECTIONS.some(sub => sub.id === activeSection)) ||
                   (section.id === 'genereer-rapport' && RAPPORT_SUBSECTIONS.some(sub => sub.id === activeSection)))
                    ? 'bg-primary/10 text-primary border border-primary'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <span className="font-medium">{getSectionText(section)}</span>
                {section.id === 'omgeving' && (
                  <svg
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
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
                      'w-4 h-4 transition-transform duration-200',
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
                <div className="mt-1 ml-4 space-y-1">
                  {OMGEVING_SUBSECTIONS.map((subsection) => (
                    <Button
                      key={subsection.id}
                      onClick={() => handleSubsectionClick(subsection.id)}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start text-left p-2 rounded-md text-sm',
                        activeSection === subsection.id
                          ? 'bg-primary/10 text-primary border border-primary'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {getSectionText(subsection)}
                    </Button>
                  ))}
                </div>
              )}

              {/* Rapport Subsections */}
              {section.id === 'genereer-rapport' && isRapportExpanded && hasRapport && (
                <div className="mt-1 ml-4 space-y-1">
                  {RAPPORT_SUBSECTIONS.map((subsection) => (
                    <Button
                      key={subsection.id}
                      onClick={() => handleRapportPageNav(subsection.id)}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start text-left p-2 rounded-md text-sm',
                        activeSection === subsection.id
                          ? 'bg-primary/10 text-primary border border-primary'
                          : 'text-gray-600 hover:bg-gray-50'
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
      </div>
    </div>
  );
}

export default LocationSidebarWrapper;
