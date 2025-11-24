-- Add versioning and completion tracking to saved locations
-- Handles partial states and future schema changes

-- Add new columns for version tracking and completion status
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS data_version VARCHAR(20) DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) DEFAULT 'location_only';

-- Completion status can be:
-- 'location_only' - Just location data
-- 'with_personas' - Location + personas selected
-- 'with_pve' - Location + PVE completed
-- 'with_personas_pve' - Location + personas + PVE
-- 'complete' - All data including rapport

-- Create index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_saved_locations_completion ON saved_locations(completion_status);

-- Create index for version tracking
CREATE INDEX IF NOT EXISTS idx_saved_locations_version ON saved_locations(data_version);

-- Function to automatically update completion status based on available data
CREATE OR REPLACE FUNCTION update_completion_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine completion status based on what data is present
  IF NEW.llm_rapport IS NOT NULL THEN
    NEW.completion_status := 'complete';
  ELSIF NEW.selected_personas IS NOT NULL AND NEW.selected_pve IS NOT NULL THEN
    NEW.completion_status := 'with_personas_pve';
  ELSIF NEW.selected_pve IS NOT NULL THEN
    NEW.completion_status := 'with_pve';
  ELSIF NEW.selected_personas IS NOT NULL THEN
    NEW.completion_status := 'with_personas';
  ELSE
    NEW.completion_status := 'location_only';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update completion status
CREATE TRIGGER trigger_update_completion_status
  BEFORE INSERT OR UPDATE ON saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_completion_status();

-- Add metadata JSONB column for storing version-specific info and migration tracking
ALTER TABLE saved_locations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Example metadata structure:
-- {
--   "migrated_from": "1.0.0",
--   "migration_date": "2024-01-15T10:30:00Z",
--   "warnings": ["old_field_removed", "new_field_added"],
--   "custom_fields": {}
-- }

-- View for analytics on saved locations
CREATE OR REPLACE VIEW saved_locations_stats AS
SELECT
  data_version,
  completion_status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_session_duration_seconds,
  COUNT(CASE WHEN llm_rapport IS NOT NULL THEN 1 END) as with_rapport_count,
  COUNT(CASE WHEN selected_personas IS NOT NULL THEN 1 END) as with_personas_count,
  COUNT(CASE WHEN selected_pve IS NOT NULL THEN 1 END) as with_pve_count
FROM saved_locations
GROUP BY data_version, completion_status
ORDER BY data_version DESC, completion_status;

-- Add comment explaining the versioning strategy
COMMENT ON COLUMN saved_locations.data_version IS
'Semantic version (major.minor.patch) of the data structure. Used for backwards compatibility and migrations.';

COMMENT ON COLUMN saved_locations.completion_status IS
'Tracks workflow completion: location_only, with_personas, with_pve, with_personas_pve, or complete.';

COMMENT ON COLUMN saved_locations.metadata IS
'Flexible JSONB field for version-specific data, migration tracking, and custom fields.';
