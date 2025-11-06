// src/features/location/components/LocationWelcome/LocationWelcome.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { CubeVisualization } from '../Doelgroepen/CubeVisualization';
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
 * - Centered cube visualization with random tetris shape
 * - Address search bar below cube
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

    // Create color array for all 27 positions, but only active ones will show
    return {
      activeIndices: shapeIndices,
      cubeColors: allColors,
    };
  }, []); // Empty deps = only run once on mount

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-lg">
      <div className="w-full max-w-4xl space-y-xl">
        {/* Cube Visualization - No title, no legend */}
        <div className="panel-outer">
          <CubeVisualization
            activeIndices={activeIndices}
            cubeColors={cubeColors}
            locale={locale}
          />
        </div>

        {/* Search Bar */}
        <div className="panel-inner max-w-2xl mx-auto">
          <div className="space-y-md">
            <label className="block text-center text-base font-medium text-text-secondary mb-sm">
              {locale === 'nl'
                ? 'Vind je ideale doelgroep'
                : 'Find your ideal target audience'}
            </label>
            <AddressAutocomplete
              placeholder={locale === 'nl' ? 'Voer een adres in...' : 'Enter an address...'}
              value={searchAddress}
              onChange={setSearchAddress}
              onSelect={(address) => {
                setSearchAddress(address);
                onAddressSearch(address);
              }}
              onKeyPress={handleKeyPress}
              className="w-full"
              disabled={isSearching}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationWelcome;
