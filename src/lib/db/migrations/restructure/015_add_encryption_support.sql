-- ================================================
-- Migration 015: Add Encryption Support to Chat Messages
-- Description: Adds content_encrypted flag to track encrypted messages
-- Date: 2025-12-04
-- ================================================

BEGIN;

-- Add content_encrypted column to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT false;

-- Create index for faster queries on encrypted messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_encrypted 
ON chat_messages(content_encrypted) 
WHERE content_encrypted = true;

-- Add comment to explain the column
COMMENT ON COLUMN chat_messages.content_encrypted IS 
'Flag indicating whether the content and content_json fields are encrypted using AES-256-GCM';

COMMIT;

-- Verification
SELECT 
  'chat_messages' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_messages'
AND column_name = 'content_encrypted';
