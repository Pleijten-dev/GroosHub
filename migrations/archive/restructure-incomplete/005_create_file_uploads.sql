-- ================================================
-- Migration 005: Create File Uploads Table
-- Description: Unified file management system
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create file_uploads table (replaces 'chat_files')
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Optional Project Linkage (NULL = private file)
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Optional Chat Linkage
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- File Details
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,

  -- File Type Classification
  file_category VARCHAR(50), -- 'document', 'image', 'spreadsheet', 'pdf', 'other'

  -- Storage Info
  storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'gcs', etc.
  storage_url TEXT,

  -- Access Control
  is_public BOOLEAN DEFAULT false,
  access_level VARCHAR(50) DEFAULT 'private', -- 'private', 'project', 'public'

  -- Processing Status
  processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_error TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Soft Delete
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_file_user ON file_uploads(user_id);
CREATE INDEX idx_file_project ON file_uploads(project_id);
CREATE INDEX idx_file_chat ON file_uploads(chat_id);
CREATE INDEX idx_file_category ON file_uploads(file_category);
CREATE INDEX idx_file_created ON file_uploads(created_at DESC);
CREATE INDEX idx_file_deleted ON file_uploads(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER file_uploads_updated_at
  BEFORE UPDATE ON file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'file_uploads' as table_name,
  COUNT(*) as row_count
FROM file_uploads;
