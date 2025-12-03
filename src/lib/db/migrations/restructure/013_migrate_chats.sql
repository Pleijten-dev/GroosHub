-- ================================================
-- Migration 013: Migrate Chats to New Structure
-- Description: Migrate chats and chats_messages to new tables
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate 'chats' to 'chat_conversations'
INSERT INTO chat_conversations (
  id,
  user_id,
  project_id,
  title,
  model_id,
  model_settings,
  metadata,
  created_at,
  updated_at,
  last_message_at
)
SELECT
  c.id,
  c.user_id,
  NULL as project_id, -- All existing chats are private (no project)
  c.title,
  c.model,
  COALESCE(c.model_settings, '{}'::jsonb),
  jsonb_build_object(
    'migrated_from', 'chats',
    'original_id', c.id
  ) as metadata,
  c.created_at,
  c.created_at as updated_at,
  COALESCE(
    (SELECT MAX(created_at) FROM chats_messages WHERE chat_id = c.id),
    c.created_at
  ) as last_message_at
FROM chats c
WHERE NOT EXISTS (
  SELECT 1 FROM chat_conversations cc WHERE cc.id = c.id
);

-- Migrate 'chats_messages' to 'chat_messages'
INSERT INTO chat_messages (
  id,
  chat_id,
  role,
  content,
  content_json,
  content_encrypted,
  model_id,
  input_tokens,
  output_tokens,
  metadata,
  created_at
)
SELECT
  cm.id,
  cm.chat_id,
  cm.role,
  cm.content,
  COALESCE(cm.content_json, NULL),
  COALESCE(cm.content_encrypted, false),
  cm.model,
  cm.input_tokens,
  cm.output_tokens,
  jsonb_build_object(
    'migrated_from', 'chats_messages',
    'original_id', cm.id
  ) as metadata,
  cm.created_at
FROM chats_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM chat_messages msg WHERE msg.id = cm.id
);

-- Migrate 'chats_messages_votes' to 'chat_message_votes'
INSERT INTO chat_message_votes (
  message_id,
  user_id,
  is_upvoted,
  feedback,
  created_at,
  updated_at
)
SELECT
  cmv.message_id,
  cmv.user_id,
  cmv.is_upvoted,
  cmv.feedback,
  cmv.created_at,
  cmv.created_at as updated_at
FROM chats_messages_votes cmv
WHERE NOT EXISTS (
  SELECT 1 FROM chat_message_votes v
  WHERE v.message_id = cmv.message_id AND v.user_id = cmv.user_id
);

-- Verification
SELECT
  'chats -> chat_conversations' as migration,
  (SELECT COUNT(*) FROM chats) as old_count,
  (SELECT COUNT(*) FROM chat_conversations WHERE metadata->>'migrated_from' = 'chats') as new_count
UNION ALL
SELECT
  'chats_messages -> chat_messages' as migration,
  (SELECT COUNT(*) FROM chats_messages) as old_count,
  (SELECT COUNT(*) FROM chat_messages WHERE metadata->>'migrated_from' = 'chats_messages') as new_count
UNION ALL
SELECT
  'chats_messages_votes -> chat_message_votes' as migration,
  (SELECT COUNT(*) FROM chats_messages_votes) as old_count,
  (SELECT COUNT(*) FROM chat_message_votes) as new_count;

COMMIT;
