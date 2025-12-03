-- ================================================
-- Rollback 011: Revert LCA Snapshots Migration
-- Description: Remove migrated LCA snapshots
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete migrated LCA snapshots
DELETE FROM lca_snapshots
WHERE metadata->>'migrated_from' = 'lca_projects';

COMMIT;

-- Verification
SELECT
  'lca_snapshots' as table_name,
  COUNT(*) as row_count
FROM lca_snapshots;
