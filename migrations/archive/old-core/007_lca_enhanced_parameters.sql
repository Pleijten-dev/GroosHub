-- LCA Enhanced Parameters Migration
-- Adds new fields to lca_projects table for improved calculation accuracy

-- Add new fields to lca_projects table
ALTER TABLE lca_projects
  -- Number of dwellings in the project
  ADD COLUMN IF NOT EXISTS dwelling_count INTEGER DEFAULT 1,

  -- Facade cladding type
  ADD COLUMN IF NOT EXISTS facade_cladding VARCHAR(100),

  -- Foundation type
  ADD COLUMN IF NOT EXISTS foundation VARCHAR(100),

  -- Roof type
  ADD COLUMN IF NOT EXISTS roof VARCHAR(100),

  -- Window frame material
  ADD COLUMN IF NOT EXISTS window_frames VARCHAR(100),

  -- Window to wall ratio (percentage)
  ADD COLUMN IF NOT EXISTS window_to_wall_ratio DECIMAL(5,2);

-- Update building_type to be nullable (no longer required in quick start)
ALTER TABLE lca_projects
  ALTER COLUMN building_type DROP NOT NULL;

-- Add check constraint for window_to_wall_ratio
ALTER TABLE lca_projects
  ADD CONSTRAINT check_window_to_wall_ratio
  CHECK (window_to_wall_ratio IS NULL OR (window_to_wall_ratio >= 0 AND window_to_wall_ratio <= 100));

-- Create index on new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_lca_projects_construction_params
  ON lca_projects(construction_system, facade_cladding, roof);

-- Add comments
COMMENT ON COLUMN lca_projects.dwelling_count IS 'Number of dwelling units in the project';
COMMENT ON COLUMN lca_projects.facade_cladding IS 'Type of facade cladding: hout, vezelcement, metselwerk, metaal, stucwerk';
COMMENT ON COLUMN lca_projects.foundation IS 'Type of foundation: kruipruimte, betonplaat, souterrain';
COMMENT ON COLUMN lca_projects.roof IS 'Type of roof: plat_bitumen, hellend_dakpannen, hellend_metaal, groendak';
COMMENT ON COLUMN lca_projects.window_frames IS 'Window frame material: pvc, hout, aluminium';
COMMENT ON COLUMN lca_projects.window_to_wall_ratio IS 'Percentage of window area relative to wall area (0-100)';
