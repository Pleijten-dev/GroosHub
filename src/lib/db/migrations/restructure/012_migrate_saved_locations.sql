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
    sl.latitude,
    sl.longitude,
    sl.neighborhood_code,
    sl.district_code,
    sl.municipality_code,
    COALESCE(sl.saved_date, sl.created_at::date) as snapshot_date,
    1 as version_number,
    true as is_active,
    COALESCE(sl.demographics_data, '{}'::jsonb),
    COALESCE(sl.health_data, '{}'::jsonb),
    COALESCE(sl.safety_data, '{}'::jsonb),
    COALESCE(sl.livability_data, '{}'::jsonb),
    COALESCE(sl.amenities_data, '{}'::jsonb),
    COALESCE(sl.housing_data, '{}'::jsonb),
    sl.overall_score,
    COALESCE(sl.category_scores, '{}'::jsonb),
    COALESCE(sl.data_sources, '{}'::jsonb),
    sl.notes,
    sl.tags,
    jsonb_build_object(
      'migrated_from', 'saved_locations',
      'original_id', sl.id,
      'original_name', sl.name,
      'migration_date', CURRENT_TIMESTAMP
    ) as metadata,
    sl.created_at,
    sl.updated_at
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
