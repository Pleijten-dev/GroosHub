-- ================================================
-- Rollback 006: Drop Location Snapshots Table
-- Description: Rollback for migration 006
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS location_snapshots_updated_at ON location_snapshots;

-- Drop table
DROP TABLE IF EXISTS location_snapshots CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_snapshots') as table_dropped;
