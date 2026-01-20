# AI Assistant Automation System

## Overview

GroosHub implements an automated system for managing AI assistant conversation summaries and user memory. This system optimizes context window usage, reduces costs, and improves personalization through intelligent summarization and memory consolidation.

---

## Architecture

### Vercel Hobby Plan (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│  Real-Time (During Conversation)                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Message ──→ Message Count Check                           │
│                   └─ Every 10 messages:                          │
│                      └─ Generate summary (compresses context)   │
│                      └─ Analyze for memory updates              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Automated (Daily Cron Job - Hobby Plan Limitation)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Daily at 11:00 PM] ──→ Combined Automation                    │
│     └─ POST /api/memory/consolidate                             │
│        ├─ Step 1: Inactivity summarization                      │
│        │  └─ Summarize ALL chats inactive 1+ hours              │
│        │     └─ Catches day's abandoned conversations           │
│        └─ Step 2: Memory consolidation                          │
│           └─ Gather all day's summaries per user                │
│           └─ Send to LLM for pattern extraction                 │
│           └─ Update user memory with daily insights             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vercel Pro Plan (Optional Upgrade)

If you upgrade to Pro, you can split the jobs for more frequent processing:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Every Hour] ──→ Inactivity Summarization                      │
│     └─ POST /api/summaries/inactivity                           │
│        └─ Summarize chats inactive for 1+ hours                 │
│                                                                  │
│  [Daily at 11:00 PM] ──→ Memory Consolidation                   │
│     └─ POST /api/memory/consolidate                             │
│        └─ Consolidate summaries into user memory                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Pro Plan Setup**: Add this to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/summaries/inactivity",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## Components

### 1. **Real-Time Summarization** (Every 10 Messages)

**Trigger**: During active chat conversation
**Threshold**: When message count % 10 === 0
**Location**: `src/lib/ai/conversation-analyzer.ts`

**What It Does**:
- Compresses old messages into concise summaries
- Keeps last 10 messages unsummarized for context
- Saves ~80% of tokens vs. full message history
- Updates user memory with recent patterns

**Configuration**:
```typescript
summarization: {
  enabled: true,
  summarizeAfterMessages: 10,  // Trigger every 10 messages
  keepRecentMessages: 10,       // Keep last 10 raw
  summaryChunkSize: 15,         // Chunk size for large histories
}
```

**Example**:
```
Messages 1-10  → Summary 1 (500 tokens vs 2000)
Messages 11-20 → Summary 2 (500 tokens vs 2000)
Messages 21-30 → (kept raw)
```

---

### 2. **Inactivity Summarization** (Daily on Hobby, Hourly on Pro)

**Endpoint**: `POST /api/summaries/inactivity`
**Schedule**:
- **Hobby Plan**: Daily at 11:00 PM (called by `/api/memory/consolidate`)
- **Pro Plan**: `0 * * * *` (every hour, optional)
**Purpose**: Summarize chats where user stopped mid-conversation

**What It Does**:
1. Finds chats inactive for 1+ hours
2. Checks if they have unsummarized messages
3. Generates final summary for those messages
4. Updates `last_summary_at` timestamp

**Criteria for Processing**:
- Chat inactive for 1+ hours (`last_activity_at < NOW() - INTERVAL '1 hour'`)
- Has messages since last summary (`last_activity_at > last_summary_at`)
- At least 3 messages to summarize
- Not deleted

**SQL Query**:
```sql
SELECT cc.id, cc.user_id, COUNT(cm.id) as message_count
FROM chat_conversations cc
LEFT JOIN chat_messages cm ON cm.chat_id = cc.id
WHERE cc.deleted_at IS NULL
  AND cc.last_activity_at < NOW() - INTERVAL '1 hour'
  AND (cc.last_summary_at IS NULL OR cc.last_activity_at > cc.last_summary_at)
  AND EXISTS (
    SELECT 1 FROM chat_messages
    WHERE chat_id = cc.id
    AND (cc.last_summary_at IS NULL OR created_at > cc.last_summary_at)
  )
GROUP BY cc.id, cc.user_id
HAVING COUNT(cm.id) >= 3
LIMIT 50;
```

