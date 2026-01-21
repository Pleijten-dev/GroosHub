-- ================================================
-- Migration 014: Add PVE Data Column
-- Description: Add column for storing Program van Eisen (PVE) configuration data
-- Date: 2026-01-21
-- ================================================

BEGIN;

-- Add pve_data column to location_snapshots table
ALTER TABLE location_snapshots
ADD COLUMN IF NOT EXISTS pve_data JSONB DEFAULT '{}'::jsonb;

-- Add index for PVE data queries
CREATE INDEX IF NOT EXISTS idx_location_pve_data
ON location_snapshots USING GIN (pve_data);

-- Add comment to document the column
COMMENT ON COLUMN location_snapshots.pve_data IS
'Program van Eisen (PVE) configuration data including total m2, percentage allocations for apartments, commercial, hospitality, social, communal, and offices. Structure: { totalM2: number, percentages: { apartments: number, commercial: number, hospitality: number, social: number, communal: number, offices: number }, timestamp: number }';

COMMIT;

-- Verification
SELECT
  'location_snapshots' as table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'location_snapshots'
  AND column_name = 'pve_data';
