-- ============================================
-- ENHANCED MEMORY SYSTEM MIGRATION
-- ============================================
-- Upgrades the memory system with:
-- 1. Confidence scoring for preferences (prevents quick overwrites)
-- 2. Domain memory (organization-wide knowledge)
-- 3. AI analytics tracking
-- 4. Memory update source tracking
-- Created: 2026-01-23
-- ============================================

-- ============================================
-- 1. ENHANCED USER MEMORIES (ADD COLUMNS)
-- ============================================
-- Add identity and preferences_v2 columns for new flexible schema

-- Add identity column (structured user info)
ALTER TABLE user_memories
ADD COLUMN IF NOT EXISTS identity JSONB DEFAULT '{}'::jsonb;

-- Add preferences_v2 column (with confidence tracking)
ALTER TABLE user_memories
ADD COLUMN IF NOT EXISTS preferences_v2 JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_memories.identity IS 'Structured user identity: name, position, organization';
COMMENT ON COLUMN user_memories.preferences_v2 IS 'Learned preferences with confidence scores and reinforcement counts';

-- ============================================
-- 2. ENHANCED PROJECT MEMORIES
-- ============================================
-- Update project_memories to support hard values and soft context

-- First check if table exists, if not create it
CREATE TABLE IF NOT EXISTS project_memories (
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,
  memory_content TEXT NOT NULL DEFAULT '',
  project_summary TEXT,
  key_decisions JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  patterns JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add new columns for enhanced project memory
ALTER TABLE project_memories
ADD COLUMN IF NOT EXISTS hard_values JSONB DEFAULT '{}'::jsonb;

ALTER TABLE project_memories
ADD COLUMN IF NOT EXISTS soft_context JSONB DEFAULT '[]'::jsonb;

ALTER TABLE project_memories
ADD COLUMN IF NOT EXISTS last_synthesized_at TIMESTAMP;

ALTER TABLE project_memories
ADD COLUMN IF NOT EXISTS synthesis_sources JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN project_memories.hard_values IS 'Structured project facts: BVO, GO, units, target groups, phase, etc.';
COMMENT ON COLUMN project_memories.soft_context IS 'Learned context with source tracking and confidence';
COMMENT ON COLUMN project_memories.synthesis_sources IS 'Sources that contributed to memory: chat IDs, document IDs, etc.';

-- ============================================
-- 3. DOMAIN MEMORIES TABLE (NEW)
-- ============================================
-- Organization-wide knowledge that applies across all projects

CREATE TABLE IF NOT EXISTS domain_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Admin-entered explicit knowledge
  explicit_knowledge JSONB DEFAULT '[]'::jsonb,

  -- Learned patterns from cross-project analysis
  learned_patterns JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  token_estimate INTEGER DEFAULT 0,
  last_synthesized_at TIMESTAMP,
  last_updated_by INTEGER REFERENCES user_accounts(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_domain_memories_org ON domain_memories(org_id);

COMMENT ON TABLE domain_memories IS 'Organization-wide AI knowledge that applies across all projects and users';
COMMENT ON COLUMN domain_memories.explicit_knowledge IS 'Admin-entered knowledge: standards, regulations, preferences';
COMMENT ON COLUMN domain_memories.learned_patterns IS 'Patterns learned from cross-project analysis';

-- ============================================
-- 4. MEMORY UPDATE HISTORY (ENHANCED)
-- ============================================
-- Unified memory update tracking for all memory types

CREATE TABLE IF NOT EXISTS memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Memory reference
  memory_type VARCHAR(20) NOT NULL,  -- 'personal', 'project', 'domain'
  memory_id TEXT NOT NULL,           -- user_id, project_id, or domain_memory_id

  -- Update details
  update_type VARCHAR(30) NOT NULL,  -- 'learned', 'reinforced', 'contradicted', 'user_edit', 'user_delete', 'admin_edit'
  field_path TEXT,                   -- Which field was updated (e.g., 'preferences_v2[0].value')
  preference_key TEXT,               -- For preference updates, the key being modified

  old_value JSONB,
  new_value JSONB,

  -- Confidence tracking
  old_confidence NUMERIC(4,3),
  new_confidence NUMERIC(4,3),
  reinforcement_delta INTEGER,       -- +1 for reinforcement, +1 for contradiction

  -- Source tracking
  source VARCHAR(50) NOT NULL,       -- 'chat', 'panel', 'document', 'location', 'lca', 'task', 'manual', 'admin'
  source_ref TEXT,                   -- Reference to source (chat_id, doc_id, etc.)
  source_text TEXT,                  -- The actual text/message that triggered this update

  -- Metadata
  updated_by INTEGER REFERENCES user_accounts(id),
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_updates_type_id ON memory_updates(memory_type, memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_updates_created ON memory_updates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_updates_source ON memory_updates(source);

COMMENT ON TABLE memory_updates IS 'Unified history of all memory updates across personal, project, and domain memories';

-- ============================================
-- 5. AI ANALYTICS TABLE
-- ============================================
-- Track AI feature usage for insights

CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  org_id UUID REFERENCES org_organizations(id),
  user_id INTEGER REFERENCES user_accounts(id),
  project_id UUID REFERENCES project_projects(id),

  -- Event details
  feature VARCHAR(50) NOT NULL,        -- 'location', 'project', 'task', 'lca', 'chat'
  action VARCHAR(100) NOT NULL,        -- 'create_tasks', 'health_check', 'explain_data', etc.

  -- Engagement tracking
  entry_point VARCHAR(50),             -- 'ai_button', 'chat', 'quick_action'
  button_was_animated BOOLEAN DEFAULT FALSE,
  panel_was_opened BOOLEAN DEFAULT FALSE,

  -- Outcome tracking
  suggestion_shown BOOLEAN DEFAULT FALSE,
  suggestion_accepted BOOLEAN,
  items_created INTEGER,               -- e.g., number of tasks created

  -- Performance
  response_time_ms INTEGER,
  tokens_used INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_analytics_org ON ai_analytics(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_user ON ai_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_feature ON ai_analytics(feature, action);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_date ON ai_analytics(created_at DESC);

COMMENT ON TABLE ai_analytics IS 'Tracks AI feature usage across the platform for insights and optimization';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to calculate confidence from reinforcements and contradictions
CREATE OR REPLACE FUNCTION calculate_preference_confidence(
  reinforcements INTEGER,
  contradictions INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  -- Formula: reinforcements / (reinforcements + contradictions + 1)
  -- This ensures:
  -- - New preferences start low (0 / 1 = 0)
  -- - Confidence grows with reinforcements
  -- - Single contradictions don't dramatically reduce confidence
  -- - Sustained contradictions eventually reduce confidence
  RETURN ROUND(
    reinforcements::NUMERIC / (reinforcements + contradictions + 1)::NUMERIC,
    3
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_preference_confidence IS 'Calculate confidence score from reinforcement and contradiction counts';

-- Function to get combined memory for a user in a project context
CREATE OR REPLACE FUNCTION get_combined_memory_context(
  p_user_id INTEGER,
  p_project_id UUID DEFAULT NULL,
  p_org_id UUID DEFAULT NULL
) RETURNS TABLE (
  memory_type VARCHAR(20),
  memory_content TEXT,
  token_estimate INTEGER
) AS $$
BEGIN
  -- Personal memory
  RETURN QUERY
  SELECT
    'personal'::VARCHAR(20) as memory_type,
    um.memory_content,
    um.token_count as token_estimate
  FROM user_memories um
  WHERE um.user_id = p_user_id;

  -- Project memory (if project_id provided)
  IF p_project_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'project'::VARCHAR(20) as memory_type,
      pm.memory_content,
      pm.token_count as token_estimate
    FROM project_memories pm
    WHERE pm.project_id = p_project_id;
  END IF;

  -- Domain memory (if org_id provided)
  IF p_org_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'domain'::VARCHAR(20) as memory_type,
      ''::TEXT as memory_content, -- Domain memory doesn't have a single content field
      dm.token_estimate
    FROM domain_memories dm
    WHERE dm.org_id = p_org_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_combined_memory_context IS 'Get all relevant memory contexts for a user/project/org combination';

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Trigger to update domain_memories.updated_at
CREATE OR REPLACE FUNCTION update_domain_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_domain_memory_timestamp ON domain_memories;
CREATE TRIGGER trigger_update_domain_memory_timestamp
BEFORE UPDATE ON domain_memories
FOR EACH ROW
EXECUTE FUNCTION update_domain_memory_timestamp();

-- Trigger to update project_memories.updated_at
CREATE OR REPLACE FUNCTION update_project_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  IF OLD.total_updates IS NOT NULL THEN
    NEW.total_updates = OLD.total_updates + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_memory_timestamp ON project_memories;
CREATE TRIGGER trigger_update_project_memory_timestamp
BEFORE UPDATE ON project_memories
FOR EACH ROW
EXECUTE FUNCTION update_project_memory_timestamp();

-- ============================================
-- 8. VIEWS FOR ANALYTICS
-- ============================================

-- View: AI feature usage summary
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT
  feature,
  action,
  COUNT(*) as total_uses,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(CASE WHEN suggestion_accepted THEN 1 ELSE 0 END)::NUMERIC(4,3) as acceptance_rate,
  AVG(response_time_ms) as avg_response_time_ms,
  SUM(items_created) as total_items_created
FROM ai_analytics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY feature, action
ORDER BY total_uses DESC;

COMMENT ON VIEW ai_usage_summary IS 'Summary of AI feature usage over the last 30 days';

-- View: Memory health overview
CREATE OR REPLACE VIEW memory_health_overview AS
SELECT
  'personal' as memory_type,
  COUNT(*) as total_memories,
  AVG(token_count) as avg_tokens,
  COUNT(*) FILTER (WHERE last_analysis_at > NOW() - INTERVAL '7 days') as active_last_week
FROM user_memories
UNION ALL
SELECT
  'project' as memory_type,
  COUNT(*) as total_memories,
  AVG(token_count) as avg_tokens,
  COUNT(*) FILTER (WHERE last_analysis_at > NOW() - INTERVAL '7 days') as active_last_week
FROM project_memories
UNION ALL
SELECT
  'domain' as memory_type,
  COUNT(*) as total_memories,
  AVG(token_estimate) as avg_tokens,
  COUNT(*) FILTER (WHERE last_synthesized_at > NOW() - INTERVAL '7 days') as active_last_week
FROM domain_memories;

COMMENT ON VIEW memory_health_overview IS 'Overview of memory system health across all types';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Added identity and preferences_v2 columns to user_memories
-- ✅ Enhanced project_memories with hard_values and soft_context
-- ✅ Created domain_memories table for org-wide knowledge
-- ✅ Created unified memory_updates tracking table
-- ✅ Created ai_analytics table for usage tracking
-- ✅ Added confidence calculation function
-- ✅ Added combined memory retrieval function
-- ✅ Created analytics views
--
-- The confidence system works as follows:
-- - Each preference tracks: value, reinforcements, contradictions
-- - Confidence = reinforcements / (reinforcements + contradictions + 1)
-- - New preferences start at 0 confidence (0/1 = 0)
-- - After 5 reinforcements: 5/6 = 0.83
-- - After 25 reinforcements: 25/26 = 0.96
-- - One contradiction after 25 reinforcements: 25/27 = 0.93 (minimal impact)
-- - Sustained contradictions (5): 25/31 = 0.81 (gradual decline)
-- ============================================
