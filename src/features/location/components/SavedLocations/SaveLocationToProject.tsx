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
import { getRapportDataByAddress } from '../../data/cache/rapportCache';

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

  // Create project state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      setErrorDialog({
        isOpen: true,
        message: locale === 'nl' ? 'Voer een projectnaam in' : 'Please enter a project name',
      });
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload projects list
        await loadProjects();
        // Auto-select the newly created project
        setSelectedProjectId(result.data.id);
        // Reset the create project form
        setNewProjectName('');
        setShowCreateProject(false);
        // Show success message
        setSuccessDialog({
          isOpen: true,
          message: locale === 'nl'
            ? `Project "${trimmedName}" succesvol aangemaakt!`
            : `Project "${trimmedName}" created successfully!`,
        });
      } else {
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Project aanmaken mislukt' : 'Failed to create project'),
        });
      }
    } catch (err) {
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Project aanmaken mislukt' : 'Failed to create project'),
      });
    } finally {
      setIsCreatingProject(false);
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

      // Get custom scenario selection from localStorage
      let customScenarioIds: string[] | undefined;
      try {
        const stored = localStorage.getItem('grooshub_doelgroepen_scenario_selection');
        if (stored) {
          const { customIds } = JSON.parse(stored);
          if (customIds && Array.isArray(customIds) && customIds.length > 0) {
            customScenarioIds = customIds;
          }
        }
      } catch (error) {
        console.error('Failed to read custom scenario from localStorage:', error);
      }

      // Combine PVE data with custom scenario
      const combinedPveData = {
        ...pveData,
        customScenarioIds, // Include custom scenario selection
      };

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

      // Get rapport data from local cache (if user has generated a report)
      const rapportData = getRapportDataByAddress(address);

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

      // Extract geographic codes from location data
      const neighborhoodCode = locationData?.location?.neighborhood?.statcode || null;
      const districtCode = locationData?.location?.district?.statcode || null;
      const municipalityCode = locationData?.location?.municipality?.statcode || null;

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
          // Include geographic codes so data levels are available on load
          neighborhood_code: neighborhoodCode,
          district_code: districtCode,
          municipality_code: municipalityCode,
          demographics_data: locationData?.demographics || {},
          health_data: locationData?.health || {},
          safety_data: locationData?.safety || {},
          livability_data: locationData?.livability || {},
          amenities_data: enrichedAmenitiesData,
          housing_data: housingData,
          wms_grading_data: wmsGradingData || null,
          pve_data: combinedPveData || null,
          rapport_data: rapportData || null,
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
      <div className="p-base space-y-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-sm">
          <p className="text-sm font-medium text-blue-800 mb-xs">
            {locale === 'nl' ? 'Nieuw project aanmaken' : 'Create a new project'}
          </p>
          <p className="text-xs text-blue-700 mb-sm">
            {locale === 'nl'
              ? 'Maak een project aan om deze locatie op te slaan.'
              : 'Create a project to save this location.'}
          </p>
          <div className="space-y-xs">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreatingProject) {
                  handleCreateProject();
                }
              }}
              placeholder={locale === 'nl' ? 'Projectnaam' : 'Project name'}
              className="w-full box-border px-sm py-xs text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isCreatingProject}
            />
            <Button
              onClick={handleCreateProject}
              variant="primary"
              size="base"
              className="w-full"
              disabled={isCreatingProject || !newProjectName.trim()}
            >
              {isCreatingProject
                ? (locale === 'nl' ? 'Aanmaken...' : 'Creating...')
                : (locale === 'nl' ? 'Project Aanmaken' : 'Create Project')}
            </Button>
          </div>
        </div>

        {/* Show location info if available */}
        {address && (
          <div className="bg-gray-50 rounded-md p-sm">
            <p className="text-xs font-medium text-gray-700 mb-xs">
              {locale === 'nl' ? 'Te bewaren locatie' : 'Location to save'}
            </p>
            <p className="text-xs text-gray-600">{address}</p>
          </div>
        )}

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

        {/* Create New Project Toggle */}
        {!showCreateProject ? (
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="mt-xs text-xs text-primary hover:text-primary-dark underline"
          >
            {locale === 'nl' ? '+ Nieuw project aanmaken' : '+ Create new project'}
          </button>
        ) : (
          <div className="mt-sm p-sm bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-xs font-medium text-gray-700">
                {locale === 'nl' ? 'Nieuw project' : 'New project'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCreateProject(false);
                  setNewProjectName('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {locale === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
            </div>
            <div className="flex gap-xs">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreatingProject) {
                    handleCreateProject();
                  }
                }}
                placeholder={locale === 'nl' ? 'Projectnaam' : 'Project name'}
                className="flex-1 min-w-0 box-border px-sm py-xs text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isCreatingProject}
                autoFocus
              />
              <Button
                onClick={handleCreateProject}
                variant="primary"
                size="sm"
                disabled={isCreatingProject || !newProjectName.trim()}
              >
                {isCreatingProject
                  ? (locale === 'nl' ? '...' : '...')
                  : (locale === 'nl' ? 'Aanmaken' : 'Create')}
              </Button>
            </div>
          </div>
        )}
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
