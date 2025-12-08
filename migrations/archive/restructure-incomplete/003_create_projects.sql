-- ================================================
-- Migration 003: Create Projects Tables
-- Description: Unified project system for all features
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create main projects table
CREATE TABLE IF NOT EXISTS project_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100),

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  is_template BOOLEAN DEFAULT false,

  -- Soft Delete
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_project_org ON project_projects(org_id);
CREATE INDEX idx_project_status ON project_projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_last_accessed ON project_projects(last_accessed_at DESC);
CREATE INDEX idx_project_deleted ON project_projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create project members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Role: 'creator', 'admin', 'member', 'viewer'
  role VARCHAR(50) NOT NULL DEFAULT 'member',

  -- Permissions
  permissions JSONB DEFAULT '{
    "can_edit": true,
    "can_delete": false,
    "can_manage_members": false,
    "can_manage_files": true,
    "can_view_analytics": true
  }'::jsonb,

  -- Metadata
  invited_by_user_id INTEGER REFERENCES user_accounts(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,

  -- Constraints
  UNIQUE (project_id, user_id)
);

-- Create indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_active ON project_members(left_at) WHERE left_at IS NULL;

-- Create project invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  invited_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  invited_user_id INTEGER REFERENCES user_accounts(id),

  -- Invitation Details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  message TEXT,

  -- Status: 'pending', 'accepted', 'declined', 'expired'
  status VARCHAR(50) DEFAULT 'pending',
  token_hash VARCHAR(255) UNIQUE NOT NULL,

  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_invitation_project ON project_invitations(project_id);
CREATE INDEX idx_invitation_email ON project_invitations(email);
CREATE INDEX idx_invitation_token ON project_invitations(token_hash);
CREATE INDEX idx_invitation_status ON project_invitations(status);

-- Add updated_at triggers
CREATE TRIGGER project_projects_updated_at
  BEFORE UPDATE ON project_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'project_projects' as table_name,
  COUNT(*) as row_count
FROM project_projects;
