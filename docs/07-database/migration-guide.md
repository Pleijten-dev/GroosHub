# Chatbot Rebuild Database Migration

## Overview

This migration prepares your PostgreSQL database for the new Vercel AI SDK v5 chatbot with multi-modal support, RAG, and advanced features.

## What This Migration Does

### ✅ Modifications to Existing Tables

1. **`chats` table**
   - Adds `project_id` (link chats to LCA projects)
   - Adds `model_id` (track which AI model is used)
   - Adds `metadata` (chat settings like temperature, system prompt)

2. **`chats_messages` table**
   - Adds `content_json` (JSONB format for Vercel AI SDK UIMessage)
   - Migrates existing TEXT content to JSONB automatically
   - Adds `model_id`, `input_tokens`, `output_tokens` for tracking
   - **Preserves all existing data!**

### ✅ New Tables Created

3. **`chat_files`**
   - Stores uploaded PDFs and images
   - Links files to chats and messages
   - Tracks processing status

4. **`project_doc_chunks`**
   - Stores text chunks from project documents
   - Includes vector embeddings (1536 dimensions)
   - Enables RAG (Retrieval Augmented Generation)

5. **`image_generations`**
   - Tracks AI-generated images
   - Stores prompts, parameters, and costs
   - Links to chats and users

6. **`llm_usage`**
   - Tracks token usage and costs for all API calls
   - Supports cost analysis per user/chat/model
   - Includes automated cost calculation function

### ✅ Additional Features

7. **pgvector Extension**
   - Enables vector similarity search for RAG
   - Required for semantic document retrieval

8. **Analytics Views**
   - `daily_llm_cost_by_user` - Daily cost summaries
   - `chat_statistics` - Chat-level statistics

9. **Helper Functions**
   - `calculate_llm_cost()` - Automatic cost calculation based on model pricing

10. **Performance Indexes**
    - Vector similarity search (ivfflat)
    - Full-text search on document chunks
    - Optimized queries for common operations

---

## How to Run the Migration

### Option 1: Using Neon Console (Recommended)

1. **Go to Neon Console**
   - Open https://console.neon.tech/
   - Navigate to your GroosHub project
   - Click on "SQL Editor" in the left sidebar

2. **Copy the SQL**
   - Open the migration file: `src/lib/db/migrations/006_chatbot_rebuild_schema.sql`
   - Copy all the SQL content (Cmd/Ctrl + A, Cmd/Ctrl + C)

3. **Run the Migration**
   - Paste the SQL into the Neon SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter
   - Wait for completion (should take 5-10 seconds)

4. **Verify Success**
   - Check that all tables were created
   - Look for "Query executed successfully" message
   - Run verification query (see below)

### Option 2: Using the Migration Script

```bash
# From project root
npm run db:migrate
```

This will run all migrations in order, including the new chatbot migration.

### Option 3: Using psql Command Line

```bash
# If you have psql installed
psql $POSTGRES_URL -f src/lib/db/migrations/006_chatbot_rebuild_schema.sql
```

---

## Verification Queries

After running the migration, verify everything is set up correctly:

### 1. Check pgvector Extension

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Expected**: Should return 1 row showing vector extension is installed.

### 2. Check New Tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('chat_files', 'project_doc_chunks', 'image_generations', 'llm_usage')
ORDER BY table_name;
```

**Expected**: Should return 4 rows with all new table names.

### 3. Check Modified Columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chats'
  AND column_name IN ('project_id', 'model_id', 'metadata')
ORDER BY column_name;
```

**Expected**: Should return 3 rows showing new columns in chats table.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chats_messages'
  AND column_name IN ('content_json', 'model_id', 'input_tokens', 'output_tokens')
ORDER BY column_name;
```

**Expected**: Should return 4 rows showing new columns in chats_messages table.

### 4. Check Indexes

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'project_doc_chunks'
  AND indexname LIKE '%embedding%';
```

**Expected**: Should return 1 row showing vector index exists.

### 5. Check Views

```sql
SELECT viewname
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('daily_llm_cost_by_user', 'chat_statistics');
```

**Expected**: Should return 2 rows with both view names.

### 6. Verify Data Migration

