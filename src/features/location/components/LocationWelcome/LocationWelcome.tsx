// src/features/location/components/LocationWelcome/LocationWelcome.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { AnimatedCube } from './AnimatedCube';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';
import { getRandomTetrisShape, generateGradientColors } from '../../utils/cubePatterns';

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

  // Generate random tetris shape and gradient colors (memoized to stay consistent)
  const { activeIndices, cubeColors } = useMemo(() => {
    const allColors = generateGradientColors();
    const shapeIndices = getRandomTetrisShape();

    return {
      activeIndices: shapeIndices,
      cubeColors: allColors,
    };
  }, []); // Empty deps = only run once on mount

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-lg">
      <div className="w-full max-w-4xl space-y-xl">
        {/* Animated Cube Visualization - No border, larger, rotating */}
        <AnimatedCube
          activeIndices={activeIndices}
          cubeColors={cubeColors}
        />

        {/* Pill-shaped Search Bar - No panel wrapper */}
        <div className="max-w-2xl mx-auto">
          <AddressAutocomplete
            placeholder={locale === 'nl' ? 'Vind je ideale doelgroep' : 'Find your ideal target audience'}
            value={searchAddress}
            onChange={setSearchAddress}
            onSelect={(address) => {
              setSearchAddress(address);
              onAddressSearch(address);
            }}
            onKeyPress={handleKeyPress}
            className="w-full !rounded-full px-lg py-md text-base"
            disabled={isSearching}
          />
        </div>
      </div>
    </div>
  );
};

export default LocationWelcome;
