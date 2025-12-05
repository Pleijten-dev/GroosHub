-- ================================================
-- Migration 008: Create Project Memory System
-- Description: Contextual memory for AI agents (consolidated format)
-- Date: 2025-12-03
-- Updated: 2025-12-04 - Changed to consolidated memory format
-- ================================================

BEGIN;

-- Create project_memories table (consolidated memory per project)
CREATE TABLE IF NOT EXISTS project_memories (
  -- Primary key is project_id (one memory record per project)
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Consolidated Memory Content
  memory_content TEXT NOT NULL,

  -- Project Summary
  project_summary TEXT,

  -- Structured Data
  key_decisions JSONB DEFAULT '[]'::jsonb, -- Array of decision objects
  preferences JSONB DEFAULT '{}'::jsonb,    -- Project/team preferences
  patterns JSONB DEFAULT '{}'::jsonb,       -- Recurring patterns
  context JSONB DEFAULT '{}'::jsonb,        -- Additional context

  -- Update Tracking
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,

  -- Token Management
  token_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_memory_updates table (audit trail)
CREATE TABLE IF NOT EXISTS project_memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Reference
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Change Details
  previous_content TEXT,
  new_content TEXT,
  change_summary TEXT,
  change_type VARCHAR(50), -- 'addition', 'modification', 'removal', 'consolidation'

  -- Trigger Information
  trigger_source VARCHAR(50), -- 'chat', 'note', 'task', 'file_upload', 'manual'
  trigger_id UUID, -- ID of chat, note, etc.
  triggered_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memory_project ON project_memory_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_created ON project_memory_updates(created_at DESC);

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS project_memories_updated_at ON project_memories;
CREATE TRIGGER project_memories_updated_at
  BEFORE UPDATE ON project_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'project_memories' as table_name,
  COUNT(*) as row_count
FROM project_memories;
