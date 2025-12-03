-- ================================================
-- Migration 006: Create Location Snapshots Table
-- Description: Versioned location data storage
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create location_snapshots table (replaces 'saved_locations')
CREATE TABLE IF NOT EXISTS location_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage (required)
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Owner
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Location Details
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Geographic Identifiers
  neighborhood_code VARCHAR(20),
  district_code VARCHAR(20),
  municipality_code VARCHAR(20),

  -- Versioning
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Location Data (JSON structure)
  demographics_data JSONB DEFAULT '{}'::jsonb,
  health_data JSONB DEFAULT '{}'::jsonb,
  safety_data JSONB DEFAULT '{}'::jsonb,
  livability_data JSONB DEFAULT '{}'::jsonb,
  amenities_data JSONB DEFAULT '{}'::jsonb,
  housing_data JSONB DEFAULT '{}'::jsonb,

  -- Scoring Results
  overall_score DECIMAL(5, 2),
  category_scores JSONB DEFAULT '{}'::jsonb,

  -- Data Sources
  data_sources JSONB DEFAULT '{}'::jsonb,
  api_versions JSONB DEFAULT '{}'::jsonb,

  -- Notes
  notes TEXT,
  tags TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure only one active snapshot per project
  UNIQUE (project_id, is_active) WHERE is_active = true
);

-- Create indexes
CREATE INDEX idx_location_project ON location_snapshots(project_id);
CREATE INDEX idx_location_user ON location_snapshots(user_id);
CREATE INDEX idx_location_active ON location_snapshots(is_active) WHERE is_active = true;
CREATE INDEX idx_location_snapshot_date ON location_snapshots(snapshot_date DESC);
CREATE INDEX idx_location_version ON location_snapshots(project_id, version_number DESC);
CREATE INDEX idx_location_coords ON location_snapshots(latitude, longitude);

-- Add updated_at trigger
CREATE TRIGGER location_snapshots_updated_at
  BEFORE UPDATE ON location_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'location_snapshots' as table_name,
  COUNT(*) as row_count
FROM location_snapshots;