**Benefits**:
- ✅ Captures insights from abandoned conversations
- ✅ Prevents context bloat in resumed chats
- ✅ Reduces LLM costs for inactive chats

---

### 3. **Memory Consolidation** (Daily at 11:30 PM)

**Endpoint**: `POST /api/memory/consolidate`
**Schedule**: `30 23 * * *` (11:30 PM daily)
**Purpose**: Create holistic daily memory updates from all conversations

**What It Does**:
1. Finds all users with summaries created today
2. Gathers all summaries per user
3. Sends to LLM for pattern extraction
4. Updates user memory with consolidated insights

**Why End-of-Day**:
- 🧠 **Holistic View**: Analyzes full day's interactions, not just individual chats
- 🎯 **Better Patterns**: Identifies cross-conversation themes
- 💡 **Context Retention**: Preserves important info, removes noise
- ⚡ **Efficient**: Single analysis vs. multiple per-conversation updates

**Memory Format**:
```
User Preferences:
- Prefers concise, technical explanations
- Working on urban planning projects
- Interested in sustainable development

Patterns:
- Frequently analyzes location data
- Asks follow-up questions for clarification
- Values data-driven insights

Current Context:
- Active project: Amsterdam city center analysis
- Focus area: Demographics and housing
```

**SQL Query**:
```sql
SELECT DISTINCT cc.user_id, COUNT(cs.id) as summary_count
FROM chat_conversations cc
INNER JOIN chat_summaries cs ON cs.chat_id = cc.id
WHERE cs.created_at >= CURRENT_DATE
  AND cs.created_at < CURRENT_DATE + INTERVAL '1 day'
  AND cc.deleted_at IS NULL
GROUP BY cc.user_id
HAVING COUNT(cs.id) >= 1;
```

**Benefits**:
- ✅ Higher quality memory vs. per-message updates
- ✅ Learns from full day's interactions
- ✅ Removes outdated/irrelevant information
- ✅ Stays within ~500 token budget

---

## Database Schema

### New Columns in `chat_conversations`

```sql
-- Added by migration 012_add_chat_activity_tracking.sql

ALTER TABLE chat_conversations
ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN last_summary_at TIMESTAMP;

-- Indexes for efficient querying
CREATE INDEX idx_chat_activity_tracking
ON chat_conversations(last_activity_at, last_summary_at)
WHERE deleted_at IS NULL;

CREATE INDEX idx_chat_needs_summary
ON chat_conversations(last_activity_at)
WHERE deleted_at IS NULL
AND (last_summary_at IS NULL OR last_activity_at > last_summary_at);
```

**Column Purposes**:
- `last_activity_at`: Updated on every new message (tracks when user last interacted)
- `last_summary_at`: Updated when summary is generated (tracks when chat was last summarized)

---

## API Endpoints

### **POST /api/summaries/inactivity**

**Description**: Summarize chats inactive for 1+ hours

**Authentication**:
- Admin user session, OR
- Valid `CRON_SECRET` in `x-cron-secret` header

**Request**:
```bash
curl -X POST https://yourdomain.com/api/summaries/inactivity \
  -H "x-cron-secret: your-secret"
```

**Response**:
```json
{
  "success": true,
  "message": "Processed 15 inactive chats",
  "processed": 15,
  "successful": 14,
  "failed": 1,
  "results": [
    {
      "chatId": "abc-123",
      "userId": 42,
      "messageCount": 5,
      "success": true
    }
  ]
}
```

---

### **GET /api/summaries/inactivity**

**Description**: Preview how many chats are eligible for summarization

**Authentication**: Admin only

**Request**:
```bash
curl https://yourdomain.com/api/summaries/inactivity \
  -H "Cookie: admin-session-cookie"
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "eligibleChatsCount": 15,
    "oldestActivity": "2025-12-29T10:30:00.000Z",
    "newestActivity": "2025-12-29T22:15:00.000Z"
  }
}
```

