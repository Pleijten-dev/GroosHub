// src/features/location/types/saved-locations.ts
/**
 * TypeScript types for persistent location storage
 */

import type { UnifiedLocationData } from '../data/aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../data/sources/google-places/types';

/**
 * Coordinates structure
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * PVE (Programma Van Eisen) configuration
 */
export interface PVEConfig {
  [key: string]: unknown; // TODO: Define specific PVE structure
}

/**
 * Selected persona data
 */
export interface SelectedPersona {
  personaId: string;
  name: string;
  score?: number;
  [key: string]: unknown;
}

/**
 * LLM-generated rapport data
 */
export interface LLMRapportData {
  housing?: unknown;
  community?: unknown;
  public?: unknown;
  generatedAt?: string;
  [key: string]: unknown;
}

/**
 * Complete location data for saving
 */
export interface SaveLocationData {
  name?: string; // Optional user-given name
  address: string;
  coordinates: Coordinates;
  locationData: UnifiedLocationData;
  amenitiesData?: AmenityMultiCategoryResponse;
  selectedPVE?: PVEConfig;
  selectedPersonas?: SelectedPersona[];
  llmRapport?: LLMRapportData;
}

/**
 * Completion status of saved location workflow
 */
export type CompletionStatus =
  | 'location_only'
  | 'with_personas'
  | 'with_pve'
  | 'with_personas_pve'
  | 'complete';

/**
 * Metadata for version tracking and migrations
 */
export interface LocationMetadata {
  migratedFrom?: string;
  migrationDate?: string;
  warnings?: string[];
  customFields?: Record<string, unknown>;
}

/**
 * Saved location record from database
 */
export interface SavedLocation {
  id: string;
  userId: number;
  name?: string;
  address: string;
  coordinates: Coordinates;
  locationData: UnifiedLocationData;
  amenitiesData?: AmenityMultiCategoryResponse;
  selectedPVE?: PVEConfig;
  selectedPersonas?: SelectedPersona[];
  llmRapport?: LLMRapportData;
  dataVersion: string; // Semantic version (e.g., "1.0.0")
  completionStatus: CompletionStatus;
  metadata?: LocationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location share record
 */
export interface LocationShare {
  id: string;
  savedLocationId: string;
  sharedByUserId: number;
  sharedWithUserId: number;
  canEdit: boolean;
  sharedAt: Date;
}

/**
 * User-accessible location (owned or shared)
 */
export interface AccessibleLocation extends SavedLocation {
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  isShared: boolean;
  canEdit: boolean;
}

/**
 * API request/response types
 */

export interface SaveLocationRequest {
  name?: string;
  address: string;
  coordinates: Coordinates;
  locationData: UnifiedLocationData;
  amenitiesData?: AmenityMultiCategoryResponse;
  selectedPVE?: PVEConfig;
  selectedPersonas?: SelectedPersona[];
  llmRapport?: LLMRapportData;
}

export interface SaveLocationResponse {
  success: boolean;
  data?: SavedLocation;
  error?: string;
}

export interface LoadLocationsResponse {
  success: boolean;
  data?: AccessibleLocation[];
  error?: string;
}

export interface LoadLocationResponse {
  success: boolean;
  data?: AccessibleLocation;
  error?: string;
}

export interface DeleteLocationRequest {
  id: string;
}

export interface DeleteLocationResponse {
  success: boolean;
  error?: string;
}

export interface ShareLocationRequest {
  locationId: string;
  shareWithEmail: string;
  canEdit?: boolean;
}

export interface ShareLocationResponse {
  success: boolean;
  data?: LocationShare;
  error?: string;
}

export interface UnshareLocationRequest {
  shareId: string;
}

export interface UnshareLocationResponse {
  success: boolean;
  error?: string;
}
