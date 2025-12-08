-- ================================================
-- Rollback 001: Drop Organizations Table
-- Description: Rollback for migration 001
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS org_organizations_updated_at ON org_organizations;

-- Drop table (CASCADE will drop all dependent objects)
DROP TABLE IF EXISTS org_organizations CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'org_organizations'
  ) as table_dropped;
