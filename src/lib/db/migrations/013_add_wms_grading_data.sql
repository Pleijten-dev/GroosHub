-- ================================================
-- Migration 013: Add WMS Grading Data Column
-- Description: Add column for storing WMS layer grading data (point, average, max samples)
-- Date: 2026-01-19
-- ================================================

BEGIN;

-- Add wms_grading_data column to location_snapshots table
ALTER TABLE location_snapshots
ADD COLUMN IF NOT EXISTS wms_grading_data JSONB DEFAULT '{}'::jsonb;

-- Add index for WMS grading data queries
CREATE INDEX IF NOT EXISTS idx_location_wms_grading
ON location_snapshots USING GIN (wms_grading_data);

-- Add comment to document the column
COMMENT ON COLUMN location_snapshots.wms_grading_data IS
'WMS layer grading data including point samples, average area samples, and maximum area samples for all WMS layers at this location. Structure: { layer_id: { point_sample: {...}, average_area_sample: {...}, max_area_sample: {...} } }';

COMMIT;

-- Verification
SELECT
  'location_snapshots' as table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'location_snapshots'
  AND column_name = 'wms_grading_data';
