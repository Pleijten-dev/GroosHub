-- ================================================
-- Migration 001: Create Organizations Table
-- Description: Top-level tenant entity for multi-org support
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create organizations table
CREATE TABLE IF NOT EXISTS org_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,

  -- Limits & Billing
  plan_tier VARCHAR(50) DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_org_slug ON org_organizations(slug);
CREATE INDEX idx_org_active ON org_organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_deleted ON org_organizations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_organizations_updated_at
  BEFORE UPDATE ON org_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default GROOSMAN organization
INSERT INTO org_organizations (name, slug, plan_tier, max_users, max_projects, max_storage_gb)
VALUES ('GROOSMAN', 'groosman', 'professional', 100, 50, 100)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verification
SELECT
  'org_organizations' as table_name,
  COUNT(*) as row_count,
  (SELECT id FROM org_organizations WHERE slug = 'groosman') as groosman_id
FROM org_organizations;
