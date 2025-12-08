-- ============================================
-- CHATBOT REBUILD MIGRATION
-- ============================================
-- Adds tables and modifications for Vercel AI SDK v5 chatbot rebuild
-- Created: 2025-11-26
--
-- This migration:
-- 1. Installs pgvector extension for embeddings
-- 2. Modifies existing chats/messages tables for AI SDK compatibility
-- 3. Adds new tables: chat_files, project_doc_chunks, image_generations, llm_usage
-- 4. Adds necessary indexes for performance
-- ============================================

-- ============================================
-- 1. INSTALL PGVECTOR EXTENSION
-- ============================================
-- Required for RAG (Retrieval Augmented Generation) with embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. MODIFY EXISTING CHATS TABLE
-- ============================================
-- Add project_id to link chats with LCA projects
-- Add model_id to track which AI model is used
-- Add metadata for additional chat settings
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES lca_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id VARCHAR(100),  -- e.g., 'claude-sonnet-4.5', 'gpt-4o'
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;  -- temperature, system_prompt, etc.

-- Add index for project-based chat queries
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_project ON chats(user_id, project_id);

COMMENT ON COLUMN chats.project_id IS 'Optional link to LCA project for project-specific chats';
COMMENT ON COLUMN chats.model_id IS 'AI model used for this chat (e.g., claude-sonnet-4.5)';
COMMENT ON COLUMN chats.metadata IS 'Chat settings: temperature, max_tokens, system_prompt, etc.';

-- ============================================
-- 3. MODIFY EXISTING MESSAGES TABLE
-- ============================================
-- CRITICAL: Change content from TEXT to JSONB for Vercel AI SDK UIMessage format
-- UIMessage format supports text, images, tool calls, etc.

-- Step 1: Add new JSONB column
ALTER TABLE chats_messages
  ADD COLUMN IF NOT EXISTS content_json JSONB;

-- Step 2: Migrate existing TEXT content to JSONB format
-- This preserves existing messages in a compatible format
UPDATE chats_messages
SET content_json = jsonb_build_object(
  'type', 'text',
  'text', content
)
WHERE content_json IS NULL AND content IS NOT NULL;

-- Step 3: Add model and token tracking columns
ALTER TABLE chats_messages
  ADD COLUMN IF NOT EXISTS model_id VARCHAR(100),  -- Model used for this specific message
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;  -- tool calls, attachments, etc.

-- Step 4: Make content_json NOT NULL (after migration)
ALTER TABLE chats_messages
  ALTER COLUMN content_json SET NOT NULL;

-- Note: We keep the old 'content' column for backward compatibility
-- You can drop it later with: ALTER TABLE chats_messages DROP COLUMN content;

CREATE INDEX IF NOT EXISTS idx_chats_messages_chat_created ON chats_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_messages_role ON chats_messages(role);

COMMENT ON COLUMN chats_messages.content_json IS 'Vercel AI SDK UIMessage format (supports text, images, tools)';
COMMENT ON COLUMN chats_messages.model_id IS 'AI model used to generate this message';
COMMENT ON COLUMN chats_messages.input_tokens IS 'Input tokens used for this message';
COMMENT ON COLUMN chats_messages.output_tokens IS 'Output tokens generated for this message';

-- ============================================
-- 4. NEW TABLE: CHAT_FILES
-- ============================================
-- Stores uploaded files (PDFs, images) attached to chat messages
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chats_messages(id) ON DELETE CASCADE,

  -- File information
  file_url TEXT NOT NULL,  -- URL in storage (S3/Supabase)
  file_name TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,  -- 'pdf', 'image', 'document'
  mime_type VARCHAR(100) NOT NULL,  -- 'application/pdf', 'image/png', etc.
  file_size INTEGER NOT NULL,  -- bytes

  -- Processing status
  status VARCHAR(50) DEFAULT 'uploaded',  -- 'uploaded', 'processing', 'processed', 'error'
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- dimensions, pages, processing_time, etc.

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX idx_chat_files_message_id ON chat_files(message_id);
CREATE INDEX idx_chat_files_status ON chat_files(status);
CREATE INDEX idx_chat_files_created ON chat_files(created_at DESC);

