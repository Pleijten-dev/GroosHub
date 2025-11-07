// src/features/location/components/LocationAnimation/LocationAnimation.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { AnimatedCube } from '../LocationWelcome/AnimatedCube';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { TETRIS_SHAPES } from '../../utils/cubePatterns';

interface LocationAnimationProps {
  locale: Locale;
  cubeColors: string[];
  stage: 'welcome' | 'loading';
  onAddressSearch: (address: string) => void;
  isSearching?: boolean;
}

const LOADING_MESSAGES = {
  nl: [
    'Adres geocoderen...',
    'CBS Demografie ophalen...',
    'RIVM Gezondheid ophalen...',
    'CBS Leefbaarheid ophalen...',
    'Politie Veiligheid ophalen...',
    'Google Voorzieningen ophalen...',
    'Altum AI Woningmarkt ophalen...'
  ],
  en: [
    'Geocoding address...',
    'Fetching CBS Demographics...',
    'Fetching RIVM Health...',
    'Fetching CBS Livability...',
    'Fetching Police Safety...',
    'Fetching Google Amenities...',
    'Fetching Altum AI Housing Data...'
  ]
};

/**
 * Unified component that handles both welcome and loading states
 * Maintains a single cube instance that persists and moves between positions
 */
export const LocationAnimation: React.FC<LocationAnimationProps> = ({
  locale,
  cubeColors,
  stage,
  onAddressSearch,
  isSearching = false
}) => {
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [messageOpacity, setMessageOpacity] = useState(1);

  const handleSearch = () => {
    if (searchAddress.trim()) {
      onAddressSearch(searchAddress.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Create randomized message order (no repeats until all shown)
  const shuffledMessages = useMemo(() => {
    const messages = LOADING_MESSAGES[locale];
    const shuffled = [...messages];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [locale]);

  // Cycle through loading messages when in loading stage
  useEffect(() => {
    if (stage !== 'loading') return;

    const messageInterval = setInterval(() => {
      // Fade out
      setMessageOpacity(0);

      setTimeout(() => {
        // Switch message
        setCurrentMessageIndex(prev => (prev + 1) % shuffledMessages.length);
        // Fade in
        setMessageOpacity(1);
      }, 400); // Half of transition duration (800ms / 2)
    }, 3500); // Show each message for 3.5 seconds

    return () => clearInterval(messageInterval);
  }, [shuffledMessages.length, stage]);

  const allShapes = useMemo(() => TETRIS_SHAPES, []);

  // Cube position changes based on stage
  const cubePosition = stage === 'welcome' ? 'top-[25%]' : 'top-[50%]';

  // Search bar and loading message visibility
  const showSearchBar = stage === 'welcome';
  const showLoadingMessage = stage === 'loading';

  return (
    <div className="relative h-full w-full">
      {/* Single persistent cube that moves between positions */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 -translate-y-1/2
          transition-all duration-1000 ease-in-out
          ${cubePosition}
        `}
        style={{ height: '40vh', width: '100%', maxWidth: '800px' }}
      >
        <AnimatedCube
          allShapes={allShapes}
          cubeColors={cubeColors}
        />
      </div>

      {/* Search Bar - fades out when loading starts */}
      <div
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] max-w-5xl px-lg
          transition-opacity duration-500
          ${showSearchBar ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <AddressAutocomplete
          placeholder={locale === 'nl' ? 'Vind de ideale doelgroep voor iedere locatie' : 'Find the ideal target audience for any location'}
          value={searchAddress}
          onChange={setSearchAddress}
          onSelect={(address) => {
            setSearchAddress(address);
            onAddressSearch(address);
          }}
          onKeyPress={handleKeyPress}
          className="w-full !rounded-full px-xl py-xl text-lg"
          disabled={isSearching}
        />
      </div>

      {/* Loading message - fades in when loading starts */}
      {showLoadingMessage && (
        <div className="absolute left-1/2 top-[calc(50%+20vh+2rem)] -translate-x-1/2 text-center">
          <p
            className="text-lg text-text-secondary transition-opacity duration-[800ms]"
            style={{ opacity: messageOpacity }}
          >
            {shuffledMessages[currentMessageIndex]}
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationAnimation;
