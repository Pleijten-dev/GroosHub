-- ================================================
-- Migration 013 Rollback: Remove WMS Grading Data Column
-- Description: Remove wms_grading_data column from location_snapshots
-- Date: 2026-01-19
-- ================================================

BEGIN;

-- Drop index
DROP INDEX IF EXISTS idx_location_wms_grading;

-- Remove column
ALTER TABLE location_snapshots
DROP COLUMN IF EXISTS wms_grading_data;

COMMIT;

-- Verification
SELECT
  'Rollback complete' as status,
  COUNT(*) as wms_grading_columns_remaining
FROM information_schema.columns
WHERE table_name = 'location_snapshots'
  AND column_name = 'wms_grading_data';
