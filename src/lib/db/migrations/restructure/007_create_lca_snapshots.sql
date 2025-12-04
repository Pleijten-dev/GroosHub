-- ================================================
-- Migration 007: Create LCA Snapshots Table
-- Description: Versioned LCA data storage
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create lca_snapshots table
CREATE TABLE IF NOT EXISTS lca_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage (required)
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Owner
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- LCA Project Details
  project_name VARCHAR(500) NOT NULL,
  project_description TEXT,

  -- Versioning
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- LCA Configuration
  functional_unit VARCHAR(255),
  system_boundary TEXT,
  allocation_method VARCHAR(100),

  -- LCA Data (replaces old lca_* tables)
  processes JSONB DEFAULT '[]'::jsonb,           -- From lca_processes
  flows JSONB DEFAULT '[]'::jsonb,               -- From lca_flows
  impact_categories JSONB DEFAULT '[]'::jsonb,   -- From lca_impact_categories
  results JSONB DEFAULT '{}'::jsonb,             -- From lca_results
  parameters JSONB DEFAULT '{}'::jsonb,          -- From lca_parameters
  comparisons JSONB DEFAULT '[]'::jsonb,         -- From lca_comparisons

  -- Calculation Status
  calculation_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'calculating', 'completed', 'failed'
  calculation_error TEXT,
  last_calculated_at TIMESTAMP,

  -- Data Sources
  database_source VARCHAR(100), -- 'ecoinvent', 'agribalyse', 'custom', etc.
  database_version VARCHAR(50),

  -- Notes and Tags
  notes TEXT,
  tags TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one active snapshot per project (partial unique index)
CREATE UNIQUE INDEX idx_lca_snapshots_active_project
ON lca_snapshots(project_id, is_active)
WHERE is_active = true;

-- Create indexes
CREATE INDEX idx_lca_project ON lca_snapshots(project_id);
CREATE INDEX idx_lca_user ON lca_snapshots(user_id);
CREATE INDEX idx_lca_active ON lca_snapshots(is_active) WHERE is_active = true;
CREATE INDEX idx_lca_snapshot_date ON lca_snapshots(snapshot_date DESC);
CREATE INDEX idx_lca_version ON lca_snapshots(project_id, version_number DESC);
CREATE INDEX idx_lca_status ON lca_snapshots(calculation_status);

-- Add updated_at trigger
CREATE TRIGGER lca_snapshots_updated_at
  BEFORE UPDATE ON lca_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'lca_snapshots' as table_name,
  COUNT(*) as row_count
FROM lca_snapshots;