---

### **POST /api/memory/consolidate**

**Description**: Consolidate daily summaries into user memory

**Authentication**:
- Admin user session, OR
- Valid `CRON_SECRET` in `x-cron-secret` header

**Request**:
```bash
curl -X POST https://yourdomain.com/api/memory/consolidate \
  -H "x-cron-secret: your-secret"
```

**Response**:
```json
{
  "success": true,
  "message": "Processed 42 users",
  "processed": 42,
  "memoryUpdates": 38,
  "skipped": 4,
  "results": [
    {
      "userId": 10,
      "summariesProcessed": 3,
      "memoryUpdated": true
    }
  ]
}
```

---

### **GET /api/memory/consolidate**

**Description**: Preview today's consolidation candidates

**Authentication**: Admin only

**Request**:
```bash
curl https://yourdomain.com/api/memory/consolidate \
  -H "Cookie: admin-session-cookie"
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "usersWithActivity": 42,
    "totalSummariesToday": 127,
    "avgSummaryLength": 450
  }
}
```

---

## Cron Configuration

### Hobby Plan (Default) - `vercel.json`

⚠️ **Vercel Hobby plan only allows daily cron jobs.** Hourly crons require Pro plan.

```json
{
  "crons": [
    {
      "path": "/api/files/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/memory/consolidate",
      "schedule": "0 23 * * *"
    }
  ]
}
```

### Hobby Plan Cron Schedule

| Job | Schedule | Frequency | Purpose |
|-----|----------|-----------|---------|
| File Cleanup | `0 2 * * *` | Daily at 2:00 AM | Delete files in trash 30+ days |
| AI Automation | `0 23 * * *` | Daily at 11:00 PM | Inactivity summarization + Memory consolidation |

**Note**: `/api/memory/consolidate` internally calls `/api/summaries/inactivity` first, then does memory consolidation.

---

### Pro Plan (Optional Upgrade)

If you upgrade to Vercel Pro, you can enable hourly summarization:

```json
{
  "crons": [
    {
      "path": "/api/files/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/summaries/inactivity",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/memory/consolidate",
      "schedule": "0 23 * * *"
    }
  ]
}
```

### Pro Plan Cron Schedule

| Job | Schedule | Frequency | Purpose |
|-----|----------|-----------|---------|
| File Cleanup | `0 2 * * *` | Daily at 2:00 AM | Delete files in trash 30+ days |
| Inactivity Summarization | `0 * * * *` | **Every hour** | Summarize abandoned chats |
| Memory Consolidation | `0 23 * * *` | Daily at 11:00 PM | Update user memories |

**Benefit**: Chats are summarized within 1-2 hours of inactivity instead of waiting until end of day.

---

## Cost Analysis

### Token Usage

**Without Automation**:
- Average chat: 30 messages × 150 tokens = 4,500 tokens/chat
- 100 chats/day = 450,000 tokens

**With Automation**:
- Summaries: 30 messages → 3 summaries × 500 tokens = 1,500 tokens/chat
- 100 chats/day = 150,000 tokens
- **Savings: 67% reduction**

### LLM Costs (Claude Haiku 3.5)

**Summarization**:
- Input: 1,500 tokens (messages to summarize)
- Output: 500 tokens (summary)
- Cost: $0.001 per summary
- Daily (100 chats): **$0.10**

**Memory Consolidation**:
- Input: 1,000 tokens (summaries + current memory)
- Output: 400 tokens (updated memory)
- Cost: $0.0007 per user
- Daily (50 users): **$0.035**

**Total Daily Cost**: ~$0.14 for automated processing

**ROI**: Saves 300,000 tokens/day = $3-5/day in reduced context costs

---

## Monitoring & Debugging

### Logs

All operations are logged with prefixes:

