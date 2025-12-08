# User Memory System - Quick Start Guide

## What Has Been Implemented

A complete user memory system for the GroosHub AI chatbot that:
- Learns from conversations automatically
- Stores user preferences, patterns, and context
- Uses background processing to avoid blocking chat responses
- Operates cost-efficiently with cheaper AI models (< 3% cost overhead)
- Provides full GDPR compliance with privacy controls

---

## Files Created

### Database Migration
- **`src/lib/db/migrations/008_user_memories.sql`**
  - Creates `user_memories` table
  - Creates `user_memory_updates` table (audit trail)
  - Adds helper functions and indexes

### Core Memory System
- **`src/lib/ai/memory-store.ts`** - Database operations (CRUD)
- **`src/lib/ai/memory-prompts.ts`** - LLM prompts for extraction
- **`src/lib/ai/memory-analyzer.ts`** - Background analysis service

### API Endpoints
- **`src/app/api/memory/route.ts`**
  - GET: Retrieve user memory
  - POST: Analyze conversation and update memory
  - PUT: Manually update memory
  - DELETE: Delete memory (GDPR)

### Integration
- **`src/app/api/chat/route.ts`** - Updated to:
  - Load user memory on each chat
  - Inject memory into system prompt
  - Queue background memory analysis

### Documentation
- **`Documentation/USER_MEMORY_SYSTEM.md`** - Complete system documentation
- **`Documentation/MEMORY_SYSTEM_QUICKSTART.md`** - This file

---

## Setup Steps

### 1. Run Database Migration

Ensure your `.env.local` has database credentials:
```bash
POSTGRES_URL=your_postgres_url_here
POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_url_here
```

Then run:
```bash
npm run db:migrate
```

This creates the memory tables in your database.

### 2. Verify Tables Created

Connect to your database and verify:
```sql
-- Check tables exist
\dt user_memories
\dt user_memory_updates

-- Check helper function exists
\df get_user_memory
```

### 3. Test the System

**Option A: Through Chat**
1. Start a chat conversation
2. Mention preferences (e.g., "I prefer brief answers")
3. Send 10+ messages to trigger memory analysis
4. Check logs for: `[Chat API] 🧠 User memory loaded`

**Option B: Through API**
```bash
# Get memory
curl -X GET http://localhost:3000/api/memory \
  -H "Cookie: your-auth-cookie"

# Manually update
curl -X PUT http://localhost:3000/api/memory \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "memory_content": "User prefers brief, technical answers",
    "preferences": { "response_style": "brief" }
  }'
```

---

## How It Works (Summary)

### Flow Diagram

```
User sends message
     ↓
Chat API receives request
     ↓
Load user memory from DB
     ↓
Enhance system prompt with memory
     ↓
Send to LLM (main chat model)
     ↓
Stream response to user ✅
     ↓
[Background, non-blocking]
     ↓
Queue memory analysis
     ↓
Analyze last 10 messages (cheap model)
     ↓
Extract new facts/preferences
     ↓
Update memory in DB
```

### Cost Efficiency

**Main Chat:**
- Model: Claude Sonnet 4.5
- Tokens: ~2,000
- Cost: ~$0.006

**Memory Analysis (background):**
- Model: Claude Haiku
- Tokens: ~550
- Cost: ~$0.000165

**Total overhead: < 3%**

### Update Triggers

Memory updates automatically when:
1. User has sent 10+ messages
2. AND at least one of:
   - 10 messages since last update
   - 24 hours since last update
   - Manual trigger via API

---

## Configuration

Edit `/src/lib/ai/memory-analyzer.ts`:

```typescript
const MEMORY_CONFIG = {
  // Model for memory analysis (cheap model)
  analysisModel: 'claude-haiku', // or 'gpt-4o-mini'

  // How many recent messages to analyze
  recentMessageCount: 10,

  // Trigger conditions
  triggerEveryNMessages: 10, // Update every N messages
  minMessagesBeforeFirstUpdate: 3,

  // Smart decision making
  useSmartDecision: true, // Quick check before full analysis
};
```

**Recommendations:**
- Keep `analysisModel` as `claude-haiku` (cheapest)
- Increase `triggerEveryNMessages` to 20 for less frequent updates
- Keep `useSmartDecision: true` to save tokens

---

## Monitoring

### Check Logs

