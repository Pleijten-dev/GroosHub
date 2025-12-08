-- ================================================
-- Rollback 015: Remove Encryption Support from Chat Messages
-- Description: Removes content_encrypted column
-- Date: 2025-12-04
-- ================================================

BEGIN;

-- Drop index
DROP INDEX IF EXISTS idx_chat_messages_encrypted;

-- Remove content_encrypted column
ALTER TABLE chat_messages 
DROP COLUMN IF EXISTS content_encrypted;

COMMIT;

-- Verification
SELECT 
  COUNT(*) as content_encrypted_column_exists
FROM information_schema.columns
WHERE table_name = 'chat_messages'
AND column_name = 'content_encrypted';
