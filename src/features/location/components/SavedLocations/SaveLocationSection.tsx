// src/features/location/components/SavedLocations/SaveLocationSection.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';
import type { Locale } from '@/lib/i18n/config';
import type { UnifiedLocationData } from '../../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import type { AccessibleLocation } from '../../types/saved-locations';

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
  const [existingLocation, setExistingLocation] = useState<AccessibleLocation | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);

  // Check if this address already exists in saved locations
  useEffect(() => {
    const checkExistingLocation = async () => {
      if (!address) {
        setExistingLocation(null);
        setLocationName('');
        return;
      }

      setIsCheckingExisting(true);

      try {
        // Fetch all saved locations
        const response = await fetch('/api/location/saved');
        const result = await response.json();

        if (result.success && result.data) {
          // Find location matching current address
          const existing = result.data.find(
            (loc: AccessibleLocation) =>
              loc.address.toLowerCase() === address.toLowerCase()
          );

          if (existing) {
            setExistingLocation(existing);
            // Pre-populate name field with existing name
            setLocationName(existing.name || '');
          } else {
            setExistingLocation(null);
            setLocationName('');
          }
        }
      } catch (error) {
        console.error('Error checking for existing location:', error);
        setExistingLocation(null);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    checkExistingLocation();
  }, [address]);

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

      // Prepare save data
      const saveData = {
        name: locationName.trim() || undefined,
        address,
        coordinates,
        locationData,
        amenitiesData: amenitiesData || undefined,
        selectedPVE: undefined, // TODO: Get from PVE state
        selectedPersonas: undefined, // TODO: Get from personas state
        llmRapport: undefined, // TODO: Get from rapport cache
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
        // Only clear the name input for new saves, not updates
        if (!existingLocation) {
          setLocationName('');
        }
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

      {/* Existing location info */}
      {existingLocation && !isCheckingExisting && (
        <div className="text-xs bg-blue-50 border border-blue-200 p-sm rounded-md space-y-xs">
          <div className="flex items-center gap-xs text-blue-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              {locale === 'nl'
                ? 'Bestaande locatie gevonden'
                : 'Existing location found'}
            </span>
          </div>
          <div className="text-text-muted">
            {locale === 'nl' ? 'Laatst opgeslagen:' : 'Last saved:'}{' '}
            {new Date(existingLocation.updatedAt).toLocaleDateString(
              locale === 'nl' ? 'nl-NL' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' }
            )}
          </div>
          {existingLocation.completionStatus && (
            <div className="text-text-muted">
              {locale === 'nl' ? 'Voortgang:' : 'Progress:'}{' '}
              <span className="font-medium text-primary">
                {existingLocation.completionStatus === 'complete'
                  ? '100%'
                  : existingLocation.completionStatus === 'with_personas_pve'
                  ? '75%'
                  : existingLocation.completionStatus === 'with_personas' ||
                    existingLocation.completionStatus === 'with_pve'
                  ? '50%'
                  : '25%'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Save/Update button */}
      <Button
        onClick={handleSave}
        disabled={!hasData || isSaving || isCheckingExisting}
        variant="primary"
        className="w-full"
      >
        {isSaving
          ? locale === 'nl'
            ? existingLocation
              ? 'Bijwerken...'
              : 'Opslaan...'
            : existingLocation
            ? 'Updating...'
            : 'Saving...'
          : locale === 'nl'
          ? existingLocation
            ? 'Locatie Bijwerken'
            : 'Locatie Opslaan'
          : existingLocation
          ? 'Update Location'
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
          {existingLocation
            ? locale === 'nl'
              ? 'Locatie bijgewerkt!'
              : 'Location updated!'
            : locale === 'nl'
            ? 'Locatie opgeslagen!'
            : 'Location saved!'}
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
