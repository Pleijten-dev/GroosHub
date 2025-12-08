-- Chat Schema Migration
-- Adds tables for AI chatbot functionality

-- Drop existing chats table if it exists (and cascade to dependent objects)
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS chats_messages CASCADE;
DROP TABLE IF EXISTS chats_messages_votes CASCADE;

-- Chats Table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);

-- Messages Table
CREATE TABLE chats_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chats_messages_chat_id ON chats_messages(chat_id);
CREATE INDEX idx_chats_messages_created_at ON chats_messages(created_at);

-- Votes Table (for message feedback)
CREATE TABLE chats_messages_votes (
  message_id UUID PRIMARY KEY REFERENCES chats_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_upvoted BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_chat_timestamp
BEFORE UPDATE ON chats
FOR EACH ROW
EXECUTE FUNCTION update_chat_updated_at();

-- Comments for documentation
COMMENT ON TABLE chats IS 'Stores chat conversations';
COMMENT ON TABLE chats_messages IS 'Stores individual messages within chats';
COMMENT ON TABLE chats_messages_votes IS 'Stores user feedback on AI responses';

