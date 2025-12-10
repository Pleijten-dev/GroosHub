-- ============================================
-- ADD IS_PINNED TO PROJECT_MEMBERS
-- ============================================
-- Adds per-user pin status for projects
-- Created: 2025-12-09
--
-- This migration:
-- 1. Adds is_pinned column to project_members table
-- 2. Adds index for efficient filtering
-- ============================================

-- Add is_pinned column to project_members
-- This is per-user, not per-project, so each user can pin projects independently
ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add index for pin queries
CREATE INDEX IF NOT EXISTS idx_project_members_user_pinned
  ON project_members(user_id, is_pinned)
  WHERE is_pinned = true;

COMMENT ON COLUMN project_members.is_pinned IS 'User-specific pin status for quick access to favorite projects';
