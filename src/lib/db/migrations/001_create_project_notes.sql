-- Migration: Create project_notes table
-- Description: Database-backed storage for project notes (replacing localStorage)
-- Date: 2025-01-29

-- Project Notes Table
-- Stores notes associated with projects, accessible to project members
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_user_id ON project_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_created_at ON project_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_notes_pinned ON project_notes(project_id, is_pinned) WHERE deleted_at IS NULL;

-- Composite index for fetching project notes with soft delete filter
CREATE INDEX IF NOT EXISTS idx_project_notes_active ON project_notes(project_id, created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE project_notes IS 'User notes associated with projects, replacing localStorage storage';
COMMENT ON COLUMN project_notes.is_pinned IS 'Pinned notes appear at the top of the list';
COMMENT ON COLUMN project_notes.deleted_at IS 'Soft delete timestamp - null means active';
