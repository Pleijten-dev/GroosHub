-- ================================================
-- Migration 002: Create User Accounts Table
-- Description: Replaces 'users' with org_id support
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create user_accounts table (new version with org_id)
CREATE TABLE IF NOT EXISTS user_accounts (
  id SERIAL PRIMARY KEY,

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Profile
  name VARCHAR(255),
  avatar_url TEXT,

  -- Roles: 'owner', 'admin', 'user'
  role VARCHAR(50) NOT NULL DEFAULT 'user',

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_accounts_org ON user_accounts(org_id);
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_role ON user_accounts(role);
CREATE INDEX idx_user_accounts_active ON user_accounts(is_active);

-- Add updated_at trigger
CREATE TRIGGER user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'user_accounts' as table_name,
  COUNT(*) as row_count
FROM user_accounts;
