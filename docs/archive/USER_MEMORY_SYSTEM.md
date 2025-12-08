# User Memory System

## Overview

The User Memory System provides personalized context for each user's interactions with the GroosHub AI Assistant. Inspired by Claude's memory feature, it learns from conversations to remember preferences, patterns, and context.

**Key Features:**
- Automatic learning from conversations
- Brief, structured memory (~500 tokens max)
- Cost-efficient updates using cheaper AI models
- Privacy-focused with GDPR compliance
- Non-blocking background processing

---

## How It Works

### 1. Memory Structure

Each user has a personalized memory that includes:

```
User: [Name if mentioned]
Role: [Function/role if mentioned]

Preferences:
- Response style (brief, detailed, technical, etc.)
- Preferred language
- Data/analysis interests

Patterns:
- Recurring tasks (e.g., "Often translates from Spanish to Dutch")
- Common workflows (e.g., "Analyzes Amsterdam Noord neighborhoods")

Current Context:
- Active projects
- Recent focus areas

Interests:
- Topics that frequently come up
- Architectural styles, sustainability, etc.
```

### 2. When Memory is Updated

**Automatic Updates:**
- Every **10 user messages** in a conversation
- When conversation appears to end (no activity for 30+ minutes)
- Only when new, relevant information is detected

**Manual Updates:**
- Via API endpoint `/api/memory`
- Through admin panel (future feature)

### 3. How Updates Avoid Double Token Usage

**Smart Design:**
1. **Background Processing**: Memory analysis happens AFTER the chat response is sent to the user
2. **Recent Messages Only**: Analyzes last 5-10 messages, not the entire conversation
3. **Cheap Model**: Uses Claude Haiku or GPT-4o-mini (10x cheaper than main models)
4. **Two-Step Process**:
   - Step 1: Quick check "Is there new information?" (~50 tokens)
   - Step 2: Full memory extraction only if needed (~300-500 tokens)

**Token Cost Comparison:**
- Main chat response: ~1,000-5,000 tokens (Claude Sonnet 4.5)
- Memory analysis: ~50-500 tokens (Claude Haiku)
- **Cost increase: < 5%** of main chat cost

---

## Architecture

### Database Schema

```sql
-- User memories (one per user)
CREATE TABLE user_memories (
  user_id INTEGER PRIMARY KEY,
  memory_content TEXT,
  user_name VARCHAR(255),
  user_role VARCHAR(255),
  preferences JSONB,
  interests JSONB,
  patterns JSONB,
  context JSONB,
  token_count INTEGER,
  total_updates INTEGER,
  last_analysis_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Memory update history (audit trail)
CREATE TABLE user_memory_updates (
  id UUID PRIMARY KEY,
  user_id INTEGER,
  previous_content TEXT,
  new_content TEXT,
  change_summary TEXT,
  change_type VARCHAR(50),  -- 'initial', 'addition', 'modification', 'removal', 'manual'
  trigger_source VARCHAR(50), -- 'chat', 'manual', 'api', 'system'
  trigger_id UUID,
  metadata JSONB,
  created_at TIMESTAMP
);
```

### Code Architecture

```
src/lib/ai/
├── memory-store.ts          # Database operations
├── memory-prompts.ts        # LLM prompts for analysis
├── memory-analyzer.ts       # Background analysis service
└── models.ts                # AI model configuration

src/app/api/
└── memory/
    └── route.ts             # Memory API endpoints

src/app/api/chat/
└── route.ts                 # Chat API (integrated)
```

---

## API Endpoints

### GET /api/memory

Get current user memory.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "memory_content": "User: John Doe\nRole: Architect\n\nPreferences:\n- Prefers brief answers...",
    "user_name": "John Doe",
    "user_role": "Architect",
    "preferences": { "response_style": "brief" },
    "interests": ["sustainability", "urban planning"],
    "patterns": [
      {
        "type": "translation",
        "description": "Often translates from Spanish to Dutch"
      }
    ],
    "context": [
      {
        "key": "current_project",
        "value": "Noord district analysis"
      }
    ],
    "token_count": 245,
    "total_updates": 3,
    "last_analysis_at": "2025-12-02T10:30:00Z",
    "formatted": "User: John Doe (Architect)\n\nPreferences:\n- Prefers brief answers..."
  }
}
```

### POST /api/memory/analyze

Manually trigger memory analysis from conversation.

**Authentication:** Required

**Request:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "I prefer brief answers" }]
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "parts": [{ "type": "text", "text": "Understood!" }]
    }
  ],
  "chatId": "chat-123",
  "locale": "nl",
  "modelId": "claude-haiku"
}
```

