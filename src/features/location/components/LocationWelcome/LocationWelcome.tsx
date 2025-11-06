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
    <div className="flex flex-col items-center justify-center min-h-screen p-lg">
      <div className="w-full max-w-4xl space-y-xl">
        {/* Animated Cube Visualization - No border, larger, rotating with shape-morphing */}
        <AnimatedCube
          allShapes={allShapes}
          cubeColors={cubeColors}
        />

        {/* Pill-shaped Search Bar - Centered and taller */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <AddressAutocomplete
              placeholder={locale === 'nl' ? 'Vind je ideale doelgroep' : 'Find your ideal target audience'}
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
    </div>
  );
};

export default LocationWelcome;
