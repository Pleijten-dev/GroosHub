# AI Memory System - Complete Guide

> **Last Updated**: 2025-12-08
> **Status**: ✅ Production Ready
> **Cost Impact**: < 3% overhead
> **Consolidates**: USER_MEMORY_SYSTEM.md, MEMORY_SYSTEM_QUICKSTART.md

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Implementation Details](#implementation-details)
6. [API Reference](#api-reference)
7. [Integration Guide](#integration-guide)
8. [Privacy & GDPR](#privacy--gdpr)
9. [Performance & Costs](#performance--costs)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The GroosHub AI chatbot features an intelligent memory system that learns from conversations and personalizes responses. The system operates in the background, analyzing chat history to extract and maintain user preferences, patterns, and context.

### Key Features

- ✅ **Automatic Learning**: Extracts preferences from conversations
- ✅ **Background Processing**: Non-blocking, doesn't slow down chat
- ✅ **Cost Efficient**: Uses cheap models (Claude Haiku), < 3% cost overhead
- ✅ **Two-Tier Memory**:
  - **User Memory**: Personal preferences across all chats
  - **Project Memory**: Shared context within projects
- ✅ **GDPR Compliant**: Full privacy controls, data deletion
- ✅ **Audit Trail**: Complete history of memory changes
- ✅ **Smart Updates**: Only updates when significant changes detected

### What It Remembers

**User Memory (Personal)**:
- Name, role, background
- Communication preferences (brief/detailed answers)
- Technical expertise level
- Work context & goals
- Recurring patterns & interests

**Project Memory (Shared)**:
- Project goals & requirements
- Key decisions made
- Technical constraints
- Team preferences
- Domain-specific context

---

## Quick Start

### Prerequisites

1. **Database Migration**: Run `008_user_memories.sql`
2. **Environment Variables**: Database credentials in `.env.local`
3. **AI API Key**: Anthropic API key for Claude Haiku

### Setup (5 minutes)

**Step 1: Run Migration**

```bash
npm run db:migrate
```

**Step 2: Verify Tables**

```sql
-- Check tables exist
SELECT * FROM user_memories LIMIT 1;
SELECT * FROM user_memory_updates LIMIT 1;
SELECT * FROM project_memories LIMIT 1;
SELECT * FROM project_memory_updates LIMIT 1;
```

**Step 3: Test**

```typescript
// In your chat, mention preferences
"I prefer brief technical answers. I'm a senior developer working on LCA calculations."

// After 10+ messages, memory analysis triggers automatically
// Check memory was created:
const memory = await getUserMemory(userId);
console.log(memory); // Should contain your preferences
```

### Files Structure

```
src/
├── lib/ai/
│   ├── memory-store.ts          # Database CRUD operations
│   ├── memory-prompts.ts        # LLM prompts for extraction
│   └── memory-analyzer.ts       # Background analysis service
│
├── app/api/
│   ├── memory/route.ts          # Memory management API
│   └── chat/route.ts            # Chat integration
│
└── lib/db/migrations/
    └── 008_user_memories.sql    # Database schema
```

---

## Architecture

### System Flow

```
Chat Message → Store in DB → Background Queue → Memory Analysis → Update Memory
     ↓                                                                    ↓
Load Memory → Inject into System Prompt → AI Response with Context
```

### Components

**1. Memory Store** (`memory-store.ts`)
- CRUD operations for memory
- Database queries
- Memory formatting

**2. Memory Analyzer** (`memory-analyzer.ts`)
- Background processing
- LLM-based extraction
- Smart update logic

**3. Memory Prompts** (`memory-prompts.ts`)
- System prompts for extraction
- Analysis prompts
- Update generation prompts

**4. API Layer** (`api/memory/route.ts`)
- REST endpoints
- Authentication
- GDPR compliance

### Memory Types

```typescript
// User Memory (Personal)
interface UserMemory {
  user_id: number;
  memory_content: string;           // Full memory text
  user_name?: string;               // Extracted name
  user_role?: string;               // Professional role
  preferences: {                    // Structured preferences
    communication_style?: string;
    technical_level?: string;
    response_length?: string;
  };
  interests: string[];             // Topics of interest
  patterns: string[];              // Behavioral patterns
  context: string[];               // Background context
  total_updates: number;
  last_analysis_at: Date;
  token_count: number;
  created_at: Date;
  updated_at: Date;
}

// Project Memory (Shared)
interface ProjectMemory {
  project_id: string;
  memory_content: string;
  project_summary?: string;
  key_decisions: Array<{
    decision: string;
    date: Date;
    rationale?: string;
  }>;
  preferences: {
    coding_standards?: string;
    architecture_patterns?: string;
  };
  patterns: Record<string, any>;
  context: Record<string, any>;
  total_updates: number;
  last_analysis_at: Date;
  token_count: number;
  created_at: Date;
  updated_at: Date;
}
```

---

## Database Schema

### User Memories Table

```sql
CREATE TABLE user_memories (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  memory_content TEXT NOT NULL DEFAULT '',
  user_name VARCHAR(255),
  user_role VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  interests JSONB DEFAULT '[]',
  patterns JSONB DEFAULT '[]',
  context JSONB DEFAULT '[]',
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_memories_updated ON user_memories(updated_at DESC);
```

### User Memory Updates (Audit Trail)

```sql
CREATE TABLE user_memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_content TEXT,
  new_content TEXT NOT NULL,
  change_summary TEXT,
  change_type VARCHAR(50),  -- 'initial', 'update', 'major_update', 'minor_update'
  trigger_source VARCHAR(50) NOT NULL,  -- 'chat', 'manual', 'api'
  trigger_id UUID,  -- Chat ID or API call ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memory_updates_user_date ON user_memory_updates(user_id, created_at DESC);
```

### Project Memories Table

```sql
CREATE TABLE project_memories (
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,
  memory_content TEXT NOT NULL,
  project_summary TEXT,
  key_decisions JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  patterns JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Helper Functions

```sql
-- Get user memory with defaults
CREATE OR REPLACE FUNCTION get_user_memory(p_user_id INTEGER)
RETURNS user_memories AS $$
DECLARE
  memory user_memories;
BEGIN
  SELECT * INTO memory FROM user_memories WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_memories (user_id, memory_content)
    VALUES (p_user_id, '')
    RETURNING * INTO memory;
  END IF;

  RETURN memory;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Details

### Memory Extraction Logic

**File**: `src/lib/ai/memory-analyzer.ts`

```typescript
export async function analyzeConversation(
  userId: number,
  messages: Message[],
  existingMemory?: string
): Promise<MemoryUpdate | null> {
  // 1. Prepare context
  const conversationText = formatMessages(messages);
  const currentMemory = existingMemory || '(No existing memory)';

  // 2. Call LLM for extraction
  const { text } = await generateText({
    model: anthropic('claude-3-haiku-20240307'),  // Cheap model
    system: MEMORY_EXTRACTION_PROMPT,
    prompt: `
Current Memory:
${currentMemory}

Recent Conversation (last 20 messages):
${conversationText}

Extract new information to add to memory. Focus on:
- User preferences (communication style, technical level)
- Interests and expertise
- Goals and context
- Patterns and behaviors

If no significant new information, return exactly: "NO_UPDATE"
    `,
    temperature: 0.3,
  });

  // 3. Check if update needed
  if (text.includes('NO_UPDATE')) {
    return null;
  }

  // 4. Merge with existing memory
  const updatedMemory = await mergeMemories(currentMemory, text);

  return {
    content: updatedMemory,
    change_summary: text,
    change_type: existingMemory ? 'update' : 'initial',
  };
}
```

### Smart Update Strategy

**Only updates when**:
- New preferences mentioned
- Significant context changes
- Pattern shifts detected
- Explicit corrections from user

**Doesn't update for**:
- Casual conversation
- One-time requests
- Temporary context
- Repeated information

### Memory Injection

**File**: `src/app/api/chat/route.ts`

```typescript
export async function POST(req: Request) {
  const { messages, userId, projectId } = await req.json();

  // 1. Load memories
  const userMemory = await getUserMemory(userId);
  const projectMemory = projectId
    ? await getProjectMemory(projectId)
    : null;

  // 2. Inject into system prompt
  const systemPrompt = `
You are an AI assistant for GroosHub.

${userMemory ? `
User Context:
${userMemory.memory_content}

Preferences: ${JSON.stringify(userMemory.preferences)}
` : ''}

${projectMemory ? `
Project Context:
${projectMemory.project_summary}

Key Decisions: ${JSON.stringify(projectMemory.key_decisions)}
` : ''}

Use this context to personalize responses. Don't explicitly mention you remember things unless relevant.
  `;

  // 3. Stream response
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: systemPrompt,
    messages,
  });

  // 4. Queue background memory analysis (non-blocking)
  if (messages.length >= 10) {
    queueMemoryAnalysis(userId, messages, projectId);
  }

  return result.toDataStreamResponse();
}
```

### Background Processing

```typescript
// Queue for background processing (doesn't block chat response)
const memoryQueue = new Queue();

export function queueMemoryAnalysis(
  userId: number,
  messages: Message[],
  projectId?: string
) {
  memoryQueue.add(async () => {
    try {
      // Analyze user memory
      const userMemory = await getUserMemory(userId);
      const update = await analyzeConversation(
        userId,
        messages,
        userMemory.memory_content
      );

      if (update) {
        await updateUserMemory(userId, update);
      }

      // Analyze project memory if applicable
      if (projectId) {
        const projectMemory = await getProjectMemory(projectId);
        const projectUpdate = await analyzeProjectConversation(
          projectId,
          messages,
          projectMemory.memory_content
        );

        if (projectUpdate) {
          await updateProjectMemory(projectId, projectUpdate);
        }
      }
    } catch (error) {
      console.error('Memory analysis failed:', error);
      // Don't throw - background processing should never crash the app
    }
  });
}
```

---

## API Reference

### GET /api/memory

Get user's memory.

```typescript
// Request
GET /api/memory

// Response
{
  "memory": {
    "user_id": 1,
    "memory_content": "Senior developer specializing in LCA...",
    "user_name": "John Doe",
    "user_role": "Senior Developer",
    "preferences": {
      "communication_style": "brief",
      "technical_level": "expert"
    },
    "interests": ["LCA", "sustainability", "TypeScript"],
    "patterns": ["Prefers code examples", "Asks follow-up questions"],
    "context": ["Working on GroosHub LCA feature"],
    "total_updates": 5,
    "last_analysis_at": "2025-12-08T10:30:00Z",
    "created_at": "2025-12-01T09:00:00Z",
    "updated_at": "2025-12-08T10:30:00Z"
  }
}
```

### POST /api/memory

Trigger manual memory analysis.

```typescript
// Request
POST /api/memory
{
  "messages": [...],  // Recent conversation
  "projectId": "uuid" // Optional
}

// Response
{
  "success": true,
  "updated": true,
  "change_summary": "Added preference for brief technical answers"
}
```

### PUT /api/memory

Manually update memory.

```typescript
// Request
PUT /api/memory
{
  "memory_content": "Updated memory text...",
  "preferences": {
    "communication_style": "detailed"
  }
}

// Response
{
  "success": true,
  "memory": {...}
}
```

### DELETE /api/memory

Delete user's memory (GDPR compliance).

```typescript
// Request
DELETE /api/memory

// Response
{
  "success": true,
  "message": "Memory deleted successfully"
}
```

---

## Integration Guide

### Adding Memory to Existing Chat

```typescript
// In your chat component
import { getUserMemory } from '@/lib/ai/memory-store';

async function handleChat(userId: number, message: string) {
  // 1. Load memory
  const memory = await getUserMemory(userId);

  // 2. Include in context
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [...],
      userId,
      memory: memory.memory_content,
    }),
  });

  return response;
}
```

### Displaying Memory to User

```typescript
// Memory viewer component
export function MemoryViewer({ userId }: { userId: number }) {
  const [memory, setMemory] = useState<UserMemory | null>(null);

  useEffect(() => {
    fetch('/api/memory')
      .then(res => res.json())
      .then(data => setMemory(data.memory));
  }, [userId]);

  if (!memory) return <div>Loading...</div>;

  return (
    <div>
      <h2>What I remember about you</h2>
      <p>{memory.memory_content}</p>

      <h3>Preferences</h3>
      <pre>{JSON.stringify(memory.preferences, null, 2)}</pre>

      <h3>Interests</h3>
      <ul>
        {memory.interests.map((interest, i) => (
          <li key={i}>{interest}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Privacy & GDPR

### Data Protection

**What we store**:
- Preferences extracted from conversations
- Professional context (role, expertise)
- Interaction patterns
- Goals and interests

**What we DON'T store**:
- Sensitive personal information (unless explicitly shared)
- Financial data
- Health information
- Private credentials

### User Rights

**Right to Access**: GET /api/memory
**Right to Rectification**: PUT /api/memory
**Right to Erasure**: DELETE /api/memory
**Right to Data Portability**: GET /api/memory (JSON export)

### GDPR Compliance Checklist

- ✅ **Consent**: User aware of memory system
- ✅ **Transparency**: Memory visible to user
- ✅ **Access**: API to view memory
- ✅ **Correction**: API to update memory
- ✅ **Deletion**: API to delete memory
- ✅ **Portability**: JSON export available
- ✅ **Audit Trail**: Complete history in `user_memory_updates`
- ✅ **Data Minimization**: Only stores relevant preferences
- ✅ **Purpose Limitation**: Only used for personalization

---

## Performance & Costs

### Cost Analysis

**Memory Analysis Cost**:
```
Model: Claude Haiku (cheapest)
Input: ~2000 tokens (conversation + current memory)
Output: ~200 tokens (extracted preferences)
Cost per analysis: ~$0.0005 (0.05 cents)

Frequency: Every 10+ messages
Cost per conversation (100 messages): ~$0.005 (0.5 cents)

Overhead: < 3% of total chat costs
```

**Chat Cost Comparison**:
```
Chat with Sonnet (per message): ~$0.015
Memory analysis (per 10 messages): ~$0.0005
Overhead: 0.0005 / (0.015 * 10) = 0.33% (negligible)
```

### Performance Impact

**Memory Loading**: < 10ms (database query)
**Memory Injection**: < 1ms (string concatenation)
**Background Analysis**: 1-3 seconds (non-blocking)

**Total Impact on Chat Response Time**: ~10ms (0.6%)

### Optimization Tips

1. **Batch Analysis**: Analyze every 10+ messages instead of every message
2. **Smart Caching**: Cache memory in session, reload only when stale
3. **Lazy Loading**: Load project memory only when needed
4. **Incremental Updates**: Only send changed parts to LLM

---

## Troubleshooting

### Issue 1: Memory not updating

**Symptoms**: Conversations happen but memory stays empty

**Causes**:
- Background queue not processing
- LLM returning "NO_UPDATE" (no new information)
- Database connection issues

**Solutions**:
```typescript
// Check if analysis is being queued
console.log('Messages count:', messages.length); // Should be >= 10

// Check database
const memory = await getUserMemory(userId);
console.log('Memory:', memory);

// Manually trigger analysis
await POST('/api/memory', { messages });
```

### Issue 2: Memory grows too large

**Symptoms**: Memory token count > 2000

**Cause**: Accumulating too much detail

**Solution**:
```typescript
// Implement memory summarization
async function summarizeMemory(memory: string): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-3-haiku-20240307'),
    prompt: `
Summarize this memory into 500 tokens or less. Keep only the most important information:

${memory}
    `,
    temperature: 0.3,
  });

  return text;
}

// Run periodically when token_count > 2000
if (memory.token_count > 2000) {
  const summarized = await summarizeMemory(memory.memory_content);
  await updateUserMemory(userId, { content: summarized });
}
```

### Issue 3: Inaccurate memories

**Symptoms**: AI remembers wrong information

**Cause**: LLM extraction error or misinterpreted context

**Solutions**:
```typescript
// 1. Manual correction via API
await PUT('/api/memory', {
  memory_content: correctedMemory
});

// 2. Add correction prompt
const CORRECTION_PROMPT = `
If the user explicitly corrects previous information:
1. Note the correction
2. Update memory immediately
3. Remove old incorrect information
`;

// 3. Check audit trail
const updates = await sql`
  SELECT * FROM user_memory_updates
  WHERE user_id = ${userId}
  ORDER BY created_at DESC
  LIMIT 10
`;
console.log('Recent updates:', updates);
```

### Issue 4: Background processing slow

**Symptoms**: Memory analysis takes > 5 seconds

**Cause**: Too many messages being analyzed

**Solution**:
```typescript
// Limit conversation history sent to LLM
const recentMessages = messages.slice(-20); // Last 20 only

// Add timeout
const analysisPromise = analyzeConversation(userId, recentMessages);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject('Timeout'), 5000)
);

const result = await Promise.race([analysisPromise, timeoutPromise])
  .catch(error => {
    console.error('Memory analysis timeout:', error);
    return null;
  });
```

---

## See Also

- [AI Chatbot Setup](../../01-getting-started/ai-chatbot-setup.md) - Initial setup
- [Multimodal Support](multimodal-support.md) - Image & file handling
- [Rebuild Roadmap](rebuild-roadmap.md) - Development timeline
- [Security](security.md) - Security best practices
- [Database Schema](../../07-database/current-schema.md) - Database tables

---

**Original Files [ARCHIVED]**:
- `/docs/archive/USER_MEMORY_SYSTEM.md`
- `/docs/archive/MEMORY_SYSTEM_QUICKSTART.md`
