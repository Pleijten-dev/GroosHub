-- ================================================
-- Migration 009: Migrate Users to User Accounts
-- Description: Migrate existing users table to user_accounts with org_id
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

  -- Migrate users from 'users' table to 'user_accounts'
  INSERT INTO user_accounts (
    id,
    org_id,
    email,
    password,
    name,
    avatar_url,
    role,
    is_active,
    email_verified_at,
    last_login_at,
    created_at,
    updated_at
  )
  SELECT
    id,
    groosman_org_id,
    email,
    password,
    name,
    image as avatar_url,
    role,
    true as is_active,
    email_verified as email_verified_at,
    NULL as last_login_at,
    created_at,
    created_at as updated_at
  FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM user_accounts WHERE user_accounts.id = users.id
  );

  -- Update sequence to continue from max id
  PERFORM setval('user_accounts_id_seq', (SELECT MAX(id) FROM user_accounts));

  RAISE NOTICE 'Migrated % users to user_accounts', (SELECT COUNT(*) FROM user_accounts);
END $$;

COMMIT;

-- Verification
SELECT
  'users' as old_table,
  COUNT(*) as old_count
FROM users
UNION ALL
SELECT
  'user_accounts' as new_table,
  COUNT(*) as new_count
FROM user_accounts;