```
[Inactivity Summarization] Finding inactive chats...
[Inactivity Summarization] Found 15 inactive chats to process
[Inactivity Summarization] ✓ Summarized chat abc-123 - 5 messages → 120 tokens
[Memory Consolidation] Processing user 42 (3 summaries)
[Memory Consolidation] ✓ Updated memory for user 42
```

### Vercel Cron Logs

View cron execution logs in Vercel Dashboard:
1. Go to project → **Logs** tab
2. Filter by `/api/summaries/inactivity` or `/api/memory/consolidate`
3. Check for errors or failures

### Manual Testing

```bash
# Test inactivity summarization
curl -X POST http://localhost:3000/api/summaries/inactivity \
  -H "Cookie: admin-session"

# Preview stats
curl http://localhost:3000/api/summaries/inactivity \
  -H "Cookie: admin-session"

# Test memory consolidation
curl -X POST http://localhost:3000/api/memory/consolidate \
  -H "Cookie: admin-session"
```

---

## Troubleshooting

### Summaries Not Being Created

**Symptom**: Chats don't have summaries after 10 messages

**Solutions**:
1. Check `conversation-analyzer.ts` config: `summarizeAfterMessages: 10`
2. Verify `queueConversationAnalysis()` is called in chat endpoint
3. Check logs for LLM errors
4. Ensure Claude Haiku API key is valid

### Inactivity Cron Not Running

**Symptom**: No summaries for inactive chats

**Solutions**:
1. Verify `vercel.json` is deployed
2. Check Vercel Cron logs for errors
3. Ensure `CRON_SECRET` is set in environment variables
4. Manually trigger: `POST /api/summaries/inactivity`

### Memory Not Updating

**Symptom**: User memory stays the same after conversations

**Solutions**:
1. Check if summaries are being created (prerequisite)
2. Verify memory consolidation cron is running
3. Check logs for LLM API errors
4. Ensure user has at least 1 summary created today
5. Manually trigger: `POST /api/memory/consolidate`

### Database Migration Failed

**Symptom**: Missing `last_activity_at` or `last_summary_at` columns

**Solutions**:
```bash
# Run migration manually
npm run db:migrate

# Or execute SQL directly
psql $POSTGRES_URL < src/lib/db/migrations/012_add_chat_activity_tracking.sql
```

---

## Configuration

### Tuning Summarization Threshold

Edit `src/lib/ai/conversation-analyzer.ts`:

```typescript
summarization: {
  enabled: true,
  summarizeAfterMessages: 10,  // Change to 5, 15, or 20
  keepRecentMessages: 10,      // Change to keep more/less context
  summaryChunkSize: 15,        // For very long conversations
}
```

**Recommendations**:
- **5 messages**: Aggressive compression, lower costs, less context
- **10 messages** (current): Balanced approach
- **20 messages**: More context retained, higher costs

### Tuning Memory Consolidation Time

Edit `vercel.json`:

```json
{
  "path": "/api/memory/consolidate",
  "schedule": "30 23 * * *"  // Change time as needed
}
```

**Recommendations**:
- `30 23 * * *` (11:30 PM): Captures full day, good for global users
- `0 0 * * *` (midnight): Clean day boundary
- `30 22 * * *` (10:30 PM): Earlier consolidation for early morning users

---

## Best Practices

1. **Monitor costs**: Track LLM usage in Vercel AI SDK dashboard
2. **Review memory quality**: Periodically check user memories via `GET /api/memory`
3. **Tune thresholds**: Adjust based on average conversation length
4. **Set up alerts**: Notify if cron jobs fail repeatedly
5. **Test before deploy**: Always test endpoints manually before relying on cron

---

## Future Enhancements

- [ ] Per-user summarization preferences (frequency, verbosity)
- [ ] Multi-language support for summaries (currently English-focused)
- [ ] Summary quality scoring and automatic regeneration
- [ ] Memory versioning and rollback
- [ ] Analytics dashboard for summarization effectiveness
- [ ] Configurable inactivity threshold (1 hour → customizable)
- [ ] Smart summarization triggers (based on topic changes, not just count)
