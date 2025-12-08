-- ================================================
-- Rollback 007: Drop LCA Snapshots Table
-- Description: Rollback for migration 007
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS lca_snapshots_updated_at ON lca_snapshots;

-- Drop table
DROP TABLE IF EXISTS lca_snapshots CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lca_snapshots') as table_dropped;
