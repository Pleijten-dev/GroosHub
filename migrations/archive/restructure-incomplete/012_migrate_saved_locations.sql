-- ================================================
-- Migration 012: Migrate Saved Locations to Snapshots
-- Description: Convert saved_locations to location_snapshots
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Get GROOSMAN organization ID
DO $$
DECLARE
  groosman_org_id UUID;
BEGIN
  -- Get GROOSMAN org ID
  SELECT id INTO groosman_org_id
  FROM org_organizations
  WHERE slug = 'groosman';

  -- Create a project for each saved location (if not already part of a project)
  -- This ensures all locations have a project_id
  INSERT INTO project_projects (
    org_id,
    name,
    description,
    settings,
    metadata,
    status,
    created_at,
    updated_at,
    last_accessed_at
  )
  SELECT DISTINCT
    groosman_org_id,
    'Location: ' || sl.name as name,
    'Auto-generated project for saved location' as description,
    '{}'::jsonb as settings,
    jsonb_build_object(
      'migrated_from', 'saved_locations',
      'original_location_id', sl.id,
      'auto_created', true
    ) as metadata,
    'active' as status,
    sl.created_at,
    sl.created_at as updated_at,
    sl.created_at as last_accessed_at
  FROM saved_locations sl
  WHERE NOT EXISTS (
    SELECT 1 FROM project_projects pp
    WHERE pp.metadata->>'original_location_id' = sl.id::text
  );

  -- Create project members for each auto-generated project
  INSERT INTO project_members (
    project_id,
    user_id,
    role,
    permissions,
    joined_at
  )
  SELECT
    pp.id as project_id,
    sl.user_id,
    'creator' as role,
    jsonb_build_object(
      'can_edit', true,
      'can_delete', true,
      'can_manage_members', true,
      'can_manage_files', true,
      'can_view_analytics', true
    ) as permissions,
    sl.created_at as joined_at
  FROM saved_locations sl
  JOIN project_projects pp ON pp.metadata->>'original_location_id' = sl.id::text
  WHERE NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = pp.id AND pm.user_id = sl.user_id
  );

  -- Migrate saved_locations to location_snapshots
  -- Extract data from JSONB structure
  INSERT INTO location_snapshots (
    project_id,
    user_id,
    address,
    latitude,
    longitude,
    neighborhood_code,
    district_code,
    municipality_code,
    snapshot_date,
    version_number,
    is_active,
    demographics_data,
    health_data,
    safety_data,
    livability_data,
    amenities_data,
    housing_data,
    overall_score,
    category_scores,
    data_sources,
    notes,
    tags,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    pp.id as project_id,
    sl.user_id,
    sl.address,
    -- Extract lat/lng from coordinates JSONB
    (sl.coordinates->>'lat')::DECIMAL(10, 8) as latitude,
    (sl.coordinates->>'lng')::DECIMAL(11, 8) as longitude,
    -- Extract geographic codes from location_data if available
    sl.location_data->'neighborhood'->>'code' as neighborhood_code,
    sl.location_data->'district'->>'code' as district_code,
    sl.location_data->'municipality'->>'code' as municipality_code,
    sl.created_at::date as snapshot_date,
    1 as version_number,
    true as is_active,
    -- Extract data categories from location_data
    COALESCE(sl.location_data->'demographics', '{}'::jsonb) as demographics_data,
    COALESCE(sl.location_data->'health', '{}'::jsonb) as health_data,
    COALESCE(sl.location_data->'safety', '{}'::jsonb) as safety_data,
    COALESCE(sl.location_data->'livability', '{}'::jsonb) as livability_data,
    COALESCE(sl.location_data->'amenities', '{}'::jsonb) as amenities_data,
    COALESCE(sl.location_data->'housing', '{}'::jsonb) as housing_data,
    -- Extract scores if available
    (sl.location_data->'scores'->>'overall')::DECIMAL(5, 2) as overall_score,
    COALESCE(sl.location_data->'scores'->'categories', '{}'::jsonb) as category_scores,
    COALESCE(sl.location_data->'metadata'->'sources', '{}'::jsonb) as data_sources,
    NULL as notes,  -- Original table doesn't have notes field
    NULL as tags,   -- Original table doesn't have tags field
    jsonb_build_object(
      'migrated_from', 'saved_locations',
      'original_id', sl.id,
      'original_name', sl.name,
      'selected_pve', sl.selected_pve,
      'selected_personas', sl.selected_personas,
      'has_llm_rapport', (sl.llm_rapport IS NOT NULL),
      'migration_date', CURRENT_TIMESTAMP
    ) as metadata,
    sl.created_at,
    COALESCE(sl.updated_at, sl.created_at) as updated_at
  FROM saved_locations sl
  JOIN project_projects pp ON pp.metadata->>'original_location_id' = sl.id::text
  WHERE NOT EXISTS (
    SELECT 1 FROM location_snapshots ls
    WHERE ls.metadata->>'original_id' = sl.id::text
  );

  RAISE NOTICE 'Migrated % saved_locations to location_snapshots', (SELECT COUNT(*) FROM location_snapshots WHERE metadata->>'migrated_from' = 'saved_locations');
END $$;

COMMIT;

-- Verification
SELECT
  'saved_locations' as old_table,
  COUNT(*) as old_count
FROM saved_locations
UNION ALL
SELECT
  'location_snapshots' as new_table,
  COUNT(*) as new_count
FROM location_snapshots
WHERE metadata->>'migrated_from' = 'saved_locations';
