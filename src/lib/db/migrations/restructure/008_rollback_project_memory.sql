-- ================================================
-- Rollback 008: Drop Project Memory Table
-- Description: Rollback for migration 008
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS project_memory_updated_at ON project_memory;

-- Drop table
DROP TABLE IF EXISTS project_memory CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_memory') as table_dropped;