**Memory loaded:**
```
[Chat API] 🧠 User memory loaded (245 tokens)
```

**Memory analysis queued:**
```
[Chat API] 🧠 Memory analysis queued for user 1
[MemoryAnalyzer] 🧠 Starting analysis for user 1, chat abc123
```

**Memory updated:**
```
[MemoryAnalyzer] 📝 Memory updated (350 chars)
[MemoryAnalyzer] ✅ Updated memory
```

**No update needed:**
```
[MemoryAnalyzer] ℹ️  No update needed for user 1: No new information
```

### Query Database

```sql
-- View user memories
SELECT
  user_id,
  memory_content,
  token_count,
  total_updates,
  last_analysis_at
FROM user_memories
ORDER BY updated_at DESC;

-- View memory update history
SELECT
  user_id,
  change_summary,
  change_type,
  trigger_source,
  created_at
FROM user_memory_updates
ORDER BY created_at DESC
LIMIT 20;

-- Get memory for specific user
SELECT * FROM get_user_memory(1);
```

---

## Testing Examples

### Example 1: Basic Preference

**User says:**
> "I prefer brief, to-the-point answers without too much explanation."

**After 10 messages, memory becomes:**
```
Preferences:
- Prefers brief, concise answers
- Minimal explanation
```

### Example 2: Pattern Recognition

**User frequently asks:**
> "Can you translate this from Spanish to Dutch?"
> (Multiple times over several conversations)

**Memory captures:**
```
Patterns:
- Frequently translates documents from Spanish to Dutch
```

### Example 3: Current Context

**User mentions:**
> "I'm working on a project in Amsterdam Noord district"

**Memory stores:**
```
Current Context:
- Working on project in Amsterdam Noord district
```

This context helps the AI provide more relevant responses about that area.

---

## Privacy & GDPR

### User Rights

Users can:
1. **View their memory**: `GET /api/memory`
2. **Update their memory**: `PUT /api/memory`
3. **Delete their memory**: `DELETE /api/memory`
4. **View update history**: Query `user_memory_updates` table

### Data Stored

- **Stored**: Extracted preferences, patterns, context
- **NOT stored**: Raw conversation messages (those are in `chats_messages` table)
- **Audit trail**: All updates logged in `user_memory_updates`

### Deletion

When user account is deleted:
- Memory automatically deleted (CASCADE)
- Update history automatically deleted (CASCADE)

---

## Troubleshooting

### Problem: Memory not updating

**Check:**
```bash
# 1. Check logs for memory queue
grep "Memory analysis queued" logs.txt

# 2. Check database
SELECT * FROM get_user_memory(1);

# 3. Manually trigger
curl -X POST http://localhost:3000/api/memory/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [...],
    "locale": "nl"
  }'
```

### Problem: High token costs

**Solution:**
```typescript
// Reduce update frequency
const MEMORY_CONFIG = {
  triggerEveryNMessages: 20, // Instead of 10
  analysisModel: 'claude-haiku', // Keep cheap model
  useSmartDecision: true // Always enable
};
```

### Problem: Memory too verbose

**Solution:**
```typescript
// The extraction prompt enforces ~500 tokens max
// If still too long, edit in memory-prompts.ts:
"Keep memory VERY BRIEF: max ~300 tokens"
```

---

## Next Steps

### Immediate
1. ✅ Run database migration
2. ✅ Test with a few chat conversations
3. ✅ Monitor logs for memory operations
4. ✅ Check database for created memories

### Short-term
1. Add UI to view/edit memory in user settings
2. Add admin panel to monitor memory quality
3. Fine-tune extraction prompts based on results
4. Set up monitoring for token costs

### Long-term
1. Add memory quality scoring
2. Implement smart context expiration
3. Add team/project-level shared memory
4. Integrate with RAG for semantic search

---

## Summary

You now have a complete, production-ready user memory system that:
- ✅ Automatically learns from conversations
- ✅ Operates in background without blocking chat
- ✅ Uses cost-efficient AI models (< 3% overhead)
- ✅ Provides full GDPR compliance
- ✅ Has comprehensive API and documentation

**Ready to go! Just run the migration and start chatting.**

For questions or issues, refer to:
- Full documentation: `Documentation/USER_MEMORY_SYSTEM.md`
- Code: `src/lib/ai/memory-*.ts`
- API: `src/app/api/memory/route.ts`
