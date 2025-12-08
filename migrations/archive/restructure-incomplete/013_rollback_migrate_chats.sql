-- ================================================
-- Rollback 013: Revert Chat Migration
-- Description: Remove migrated chats from new tables
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Delete migrated chat message votes
DELETE FROM chat_message_votes
WHERE message_id IN (
  SELECT id FROM chat_messages
  WHERE metadata->>'migrated_from' = 'chats_messages'
);

-- Delete migrated chat messages
DELETE FROM chat_messages
WHERE metadata->>'migrated_from' = 'chats_messages';

-- Delete migrated chat conversations
DELETE FROM chat_conversations
WHERE metadata->>'migrated_from' = 'chats';

COMMIT;

-- Verification
SELECT
  'chat_conversations' as table_name,
  COUNT(*) as migrated_count
FROM chat_conversations
WHERE metadata->>'migrated_from' = 'chats';
