// src/features/location/components/SavedLocations/SaveLocationToProject.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';
import type { Locale } from '@/lib/i18n/config';
import { calculateResidentialScores } from '../../data/scoring/residentialScoring';
import type { ResidentialData } from '../../data/sources/altum-ai/types';
import type { WMSGradingData } from '../../types/wms-grading';
import { pveConfigCache, type PVEFinalState } from '../../data/cache/pveConfigCache';
import { calculateAllAmenityScores, type AmenityScore } from '../../data/scoring/amenityScoring';
import type { AmenityMultiCategoryResponse } from '../../data/sources/google-places/types';
import { validateSnapshotData } from '../../utils/jsonValidation';
import { CURRENT_SCORING_VERSION } from '../../data/scoring/scoringVersion';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface SaveLocationToProjectProps {
  locale: Locale;
  address: string | null;
  latitude: number;
  longitude: number;
  locationData?: any;
  amenitiesData?: any;
  wmsGradingData?: WMSGradingData | null;
  onSaveSuccess?: () => void;
}

export const SaveLocationToProject: React.FC<SaveLocationToProjectProps> = ({
  locale,
  address,
  latitude,
  longitude,
  locationData,
  amenitiesData,
  wmsGradingData,
  onSaveSuccess,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });
  const [successDialog, setSuccessDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Load user's projects
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      const result = await response.json();

      if (result.success) {
        setProjects(result.data || []);
        // Auto-select first project if available
        if (result.data && result.data.length > 0) {
          setSelectedProjectId(result.data[0].id);
        }
      } else {
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Kan projecten niet laden' : 'Failed to load projects'),
        });
      }
    } catch (err) {
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Kan projecten niet laden' : 'Failed to load projects'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProjectId) {
      setErrorDialog({
        isOpen: true,
        message: locale === 'nl' ? 'Selecteer een project' : 'Please select a project',
      });
      return;
    }

    if (!address || latitude === undefined || longitude === undefined) {
      setErrorDialog({
        isOpen: true,
        message: locale === 'nl' ? 'Geen geldige locatie geselecteerd' : 'No valid location selected',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare housing data with pre-computed scores to prevent recalculation issues
      // when loading from database (referenceHouses array may lose data during serialization)
      let housingData = locationData?.residential || {};
      const residential = locationData?.residential as ResidentialData | undefined;
      if (residential?.hasData && residential?.referenceHouses?.length > 0) {
        // Compute and store the scores now so they don't need to be recalculated
        const precomputedScores = calculateResidentialScores(residential.referenceHouses);
        housingData = {
          ...residential,
          precomputedScores, // Store the computed scores for later use
        };
      }

      // Get PVE data from localStorage cache
      const pveData = pveConfigCache.getFinalPVE();

      // Pre-compute amenity scores to ensure consistency on load
      // The raw amenities data is saved, but we also save the computed scores
      let enrichedAmenitiesData = amenitiesData || {};
      if (amenitiesData?.results && Array.isArray(amenitiesData.results)) {
        const precomputedAmenityScores = calculateAllAmenityScores(amenitiesData.results);

        // Calculate the overall voorzieningen score (same formula as UI)
        const rawScore = precomputedAmenityScores.reduce((sum: number, score: AmenityScore) => {
          return sum + score.countScore + score.proximityBonus;
        }, 0);
        const voorzieningenScore = Math.round(((rawScore + 21) / 63) * 90 + 10);

        enrichedAmenitiesData = {
          ...amenitiesData,
          precomputedScores: precomputedAmenityScores,
          voorzieningenScore: Math.max(10, Math.min(100, voorzieningenScore)),
        };
      }

      // Validate data before saving (Phase 3.1: JSON round-trip validation)
      const validationResult = validateSnapshotData({
        demographicsData: locationData?.demographics,
        healthData: locationData?.health,
        safetyData: locationData?.safety,
        livabilityData: locationData?.livability,
        amenitiesData: enrichedAmenitiesData,
        housingData: housingData,
        wmsGradingData: wmsGradingData || undefined,
        pveData: pveData || undefined,
      });

      if (!validationResult.isValid) {
        console.warn('Snapshot data validation warnings:', validationResult.fieldResults);
      }

      const response = await fetch('/api/location/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          address,
          latitude,
          longitude,
          demographics_data: locationData?.demographics || {},
          health_data: locationData?.health || {},
          safety_data: locationData?.safety || {},
          livability_data: locationData?.livability || {},
          amenities_data: enrichedAmenitiesData,
          housing_data: housingData,
          wms_grading_data: wmsGradingData || null,
          pve_data: pveData || null,
          scoring_algorithm_version: CURRENT_SCORING_VERSION,
          notes: null,
          tags: [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessDialog({
          isOpen: true,
          message: locale === 'nl' ? 'Locatie succesvol opgeslagen!' : 'Location saved successfully!',
        });
        onSaveSuccess?.();
      } else {
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Opslaan mislukt' : 'Failed to save location'),
        });
      }
    } catch (err) {
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Opslaan mislukt' : 'Failed to save location'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-base text-sm text-gray-600">
        {locale === 'nl' ? 'Projecten laden...' : 'Loading projects...'}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-base">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-sm mb-sm">
          <p className="text-sm font-medium text-yellow-800 mb-xs">
            {locale === 'nl' ? '⚠️ Geen projecten beschikbaar' : '⚠️ No projects available'}
          </p>
          <p className="text-xs text-yellow-700">
            {locale === 'nl'
              ? 'Maak eerst een project aan om locaties op te slaan.'
              : 'Please create a project first to save locations.'}
          </p>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="p-base">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-sm">
          <p className="text-sm font-medium text-blue-800 mb-xs">
            {locale === 'nl' ? 'ℹ️ Geen locatie geselecteerd' : 'ℹ️ No location selected'}
          </p>
          <p className="text-xs text-blue-700">
            {locale === 'nl'
              ? 'Zoek eerst een locatie om op te slaan.'
              : 'Please search for a location first to save it.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-base space-y-sm">
      {/* Project Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-xs">
          {locale === 'nl' ? 'Selecteer Project' : 'Select Project'}
        </label>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-sm py-xs text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Location Info */}
      <div className="bg-gray-50 rounded-md p-sm">
        <p className="text-xs font-medium text-gray-700 mb-xs">
          {locale === 'nl' ? 'Locatie' : 'Location'}
        </p>
        <p className="text-xs text-gray-600">{address}</p>
        <p className="text-xs text-gray-500 mt-xs">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        variant="primary"
        size="base"
        className="w-full"
        disabled={!selectedProjectId || isSaving}
      >
        {isSaving
          ? (locale === 'nl' ? 'Opslaan...' : 'Saving...')
          : (locale === 'nl' ? 'Locatie Opslaan' : 'Save Location')}
      </Button>

      {/* Error Alert Dialog */}
      <AlertDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        title={locale === 'nl' ? 'Fout' : 'Error'}
        message={errorDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="error"
      />

      {/* Success Alert Dialog */}
      <AlertDialog
        isOpen={successDialog.isOpen}
        onClose={() => {
          setSuccessDialog({ isOpen: false, message: '' });
        }}
        title={locale === 'nl' ? 'Gelukt!' : 'Success!'}
        message={successDialog.message}
        closeText={locale === 'nl' ? 'Sluiten' : 'Close'}
        variant="success"
      />
    </div>
  );
};

export default SaveLocationToProject;
