-- ================================================
-- Rollback 002: Drop User Accounts Table
-- Description: Rollback for migration 002
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS user_accounts_updated_at ON user_accounts;

-- Drop table
DROP TABLE IF EXISTS user_accounts CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_accounts'
  ) as table_dropped;
