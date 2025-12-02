-- Migration: Create chat_files table for multimodal input support
-- Created: 2025-12-02
-- Purpose: Store metadata for uploaded files (images, PDFs) in chat conversations

-- Create chat_files table
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID, -- Can be NULL for chat-level files (not yet sent in a message)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Storage information
  storage_key TEXT NOT NULL UNIQUE, -- R2 storage key (full path)
  file_name TEXT NOT NULL,          -- Original filename
  file_type TEXT NOT NULL,           -- 'image' or 'pdf'
  mime_type TEXT NOT NULL,           -- Full MIME type (e.g., 'image/png', 'application/pdf')
  file_size INTEGER NOT NULL,        -- Size in bytes

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,              -- Optional: for auto-cleanup of temporary files

  -- Constraints
  CONSTRAINT valid_file_type CHECK (file_type IN ('image', 'pdf')),
  CONSTRAINT valid_file_size CHECK (
    (file_type = 'image' AND file_size > 0 AND file_size <= 10485760) OR  -- 10MB max for images
    (file_type = 'pdf' AND file_size > 0 AND file_size <= 52428800)       -- 50MB max for PDFs
  ),
  CONSTRAINT valid_mime_type CHECK (
    mime_type IN (
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',  -- Images
      'application/pdf'                                        -- PDFs
    )
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_message_id ON chat_files(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_files_user_id ON chat_files(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_created_at ON chat_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_files_expires_at ON chat_files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_files_storage_key ON chat_files(storage_key);

-- Comments for documentation
COMMENT ON TABLE chat_files IS 'Stores metadata for files uploaded in chat conversations (images, PDFs)';
COMMENT ON COLUMN chat_files.storage_key IS 'Full R2 storage path: {env}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}';
COMMENT ON COLUMN chat_files.message_id IS 'NULL if file is uploaded but not yet sent in a message';
COMMENT ON COLUMN chat_files.expires_at IS 'Optional expiration for temporary uploads (e.g., abandoned uploads after 24 hours)';
