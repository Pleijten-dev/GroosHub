-- ============================================
-- USER MEMORY SYSTEM MIGRATION
-- ============================================
-- Adds user memory system for LLM context personalization
-- Created: 2025-12-02
--
-- This migration:
-- 1. Creates user_memories table to store personalized context
-- 2. Creates memory_updates table to track memory changes over time
-- 3. Adds indexes for performance
-- 4. Adds helper functions for memory management
-- ============================================

-- ============================================
-- 1. USER MEMORIES TABLE
-- ============================================
-- Stores personalized memory for each user
-- Memory is brief, structured text that provides context to the LLM
CREATE TABLE IF NOT EXISTS user_memories (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Memory content (structured text, max ~500 tokens / 2000 chars)
  memory_content TEXT NOT NULL DEFAULT '',

  -- Structured memory fields (optional, for easier querying)
  user_name VARCHAR(255),
  user_role VARCHAR(255),
  preferences JSONB DEFAULT '{}'::jsonb,  -- {"response_style": "brief", "language": "nl"}
  interests JSONB DEFAULT '[]'::jsonb,    -- ["sustainability", "urban planning"]
  patterns JSONB DEFAULT '[]'::jsonb,     -- [{"type": "translation", "from": "es", "to": "nl"}]
  context JSONB DEFAULT '[]'::jsonb,      -- [{"key": "current_project", "value": "Noord district"}]

  -- Metadata
  total_updates INTEGER DEFAULT 0,  -- How many times memory has been updated
  last_analysis_at TIMESTAMP,  -- Last time LLM analyzed and updated memory
  token_count INTEGER DEFAULT 0,  -- Approximate token count of memory_content

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_updated ON user_memories(updated_at DESC);

COMMENT ON TABLE user_memories IS 'Personalized LLM memory for each user (preferences, patterns, context)';
COMMENT ON COLUMN user_memories.memory_content IS 'Brief structured text memory (~500 tokens max)';
COMMENT ON COLUMN user_memories.preferences IS 'User preferences: response_style, language, etc.';
COMMENT ON COLUMN user_memories.interests IS 'User interests and topics of frequent discussion';
COMMENT ON COLUMN user_memories.patterns IS 'Behavioral patterns: common tasks, workflows';
COMMENT ON COLUMN user_memories.context IS 'Current context: active projects, recent topics';

-- ============================================
-- 2. MEMORY UPDATES TABLE
-- ============================================
-- Tracks history of memory updates for debugging and rollback
CREATE TABLE IF NOT EXISTS user_memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Update details
  previous_content TEXT,  -- Memory content before update
  new_content TEXT NOT NULL,  -- Memory content after update

  -- What changed
  change_summary TEXT,  -- Brief description of what was added/modified/removed
  change_type VARCHAR(50),  -- 'initial', 'addition', 'modification', 'removal', 'manual'

  -- Trigger source
  trigger_source VARCHAR(50) NOT NULL,  -- 'chat', 'manual', 'api', 'system'
  trigger_id UUID,  -- chat_id or message_id that triggered this update

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- model_used, confidence_score, etc.

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_updates_user_id ON user_memory_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_updates_created ON user_memory_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_updates_user_date ON user_memory_updates(user_id, created_at DESC);

COMMENT ON TABLE user_memory_updates IS 'History of memory updates for debugging and rollback';
COMMENT ON COLUMN user_memory_updates.trigger_source IS 'What triggered the update: chat, manual, api, system';

-- ============================================
-- 3. HELPER FUNCTIONS
-- ============================================

-- Function to get user memory with fallback to empty
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
  last_analysis_at TIMESTAMP
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
    um.last_analysis_at
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
    NULL::TIMESTAMP as last_analysis_at
  WHERE NOT EXISTS (
    SELECT 1 FROM user_memories WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_memory IS 'Get user memory with fallback to empty defaults';

-- Function to update memory updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  NEW.total_updates = OLD.total_updates + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at and total_updates
CREATE TRIGGER trigger_update_user_memory_timestamp
BEFORE UPDATE ON user_memories
FOR EACH ROW
EXECUTE FUNCTION update_user_memory_updated_at();

-- ============================================
-- 4. VIEWS FOR ANALYTICS
-- ============================================

-- View: Recent memory updates per user
CREATE OR REPLACE VIEW recent_memory_updates AS
SELECT
  u.id as user_id,
  u.name as user_name,
  u.email,
  COUNT(mu.id) as total_updates,
  MAX(mu.created_at) as last_update,
  array_agg(mu.change_type ORDER BY mu.created_at DESC) FILTER (WHERE mu.change_type IS NOT NULL) as recent_change_types
FROM users u
LEFT JOIN user_memory_updates mu ON u.id = mu.user_id
GROUP BY u.id, u.name, u.email;

COMMENT ON VIEW recent_memory_updates IS 'Recent memory update activity per user';

-- ============================================
-- 5. SAMPLE QUERIES FOR REFERENCE
-- ============================================

-- Query 1: Get user memory
-- SELECT * FROM get_user_memory(1);

-- Query 2: Get memory update history for a user
-- SELECT
--   id,
--   change_summary,
--   change_type,
--   trigger_source,
--   created_at
-- FROM user_memory_updates
-- WHERE user_id = 1
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Query 3: Get users with active memories
-- SELECT
--   u.id,
--   u.name,
--   um.token_count,
--   um.total_updates,
--   um.last_analysis_at
-- FROM users u
-- INNER JOIN user_memories um ON u.id = um.user_id
-- WHERE um.memory_content != ''
-- ORDER BY um.updated_at DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Created user_memories table
-- ✅ Created user_memory_updates table for history tracking
-- ✅ Added indexes for performance
-- ✅ Created helper functions (get_user_memory)
-- ✅ Added triggers for automatic timestamp updates
-- ✅ Created analytics views
--
-- Next steps:
-- 1. Run this migration: npm run db:migrate
-- 2. Create memory management functions in code
-- 3. Integrate memory into chat system prompt
-- 4. Create API endpoint for memory updates
-- ============================================
