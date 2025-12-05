-- Migration: Fix chat_files foreign key to reference chat_conversations
-- Created: 2025-12-05
-- Purpose: Update chat_files to reference the new chat_conversations table
--          instead of the old chats table (database restructuring)

BEGIN;

-- Step 1: Drop the old foreign key constraint
ALTER TABLE chat_files
  DROP CONSTRAINT IF EXISTS chat_files_chat_id_fkey;

-- Step 2: Add new foreign key constraint referencing chat_conversations
ALTER TABLE chat_files
  ADD CONSTRAINT chat_files_chat_id_fkey
  FOREIGN KEY (chat_id)
  REFERENCES chat_conversations(id)
  ON DELETE CASCADE;

-- Step 3: Drop the old user_id foreign key constraint
ALTER TABLE chat_files
  DROP CONSTRAINT IF EXISTS chat_files_user_id_fkey;

-- Step 4: Add new user_id foreign key constraint referencing user_accounts
ALTER TABLE chat_files
  ADD CONSTRAINT chat_files_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_accounts(id)
  ON DELETE CASCADE;

-- Verification
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname IN ('chat_files_chat_id_fkey', 'chat_files_user_id_fkey')
ORDER BY conname;

COMMIT;

-- Expected result:
-- constraint_name           | table_name | referenced_table
-- --------------------------|------------|------------------
-- chat_files_chat_id_fkey   | chat_files | chat_conversations
-- chat_files_user_id_fkey   | chat_files | user_accounts
