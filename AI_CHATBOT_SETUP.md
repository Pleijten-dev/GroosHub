# 🤖 AI Chatbot Setup Guide

This guide will help you complete the setup of the AI chatbot feature integrated into GroosHub.

## ✅ What's Already Done

- ✅ Feature folder structure created
- ✅ TypeScript types and utilities
- ✅ Database schema designed
- ✅ AI SDK dependencies installed
- ✅ API endpoints with streaming support
- ✅ React components built
- ✅ Locale support (English & Dutch)
- ✅ Navigation item configured
- ✅ Translations added

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up Environment Variables

Create or edit `.env.local` in the project root:

```bash
# Copy example file
cp .env.local.example .env.local

# Edit and add your xAI API key
nano .env.local
```

Add this to your `.env.local`:

```bash
# Required for AI Chat
XAI_API_KEY=your_actual_xai_api_key_here
```

**Get your xAI API key:**
1. Visit https://console.x.ai
2. Sign up or log in
3. Create a new API key
4. Copy and paste it into `.env.local`

### Step 2: Run Database Migration

```bash
# Method 1: Using the migration script (recommended)
node src/features/chat/scripts/migrate.js

# Method 2: Using psql directly
psql "$POSTGRES_URL" < src/lib/db/migrations/002_chat_schema.sql
```

This creates three tables:
- `chats` - Stores chat conversations
- `messages` - Stores individual messages
- `message_votes` - Stores user feedback

### Step 3: Start the Development Server

```bash
pnpm dev
```

Then visit: **http://localhost:3000/en/ai-assistant** 🎉

## 📖 Detailed Setup

### Prerequisites

- ✅ Node.js 18+ installed
- ✅ pnpm package manager
- ✅ PostgreSQL database (Neon)
- ✅ Existing user authentication working

### Environment Variables Explained

```bash
# === REQUIRED FOR CHAT ===

# xAI API Key - For Grok models (default)
XAI_API_KEY=xai-xxx...
# Get from: https://console.x.ai

# === OPTIONAL AI PROVIDERS ===

# OpenAI - If you want to use GPT models
# OPENAI_API_KEY=sk-xxx...
# Get from: https://platform.openai.com

# Anthropic - If you want to use Claude models
# ANTHROPIC_API_KEY=sk-ant-xxx...
# Get from: https://console.anthropic.com

# === EXISTING (SHOULD ALREADY BE SET) ===
POSTGRES_URL=postgresql://...
NEXTAUTH_SECRET=xxx...
NEXTAUTH_URL=http://localhost:3000
```

### Database Schema Details

The migration creates:

#### `chats` table
```sql
id            UUID           PRIMARY KEY
user_id       INTEGER        FOREIGN KEY to users.id
title         VARCHAR(255)   Chat title
created_at    TIMESTAMP
updated_at    TIMESTAMP      Auto-updated trigger
```

#### `messages` table
```sql
id            UUID           PRIMARY KEY
chat_id       UUID           FOREIGN KEY to chats.id
role          VARCHAR(20)    'user' | 'assistant' | 'system' | 'tool'
content       TEXT           Message content
created_at    TIMESTAMP
```

#### `message_votes` table
```sql
message_id    UUID           PRIMARY KEY, FOREIGN KEY to messages.id
user_id       INTEGER        FOREIGN KEY to users.id
is_upvoted    BOOLEAN        User feedback
created_at    TIMESTAMP
```

### Verifying Setup

#### 1. Check Environment Variables
```bash
node -e "console.log('XAI_API_KEY:', process.env.XAI_API_KEY ? '✓ Set' : '✗ Missing')"
```

#### 2. Check Database Tables
```bash
psql "$POSTGRES_URL" -c "\dt" | grep -E "chats|messages"
```

Expected output:
```
 public | chats         | table | ...
 public | messages      | table | ...
 public | message_votes | table | ...
```

#### 3. Test the Chat
1. Start server: `pnpm dev`
2. Login to your account
3. Navigate to: http://localhost:3000/en/ai-assistant
4. Type a message and press Send
5. You should see a streaming response! 🎉

## 🏗️ Architecture Overview

```
User Types Message
       ↓
[ChatInput Component]
       ↓
[useChat Hook]
       ↓
POST /api/chat
       ↓
[AI SDK streamText]
       ↓
[xAI Grok Model] ← XAI_API_KEY
       ↓
[Streaming Response]
       ↓
[ChatMessages Component]
       ↓
User Sees Response (real-time)
```

## 🌍 Multi-Language Support

The chat works in both English and Dutch:

- **English**: http://localhost:3000/en/ai-assistant
- **Dutch**: http://localhost:3000/nl/ai-assistant

All UI elements automatically translate based on the locale.

## 🎨 Available AI Models

By default, two Grok models are configured:

