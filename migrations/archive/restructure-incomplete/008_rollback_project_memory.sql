-- ================================================
-- Rollback 008: Drop Project Memory Tables
-- Description: Rollback for migration 008
-- Date: 2025-12-03
-- Updated: 2025-12-04
-- ================================================

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_memory_created;
DROP INDEX IF EXISTS idx_memory_project;

-- Drop trigger
DROP TRIGGER IF EXISTS project_memories_updated_at ON project_memories;

-- Drop tables (CASCADE will remove references)
DROP TABLE IF EXISTS project_memory_updates CASCADE;
DROP TABLE IF EXISTS project_memories CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_memories') as memories_dropped,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_memory_updates') as updates_dropped;
