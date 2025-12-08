-- ================================================
-- Rollback 012: Revert Saved Locations Migration
-- Description: Remove migrated location snapshots and auto-generated projects
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete migrated location snapshots
DELETE FROM location_snapshots
WHERE metadata->>'migrated_from' = 'saved_locations';

-- Delete project members for auto-generated projects
DELETE FROM project_members
WHERE project_id IN (
  SELECT id FROM project_projects
  WHERE metadata->>'migrated_from' = 'saved_locations'
  AND (metadata->>'auto_created')::boolean = true
);

-- Delete auto-generated projects
DELETE FROM project_projects
WHERE metadata->>'migrated_from' = 'saved_locations'
AND (metadata->>'auto_created')::boolean = true;

COMMIT;

-- Verification
SELECT
  'location_snapshots' as table_name,
  COUNT(*) as row_count
FROM location_snapshots
WHERE metadata->>'migrated_from' = 'saved_locations';
