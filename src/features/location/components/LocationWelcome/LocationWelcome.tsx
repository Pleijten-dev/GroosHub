// src/features/location/components/LocationWelcome/LocationWelcome.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { AnimatedCube } from './AnimatedCube';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { TETRIS_SHAPES } from '../../utils/cubePatterns';

interface LocationWelcomeProps {
  locale: Locale;
  onAddressSearch: (address: string) => void;
  isSearching?: boolean;
  fadeOut?: boolean; // Control fade out animation
  cubeColors: string[]; // Shared cube colors for consistency
}

/**
 * Welcome state component shown when no location data is cached
 * Features:
 * - Centered animated cube visualization with random tetris shape
 * - Pill-shaped address search bar
 * - Clean, minimal design
 * - Supports fade out animation when transitioning to loading state
 */
export const LocationWelcome: React.FC<LocationWelcomeProps> = ({
  locale,
  onAddressSearch,
  isSearching = false,
  fadeOut = false,
  cubeColors
}) => {
  const [searchAddress, setSearchAddress] = useState<string>('');

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

  // Get all tetris shapes (memoized, colors passed from parent)
  const allShapes = useMemo(() => TETRIS_SHAPES, []);

  return (
    <div className="relative h-full w-full">
      {/* Cube - centered in the space above search bar, moves to center when fading out */}
      <div
        className={`
          absolute left-1/2 -translate-x-1/2 -translate-y-1/2
          transition-all duration-1000 ease-in-out
          ${fadeOut ? 'top-[50%] opacity-100' : 'top-[25%] opacity-100'}
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
          ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}
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
    </div>
  );
};

export default LocationWelcome;
