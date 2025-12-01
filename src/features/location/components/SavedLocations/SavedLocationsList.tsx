// src/features/location/components/SavedLocations/SavedLocationsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { ConfirmDialog } from '@/shared/components/UI/Modal/ConfirmDialog';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';
import { cn } from '@/shared/utils/cn';
import type { Locale } from '@/lib/i18n/config';
import type { AccessibleLocation } from '../../types/saved-locations';
import { LocationProgress } from './LocationProgress';
import { pveConfigCache } from '../../data/cache/pveConfigCache';
import type { CompletionStatus } from '../../types/saved-locations';

interface SavedLocationsListProps {
  locale: Locale;
  onLoadLocation?: (location: AccessibleLocation) => void;
  refreshTrigger?: number;
}

export const SavedLocationsList: React.FC<SavedLocationsListProps> = ({
  locale,
  onLoadLocation,
  refreshTrigger = 0,
}) => {
  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; locationId: string | null }>({
    isOpen: false,
    locationId: null,
  });
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Load saved locations
  const loadLocations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/location/saved');
      const result = await response.json();

      if (result.success) {
        setLocations(result.data || []);
      } else {
        setError(result.error || 'Failed to load locations');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and when refreshTrigger changes
  useEffect(() => {
    loadLocations();
  }, [refreshTrigger]);

  // Delete location - Open confirmation dialog
  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent expanding the card
    setDeleteDialog({ isOpen: true, locationId: id });
  };

  // Confirm delete location
  const confirmDelete = async () => {
    if (!deleteDialog.locationId) return;

    try {
      const response = await fetch(`/api/location/saved/${deleteDialog.locationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        loadLocations();
        setDeleteDialog({ isOpen: false, locationId: null });
      } else {
        setDeleteDialog({ isOpen: false, locationId: null });
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Verwijderen mislukt' : 'Failed to delete location'),
        });
      }
    } catch (err) {
      setDeleteDialog({ isOpen: false, locationId: null });
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Verwijderen mislukt' : 'Failed to delete location'),
      });
    }
  };

  // Load location data into the app
  const handleLoad = async (location: AccessibleLocation, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent expanding the card
    onLoadLocation?.(location);
  };

  // Save/update the location with current PVE and persona selections
  const handleSave = async (location: AccessibleLocation, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent expanding the card

    try {
      // Retrieve current PVE data from cache
      const pveData = pveConfigCache.getFinalPVE();
      console.log('📊 [SavedLocationsList] Retrieved PVE data:', pveData ? 'Present' : 'Missing');

      // Retrieve current persona selection from localStorage
      let personasData = null;
      try {
        const storedPersonas = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
        if (storedPersonas) {
          personasData = JSON.parse(storedPersonas);
          console.log('👥 [SavedLocationsList] Retrieved persona selection:', personasData);
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

      console.log('✅ [SavedLocationsList] Completion status:', completionStatus);

      // Update the existing saved location with current PVE/persona data
      const response = await fetch('/api/location/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: location.name,
          address: location.address,
          coordinates: location.coordinates,
          locationData: location.locationData,
          amenitiesData: location.amenitiesData,
          selectedPVE: pveData || location.selectedPVE, // Use current PVE if available, otherwise keep old
          selectedPersonas: personasData ? {
            scenario: personasData.scenario,
            customIds: personasData.customIds || []
          } : location.selectedPersonas, // Use current personas if available, otherwise keep old
          llmRapport: location.llmRapport,
          completionStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ [SavedLocationsList] Location updated successfully');
        // Refresh the list
        loadLocations();
      } else {
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Opslaan mislukt' : 'Failed to save location'),
        });
      }
    } catch (err) {
      console.error('❌ [SavedLocationsList] Error saving location:', err);
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Opslaan mislukt' : 'Failed to save location'),
      });
    }
  };

  // Format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-lg">
        <div className="text-sm text-text-muted">
          {locale === 'nl' ? 'Laden...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-600 bg-red-50 p-sm rounded-md">
        {error}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-lg">
        <svg
          className="w-12 h-12 mx-auto mb-sm text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm text-text-muted">
          {locale === 'nl' ? 'Geen opgeslagen locaties' : 'No saved locations'}
        </p>
        <p className="text-xs text-text-muted mt-xs">
          {locale === 'nl'
            ? 'Zoek een locatie en sla deze op'
            : 'Search for a location and save it'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-sm">
      {locations.map((location) => (
        <div
          key={location.id}
          className={cn(
            'border border-gray-200 rounded-md overflow-hidden',
            'transition-all duration-fast',
            'hover:border-primary hover:shadow-sm'
          )}
        >
          {/* Card Header */}
          <div
            className="p-sm cursor-pointer bg-white hover:bg-gray-50"
            onClick={() => setExpandedId(expandedId === location.id ? null : location.id)}
          >
            <div className="flex items-start justify-between gap-xs">
              <div className="flex-1 min-w-0">
                {/* Name or Address */}
                <h4 className="text-sm font-medium text-text-primary truncate">
                  {location.name || location.address}
                </h4>

                {/* Address (if name exists) */}
                {location.name && (
                  <p className="text-xs text-text-muted truncate mt-xs">
                    {location.address}
                  </p>
                )}

                {/* Meta info */}
                <div className="flex items-center gap-md mt-xs text-xs text-text-muted">
                  <span>{formatDate(location.createdAt)}</span>
                  {location.isShared && (
                    <span className="flex items-center gap-xs text-blue-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      {locale === 'nl' ? 'Gedeeld' : 'Shared'}
                    </span>
                  )}
                </div>

                {/* Compact Progress Indicator */}
                {location.completionStatus && (
                  <div className="mt-sm">
                    <LocationProgress
                      completionStatus={location.completionStatus}
                      locale={locale}
                      variant="compact"
                    />
                  </div>
                )}
              </div>

              {/* Expand icon */}
              <svg
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
                  expandedId === location.id && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Expanded Actions */}
          {expandedId === location.id && (
            <div className="p-sm bg-gray-50 border-t border-gray-200 space-y-sm">
              {/* Detailed Progress Indicator */}
              {location.completionStatus && (
                <div className="bg-white p-sm rounded-md border border-gray-200">
                  <LocationProgress
                    completionStatus={location.completionStatus}
                    locale={locale}
                    variant="full"
                  />
                </div>
              )}

              {/* Owner info (if shared) */}
              {location.isShared && (
                <div className="text-xs text-text-muted bg-blue-50 p-xs rounded">
                  {locale === 'nl' ? 'Eigenaar:' : 'Owner:'} {location.ownerName} ({location.ownerEmail})
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-sm">
                <Button
                  onClick={(e) => handleLoad(location, e)}
                  variant="primary"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  {locale === 'nl' ? 'Laden' : 'Load'}
                </Button>

                <Button
                  onClick={(e) => handleSave(location, e)}
                  variant="secondary"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  {locale === 'nl' ? 'Opslaan' : 'Save'}
                </Button>

                {!location.isShared && (
                  <Button
                    onClick={(e) => handleDelete(location.id, e)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 hover:bg-red-50"
                  >
                    {locale === 'nl' ? 'Verwijderen' : 'Delete'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, locationId: null })}
        onConfirm={confirmDelete}
        title={locale === 'nl' ? 'Locatie verwijderen' : 'Delete Location'}
        message={locale === 'nl'
          ? 'Weet u zeker dat u deze locatie wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.'
          : 'Are you sure you want to delete this location? This action cannot be undone.'}
        confirmText={locale === 'nl' ? 'Verwijderen' : 'Delete'}
        cancelText={locale === 'nl' ? 'Annuleren' : 'Cancel'}
        variant="danger"
      />

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        title={locale === 'nl' ? 'Fout' : 'Error'}
        message={errorDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="error"
      />
    </div>
  );
};

export default SavedLocationsList;
