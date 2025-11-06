// src/features/location/components/LocationWelcome/LocationWelcome.tsx
'use client';

import React, { useState } from 'react';
import { Locale } from '../../../../lib/i18n/config';
import { CubeVisualization } from '../Doelgroepen/CubeVisualization';
import { AddressAutocomplete } from '../AddressAutocomplete/AddressAutocomplete';

interface LocationWelcomeProps {
  locale: Locale;
  onAddressSearch: (address: string) => void;
  isSearching?: boolean;
}

/**
 * Welcome state component shown when no location data is cached
 * Features:
 * - Centered cube visualization for target groups
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

  // Default cube data - show all cubes with gradient colors
  const defaultActiveIndices = Array.from({ length: 27 }, (_, i) => i);
  const defaultCubeColors = [
    '#0c211a', '#48806a', '#477638', '#8a976b', '#0c211a', '#48806a', '#477638', '#8a976b', '#0c211a',
    '#48806a', '#477638', '#8a976b', '#0c211a', '#48806a', '#477638', '#8a976b', '#0c211a', '#48806a',
    '#477638', '#8a976b', '#0c211a', '#48806a', '#477638', '#8a976b', '#0c211a', '#48806a', '#477638',
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-lg">
      <div className="w-full max-w-4xl space-y-xl">
        {/* Page Title */}
        <div className="text-center mb-xl">
          <h1 className="text-4xl font-bold text-black mb-sm">
            {locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}
          </h1>
          <p className="text-lg text-text-secondary">
            {locale === 'nl'
              ? 'Ontdek de perfecte doelgroep voor jouw locatie'
              : 'Discover the perfect target audience for your location'}
          </p>
        </div>

        {/* Cube Visualization */}
        <div className="panel-outer">
          <CubeVisualization
            activeIndices={defaultActiveIndices}
            cubeColors={defaultCubeColors}
            locale={locale}
          />
        </div>

        {/* Search Bar */}
        <div className="panel-inner max-w-2xl mx-auto">
          <div className="space-y-md">
            <label className="block text-center text-sm font-medium text-text-secondary mb-sm">
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

        {/* Optional: Help text */}
        <div className="text-center text-sm text-text-muted">
          {locale === 'nl'
            ? 'Voer een adres in om gedetailleerde locatieanalyse te bekijken'
            : 'Enter an address to view detailed location analysis'}
        </div>
      </div>
    </div>
  );
};

export default LocationWelcome;
