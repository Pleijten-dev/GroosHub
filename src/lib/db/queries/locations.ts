/**
 * Database queries for location_snapshots table
 */

import { getDbConnection } from '../connection';

export interface LocationSnapshot {
  id: string; // UUID
  project_id: string;
  user_id: number;
  address: string;
  latitude: number;
  longitude: number;
  neighborhood_code: string | null;
  district_code: string | null;
  municipality_code: string | null;
  snapshot_date: Date;
  version_number: number;
  is_active: boolean;
  demographics_data: Record<string, unknown>;
  health_data: Record<string, unknown>;
  safety_data: Record<string, unknown>;
  livability_data: Record<string, unknown>;
  amenities_data: Record<string, unknown>;
  housing_data: Record<string, unknown>;
  wms_grading_data?: Record<string, unknown>; // Optional - may not exist before migration
  overall_score: number | null;
  category_scores: Record<string, unknown>;
  data_sources: Record<string, unknown>;
  api_versions: Record<string, unknown>;
  notes: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get active location snapshot for a project
 */
export async function getActiveLocationSnapshot(
  projectId: string
): Promise<LocationSnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags, metadata,
      created_at, updated_at
    FROM location_snapshots
    WHERE project_id = ${projectId}
    AND is_active = true
    LIMIT 1
  `;

  return result.length > 0 ? (result[0] as LocationSnapshot) : null;
}

/**
 * Get all location snapshots for a project (including historical)
 */
export async function getProjectLocationSnapshots(
  projectId: string
): Promise<LocationSnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags, metadata,
      created_at, updated_at
    FROM location_snapshots
    WHERE project_id = ${projectId}
    ORDER BY version_number DESC
  `;

  return result as LocationSnapshot[];
}

/**
 * Get location snapshot by ID
 */
export async function getLocationSnapshotById(
  snapshotId: string
): Promise<LocationSnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags, metadata,
      created_at, updated_at
    FROM location_snapshots
    WHERE id = ${snapshotId}
    LIMIT 1
  `;

  return result.length > 0 ? (result[0] as LocationSnapshot) : null;
}

/**
 * Create new location snapshot
 * Automatically deactivates previous active snapshot
 */
export async function createLocationSnapshot(params: {
  projectId: string;
  userId: number;
  address: string;
  latitude: number;
  longitude: number;
  neighborhoodCode?: string;
  districtCode?: string;
  municipalityCode?: string;
  demographicsData?: Record<string, unknown>;
  healthData?: Record<string, unknown>;
  safetyData?: Record<string, unknown>;
  livabilityData?: Record<string, unknown>;
  amenitiesData?: Record<string, unknown>;
  housingData?: Record<string, unknown>;
  wmsGradingData?: Record<string, unknown>;
  overallScore?: number;
  categoryScores?: Record<string, unknown>;
  dataSources?: Record<string, unknown>;
  apiVersions?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}): Promise<LocationSnapshot> {
  const db = getDbConnection();

  // Get next version number
  const versionResult = await db`
    SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
    FROM location_snapshots
    WHERE project_id = ${params.projectId}
  `;

  const nextVersion = parseInt(versionResult[0].next_version);

  // Deactivate previous active snapshot
  await db`
    UPDATE location_snapshots
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${params.projectId}
    AND is_active = true
  `;

  // Create new snapshot
  const result = await db`
    INSERT INTO location_snapshots (
      project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags,
      created_at, updated_at
    ) VALUES (
      ${params.projectId},
      ${params.userId},
      ${params.address},
      ${params.latitude},
      ${params.longitude},
      ${params.neighborhoodCode || null},
      ${params.districtCode || null},
      ${params.municipalityCode || null},
      CURRENT_DATE,
      ${nextVersion},
      true,
      ${JSON.stringify(params.demographicsData || {})},
      ${JSON.stringify(params.healthData || {})},
      ${JSON.stringify(params.safetyData || {})},
      ${JSON.stringify(params.livabilityData || {})},
      ${JSON.stringify(params.amenitiesData || {})},
      ${JSON.stringify(params.housingData || {})},
      ${JSON.stringify(params.wmsGradingData || {})},
      ${params.overallScore || null},
      ${JSON.stringify(params.categoryScores || {})},
      ${JSON.stringify(params.dataSources || {})},
      ${JSON.stringify(params.apiVersions || {})},
      ${params.notes || null},
      ${params.tags ? `{${params.tags.join(',')}}` : null},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING
      id, project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags, metadata,
      created_at, updated_at
  `;

  return result[0] as LocationSnapshot;
}

/**
 * Update location snapshot notes
 */
export async function updateLocationSnapshotNotes(
  snapshotId: string,
  notes: string
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE location_snapshots
    SET notes = ${notes},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Update location snapshot tags
 */
export async function updateLocationSnapshotTags(
  snapshotId: string,
  tags: string[]
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE location_snapshots
    SET tags = ${`{${tags.join(',')}}`},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Set active snapshot for a project
 * Deactivates all other snapshots
 */
export async function setActiveLocationSnapshot(
  projectId: string,
  snapshotId: string
): Promise<void> {
  const db = getDbConnection();

  // Deactivate all snapshots for this project
  await db`
    UPDATE location_snapshots
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${projectId}
  `;

  // Activate the specified snapshot
  await db`
    UPDATE location_snapshots
    SET is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
    AND project_id = ${projectId}
  `;
}

/**
 * Delete location snapshot
 */
export async function deleteLocationSnapshot(snapshotId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM location_snapshots
    WHERE id = ${snapshotId}
  `;
}

/**
 * Update WMS grading data for a location snapshot
 */
export async function updateLocationSnapshotWmsGrading(
  snapshotId: string,
  wmsGradingData: Record<string, unknown>
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE location_snapshots
    SET wms_grading_data = ${JSON.stringify(wmsGradingData)},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Get location snapshots by user ID
 */
export async function getUserLocationSnapshots(userId: number): Promise<LocationSnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, address, latitude, longitude,
      neighborhood_code, district_code, municipality_code,
      snapshot_date, version_number, is_active,
      demographics_data, health_data, safety_data, livability_data,
      amenities_data, housing_data, wms_grading_data, overall_score, category_scores,
      data_sources, api_versions, notes, tags, metadata,
      created_at, updated_at
    FROM location_snapshots
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return result as LocationSnapshot[];
}