**Response:**
```json
{
  "success": true,
  "updated": true,
  "data": {
    "memory_content": "Updated memory content...",
    "token_count": 256,
    "total_updates": 4,
    "last_analysis_at": "2025-12-02T11:00:00Z"
  }
}
```

### PUT /api/memory

Manually update user memory.

**Authentication:** Required

**Request:**
```json
{
  "memory_content": "User: John Doe\nRole: Senior Architect\n\nPreferences:\n- Brief, technical answers...",
  "user_name": "John Doe",
  "user_role": "Senior Architect",
  "preferences": {
    "response_style": "brief",
    "technical_level": "advanced"
  },
  "interests": ["sustainability", "LCA analysis"],
  "patterns": [
    {
      "type": "workflow",
      "description": "Analyzes neighborhoods before design phase"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memory_content": "...",
    "token_count": 280,
    "total_updates": 5
  }
}
```

### DELETE /api/memory

Delete user memory (GDPR compliance).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Memory deleted successfully"
}
```

---

## Usage Examples

### Automatic Memory in Chat

When a user chats, memory is automatically:
1. **Retrieved** and injected into system prompt
2. **Updated** in background every 10 messages

```typescript
// In chat API route (already implemented)
const userMemory = await getUserMemory(userId);
const memoryText = formatMemoryForPrompt(userMemory);
const systemPrompt = enhanceSystemPromptWithMemory(
  baseSystemPrompt,
  memoryText,
  locale
);

// Later, in onFinish callback (after response sent)
queueMemoryAnalysis(userId, chatId, allMessages, locale);
```

### Manual Memory Retrieval

```typescript
import { getUserMemory, formatMemoryForPrompt } from '@/lib/ai/memory-store';

const memory = await getUserMemory(userId);
const formattedMemory = formatMemoryForPrompt(memory);

console.log(formattedMemory);
// Output:
// User: John Doe (Architect)
//
// Preferences:
// - Prefers brief answers
// ...
```

### Manual Memory Update

```typescript
import { updateUserMemory } from '@/lib/ai/memory-store';

await updateUserMemory({
  userId: 1,
  memoryContent: "User prefers detailed technical explanations",
  changeSummary: "Updated preference based on feedback",
  changeType: 'manual',
  triggerSource: 'api'
});
```

### Trigger Analysis Manually

```typescript
import { manualMemoryAnalysis } from '@/lib/ai/memory-analyzer';

const result = await manualMemoryAnalysis(
  userId,
  chatId,
  allMessages,
  'nl'
);

console.log(result);
// { success: true, updated: true, reason: "Successfully updated" }
```

---

## Configuration

Edit `/src/lib/ai/memory-analyzer.ts` to adjust:

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

---

## Privacy & GDPR Compliance

### Data Stored
- User preferences and patterns
- Conversation-derived context
- **NO raw conversation history** (only extracted facts)

### User Rights
- **View memory**: GET /api/memory
- **Update memory**: PUT /api/memory
- **Delete memory**: DELETE /api/memory
- **Audit trail**: Memory update history tracked

### Data Retention
- Memory persists until user deletes account
- Update history kept for audit purposes
- Can be configured with TTL for context items

---

## Cost Analysis

### Token Usage per Update

| Step | Tokens | Model | Cost (per update) |
|------|--------|-------|-------------------|
| Decision check | ~50 | Claude Haiku | $0.000015 |
| Memory extraction | ~500 | Claude Haiku | $0.000150 |
| **Total** | **~550** | **Claude Haiku** | **~$0.000165** |

### Comparison to Main Chat

| Operation | Tokens | Model | Cost |
|-----------|--------|-------|------|
| Chat response | ~2,000 | Claude Sonnet 4.5 | $0.006 |
| Memory update | ~550 | Claude Haiku | $0.000165 |
| **Overhead** | **~25%** | **-** | **~2.75%** |

**Conclusion:** Memory system adds < 3% to total chat cost while significantly improving personalization.

---

## Development Workflow

### 1. Initial Setup

Run database migration:
```bash
npm run db:migrate
```

This creates:
- `user_memories` table
- `user_memory_updates` table
- Helper functions and indexes

### 2. Testing Memory System

```typescript
// Test memory creation
import { createUserMemory, getUserMemory } from '@/lib/ai/memory-store';

