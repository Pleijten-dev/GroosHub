-- ================================================
-- Migration 004: Create Chat Tables
-- Description: Renamed and updated chat tables
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create chat_conversations table (replaces 'chats')
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Project Linkage (NULL = private/personal chat)
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Chat Details
  title VARCHAR(500),

  -- Model Configuration
  model_id VARCHAR(100),
  model_settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_chat_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_project ON chat_conversations(project_id);
CREATE INDEX idx_chat_last_message ON chat_conversations(last_message_at DESC);

-- Create chat_messages table (replaces 'chats_messages')
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Message Content
  role VARCHAR(50) NOT NULL,
  content TEXT,
  content_json JSONB,
  content_encrypted BOOLEAN DEFAULT false,

  -- Model Info
  model_id VARCHAR(100),

  -- Token Usage
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_message_chat ON chat_messages(chat_id);
CREATE INDEX idx_message_role ON chat_messages(role);
CREATE INDEX idx_message_created ON chat_messages(created_at DESC);

-- Create chat_message_votes table (replaces 'chats_messages_votes')
CREATE TABLE IF NOT EXISTS chat_message_votes (
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Vote
  is_upvoted BOOLEAN NOT NULL,
  feedback TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (message_id, user_id)
);

-- Add updated_at triggers
CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER chat_message_votes_updated_at
  BEFORE UPDATE ON chat_message_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'chat_conversations' as table_name,
  COUNT(*) as row_count
FROM chat_conversations;
