// src/features/location/components/LocationWelcome/LocationWelcome.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { AnimatedCube } from './AnimatedCube';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { TETRIS_SHAPES, generateGradientColors } from '../../utils/cubePatterns';

interface LocationWelcomeProps {
  locale: Locale;
  onAddressSearch: (address: string) => void;
  isSearching?: boolean;
}

/**
 * Welcome state component shown when no location data is cached
 * Features:
 * - Centered animated cube visualization with random tetris shape
 * - Pill-shaped address search bar
 * - Clean, minimal design
 */
export const LocationWelcome: React.FC<LocationWelcomeProps> = ({
  locale,
  onAddressSearch,
  isSearching = false,
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

  // Generate all tetris shapes and gradient colors (memoized)
  const { allShapes, cubeColors } = useMemo(() => {
    const allColors = generateGradientColors();

    return {
      allShapes: TETRIS_SHAPES,
      cubeColors: allColors,
    };
  }, []); // Empty deps = only run once on mount

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Animated Cube Visualization - 40% of viewport height */}
        <div style={{ height: '40vh' }} className="flex items-center justify-center">
          <AnimatedCube
            allShapes={allShapes}
            cubeColors={cubeColors}
          />
        </div>

        {/* Pill-shaped Search Bar - Centered */}
        <div className="w-full max-w-2xl px-lg">
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
    </div>
  );
};

export default LocationWelcome;
