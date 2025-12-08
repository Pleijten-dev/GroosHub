-- ================================================
-- Migration 007: Fix llm_usage Foreign Key
-- Description: Update llm_usage table to reference chat_conversations
-- Date: 2025-12-05
-- ================================================

BEGIN;

-- Check if llm_usage table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'llm_usage'
  ) THEN

    -- Drop existing foreign key constraint
    ALTER TABLE llm_usage
    DROP CONSTRAINT IF EXISTS llm_usage_chat_id_fkey;

    -- Add new foreign key pointing to chat_conversations
    ALTER TABLE llm_usage
    ADD CONSTRAINT llm_usage_chat_id_fkey
    FOREIGN KEY (chat_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;

    RAISE NOTICE 'Foreign key constraint updated successfully';

  ELSE
    RAISE NOTICE 'llm_usage table does not exist, skipping migration';
  END IF;
END $$;

COMMIT;

-- Verification
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'llm_usage'
  AND kcu.column_name = 'chat_id';
