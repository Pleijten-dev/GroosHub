/**
 * Database queries for rapport_snapshots table
 *
 * Stores LLM-generated rapport data for locations.
 * Linked to location_snapshots via location_snapshot_id.
 */

import { getDbConnection } from '../connection';
import type { CachedRapportData } from '@/features/location/data/cache/rapportCache';
import type { CompactLocationExport } from '@/features/location/utils/jsonExportCompact';

// ============================================================================
// TYPES
// ============================================================================

export interface RapportSnapshot {
  id: string;
  location_snapshot_id: string | null; // Link to location_snapshots table
  user_id: number;
  name: string;
  location_address: string;
  latitude: number | null;
  longitude: number | null;
  locale: 'nl' | 'en';
  // LLM outputs stored as JSONB (4-stage pipeline)
  stage1_output: Record<string, unknown>;
  stage2_output: Record<string, unknown>;
  stage3_output: Record<string, unknown>;
  stage4_output: Record<string, unknown> | null;  // May be null for old snapshots
  combined_program: Record<string, unknown>;
  // Input data for regeneration/comparison
  input_data: Record<string, unknown>;
  input_hash: string;
  // Metadata
  llm_model: string;
  generation_time_ms: number | null;
  token_usage: Record<string, unknown> | null;
  notes: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRapportSnapshotParams {
  locationSnapshotId?: string;
  userId: number;
  name: string;
  locationAddress: string;
  latitude?: number;
  longitude?: number;
  locale: 'nl' | 'en';
  stage1Output: Record<string, unknown>;
  stage2Output: Record<string, unknown>;
  stage3Output: Record<string, unknown>;
  stage4Output: Record<string, unknown>;  // PVE allocation output
  combinedProgram: Record<string, unknown>;
  inputData: Record<string, unknown>;
  inputHash: string;
  llmModel?: string;
  generationTimeMs?: number;
  tokenUsage?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Create the rapport_snapshots table if it doesn't exist
 */
export async function ensureRapportSnapshotsTable(): Promise<void> {
  const db = getDbConnection();

  await db`
    CREATE TABLE IF NOT EXISTS rapport_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      location_snapshot_id UUID REFERENCES location_snapshots(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      location_address TEXT NOT NULL,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      locale VARCHAR(2) NOT NULL DEFAULT 'nl',
      stage1_output JSONB NOT NULL DEFAULT '{}',
      stage2_output JSONB NOT NULL DEFAULT '{}',
      stage3_output JSONB NOT NULL DEFAULT '{}',
      combined_program JSONB NOT NULL DEFAULT '{}',
      input_data JSONB NOT NULL DEFAULT '{}',
      input_hash VARCHAR(64) NOT NULL,
      llm_model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
      generation_time_ms INTEGER,
      token_usage JSONB,
      notes TEXT,
      tags TEXT[],
      is_favorite BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes for common queries
  await db`
    CREATE INDEX IF NOT EXISTS idx_rapport_snapshots_user_id ON rapport_snapshots(user_id)
  `;

  await db`
    CREATE INDEX IF NOT EXISTS idx_rapport_snapshots_input_hash ON rapport_snapshots(input_hash)
  `;

  await db`
    CREATE INDEX IF NOT EXISTS idx_rapport_snapshots_location ON rapport_snapshots(location_address)
  `;

  console.log('[RapportSnapshots] Table ensured');
}

/**
 * Create a new rapport snapshot
 */
export async function createRapportSnapshot(
  params: CreateRapportSnapshotParams
): Promise<RapportSnapshot> {
  const db = getDbConnection();

  const result = await db`
    INSERT INTO rapport_snapshots (
      location_snapshot_id,
      user_id,
      name,
      location_address,
      latitude,
      longitude,
      locale,
      stage1_output,
      stage2_output,
      stage3_output,
      stage4_output,
      combined_program,
      input_data,
      input_hash,
      llm_model,
      generation_time_ms,
      token_usage,
      notes,
      tags
    ) VALUES (
      ${params.locationSnapshotId || null},
      ${params.userId},
      ${params.name},
      ${params.locationAddress},
      ${params.latitude || null},
      ${params.longitude || null},
      ${params.locale},
      ${JSON.stringify(params.stage1Output)},
      ${JSON.stringify(params.stage2Output)},
      ${JSON.stringify(params.stage3Output)},
      ${JSON.stringify(params.stage4Output)},
      ${JSON.stringify(params.combinedProgram)},
      ${JSON.stringify(params.inputData)},
      ${params.inputHash},
      ${params.llmModel || 'claude-sonnet-4-20250514'},
      ${params.generationTimeMs || null},
      ${params.tokenUsage ? JSON.stringify(params.tokenUsage) : null},
      ${params.notes || null},
      ${params.tags ? `{${params.tags.join(',')}}` : null}
    )
    RETURNING *
  `;

  return result[0] as RapportSnapshot;
}

/**
 * Get rapport snapshot by ID
 */
export async function getRapportSnapshotById(
  snapshotId: string
): Promise<RapportSnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM rapport_snapshots
    WHERE id = ${snapshotId}
    LIMIT 1
  `;

  return result.length > 0 ? (result[0] as RapportSnapshot) : null;
}

/**
 * Get rapport snapshot by input hash (for cache lookup)
 */
export async function getRapportSnapshotByHash(
  inputHash: string,
  userId: number
): Promise<RapportSnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM rapport_snapshots
    WHERE input_hash = ${inputHash}
    AND user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.length > 0 ? (result[0] as RapportSnapshot) : null;
}

/**
 * Get all rapport snapshots for a user
 */
export async function getUserRapportSnapshots(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
    favoritesOnly?: boolean;
  }
): Promise<RapportSnapshot[]> {
  const db = getDbConnection();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  if (options?.favoritesOnly) {
    const result = await db`
      SELECT * FROM rapport_snapshots
      WHERE user_id = ${userId}
      AND is_favorite = true
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    return result as RapportSnapshot[];
  }

  const result = await db`
    SELECT * FROM rapport_snapshots
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result as RapportSnapshot[];
}

/**
 * Get rapport snapshots for a location snapshot
 */
export async function getLocationRapportSnapshots(
  locationSnapshotId: string
): Promise<RapportSnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM rapport_snapshots
    WHERE location_snapshot_id = ${locationSnapshotId}
    ORDER BY created_at DESC
  `;

  return result as RapportSnapshot[];
}

/**
 * Update rapport snapshot name
 */
export async function updateRapportSnapshotName(
  snapshotId: string,
  name: string
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE rapport_snapshots
    SET name = ${name},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Update rapport snapshot notes
 */
export async function updateRapportSnapshotNotes(
  snapshotId: string,
  notes: string
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE rapport_snapshots
    SET notes = ${notes},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Update rapport snapshot tags
 */
export async function updateRapportSnapshotTags(
  snapshotId: string,
  tags: string[]
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE rapport_snapshots
    SET tags = ${`{${tags.join(',')}}`},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Toggle favorite status
 */
export async function toggleRapportSnapshotFavorite(
  snapshotId: string
): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    UPDATE rapport_snapshots
    SET is_favorite = NOT is_favorite,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
    RETURNING is_favorite
  `;

  return result[0]?.is_favorite ?? false;
}

