-- ================================================
-- Rollback 010: Revert LCA Projects Migration
-- Description: Remove migrated projects from project_projects
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete project members for migrated projects
DELETE FROM project_members
WHERE project_id IN (
  SELECT id FROM project_projects
  WHERE metadata->>'migrated_from' = 'lca_projects'
);

-- Delete migrated projects
DELETE FROM project_projects
WHERE metadata->>'migrated_from' = 'lca_projects';

COMMIT;

-- Verification
SELECT
  'project_projects (from lca)' as table_name,
  COUNT(*) as row_count
FROM project_projects
WHERE metadata->>'migrated_from' = 'lca_projects';
