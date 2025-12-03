-- ================================================
-- Migration 008: Create Project Memory System
-- Description: Contextual memory for AI agents
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create project_memory table
CREATE TABLE IF NOT EXISTS project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage (required)
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Memory Entry Details
  memory_type VARCHAR(50) NOT NULL, -- 'fact', 'preference', 'decision', 'context', 'note'
  content TEXT NOT NULL,

  -- Source Information
  source_type VARCHAR(50), -- 'chat', 'file', 'location', 'lca', 'manual'
  source_id UUID, -- Reference to chat_id, file_id, snapshot_id, etc.

  -- Importance and Relevance
  importance_score DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0
  relevance_score DECIMAL(3, 2) DEFAULT 1.0,  -- 0.0 to 1.0
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,

  -- Vector Embedding (for semantic search)
  embedding vector(1536), -- OpenAI embedding dimension

  -- Categorization
  category VARCHAR(100),
  tags TEXT[],

  -- Temporal Information
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP, -- NULL = always valid
  is_active BOOLEAN DEFAULT true,

  -- User Association
  created_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  updated_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_memory_project ON project_memory(project_id);
CREATE INDEX idx_memory_type ON project_memory(memory_type);
CREATE INDEX idx_memory_active ON project_memory(is_active) WHERE is_active = true;
CREATE INDEX idx_memory_importance ON project_memory(importance_score DESC);
CREATE INDEX idx_memory_created ON project_memory(created_at DESC);
CREATE INDEX idx_memory_accessed ON project_memory(last_accessed_at DESC);
CREATE INDEX idx_memory_category ON project_memory(category);
CREATE INDEX idx_memory_valid ON project_memory(valid_from, valid_until);

-- Create embedding index for vector similarity search (if pgvector extension is available)
-- Uncomment if pgvector is installed:
-- CREATE INDEX idx_memory_embedding ON project_memory USING ivfflat (embedding vector_cosine_ops);

-- Add updated_at trigger
CREATE TRIGGER project_memory_updated_at
  BEFORE UPDATE ON project_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'project_memory' as table_name,
  COUNT(*) as row_count
FROM project_memory;