COMMENT ON TABLE chat_files IS 'Uploaded files (PDFs, images) attached to chat messages';

-- ============================================
-- 5. NEW TABLE: PROJECT_DOC_CHUNKS
-- ============================================
-- Stores text chunks from project documents with embeddings for RAG
CREATE TABLE IF NOT EXISTS project_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES lca_projects(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,  -- Position in document

  -- Embedding (1536 dimensions for text-embedding-3-small)
  embedding VECTOR(1536),  -- Change to VECTOR(3072) if using text-embedding-3-large

  -- Source document information
  source_file TEXT NOT NULL,  -- Original filename
  source_url TEXT,  -- URL to original document
  page_number INTEGER,  -- For PDFs
  section_title TEXT,  -- Header/section name

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- chunk_type, importance, date, author, etc.

  -- Quality tracking
  token_count INTEGER,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity search index (ivfflat for approximate nearest neighbor)
-- lists = sqrt(total_rows) is a good starting point
CREATE INDEX idx_project_doc_chunks_embedding
ON project_doc_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Standard indexes
CREATE INDEX idx_project_doc_chunks_project_id ON project_doc_chunks(project_id);
CREATE INDEX idx_project_doc_chunks_source_file ON project_doc_chunks(source_file);
CREATE INDEX idx_project_doc_chunks_created ON project_doc_chunks(created_at DESC);

-- Full-text search index on chunk text (for hybrid search)
CREATE INDEX idx_project_doc_chunks_text_search
ON project_doc_chunks
USING gin(to_tsvector('english', chunk_text));

COMMENT ON TABLE project_doc_chunks IS 'Text chunks from project documents with embeddings for RAG retrieval';
COMMENT ON COLUMN project_doc_chunks.embedding IS 'Vector embedding (1536 dimensions) for semantic search';

-- ============================================
-- 6. NEW TABLE: IMAGE_GENERATIONS
-- ============================================
-- Tracks AI-generated images (DALL-E, Stable Diffusion, etc.)
CREATE TABLE IF NOT EXISTS image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chats_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Generation parameters
  prompt TEXT NOT NULL,
  negative_prompt TEXT,  -- For Stable Diffusion
  model VARCHAR(100) NOT NULL,  -- 'gpt-image-1', 'dall-e-3', 'stable-diffusion-xl'

  -- Image output
  image_url TEXT NOT NULL,  -- URL in storage
  thumbnail_url TEXT,

  -- Parameters (stored as JSONB for flexibility)
  parameters JSONB DEFAULT '{}'::jsonb,  -- size, quality, style, steps, cfg_scale, etc.

  -- Tracking
  generation_time_ms INTEGER,  -- How long it took
  cost DECIMAL(10, 6),  -- Cost in USD

  -- Status
  status VARCHAR(50) DEFAULT 'completed',  -- 'pending', 'completed', 'failed'
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_image_generations_chat_id ON image_generations(chat_id);
CREATE INDEX idx_image_generations_user_id ON image_generations(user_id);
CREATE INDEX idx_image_generations_model ON image_generations(model);
CREATE INDEX idx_image_generations_created ON image_generations(created_at DESC);
CREATE INDEX idx_image_generations_status ON image_generations(status);

COMMENT ON TABLE image_generations IS 'AI-generated images with prompts and parameters';

-- ============================================
-- 7. NEW TABLE: LLM_USAGE
-- ============================================
-- Tracks token usage and costs for all LLM API calls
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chats_messages(id) ON DELETE SET NULL,

  -- Model information
  model VARCHAR(100) NOT NULL,  -- 'gpt-4o', 'claude-sonnet-4.5', etc.
  provider VARCHAR(50) NOT NULL,  -- 'openai', 'anthropic', 'google', 'mistral'

  -- Token usage
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- Cost calculation
  cost_input DECIMAL(10, 6) NOT NULL DEFAULT 0,  -- Cost for input tokens
  cost_output DECIMAL(10, 6) NOT NULL DEFAULT 0,  -- Cost for output tokens
  cost_total DECIMAL(10, 6) GENERATED ALWAYS AS (cost_input + cost_output) STORED,

  -- Request metadata
  request_type VARCHAR(50) NOT NULL,  -- 'chat', 'embedding', 'image_generation', 'tool_call'
  response_time_ms INTEGER,  -- API latency

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,  -- streaming, temperature, max_tokens, etc.

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX idx_llm_usage_chat_id ON llm_usage(chat_id);
CREATE INDEX idx_llm_usage_model ON llm_usage(model);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider);
CREATE INDEX idx_llm_usage_created ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_request_type ON llm_usage(request_type);

