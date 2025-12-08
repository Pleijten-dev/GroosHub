-- ================================================
-- Rollback 003: Drop Projects Tables
-- Description: Rollback for migration 003
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS project_projects_updated_at ON project_projects;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS project_invitations CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS project_projects CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_projects') as table_dropped;
