-- ================================================
-- Rollback 009: Revert User Migration
-- Description: Remove migrated users from user_accounts
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete all user_accounts entries
-- (This assumes you want to start fresh with the old 'users' table)
DELETE FROM user_accounts;

-- Reset sequence
ALTER SEQUENCE user_accounts_id_seq RESTART WITH 1;

COMMIT;

-- Verification
SELECT
  'user_accounts' as table_name,
  COUNT(*) as row_count
FROM user_accounts;