1. **Grok 2 Vision** (`grok-2-vision-1212`)
   - Multimodal (text + vision)
   - Advanced reasoning
   - Best for complex queries

2. **Grok 2** (`grok-2-1212`)
   - Text-only
   - Faster responses
   - Best for simple queries

Users can switch models via the dropdown in the chat header.

### Adding More Models

Edit `src/features/chat/lib/ai/models.ts`:

```typescript
export const chatModels: ChatModel[] = [
  // Existing models...
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "OpenAI's most capable model",
    provider: 'openai',
  },
];
```

Don't forget to add the corresponding API key to `.env.local`!

## 🔐 Security & Authentication

- ✅ All chat routes require authentication
- ✅ Users can only see their own chats
- ✅ API keys are server-side only (never exposed to client)
- ✅ SQL injection protected (parameterized queries)
- ✅ CSRF protection via NextAuth

## 📁 File Structure

```
src/
├── features/chat/              # Main chat feature
│   ├── components/
│   │   └── chat/              # UI components
│   ├── hooks/                 # React hooks
│   ├── lib/
│   │   ├── ai/                # AI configuration
│   │   ├── db/                # Database queries
│   │   └── utils/             # Utilities
│   ├── types/                 # TypeScript types
│   ├── scripts/               # Setup scripts
│   └── README.md              # Feature documentation
│
├── app/
│   ├── [locale]/
│   │   └── ai-assistant/      # Chat page
│   └── api/chat/              # API endpoints
│       ├── route.ts           # Main chat endpoint
│       ├── history/           # Chat history
│       └── [id]/              # Individual chat ops
│
├── lib/db/migrations/
│   └── 002_chat_schema.sql    # Database migration
│
└── i18n/
    ├── en/common.json         # English translations
    └── nl/common.json         # Dutch translations
```

## 🐛 Troubleshooting

### Problem: "Unauthorized" error
**Solution:** Make sure you're logged in. The chat requires authentication.

### Problem: "XAI_API_KEY is not defined"
**Solution:**
1. Check `.env.local` exists and has `XAI_API_KEY`
2. Restart the dev server after adding env vars
3. Verify with: `echo $XAI_API_KEY`

### Problem: Database connection error
**Solution:**
1. Check `POSTGRES_URL` is correct in `.env.local`
2. Test connection: `psql "$POSTGRES_URL" -c "SELECT 1"`
3. Ensure database is accessible from your network

### Problem: Tables don't exist
**Solution:**
```bash
# Re-run migration
node src/features/chat/scripts/migrate.js

# Or manually
psql "$POSTGRES_URL" < src/lib/db/migrations/002_chat_schema.sql
```

### Problem: Streaming doesn't work
**Solution:**
1. Check `maxDuration` is exported in `src/app/api/chat/route.ts`
2. Ensure you're not behind a proxy that buffers responses
3. Try a different browser

### Problem: AI responses are slow
**Solution:**
1. Switch to `grok-2-1212` (faster, text-only model)
2. Check xAI API status: https://status.x.ai
3. Consider upgrading your xAI plan for higher rate limits

## 📚 Next Steps

Now that the chat is working, you can:

1. **Customize the System Prompt**
   - Edit: `src/features/chat/lib/ai/prompts.ts`
   - Add context about GroosHub features
   - Tailor responses to your use case

2. **Add Chat History Sidebar**
   - List all user's chats
   - Quick navigation between conversations
   - Delete old chats

3. **Integrate Location Data**
   - Create AI tools that query your location APIs
   - Allow chat to answer questions using real data
   - See: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling

4. **Add File Uploads**
   - Allow users to upload images
   - Use vision models to analyze them
   - See: Vercel Blob documentation

5. **Markdown Rendering**
   - Display formatted text
   - Syntax highlighting for code
   - Install: `react-markdown` and `react-syntax-highlighter`

## 🤝 Support

- **Feature Documentation**: `src/features/chat/README.md`
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **xAI Documentation**: https://docs.x.ai
- **Project Issues**: https://github.com/Pleijten-dev/GroosHub/issues

## 🎉 Success Checklist

- [ ] `.env.local` created with `XAI_API_KEY`
- [ ] Database migration completed successfully
- [ ] Dev server running (`pnpm dev`)
- [ ] Can access /en/ai-assistant page
- [ ] Can send messages and receive responses
- [ ] Chat persists in database
- [ ] Chat works in both English and Dutch
- [ ] Model selector works
- [ ] Messages display with timestamps
- [ ] Auto-scroll works on new messages

Once all checkboxes are ✅, you're ready to go! 🚀

---

**Built with:**
- Next.js 15
- Vercel AI SDK
- xAI Grok Models
- PostgreSQL (Neon)
- TypeScript
- Tailwind CSS

**Integrated from:**
- [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot)

Adapted with ❤️ for GroosHub by Claude Code
