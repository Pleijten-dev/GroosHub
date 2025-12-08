-- Migration: Fix file_uploads/chat_files foreign keys to reference restructured tables
-- Created: 2025-12-05
-- Purpose: Update file_uploads (new) and chat_files (old, if exists) to reference the new
--          chat_conversations and user_accounts tables instead of the old
--          chats and users tables (database restructuring Phase 7)

BEGIN;

-- Fix file_uploads table (new table from restructuring)
-- Step 1: Drop old constraints if they exist
ALTER TABLE file_uploads
  DROP CONSTRAINT IF EXISTS file_uploads_chat_id_fkey;

ALTER TABLE file_uploads
  DROP CONSTRAINT IF EXISTS file_uploads_user_id_fkey;

-- Step 2: Add new constraints referencing restructured tables
ALTER TABLE file_uploads
  ADD CONSTRAINT file_uploads_chat_id_fkey
  FOREIGN KEY (chat_id)
  REFERENCES chat_conversations(id)
  ON DELETE CASCADE;

ALTER TABLE file_uploads
  ADD CONSTRAINT file_uploads_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_accounts(id)
  ON DELETE CASCADE;

-- Fix chat_files table (old table, if it still exists)
-- Step 3: Check if old table exists and fix its constraints too
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_files') THEN
    -- Drop old constraints
    ALTER TABLE chat_files DROP CONSTRAINT IF EXISTS chat_files_chat_id_fkey;
    ALTER TABLE chat_files DROP CONSTRAINT IF EXISTS chat_files_user_id_fkey;

    -- Add new constraints
    ALTER TABLE chat_files
      ADD CONSTRAINT chat_files_chat_id_fkey
      FOREIGN KEY (chat_id)
      REFERENCES chat_conversations(id)
      ON DELETE CASCADE;

    ALTER TABLE chat_files
      ADD CONSTRAINT chat_files_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES user_accounts(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'Updated chat_files table constraints (legacy table)';
  END IF;
END $$;

-- Verification
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname IN ('file_uploads_chat_id_fkey', 'file_uploads_user_id_fkey',
                  'chat_files_chat_id_fkey', 'chat_files_user_id_fkey')
ORDER BY table_name, conname;

COMMIT;

-- Expected result:
-- constraint_name              | table_name    | referenced_table
-- -----------------------------|---------------|------------------
-- chat_files_chat_id_fkey      | chat_files    | chat_conversations (if table exists)
-- chat_files_user_id_fkey      | chat_files    | user_accounts (if table exists)
-- file_uploads_chat_id_fkey    | file_uploads  | chat_conversations
-- file_uploads_user_id_fkey    | file_uploads  | user_accounts
