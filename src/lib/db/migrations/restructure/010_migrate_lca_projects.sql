-- ================================================
-- Migration 010: Migrate LCA Projects to Projects
-- Description: Create projects from lca_projects
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

  -- Migrate lca_projects to project_projects
  INSERT INTO project_projects (
    id,
    org_id,
    name,
    description,
    project_number,
    settings,
    metadata,
    status,
    is_template,
    created_at,
    updated_at,
    last_accessed_at
  )
  SELECT
    id,
    groosman_org_id,
    name,
    description,
    NULL as project_number,
    jsonb_build_object(
      'lca_database', database_source,
      'lca_version', database_version,
      'functional_unit', functional_unit
    ) as settings,
    jsonb_build_object(
      'migrated_from', 'lca_projects',
      'original_id', id
    ) as metadata,
    CASE
      WHEN status = 'active' THEN 'active'
      WHEN status = 'archived' THEN 'archived'
      ELSE 'active'
    END as status,
    false as is_template,
    created_at,
    updated_at,
    COALESCE(updated_at, created_at) as last_accessed_at
  FROM lca_projects
  WHERE NOT EXISTS (
    SELECT 1 FROM project_projects WHERE project_projects.id = lca_projects.id
  );

  -- Create project members for each lca_project user
  INSERT INTO project_members (
    project_id,
    user_id,
    role,
    permissions,
    invited_by_user_id,
    joined_at
  )
  SELECT
    lp.id as project_id,
    lp.user_id,
    'creator' as role,
    jsonb_build_object(
      'can_edit', true,
      'can_delete', true,
      'can_manage_members', true,
      'can_manage_files', true,
      'can_view_analytics', true
    ) as permissions,
    NULL as invited_by_user_id,
    lp.created_at as joined_at
  FROM lca_projects lp
  WHERE NOT EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = lp.id AND pm.user_id = lp.user_id
  );

  RAISE NOTICE 'Migrated % lca_projects to project_projects', (SELECT COUNT(*) FROM project_projects WHERE metadata->>'migrated_from' = 'lca_projects');
END $$;

COMMIT;

-- Verification
SELECT
  'lca_projects' as old_table,
  COUNT(*) as old_count
FROM lca_projects
UNION ALL
SELECT
  'project_projects (from lca)' as new_table,
  COUNT(*) as new_count
FROM project_projects
WHERE metadata->>'migrated_from' = 'lca_projects';
