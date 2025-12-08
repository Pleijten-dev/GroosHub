-- Saved Locations Schema
-- Stores persistent location analysis data with user ownership and sharing capabilities

-- Main saved locations table
CREATE TABLE IF NOT EXISTS saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic location info (for list display & search)
  name VARCHAR(255),  -- Optional user-given name
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL,  -- { lat: number, lng: number }

  -- Complex data as JSONB
  location_data JSONB NOT NULL,      -- All aggregated data from all sources
  selected_pve JSONB,                -- PVE configuration
  selected_personas JSONB,           -- Array of selected personas
  llm_rapport JSONB,                 -- Generated rapport data

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate addresses per user
  CONSTRAINT unique_user_address UNIQUE(user_id, address)
);

-- Location sharing table
-- Allows users to share their saved locations with other users
CREATE TABLE IF NOT EXISTS location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_location_id UUID NOT NULL REFERENCES saved_locations(id) ON DELETE CASCADE,
  shared_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Permissions
  can_edit BOOLEAN DEFAULT FALSE,    -- Can the shared user edit the location

  -- Metadata
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate shares
  CONSTRAINT unique_share UNIQUE(saved_location_id, shared_with_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_created_at ON saved_locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_locations_address ON saved_locations(address);

-- GIN index for JSONB queries (if you need to search within location data)
CREATE INDEX IF NOT EXISTS idx_saved_locations_location_data ON saved_locations USING GIN (location_data);

-- Sharing indexes
CREATE INDEX IF NOT EXISTS idx_location_shares_location_id ON location_shares(saved_location_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_shared_with ON location_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_location_shares_shared_by ON location_shares(shared_by_user_id);

-- View for locations accessible by user (owned + shared with them)
CREATE OR REPLACE VIEW user_accessible_locations AS
SELECT
  sl.id,
  sl.user_id as owner_id,
  sl.name,
  sl.address,
  sl.coordinates,
  sl.location_data,
  sl.selected_pve,
  sl.selected_personas,
  sl.llm_rapport,
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
  sl.selected_pve,
  sl.selected_personas,
  sl.llm_rapport,
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on changes
CREATE TRIGGER trigger_update_saved_location_updated_at
  BEFORE UPDATE ON saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_location_updated_at();