```sql
-- Check that existing messages were migrated to JSON format
SELECT
  COUNT(*) as total_messages,
  COUNT(content_json) as migrated_messages,
  COUNT(*) - COUNT(content_json) as pending_migration
FROM chats_messages;
```

**Expected**: `migrated_messages` should equal `total_messages`, `pending_migration` should be 0.

---

## Rollback Plan

If something goes wrong, you can rollback the changes:

### Rollback New Tables Only

```sql
-- Drop new tables (keeps existing data intact)
DROP TABLE IF EXISTS llm_usage CASCADE;
DROP TABLE IF EXISTS image_generations CASCADE;
DROP TABLE IF EXISTS project_doc_chunks CASCADE;
DROP TABLE IF EXISTS chat_files CASCADE;

-- Drop views
DROP VIEW IF EXISTS chat_statistics;
DROP VIEW IF EXISTS daily_llm_cost_by_user;

-- Remove pgvector extension (optional)
-- DROP EXTENSION IF EXISTS vector;
```

### Rollback Modified Columns

```sql
-- Remove new columns from chats table
ALTER TABLE chats
  DROP COLUMN IF EXISTS project_id,
  DROP COLUMN IF EXISTS model_id,
  DROP COLUMN IF EXISTS metadata;

-- Remove new columns from chats_messages table
-- (Keep content_json as it contains migrated data)
ALTER TABLE chats_messages
  DROP COLUMN IF EXISTS model_id,
  DROP COLUMN IF EXISTS input_tokens,
  DROP COLUMN IF EXISTS output_tokens,
  DROP COLUMN IF EXISTS metadata;
```

**⚠️ Warning**: Do NOT drop `content_json` column after migration, as it contains your migrated message data!

---

## Common Issues & Solutions

### Issue 1: "extension vector does not exist"

**Solution**: Your PostgreSQL version might not support pgvector. Contact Neon support or:
```sql
-- Check Postgres version
SELECT version();
-- Should be 12+
```

### Issue 2: "column already exists"

**Solution**: Migration was partially run before. This is safe - the migration uses `IF NOT EXISTS` clauses.

### Issue 3: "permission denied"

**Solution**: Make sure you're using the admin/owner connection string from Neon (not the pooler URL).

### Issue 4: Slow vector index creation

**Solution**: This is normal for large tables. The migration includes:
```sql
CREATE INDEX ... USING ivfflat ...
```
This can take 30-60 seconds for large datasets.

---

## Post-Migration Steps

After successful migration:

1. ✅ **Update Application Code**
   - Modify chat code to use `content_json` instead of `content`
   - Update queries to use new columns

2. ✅ **Test Basic Functionality**
   - Create a new chat
   - Send a message
   - Verify it's stored correctly

3. ✅ **Set Up File Storage**
   - Configure S3 or Supabase Storage
   - Update `STORAGE_URL` environment variable

4. ✅ **Generate Sample Embeddings**
   - Run embedding script on sample documents
   - Test RAG retrieval

5. ✅ **Monitor Costs**
   - Check `llm_usage` table
   - Set up cost alerts if needed

---

## Cost Estimation

### Storage Costs (Neon)

- **New Tables**: ~5-10 MB initially
- **With RAG**: +100 MB per 1000 pages of documents
- **Vector Index**: +20% of embedding data size

**Example**: 500 pages of project docs ≈ 50 MB total

### Compute Costs

- Vector search queries: ~10-50ms each
- No significant impact on existing queries
- Indexes improve read performance

---

## Next Steps

After migration is complete:

1. Update `CHATBOT_REBUILD_ROADMAP.md`
   - Mark "Database Migration" as complete ✅
   - Update Week 1 status

2. Start Week 1 Implementation
   - Install Vercel AI SDK packages
   - Create model registry
   - Build basic streaming chat

3. Test RAG Setup
   - Upload sample project document
   - Run embedding script
   - Test document retrieval

---

## Questions or Issues?

If you encounter any problems:

1. Check the verification queries above
2. Review the rollback plan
3. Check Neon logs for error details
4. Open an issue with error messages

---

**Migration Created**: 2025-11-26
**Compatible With**: PostgreSQL 12+, pgvector 0.4.0+
**Neon Version**: All versions