-- Index for cost aggregation queries
CREATE INDEX idx_llm_usage_user_date ON llm_usage(user_id, created_at DESC);

COMMENT ON TABLE llm_usage IS 'Token usage and cost tracking for all LLM API calls';

-- ============================================
-- 8. VIEWS FOR ANALYTICS
-- ============================================

-- View: Daily cost summary per user
CREATE OR REPLACE VIEW daily_llm_cost_by_user AS
SELECT
  user_id,
  DATE(created_at) as date,
  provider,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_total) as total_cost
FROM llm_usage
GROUP BY user_id, DATE(created_at), provider, model
ORDER BY date DESC, user_id;

-- View: Chat-level statistics
CREATE OR REPLACE VIEW chat_statistics AS
SELECT
  c.id as chat_id,
  c.title,
  c.user_id,
  c.project_id,
  c.model_id,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.role = 'user') as user_message_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.role = 'assistant') as assistant_message_count,
  SUM(m.input_tokens) as total_input_tokens,
  SUM(m.output_tokens) as total_output_tokens,
  COUNT(DISTINCT cf.id) as attached_files_count,
  COUNT(DISTINCT ig.id) as generated_images_count,
  c.created_at,
  MAX(m.created_at) as last_message_at
FROM chats c
LEFT JOIN chats_messages m ON c.id = m.chat_id
LEFT JOIN chat_files cf ON c.id = cf.chat_id
LEFT JOIN image_generations ig ON c.id = ig.chat_id
GROUP BY c.id, c.title, c.user_id, c.project_id, c.model_id, c.created_at;

COMMENT ON VIEW daily_llm_cost_by_user IS 'Daily aggregated LLM costs per user';
COMMENT ON VIEW chat_statistics IS 'Chat-level statistics including messages, tokens, files, images';

-- ============================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Reuse existing update function for new tables
CREATE TRIGGER trigger_update_project_doc_chunks_timestamp
BEFORE UPDATE ON project_doc_chunks
FOR EACH ROW
EXECUTE FUNCTION update_lca_updated_at();

-- ============================================
-- 10. HELPER FUNCTIONS
-- ============================================