/**
 * Delete rapport snapshot
 */
export async function deleteRapportSnapshot(snapshotId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM rapport_snapshots
    WHERE id = ${snapshotId}
  `;
}

/**
 * Delete all rapport snapshots for a user
 */
export async function deleteUserRapportSnapshots(userId: number): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    DELETE FROM rapport_snapshots
    WHERE user_id = ${userId}
    RETURNING id
  `;

  return result.length;
}

/**
 * Search rapport snapshots by location address
 */
export async function searchRapportSnapshots(
  userId: number,
  searchTerm: string,
  limit: number = 20
): Promise<RapportSnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM rapport_snapshots
    WHERE user_id = ${userId}
    AND (
      location_address ILIKE ${'%' + searchTerm + '%'}
      OR name ILIKE ${'%' + searchTerm + '%'}
    )
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  return result as RapportSnapshot[];
}

/**
 * Get rapport snapshot count for user
 */
export async function getRapportSnapshotCount(userId: number): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    SELECT COUNT(*) as count FROM rapport_snapshots
    WHERE user_id = ${userId}
  `;

  return parseInt(result[0]?.count || '0');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert CachedRapportData to CreateRapportSnapshotParams
 */
export function cachedDataToSnapshotParams(
  cachedData: CachedRapportData,
  inputData: CompactLocationExport,
  userId: number,
  name: string,
  locationSnapshotId?: string
): CreateRapportSnapshotParams {
  return {
    locationSnapshotId,
    userId,
    name,
    locationAddress: cachedData.locationAddress,
    latitude: cachedData.coordinates?.lat,
    longitude: cachedData.coordinates?.lon,
    locale: cachedData.locale,
    stage1Output: cachedData.stage1Output as unknown as Record<string, unknown>,
    stage2Output: cachedData.stage2Output as unknown as Record<string, unknown>,
    stage3Output: cachedData.stage3Output as unknown as Record<string, unknown>,
    stage4Output: cachedData.stage4Output as unknown as Record<string, unknown>,
    combinedProgram: cachedData.combinedProgram as unknown as Record<string, unknown>,
    inputData: inputData as unknown as Record<string, unknown>,
    inputHash: cachedData.inputHash,
  };
}

/**
 * Convert RapportSnapshot to CachedRapportData
 */
export function snapshotToCachedData(
  snapshot: RapportSnapshot
): CachedRapportData {
  return {
    stage1Output: snapshot.stage1_output as unknown as CachedRapportData['stage1Output'],
    stage2Output: snapshot.stage2_output as unknown as CachedRapportData['stage2Output'],
    stage3Output: snapshot.stage3_output as unknown as CachedRapportData['stage3Output'],
    stage4Output: (snapshot.stage4_output ?? {}) as unknown as CachedRapportData['stage4Output'],
    combinedProgram: snapshot.combined_program as unknown as CachedRapportData['combinedProgram'],
    inputHash: snapshot.input_hash,
    timestamp: snapshot.created_at.getTime(),
    locale: snapshot.locale,
    locationAddress: snapshot.location_address,
    coordinates: snapshot.latitude && snapshot.longitude ? {
      lat: snapshot.latitude,
      lon: snapshot.longitude,
    } : undefined,
    version: 1,
  };
}
