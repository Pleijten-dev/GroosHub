/**
 * Database Migration Helper
 * Checks if WMS grading column exists and runs migration if needed
 */

import { getDbConnection } from '../connection';
import fs from 'fs';
import path from 'path';

/**
 * Check if wms_grading_data column exists in location_snapshots table
 */
export async function checkWmsGradingColumnExists(): Promise<boolean> {
  try {
    const db = getDbConnection();

    const result = await db`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'location_snapshots'
        AND column_name = 'wms_grading_data'
    `;

    return result.length > 0;
  } catch (error) {
    console.error('Error checking wms_grading_data column:', error);
    return false;
  }
}

/**
 * Run WMS grading migration if column doesn't exist
 */
export async function ensureWmsGradingMigration(): Promise<{
  success: boolean;
  message: string;
  migrationRan?: boolean;
}> {
  try {
    const exists = await checkWmsGradingColumnExists();

    if (exists) {
      return {
        success: true,
        message: 'WMS grading column already exists',
        migrationRan: false
      };
    }

    // Column doesn't exist, run migration
    console.log('WMS grading column not found, running migration...');

    const db = getDbConnection();

    // Read migration file
    const migrationPath = path.join(
      process.cwd(),
      'src/lib/db/migrations/013_add_wms_grading_data.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      return {
        success: false,
        message: 'Migration file not found. Please run migration manually.',
      };
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await db.unsafe(migrationSQL);

    console.log('✅ WMS grading migration completed successfully');

    return {
      success: true,
      message: 'WMS grading migration completed successfully',
      migrationRan: true
    };

  } catch (error) {
    console.error('Error running WMS grading migration:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get location snapshot columns based on whether wms_grading exists
 */
export async function getLocationSnapshotColumns(): Promise<string> {
  const hasWmsGrading = await checkWmsGradingColumnExists();

  const baseColumns = `
    id, project_id, user_id, address, latitude, longitude,
    neighborhood_code, district_code, municipality_code,
    snapshot_date, version_number, is_active,
    demographics_data, health_data, safety_data, livability_data,
    amenities_data, housing_data, overall_score, category_scores,
    data_sources, api_versions, notes, tags, metadata,
    created_at, updated_at
  `;

  if (hasWmsGrading) {
    // Insert wms_grading_data after housing_data
    return baseColumns.replace(
      'housing_data,',
      'housing_data, wms_grading_data,'
    );
  }

  return baseColumns;
}
