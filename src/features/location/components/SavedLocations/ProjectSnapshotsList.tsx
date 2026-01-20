// src/features/location/components/SavedLocations/ProjectSnapshotsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import { ConfirmDialog } from '@/shared/components/UI/Modal/ConfirmDialog';
import { AlertDialog } from '@/shared/components/UI/Modal/AlertDialog';
import { cn } from '@/shared/utils/cn';
import type { Locale } from '@/lib/i18n/config';
import type { AccessibleLocation } from '@/features/location/types/saved-locations';

interface LocationSnapshot {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  snapshot_date: Date | string;
  version_number: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  user_id: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  snapshots?: LocationSnapshot[];
}

interface ProjectSnapshotsListProps {
  locale: Locale;
  onLoadSnapshot?: (location: AccessibleLocation) => void;
  refreshTrigger?: number;
}

export const ProjectSnapshotsList: React.FC<ProjectSnapshotsListProps> = ({
  locale,
  onLoadSnapshot,
  refreshTrigger = 0,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; snapshotId: string | null }>({
    isOpen: false,
    snapshotId: null,
  });
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: '',
  });

  // Load projects and their snapshots
  useEffect(() => {
    loadProjectsWithSnapshots();
  }, [refreshTrigger]);

  const loadProjectsWithSnapshots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, load projects
      const projectsResponse = await fetch('/api/projects');
      const projectsResult = await projectsResponse.json();

      if (!projectsResult.success) {
        setError(projectsResult.error || 'Failed to load projects');
        setIsLoading(false);
        return;
      }

      const projectsList: Project[] = projectsResult.data || [];

      // For each project, load its snapshots
      const projectsWithSnapshots = await Promise.all(
        projectsList.map(async (project) => {
          try {
            const snapshotsResponse = await fetch(`/api/location/snapshots?project_id=${project.id}`);
            const snapshotsResult = await snapshotsResponse.json();

            return {
              ...project,
              snapshots: snapshotsResult.success ? (snapshotsResult.data || []) : [],
            };
          } catch (err) {
            console.error(`Failed to load snapshots for project ${project.id}:`, err);
            return {
              ...project,
              snapshots: [],
            };
          }
        })
      );

      setProjects(projectsWithSnapshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSnapshot = async (snapshot: LocationSnapshot) => {
    try {
      // Fetch full snapshot data from API
      const response = await fetch(`/api/location/snapshots/${snapshot.id}`);

      if (!response.ok) {
        console.error('Failed to fetch snapshot data');
        setErrorDialog({
          isOpen: true,
          message: locale === 'nl' ? 'Snapshot laden mislukt' : 'Failed to load snapshot',
        });
        return;
      }

      const { data: snapshotData } = await response.json();

      // Transform to AccessibleLocation format
      // Structure must match UnifiedLocationData with location.coordinates.wgs84 nesting
      const accessibleLocation: AccessibleLocation = {
        id: snapshotData.id,
        userId: snapshotData.user_id,
        name: snapshotData.address,
        address: snapshotData.address,
        coordinates: {
          lat: snapshotData.latitude,
          lng: snapshotData.longitude,
        },
        locationData: {
          // Location data with proper coordinate nesting
          location: {
            address: snapshotData.address,
            coordinates: {
              wgs84: {
                latitude: snapshotData.latitude,
                longitude: snapshotData.longitude,
              },
              rd: {
                x: 0,
                y: 0,
              }
            },
            neighborhood: snapshotData.neighborhood_code ? { statcode: snapshotData.neighborhood_code } : null,
            district: snapshotData.district_code ? { statcode: snapshotData.district_code } : null,
            municipality: snapshotData.municipality_code ? { statcode: snapshotData.municipality_code } : null,
          },
          // Data sections at root level
          demographics: snapshotData.demographics_data || {},
          health: snapshotData.health_data || {},
          safety: snapshotData.safety_data || {},
          livability: snapshotData.livability_data || {},
          residential: snapshotData.housing_data || {},
        } as any, // Type assertion to bypass strict type checking for now
        amenitiesData: snapshotData.amenities_data || null,
        dataVersion: '1.0.0',
        completionStatus: 'location_only',
        createdAt: new Date(snapshotData.created_at),
        updatedAt: new Date(snapshotData.updated_at),
        ownerId: snapshotData.user_id,
        ownerName: 'Current User', // Default value
        ownerEmail: '', // Default value
        isShared: false,
        canEdit: true,
      };

      // Call the callback with transformed data
      if (onLoadSnapshot) {
        onLoadSnapshot(accessibleLocation);
      }
    } catch (err) {
      console.error('Failed to load snapshot:', err);
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Snapshot laden mislukt' : 'Failed to load snapshot'),
      });
    }
  };

  const handleDelete = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/location/snapshots/${snapshotId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the list
        loadProjectsWithSnapshots();
        setDeleteDialog({ isOpen: false, snapshotId: null });
      } else {
        setDeleteDialog({ isOpen: false, snapshotId: null });
        setErrorDialog({
          isOpen: true,
          message: result.error || (locale === 'nl' ? 'Verwijderen mislukt' : 'Failed to delete snapshot'),
        });
      }
    } catch (err) {
      setDeleteDialog({ isOpen: false, snapshotId: null });
      setErrorDialog({
        isOpen: true,
        message: err instanceof Error ? err.message : (locale === 'nl' ? 'Verwijderen mislukt' : 'Failed to delete snapshot'),
      });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (projects.length === 0) {
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
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-sm text-text-muted">
          {locale === 'nl' ? 'Geen projecten gevonden' : 'No projects found'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-sm">
      {projects.map((project) => (
        <div
          key={project.id}
          className="border border-gray-200 rounded-md overflow-hidden"
        >
          {/* Project Header */}
          <div
            className={cn(
              'px-sm py-xs cursor-pointer bg-gray-50 hover:bg-gray-100',
              'flex items-center justify-between',
              'border-b border-gray-200'
            )}
            onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
          >
            <div className="flex-1">
              <h4 className="text-sm font-medium text-text-primary">
                {project.name}
              </h4>
              <p className="text-xs text-text-muted">
                {project.snapshots?.length || 0} {locale === 'nl' ? 'snapshots' : 'snapshots'}
              </p>
            </div>
            <svg
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
                expandedProjectId === project.id && 'rotate-180'
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

          {/* Snapshots List (Expanded) */}
          {expandedProjectId === project.id && (
            <div className="bg-white">
              {project.snapshots && project.snapshots.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {project.snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="p-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-xs mb-xs">
                            <p className="text-xs font-medium text-text-primary truncate">
                              {snapshot.address}
                            </p>
                            {snapshot.is_active && (
                              <span className="px-xs py-xxs text-xxs font-medium bg-green-100 text-green-700 rounded">
                                {locale === 'nl' ? 'Actief' : 'Active'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-md text-xs text-text-muted">
                            <span>v{snapshot.version_number}</span>
                            <span>{formatDate(snapshot.created_at)}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-xs">
                          <Button
                            onClick={() => handleLoadSnapshot(snapshot)}
                            variant="primary"
                            size="sm"
                            className="text-xs"
                          >
                            {locale === 'nl' ? 'Laden' : 'Load'}
                          </Button>
                          <Button
                            onClick={() => setDeleteDialog({ isOpen: true, snapshotId: snapshot.id })}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600 hover:bg-red-50"
                          >
                            {locale === 'nl' ? 'Verwijderen' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-base text-center text-sm text-gray-500">
                  {locale === 'nl' ? 'Nog geen locaties opgeslagen' : 'No locations saved yet'}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, snapshotId: null })}
        onConfirm={() => {
          if (deleteDialog.snapshotId) {
            handleDelete(deleteDialog.snapshotId);
          }
        }}
        title={locale === 'nl' ? 'Snapshot verwijderen' : 'Delete Snapshot'}
        message={locale === 'nl'
          ? 'Weet u zeker dat u deze snapshot wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.'
          : 'Are you sure you want to delete this snapshot? This action cannot be undone.'}
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

export default ProjectSnapshotsList;