-- Function to calculate cost from tokens
CREATE OR REPLACE FUNCTION calculate_llm_cost(
  p_model VARCHAR,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER
) RETURNS TABLE (
  cost_input DECIMAL(10,6),
  cost_output DECIMAL(10,6)
) AS $$
BEGIN
  -- Cost per 1M tokens (update these regularly)
  RETURN QUERY
  SELECT
    CASE p_model
      -- OpenAI pricing (per 1M tokens)
      WHEN 'gpt-4o' THEN p_input_tokens * 2.50 / 1000000.0
      WHEN 'gpt-4o-mini' THEN p_input_tokens * 0.15 / 1000000.0
      WHEN 'gpt-4-turbo' THEN p_input_tokens * 10.00 / 1000000.0
      -- Anthropic pricing
      WHEN 'claude-sonnet-4.5' THEN p_input_tokens * 3.00 / 1000000.0
      WHEN 'claude-haiku' THEN p_input_tokens * 0.25 / 1000000.0
      WHEN 'claude-opus' THEN p_input_tokens * 15.00 / 1000000.0
      -- Google pricing
      WHEN 'gemini-2.0-flash' THEN p_input_tokens * 0.075 / 1000000.0
      WHEN 'gemini-pro' THEN p_input_tokens * 0.50 / 1000000.0
      -- Mistral pricing
      WHEN 'mistral-large' THEN p_input_tokens * 4.00 / 1000000.0
      WHEN 'mistral-medium' THEN p_input_tokens * 2.70 / 1000000.0
      -- Default
      ELSE p_input_tokens * 1.00 / 1000000.0
    END::DECIMAL(10,6) AS cost_input,

    CASE p_model
      -- OpenAI output pricing
      WHEN 'gpt-4o' THEN p_output_tokens * 10.00 / 1000000.0
      WHEN 'gpt-4o-mini' THEN p_output_tokens * 0.60 / 1000000.0
      WHEN 'gpt-4-turbo' THEN p_output_tokens * 30.00 / 1000000.0
      -- Anthropic output pricing
      WHEN 'claude-sonnet-4.5' THEN p_output_tokens * 15.00 / 1000000.0
      WHEN 'claude-haiku' THEN p_output_tokens * 1.25 / 1000000.0
      WHEN 'claude-opus' THEN p_output_tokens * 75.00 / 1000000.0
      -- Google output pricing
      WHEN 'gemini-2.0-flash' THEN p_output_tokens * 0.30 / 1000000.0
      WHEN 'gemini-pro' THEN p_output_tokens * 1.50 / 1000000.0
      -- Mistral output pricing
      WHEN 'mistral-large' THEN p_output_tokens * 12.00 / 1000000.0
      WHEN 'mistral-medium' THEN p_output_tokens * 8.10 / 1000000.0
      -- Default
      ELSE p_output_tokens * 3.00 / 1000000.0
    END::DECIMAL(10,6) AS cost_output;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_llm_cost IS 'Calculate cost from tokens based on model pricing';

-- ============================================
-- 11. SAMPLE QUERIES FOR REFERENCE
-- ============================================

-- Query 1: Get user's total spending this month
-- SELECT
--   user_id,
--   SUM(cost_total) as monthly_cost
-- FROM llm_usage
-- WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY user_id;

-- Query 2: Find similar document chunks (RAG retrieval)
-- SELECT
--   id,
--   chunk_text,
--   source_file,
--   page_number,
--   1 - (embedding <=> '[your_query_embedding_vector]'::vector) as similarity
-- FROM project_doc_chunks
-- WHERE project_id = 'your-project-id'
-- ORDER BY embedding <=> '[your_query_embedding_vector]'::vector
-- LIMIT 10;

-- Query 3: Chat usage statistics
-- SELECT * FROM chat_statistics
-- WHERE user_id = 1
-- ORDER BY last_message_at DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
--
-- Summary of changes:
-- ✅ Installed pgvector extension
-- ✅ Modified chats table (added project_id, model_id, metadata)
-- ✅ Modified chats_messages table (added content_json, tokens tracking)
-- ✅ Created chat_files table
-- ✅ Created project_doc_chunks table with vector embeddings
-- ✅ Created image_generations table
-- ✅ Created llm_usage table
-- ✅ Added indexes for performance
-- ✅ Created analytics views
-- ✅ Added cost calculation function
--
-- Next steps:
-- 1. Run this migration in Neon
-- 2. Update application code to use new schema
-- 3. Start Week 1 of chatbot rebuild roadmap
-- ============================================
