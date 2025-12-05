-- ================================================
-- Migration 016: Create Audit Logs Table
-- Description: System-wide audit logging for security and compliance
-- Date: 2025-12-04
-- ================================================

BEGIN;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  user_id INTEGER REFERENCES user_accounts(id) ON DELETE SET NULL,
  org_id UUID, -- Organization context (nullable, no FK since organizations table may not exist yet)

  -- What action was performed
  action VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'login', 'logout', etc.
  entity_type VARCHAR(100) NOT NULL, -- 'project', 'chat', 'file', 'user', 'organization', etc.
  entity_id VARCHAR(255), -- ID of the affected entity

  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10), -- 'GET', 'POST', 'PUT', 'DELETE', etc.
  request_path TEXT,

  -- Response metadata
  status_code INTEGER,
  error_message TEXT,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address);

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_audit_metadata ON audit_logs USING GIN (metadata);

COMMIT;

-- Verification
SELECT
  'audit_logs' as table_name,
  COUNT(*) as row_count
FROM audit_logs;
