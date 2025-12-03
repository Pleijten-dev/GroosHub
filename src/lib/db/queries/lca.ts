/**
 * Database queries for lca_snapshots table
 */

import { getDbConnection } from '../connection';

export interface LCASnapshot {
  id: string; // UUID
  project_id: string;
  user_id: number;
  project_name: string;
  project_description: string | null;
  snapshot_date: Date;
  version_number: number;
  is_active: boolean;
  functional_unit: string | null;
  system_boundary: string | null;
  allocation_method: string | null;
  processes: unknown[];
  flows: unknown[];
  impact_categories: unknown[];
  results: Record<string, unknown>;
  parameters: Record<string, unknown>;
  comparisons: unknown[];
  calculation_status: string;
  calculation_error: string | null;
  last_calculated_at: Date | null;
  database_source: string | null;
  database_version: string | null;
  notes: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get active LCA snapshot for a project
 */
export async function getActiveLCASnapshot(projectId: string): Promise<LCASnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, calculation_error, last_calculated_at,
      database_source, database_version, notes, tags, metadata,
      created_at, updated_at
    FROM lca_snapshots
    WHERE project_id = ${projectId}
    AND is_active = true
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all LCA snapshots for a project (including historical)
 */
export async function getProjectLCASnapshots(projectId: string): Promise<LCASnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, calculation_error, last_calculated_at,
      database_source, database_version, notes, tags, metadata,
      created_at, updated_at
    FROM lca_snapshots
    WHERE project_id = ${projectId}
    ORDER BY version_number DESC
  `;

  return result;
}

/**
 * Get LCA snapshot by ID
 */
export async function getLCASnapshotById(snapshotId: string): Promise<LCASnapshot | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, calculation_error, last_calculated_at,
      database_source, database_version, notes, tags, metadata,
      created_at, updated_at
    FROM lca_snapshots
    WHERE id = ${snapshotId}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Create new LCA snapshot
 * Automatically deactivates previous active snapshot
 */
export async function createLCASnapshot(params: {
  projectId: string;
  userId: number;
  projectName: string;
  projectDescription?: string;
  functionalUnit?: string;
  systemBoundary?: string;
  allocationMethod?: string;
  processes?: unknown[];
  flows?: unknown[];
  impactCategories?: unknown[];
  results?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  comparisons?: unknown[];
  databaseSource?: string;
  databaseVersion?: string;
  notes?: string;
  tags?: string[];
}): Promise<LCASnapshot> {
  const db = getDbConnection();

  // Get next version number
  const versionResult = await db`
    SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
    FROM lca_snapshots
    WHERE project_id = ${params.projectId}
  `;

  const nextVersion = parseInt(versionResult[0].next_version);

  // Deactivate previous active snapshot
  await db`
    UPDATE lca_snapshots
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${params.projectId}
    AND is_active = true
  `;

  // Create new snapshot
  const result = await db`
    INSERT INTO lca_snapshots (
      project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, database_source, database_version, notes, tags,
      created_at, updated_at
    ) VALUES (
      ${params.projectId},
      ${params.userId},
      ${params.projectName},
      ${params.projectDescription || null},
      CURRENT_DATE,
      ${nextVersion},
      true,
      ${params.functionalUnit || null},
      ${params.systemBoundary || null},
      ${params.allocationMethod || null},
      ${JSON.stringify(params.processes || [])},
      ${JSON.stringify(params.flows || [])},
      ${JSON.stringify(params.impactCategories || [])},
      ${JSON.stringify(params.results || {})},
      ${JSON.stringify(params.parameters || {})},
      ${JSON.stringify(params.comparisons || [])},
      'pending',
      ${params.databaseSource || null},
      ${params.databaseVersion || null},
      ${params.notes || null},
      ${params.tags ? `{${params.tags.join(',')}}` : null},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING
      id, project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, calculation_error, last_calculated_at,
      database_source, database_version, notes, tags, metadata,
      created_at, updated_at
  `;

  return result[0];
}

/**
 * Update LCA snapshot calculation status
 */
export async function updateLCACalculationStatus(
  snapshotId: string,
  status: 'pending' | 'calculating' | 'completed' | 'failed',
  error?: string,
  results?: Record<string, unknown>
): Promise<void> {
  const db = getDbConnection();

  if (results) {
    await db`
      UPDATE lca_snapshots
      SET calculation_status = ${status},
          calculation_error = ${error || null},
          results = ${JSON.stringify(results)},
          last_calculated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${snapshotId}
    `;
  } else {
    await db`
      UPDATE lca_snapshots
      SET calculation_status = ${status},
          calculation_error = ${error || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${snapshotId}
    `;
  }
}

/**
 * Update LCA snapshot data
 */
export async function updateLCASnapshotData(
  snapshotId: string,
  data: {
    processes?: unknown[];
    flows?: unknown[];
    impactCategories?: unknown[];
    parameters?: Record<string, unknown>;
  }
): Promise<void> {
  const db = getDbConnection();

  const updates = [];
  const values = [];

  if (data.processes !== undefined) {
    updates.push(`processes = $${updates.length + 1}`);
    values.push(JSON.stringify(data.processes));
  }

  if (data.flows !== undefined) {
    updates.push(`flows = $${updates.length + 1}`);
    values.push(JSON.stringify(data.flows));
  }

  if (data.impactCategories !== undefined) {
    updates.push(`impact_categories = $${updates.length + 1}`);
    values.push(JSON.stringify(data.impactCategories));
  }

  if (data.parameters !== undefined) {
    updates.push(`parameters = $${updates.length + 1}`);
    values.push(JSON.stringify(data.parameters));
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(snapshotId);

  await db(
    `
    UPDATE lca_snapshots
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
  `,
    values
  );
}

/**
 * Update LCA snapshot notes
 */
export async function updateLCASnapshotNotes(snapshotId: string, notes: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE lca_snapshots
    SET notes = ${notes},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Update LCA snapshot tags
 */
export async function updateLCASnapshotTags(snapshotId: string, tags: string[]): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE lca_snapshots
    SET tags = ${`{${tags.join(',')}}`},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
  `;
}

/**
 * Set active snapshot for a project
 * Deactivates all other snapshots
 */
export async function setActiveLCASnapshot(projectId: string, snapshotId: string): Promise<void> {
  const db = getDbConnection();

  // Deactivate all snapshots for this project
  await db`
    UPDATE lca_snapshots
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ${projectId}
  `;

  // Activate the specified snapshot
  await db`
    UPDATE lca_snapshots
    SET is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${snapshotId}
    AND project_id = ${projectId}
  `;
}

/**
 * Delete LCA snapshot
 */
export async function deleteLCASnapshot(snapshotId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM lca_snapshots
    WHERE id = ${snapshotId}
  `;
}

/**
 * Get LCA snapshots by user ID
 */
export async function getUserLCASnapshots(userId: number): Promise<LCASnapshot[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, project_id, user_id, project_name, project_description,
      snapshot_date, version_number, is_active,
      functional_unit, system_boundary, allocation_method,
      processes, flows, impact_categories, results, parameters, comparisons,
      calculation_status, calculation_error, last_calculated_at,
      database_source, database_version, notes, tags, metadata,
      created_at, updated_at
    FROM lca_snapshots
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return result;
}
