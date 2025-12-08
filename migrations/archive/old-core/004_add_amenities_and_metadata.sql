-- Add amenities_data and metadata columns to saved_locations table
-- This migration adds support for storing amenities data and additional metadata

-- Add amenities_data column to store Google Places API results
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS amenities_data JSONB;

-- Add data_version column for versioning
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS data_version VARCHAR(20) DEFAULT '1.0.0';

-- Add completion_status column to track workflow progress
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) DEFAULT 'location_only';

-- Add metadata column for version tracking and migrations
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for amenities_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_saved_locations_amenities_data ON saved_locations USING GIN (amenities_data);

-- Update the view to include new columns
DROP VIEW IF EXISTS user_accessible_locations;
CREATE OR REPLACE VIEW user_accessible_locations AS
SELECT
  sl.id,
  sl.user_id as owner_id,
  sl.name,
  sl.address,
  sl.coordinates,
  sl.location_data,
  sl.amenities_data,
  sl.selected_pve,
  sl.selected_personas,
  sl.llm_rapport,
  sl.data_version,
  sl.completion_status,
  sl.metadata,
  sl.created_at,
  sl.updated_at,
  u.name as owner_name,
  u.email as owner_email,
  FALSE as is_shared,
  TRUE as can_edit
FROM saved_locations sl
JOIN users u ON sl.user_id = u.id

UNION ALL

SELECT
  sl.id,
  sl.user_id as owner_id,
  sl.name,
  sl.address,
  sl.coordinates,
  sl.location_data,
  sl.amenities_data,
  sl.selected_pve,
  sl.selected_personas,
  sl.llm_rapport,
  sl.data_version,
  sl.completion_status,
  sl.metadata,
  sl.created_at,
  sl.updated_at,
  u.name as owner_name,
  u.email as owner_email,
  TRUE as is_shared,
  ls.can_edit
FROM saved_locations sl
JOIN location_shares ls ON sl.id = ls.saved_location_id
JOIN users u ON sl.user_id = u.id
WHERE ls.shared_with_user_id IS NOT NULL;
