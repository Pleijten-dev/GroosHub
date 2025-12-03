-- ================================================
-- Rollback 004: Drop Chat Tables
-- Description: Rollback for migration 004
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS chat_conversations_updated_at ON chat_conversations;
DROP TRIGGER IF EXISTS chat_message_votes_updated_at ON chat_message_votes;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS chat_message_votes CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;

COMMIT;

-- Verification
SELECT
  'Rollback Complete' as status,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversations') as table_dropped;
