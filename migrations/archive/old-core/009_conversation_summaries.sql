-- ============================================
-- CONVERSATION SUMMARIES MIGRATION
-- ============================================
-- Adds conversation summarization for efficient context management
-- Works alongside user memory system (008_user_memories.sql)
-- Created: 2025-12-02
--
-- This migration:
-- 1. Creates chat_summaries table to store conversation summaries
-- 2. Adds indexes for performance
-- 3. Adds helper functions
-- ============================================

-- ============================================
-- 1. CHAT SUMMARIES TABLE
-- ============================================
-- Stores summaries of old messages to compress context window
CREATE TABLE IF NOT EXISTS chat_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,

  -- Summary content
  summary_text TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::jsonb,  -- Array of key discussion points

  -- Message range this summary covers
  message_range_start INTEGER NOT NULL,  -- Index of first message
  message_range_end INTEGER NOT NULL,    -- Index of last message
  message_count INTEGER GENERATED ALWAYS AS (message_range_end - message_range_start + 1) STORED,

  -- Metadata
  token_count INTEGER DEFAULT 0,  -- Approximate tokens in summary
  compression_ratio DECIMAL(5,2),  -- How much space saved (e.g., 0.20 = 80% reduction)

  -- Generation details
  model_used VARCHAR(100) DEFAULT 'claude-haiku',
  generation_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_summaries_chat_id ON chat_summaries(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_created ON chat_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_summaries_chat_range ON chat_summaries(chat_id, message_range_end DESC);

COMMENT ON TABLE chat_summaries IS 'Summaries of conversation chunks to compress context window';
COMMENT ON COLUMN chat_summaries.summary_text IS 'Concise summary of messages in this range';
COMMENT ON COLUMN chat_summaries.key_points IS 'Array of key discussion points from this chunk';
COMMENT ON COLUMN chat_summaries.compression_ratio IS 'Space saved ratio (0.0-1.0, lower is better)';

-- ============================================
-- 2. HELPER FUNCTIONS
-- ============================================

-- Function to get all summaries for a chat in chronological order
CREATE OR REPLACE FUNCTION get_chat_summaries(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  summary_text TEXT,
  key_points JSONB,
  message_range_start INTEGER,
  message_range_end INTEGER,
  message_count INTEGER,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.summary_text,
    cs.key_points,
    cs.message_range_start,
    cs.message_range_end,
    cs.message_count,
    cs.created_at
  FROM chat_summaries cs
  WHERE cs.chat_id = p_chat_id
  ORDER BY cs.message_range_start ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_chat_summaries IS 'Get all summaries for a chat in chronological order';

-- Function to get latest summary for a chat
CREATE OR REPLACE FUNCTION get_latest_chat_summary(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  summary_text TEXT,
  key_points JSONB,
  message_range_end INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.summary_text,
    cs.key_points,
    cs.message_range_end
  FROM chat_summaries cs
  WHERE cs.chat_id = p_chat_id
  ORDER BY cs.message_range_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_chat_summary IS 'Get most recent summary for a chat';

-- ============================================
-- 3. VIEWS FOR ANALYTICS
-- ============================================

-- View: Chat compression statistics
CREATE OR REPLACE VIEW chat_compression_stats AS
SELECT
  c.id as chat_id,
  c.title,
  c.user_id,
  COUNT(DISTINCT cs.id) as summary_count,
  COALESCE(SUM(cs.message_count), 0) as total_summarized_messages,
  COALESCE(AVG(cs.compression_ratio), 0) as avg_compression_ratio,
  COALESCE(SUM(cs.token_count), 0) as total_summary_tokens,
  MAX(cs.created_at) as last_summary_created
FROM chats c
LEFT JOIN chat_summaries cs ON c.id = cs.chat_id
GROUP BY c.id, c.title, c.user_id;

COMMENT ON VIEW chat_compression_stats IS 'Statistics about conversation compression per chat';

-- ============================================
-- 4. SAMPLE QUERIES FOR REFERENCE
-- ============================================

-- Query 1: Get all summaries for a chat
-- SELECT * FROM get_chat_summaries('chat-uuid-here');

-- Query 2: Get latest summary
-- SELECT * FROM get_latest_chat_summary('chat-uuid-here');

-- Query 3: Check compression effectiveness
-- SELECT
--   chat_id,
--   summary_count,
--   total_summarized_messages,
--   avg_compression_ratio,
--   total_summary_tokens
-- FROM chat_compression_stats
-- WHERE user_id = 1;

-- Query 4: Rebuild context from summaries + recent messages
-- WITH summaries AS (
--   SELECT
--     array_agg(summary_text ORDER BY message_range_start) as all_summaries,
--     MAX(message_range_end) as last_summarized_index
--   FROM chat_summaries
--   WHERE chat_id = 'your-chat-id'
-- ),
-- recent_messages AS (
--   SELECT
--     content,
--     role,
--     created_at
--   FROM chats_messages
--   WHERE chat_id = 'your-chat-id'
--   AND -- Only messages after last summarized index
--   ORDER BY created_at ASC
-- )
-- SELECT * FROM summaries, recent_messages;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Created chat_summaries table
-- ✅ Added indexes for performance
-- ✅ Created helper functions (get_chat_summaries, get_latest_chat_summary)
-- ✅ Created analytics view (chat_compression_stats)
--
-- Next steps:
-- 1. Use unified conversation-analyzer.ts for both summarization + memory
-- 2. Summaries compress old messages to save context window
-- 3. Memory learns user preferences across all chats
-- 4. Both run in same background job (efficient!)
-- ============================================
