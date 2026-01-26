'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/UI/Button/Button';
import { cn } from '@/shared/utils/cn';

interface ProjectLocationsProps {
  projectId: string;
  locale: string;
}

interface LocationSnapshot {
  id: string;
  project_id: string;
  user_id: number;
  address: string;
  latitude: number;
  longitude: number;
  neighborhood_code: string | null;
  district_code: string | null;
  municipality_code: string | null;
  snapshot_date: string;
  version_number: number;
  is_active: boolean;
  demographics_data: Record<string, unknown>;
  health_data: Record<string, unknown>;
  safety_data: Record<string, unknown>;
  livability_data: Record<string, unknown>;
  amenities_data: Record<string, unknown>;
  housing_data: Record<string, unknown>;
  overall_score: number | null;
  category_scores: Record<string, unknown>;
  data_sources: Record<string, unknown>;
  api_versions: Record<string, unknown>;
  notes: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const translations = {
  nl: {
    title: 'Locatie Snapshots',
    noSnapshots: 'Nog geen locatie snapshots opgeslagen',
    noSnapshotsDesc: 'Ga naar de locatie pagina en sla een analyse op om deze hier te zien.',
    address: 'Adres',
    version: 'Versie',
    date: 'Datum',
    active: 'Actief',
    inactive: 'Inactief',
    score: 'Score',
    loadToPage: 'Laden naar Pagina',
    setActive: 'Activeren',
    delete: 'Verwijderen',
    confirmDelete: 'Weet je zeker dat je deze snapshot wilt verwijderen?',
    loading: 'Laden...',
    errorLoading: 'Fout bij laden snapshots',
    notes: 'Notities',
    tags: 'Tags',
    viewDetails: 'Details bekijken',
    hideDetails: 'Details verbergen',
    demographics: 'Demografie',
    health: 'Gezondheid',
    safety: 'Veiligheid',
    livability: 'Leefbaarheid',
    amenities: 'Voorzieningen',
    housing: 'Woningmarkt'
  },
  en: {
    title: 'Location Snapshots',
    noSnapshots: 'No location snapshots saved yet',
    noSnapshotsDesc: 'Go to the location page and save an analysis to see it here.',
    address: 'Address',
    version: 'Version',
    date: 'Date',
    active: 'Active',
    inactive: 'Inactive',
    score: 'Score',
    loadToPage: 'Load to Page',
    setActive: 'Set Active',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this snapshot?',
    loading: 'Loading...',
    errorLoading: 'Error loading snapshots',
    notes: 'Notes',
    tags: 'Tags',
    viewDetails: 'View Details',
    hideDetails: 'Hide Details',
    demographics: 'Demographics',
    health: 'Health',
    safety: 'Safety',
    livability: 'Livability',
    amenities: 'Amenities',
    housing: 'Housing Market'
  }
};

export function ProjectLocations({ projectId, locale }: ProjectLocationsProps) {
  const [snapshots, setSnapshots] = useState<LocationSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const router = useRouter();

  const t = translations[locale as keyof typeof translations] || translations.en;

  useEffect(() => {
    fetchSnapshots();
  }, [projectId]);

  async function fetchSnapshots() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/locations`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots || []);
      } else {
        setError(t.errorLoading);
      }
    } catch (error) {
      console.error('Failed to fetch snapshots:', error);
      setError(t.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetActive(snapshotId: string) {
    try {
      const res = await fetch(`/api/location/snapshots/${snapshotId}/activate`, {
        method: 'PATCH'
      });

      if (res.ok) {
        await fetchSnapshots();
      }
    } catch (error) {
      console.error('Failed to set active snapshot:', error);
    }
  }

  async function handleDelete(snapshotId: string) {
    if (!confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`/api/location/snapshots/${snapshotId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchSnapshots();
      }
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
    }
  }

  async function handleLoadToPage(snapshot: LocationSnapshot) {
    try {
      // Fetch full snapshot data
      const res = await fetch(`/api/location/snapshots/${snapshot.id}`);
      if (!res.ok) {
        console.error('Failed to fetch snapshot data');
        return;
      }

      const { data: snapshotData } = await res.json();

      // Store snapshot data in sessionStorage for the location page to retrieve
      // Structure must match UnifiedLocationData with location.coordinates.wgs84 nesting
      // Ensure coordinates are numbers (they may come as strings from JSON/database)
      const latitude = typeof snapshotData.latitude === 'string'
        ? parseFloat(snapshotData.latitude)
        : Number(snapshotData.latitude) || 0;
      const longitude = typeof snapshotData.longitude === 'string'
        ? parseFloat(snapshotData.longitude)
        : Number(snapshotData.longitude) || 0;

      sessionStorage.setItem('grooshub_load_snapshot', JSON.stringify({
        snapshotId: snapshotData.id, // Include snapshot ID for WMS grading
        projectId: snapshotData.project_id, // Include project ID for AI assistant chats
        address: snapshotData.address,
        locationData: {
          // Location data with proper coordinate nesting
          location: {
            address: snapshotData.address,
            coordinates: {
              wgs84: {
                latitude,
                longitude,
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
          residential: snapshotData.housing_data || {}
        },
        amenitiesData: snapshotData.amenities_data || null,
        wmsGradingData: snapshotData.wms_grading_data || null // Include WMS grading data if available
      }));

      // Navigate to location page
      router.push(`/${locale}/location`);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    }
  }

  function getCategoryDataCount(data: Record<string, unknown>): number {
    return Object.keys(data).length;
  }

  if (isLoading) {
    return (
      <div className="text-center py-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-600 mt-sm">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-lg text-red-600">
        {error}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-lg">
        <svg
          className="w-16 h-16 text-gray-400 mx-auto mb-base"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-xs">{t.noSnapshots}</h3>
        <p className="text-gray-600">{t.noSnapshotsDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-base">
      <h2 className="text-xl font-semibold">{t.title}</h2>

      {/* Snapshots List */}
      <div className="space-y-sm">
        {snapshots.map(snapshot => (
          <div
            key={snapshot.id}
            className={cn(
              'border rounded-lg overflow-hidden transition-all',
              snapshot.is_active ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
            )}
          >
            {/* Snapshot Header */}
            <div className="p-base">
              <div className="flex items-start justify-between gap-base">
                <div className="flex-1 min-w-0">
                  {/* Address and Version */}
                  <div className="flex items-center gap-sm mb-xs">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {snapshot.address}
                    </h3>
                    <span className={cn(
                      'px-sm py-xs text-xs font-medium rounded-full',
                      snapshot.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {snapshot.is_active ? t.active : t.inactive}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-md text-sm text-gray-600 flex-wrap">
                    <span>{t.version} {snapshot.version_number}</span>
                    <span>•</span>
                    <span>{new Date(snapshot.snapshot_date).toLocaleDateString(locale)}</span>
                    {snapshot.overall_score !== null && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-primary">
                          {t.score}: {snapshot.overall_score.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tags */}
                  {snapshot.tags && snapshot.tags.length > 0 && (
                    <div className="flex items-center gap-xs mt-sm flex-wrap">
                      {snapshot.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-sm py-xs text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes Preview */}
                  {snapshot.notes && (
                    <p className="text-sm text-gray-700 mt-sm line-clamp-2">
                      {snapshot.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-xs flex-shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLoadToPage(snapshot)}
                  >
                    {t.loadToPage}
                  </Button>

                  {!snapshot.is_active && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetActive(snapshot.id)}
                    >
                      {t.setActive}
                    </Button>
                  )}

                  <button
                    onClick={() => setExpandedSnapshot(
                      expandedSnapshot === snapshot.id ? null : snapshot.id
                    )}
                    className="px-sm py-xs text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  >
                    {expandedSnapshot === snapshot.id ? t.hideDetails : t.viewDetails}
                  </button>

                  <button
                    onClick={() => handleDelete(snapshot.id)}
                    className="p-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                    title={t.delete}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedSnapshot === snapshot.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-base">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-base">
                  {/* Category Data Counts */}
                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.demographics_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.demographics}</div>
                  </div>

                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.health_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.health}</div>
                  </div>

                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.safety_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.safety}</div>
                  </div>

                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.livability_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.livability}</div>
                  </div>

                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.amenities_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.amenities}</div>
                  </div>

                  <div className="text-center p-sm bg-white rounded border border-gray-200">
                    <div className="text-2xl font-bold text-primary">
                      {getCategoryDataCount(snapshot.housing_data)}
                    </div>
                    <div className="text-xs text-gray-600 mt-xs">{t.housing}</div>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="mt-base p-sm bg-white rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-xs">Coordinates</div>
                  <div className="text-sm text-gray-700">
                    {snapshot.latitude.toFixed(6)}, {snapshot.longitude.toFixed(6)}
                  </div>
                  {snapshot.neighborhood_code && (
                    <div className="text-xs text-gray-500 mt-xs">
                      Neighborhood: {snapshot.neighborhood_code}
                    </div>
                  )}
                </div>

                {/* Full Notes */}
                {snapshot.notes && (
                  <div className="mt-base p-sm bg-white rounded border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 mb-xs">{t.notes}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {snapshot.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectLocations;
