-- Migration 012: Add Chat Activity Tracking
-- Purpose: Track last activity and summary timestamps for automated summarization

-- Add activity tracking columns to chat_conversations
ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_summary_at TIMESTAMP;

-- Update existing rows to have last_activity_at set to their updated_at
UPDATE chat_conversations
SET last_activity_at = updated_at
WHERE last_activity_at IS NULL;

-- Create index for efficient querying of inactive chats
CREATE INDEX IF NOT EXISTS idx_chat_activity_tracking
ON chat_conversations(last_activity_at, last_summary_at)
WHERE deleted_at IS NULL;

-- Create index for finding chats needing summarization
CREATE INDEX IF NOT EXISTS idx_chat_needs_summary
ON chat_conversations(last_activity_at)
WHERE deleted_at IS NULL
AND (last_summary_at IS NULL OR last_activity_at > last_summary_at);

-- Add comment
COMMENT ON COLUMN chat_conversations.last_activity_at IS 'Timestamp of last message in this chat (updated on each new message)';
COMMENT ON COLUMN chat_conversations.last_summary_at IS 'Timestamp of last summary generation for this chat';