await createUserMemory({
  userId: 1,
  memoryContent: "Test user prefers brief answers",
  preferences: { response_style: "brief" }
});

// Test retrieval
const memory = await getUserMemory(1);
console.log(memory);

// Test analysis
import { manualMemoryAnalysis } from '@/lib/ai/memory-analyzer';

const result = await manualMemoryAnalysis(
  1,
  'test-chat-id',
  testMessages,
  'nl'
);
console.log(result);
```

### 3. Monitoring

Check logs for memory operations:
```bash
# Memory loaded into chat
[Chat API] 🧠 User memory loaded (245 tokens)

# Memory analysis queued
[Chat API] 🧠 Memory analysis queued for user 1

# Memory updated
[MemoryAnalyzer] ✅ Updated memory

# No update needed
[MemoryAnalyzer] ℹ️  No update needed for user 1: No new information
```

### 4. Debugging

View memory update history:
```sql
SELECT
  id,
  change_summary,
  change_type,
  trigger_source,
  created_at
FROM user_memory_updates
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

---

## Best Practices

### For Developers

1. **Don't block main flow**: Memory analysis is always async
2. **Use cheap models**: Memory analysis doesn't need expensive models
3. **Keep memory brief**: Target 300-500 tokens, max 600
4. **Handle errors gracefully**: Memory failures shouldn't break chat
5. **Monitor token usage**: Track memory analysis costs separately

### For Users

1. **Natural interaction**: Memory learns automatically, no special commands needed
2. **Privacy control**: Can view/edit/delete memory anytime
3. **Manual updates**: Use API for specific preference updates
4. **Context management**: Set temporary context with expiration

### For Admins

1. **Monitor costs**: Track memory analysis token usage
2. **Review memory quality**: Check if extractions are accurate
3. **Adjust triggers**: Fine-tune update frequency if needed
4. **Privacy compliance**: Ensure GDPR processes are followed

---

## Future Enhancements

### Planned Features

1. **User-controlled memory**:
   - UI to view/edit memory
   - Toggle automatic updates on/off
   - Manual "forget this" commands

2. **Smart context expiration**:
   - Time-sensitive context auto-expires
   - Project-based context cleanup

3. **Memory quality scoring**:
   - Track how often memory is used
   - Remove unused facts after N days

4. **Multi-modal memory**:
   - Remember image preferences
   - Store visualization preferences

5. **Shared team memory**:
   - Project-level shared context
   - Team preferences and patterns

### Advanced Features

1. **RAG integration**:
   - Embed memory for semantic search
   - Find similar user preferences

2. **A/B testing**:
   - Test memory impact on satisfaction
   - Optimize extraction prompts

3. **Export/import**:
   - Export memory for backup
   - Transfer between accounts

---

## Troubleshooting

### Memory not updating

**Check:**
1. Database migration ran successfully
2. User has sent at least 3 messages
3. Memory analysis is being queued (check logs)
4. No errors in memory analyzer

**Debug:**
```typescript
// Manually trigger analysis
const result = await manualMemoryAnalysis(userId, chatId, messages, 'nl');
console.log(result);
```

### Memory too large

**Solution:**
1. Review memory content
2. Remove outdated information
3. Adjust extraction prompt to be more concise

### High token costs

**Check:**
1. Memory analysis frequency (should be every 10 messages)
2. Model being used (should be Claude Haiku or GPT-4o-mini)
3. Decision check is enabled (saves tokens)

**Adjust:**
```typescript
// In memory-analyzer.ts
const MEMORY_CONFIG = {
  triggerEveryNMessages: 20, // Less frequent
  useSmartDecision: true, // Always enable
};
```

---

## Summary

The User Memory System provides:
- **Personalized responses** based on user preferences
- **Automatic learning** from conversations
- **Cost-efficient operation** (< 3% overhead)
- **Privacy-focused** with GDPR compliance
- **Non-blocking performance** via background processing

It's designed to enhance user experience without impacting chat performance or significantly increasing costs.
