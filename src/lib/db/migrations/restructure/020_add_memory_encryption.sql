-- ============================================
-- ADD ENCRYPTION SUPPORT TO MEMORY AND SUMMARY TABLES
-- ============================================
-- Adds content_encrypted flag to:
-- 1. user_memories table
-- 2. user_memory_updates table
-- 3. chat_summaries table
-- Created: 2025-01-27
-- ============================================

-- ============================================
-- 1. USER MEMORIES TABLE
-- ============================================
ALTER TABLE user_memories
ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_memories.content_encrypted IS 'Whether memory_content is encrypted with AES-256-GCM';

-- ============================================
-- 2. USER MEMORY UPDATES TABLE
-- ============================================
ALTER TABLE user_memory_updates
ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_memory_updates.content_encrypted IS 'Whether previous_content and new_content are encrypted';

-- ============================================
-- 3. CHAT SUMMARIES TABLE
-- ============================================
ALTER TABLE chat_summaries
ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN chat_summaries.content_encrypted IS 'Whether summary_text is encrypted with AES-256-GCM';

-- ============================================
-- 4. UPDATE HELPER FUNCTIONS
-- ============================================

-- Update get_user_memory function to include encryption flag
CREATE OR REPLACE FUNCTION get_user_memory(p_user_id INTEGER)
RETURNS TABLE (
  user_id INTEGER,
  memory_content TEXT,
  user_name VARCHAR(255),
  user_role VARCHAR(255),
  preferences JSONB,
  interests JSONB,
  patterns JSONB,
  context JSONB,
  token_count INTEGER,
  last_analysis_at TIMESTAMP,
  content_encrypted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.user_id,
    COALESCE(um.memory_content, '') as memory_content,
    um.user_name,
    um.user_role,
    COALESCE(um.preferences, '{}'::jsonb) as preferences,
    COALESCE(um.interests, '[]'::jsonb) as interests,
    COALESCE(um.patterns, '[]'::jsonb) as patterns,
    COALESCE(um.context, '[]'::jsonb) as context,
    COALESCE(um.token_count, 0) as token_count,
    um.last_analysis_at,
    COALESCE(um.content_encrypted, FALSE) as content_encrypted
  FROM user_memories um
  WHERE um.user_id = p_user_id

  UNION ALL

  -- If no memory exists, return empty defaults
  SELECT
    p_user_id as user_id,
    '' as memory_content,
    NULL::VARCHAR(255) as user_name,
    NULL::VARCHAR(255) as user_role,
    '{}'::jsonb as preferences,
    '[]'::jsonb as interests,
    '[]'::jsonb as patterns,
    '[]'::jsonb as context,
    0 as token_count,
    NULL::TIMESTAMP as last_analysis_at,
    FALSE as content_encrypted
  WHERE NOT EXISTS (
    SELECT 1 FROM user_memories um WHERE um.user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_memory IS 'Get user memory with fallback to empty defaults (includes encryption flag)';

-- Update get_chat_summaries function to include encryption flag
CREATE OR REPLACE FUNCTION get_chat_summaries(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  summary_text TEXT,
  key_points JSONB,
  message_range_start INTEGER,
  message_range_end INTEGER,
  message_count INTEGER,
  created_at TIMESTAMP,
  content_encrypted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.summary_text,
    cs.key_points,
    cs.message_range_start,
    cs.message_range_end,
    (cs.message_range_end - cs.message_range_start + 1)::INTEGER as message_count,
    cs.created_at,
    COALESCE(cs.content_encrypted, FALSE) as content_encrypted
  FROM chat_summaries cs
  WHERE cs.chat_id = p_chat_id
  ORDER BY cs.message_range_start ASC;
END;
$$ LANGUAGE plpgsql;

-- Update get_latest_chat_summary function to include encryption flag
CREATE OR REPLACE FUNCTION get_latest_chat_summary(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  summary_text TEXT,
  key_points JSONB,
  message_range_end INTEGER,
  content_encrypted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.summary_text,
    cs.key_points,
    cs.message_range_end,
    COALESCE(cs.content_encrypted, FALSE) as content_encrypted
  FROM chat_summaries cs
  WHERE cs.chat_id = p_chat_id
  ORDER BY cs.message_range_end DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Added content_encrypted column to user_memories
-- ✅ Added content_encrypted column to user_memory_updates
-- ✅ Added content_encrypted column to chat_summaries
-- ✅ Updated get_user_memory function to return encryption flag
-- ✅ Updated get_chat_summaries function to return encryption flag
-- ✅ Updated get_latest_chat_summary function to return encryption flag
--
-- Next steps:
-- 1. Run this migration: npm run db:migrate
-- 2. Set ENCRYPTION_MASTER_KEY in .env.local
-- 3. New data will be automatically encrypted
-- 4. Old unencrypted data remains readable (backward compatible)
-- ============================================
