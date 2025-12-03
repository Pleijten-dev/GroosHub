/**
 * Alter chat_files table for R2 Storage Integration
 *
 * This migration updates the existing chat_files table to support
 * Cloudflare R2 storage with proper user ownership and security.
 *
 * Changes:
 * - Add user_id column for ownership verification
 * - Add storage_key column for R2 file identification
 * - Add expires_at column for time-limited access
 * - Update file_type constraints
 * - Add file size validation constraints
 * - Create indexes for performance
 * - Keep existing columns for backwards compatibility
 */

-- Step 1: Add new columns
ALTER TABLE chat_files
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Step 2: Add foreign key constraint for user_id
ALTER TABLE chat_files
  ADD CONSTRAINT fk_chat_files_user_id
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Step 3: Add unique constraint on storage_key (R2 keys must be unique)
ALTER TABLE chat_files
  ADD CONSTRAINT uq_chat_files_storage_key
  UNIQUE (storage_key);

-- Step 4: Update file_type to use check constraint for valid types
-- First drop existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE chat_files DROP CONSTRAINT IF EXISTS valid_file_type;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint
ALTER TABLE chat_files
  ADD CONSTRAINT valid_file_type
  CHECK (file_type IN ('image', 'pdf'));

-- Step 5: Add file size validation constraints
-- First drop existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE chat_files DROP CONSTRAINT IF EXISTS valid_file_size;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint: images max 10MB (10485760 bytes), PDFs max 50MB (52428800 bytes)
ALTER TABLE chat_files
  ADD CONSTRAINT valid_file_size
  CHECK (
    (file_type = 'image' AND file_size > 0 AND file_size <= 10485760) OR
    (file_type = 'pdf' AND file_size > 0 AND file_size <= 52428800)
  );

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_files_user_id
  ON chat_files(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_files_chat_id
  ON chat_files(chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_files_message_id
  ON chat_files(message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_files_storage_key
  ON chat_files(storage_key);

CREATE INDEX IF NOT EXISTS idx_chat_files_created_at
  ON chat_files(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_files_expires_at
  ON chat_files(expires_at)
  WHERE expires_at IS NOT NULL;

-- Step 7: Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_chat_files_chat_user
  ON chat_files(chat_id, user_id);

-- Note: We're keeping the existing columns (file_url, status, error_message, metadata)
-- for backwards compatibility. These can be used alongside the new R2 fields.
