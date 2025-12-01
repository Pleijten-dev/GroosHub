// src/features/location/components/SavedLocations/SaveLocationSection.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';
import type { Locale } from '@/lib/i18n/config';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import { pveConfigCache } from '../../data/cache/pveConfigCache';
import { locationDataCache } from '../../data/cache/locationDataCache';
import type { CompletionStatus } from '../../types/saved-locations';

interface SaveLocationSectionProps {
  locale: Locale;
  address: string | null;
  locationData: UnifiedLocationData | null;
  amenitiesData?: AmenityMultiCategoryResponse | null;
  onSave?: () => void;
}

export const SaveLocationSection: React.FC<SaveLocationSectionProps> = ({
  locale,
  address,
  locationData,
  amenitiesData,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [locationName, setLocationName] = useState('');

  const handleSave = async () => {
    if (!address || !locationData) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Get coordinates from location data
      const coordinates = {
        lat: locationData.location.coordinates.wgs84.latitude,
        lng: locationData.location.coordinates.wgs84.longitude,
      };

      // Retrieve PVE data from cache
      const pveData = pveConfigCache.getFinalPVE();
      console.log('📊 [Save] Retrieved PVE data:', pveData);

      // Retrieve persona selection from localStorage
      let personasData = null;
      try {
        const storedPersonas = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
        if (storedPersonas) {
          personasData = JSON.parse(storedPersonas);
          console.log('👥 [Save] Retrieved persona selection:', personasData);
        }
      } catch (error) {
        console.error('Failed to retrieve persona selection:', error);
      }

      // Calculate completion status
      let completionStatus: CompletionStatus = 'location_only';
      if (pveData && personasData) {
        completionStatus = 'with_personas_pve';
      } else if (pveData) {
        completionStatus = 'with_pve';
      } else if (personasData) {
        completionStatus = 'with_personas';
      }

      console.log('✅ [Save] Completion status:', completionStatus);

      // Retrieve rapport from cache if available
      let rapportData = null;
      try {
        rapportData = locationDataCache.getRapport(address);
        if (rapportData) {
          console.log('📄 [Save] Retrieved rapport from cache');
        }
      } catch (error) {
        console.warn('Failed to retrieve rapport from cache:', error);
        // Continue without rapport - it's optional
      }

      // Prepare save data
      const saveData = {
        name: locationName.trim() || undefined,
        address,
        coordinates,
        locationData,
        amenitiesData: amenitiesData || undefined,
        selectedPVE: pveData || undefined,
        selectedPersonas: personasData ? {
          scenario: personasData.scenario,
          customIds: personasData.customIds || []
        } : undefined,
        llmRapport: rapportData || undefined,
        completionStatus,
      };

      // Call save API
      const response = await fetch('/api/location/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus('success');
        setLocationName(''); // Clear the name input
        onSave?.();

        // Reset success message after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } else {
        setSaveStatus('error');
        console.error('Failed to save location:', result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving location:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasData = !!address && !!locationData;

  return (
    <div className="space-y-md">
      {/* Name input */}
      <div>
        <label
          htmlFor="location-name"
          className="block text-sm font-medium text-text-secondary mb-xs"
        >
          {locale === 'nl' ? 'Naam (optioneel)' : 'Name (optional)'}
        </label>
        <input
          id="location-name"
          type="text"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder={locale === 'nl' ? 'Bijv. Mijn Project' : 'e.g. My Project'}
          disabled={!hasData || isSaving}
          className={cn(
            'w-full px-sm py-xs rounded-md border text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            hasData
              ? 'border-gray-300 bg-white text-text-primary'
              : 'border-gray-200 bg-gray-50 text-text-muted'
          )}
        />
      </div>

      {/* Current address display */}
      {address && (
        <div className="text-xs text-text-muted bg-gray-50 p-sm rounded-md">
          <span className="font-medium">
            {locale === 'nl' ? 'Adres:' : 'Address:'}
          </span>{' '}
          {address}
        </div>
      )}

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={!hasData || isSaving}
        variant="primary"
        className="w-full"
      >
        {isSaving
          ? locale === 'nl'
            ? 'Opslaan...'
            : 'Saving...'
          : locale === 'nl'
          ? 'Locatie Opslaan'
          : 'Save Location'}
      </Button>

      {/* Status messages */}
      {saveStatus === 'success' && (
        <div className="text-xs text-green-600 bg-green-50 p-sm rounded-md flex items-center gap-xs">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {locale === 'nl' ? 'Locatie opgeslagen!' : 'Location saved!'}
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="text-xs text-red-600 bg-red-50 p-sm rounded-md flex items-center gap-xs">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {locale === 'nl' ? 'Fout bij opslaan' : 'Error saving'}
        </div>
      )}

      {!hasData && (
        <p className="text-xs text-text-muted italic">
          {locale === 'nl'
            ? 'Zoek eerst een locatie om op te slaan'
            : 'Search for a location first to save'}
        </p>
      )}
    </div>
  );
};

export default SaveLocationSection;
