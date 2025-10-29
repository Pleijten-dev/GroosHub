# AI Chat Feature

This directory contains the complete AI chatbot functionality integrated from the Vercel AI Chatbot template.

## 🏗️ Architecture

### Feature Structure
```
src/features/chat/
├── components/        # React components
│   ├── chat/         # Chat UI components
│   └── ui/           # Reusable UI components (future)
├── hooks/            # Custom React hooks
├── lib/              # Business logic
│   ├── ai/          # AI configuration
│   ├── db/          # Database queries
│   └── utils/       # Utility functions
├── types/            # TypeScript types
└── actions/          # Server actions (future)
```

## 🚀 Setup Instructions

### 1. Run Database Migration

Execute the migration to create chat tables:

```bash
# Connect to your Neon PostgreSQL database
psql "$POSTGRES_URL"

# Run the migration
\i src/lib/db/migrations/002_chat_schema.sql
```

Or programmatically:

```bash
# Create a migration script
node -e "
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon(process.env.POSTGRES_URL);
const migration = fs.readFileSync('src/lib/db/migrations/002_chat_schema.sql', 'utf8');
sql(migration).then(() => console.log('Migration complete!'));
"
```

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Required: xAI API Key (default provider)
XAI_API_KEY=your_xai_api_key_here

# Optional: Alternative AI providers
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get API keys:
- **xAI (Grok)**: https://console.x.ai
- **OpenAI**: https://platform.openai.com
- **Anthropic**: https://console.anthropic.com

### 3. Verify Setup

```bash
# Install dependencies (if not already done)
pnpm install

# Run development server
pnpm dev

# Navigate to: http://localhost:3000/en/ai-assistant
```

## 📦 Components

### ChatInterface
Main container component that manages chat state and renders all sub-components.

**Props:**
- `locale`: Current language (en/nl)
- `chatId?`: Optional existing chat ID
- `initialMessages?`: Pre-loaded messages

### ChatMessages
Scrollable message list with auto-scroll behavior.

### ChatMessage
Individual message bubble with timestamp and role-based styling.

### ChatInput
Auto-resizing textarea with send button and keyboard shortcuts.

## 🎣 Hooks

### useChat
Wraps AI SDK's `useChat` with custom configuration:
- Model selection
- Locale support
- Chat persistence
- Error handling

### useChatHistory
Manages chat history state:
- Fetch all user chats
- Delete chats
- Update chat titles
- Auto-refresh

## 🌐 API Routes

### POST /api/chat
Main chat endpoint with streaming support.

**Request:**
```typescript
{
  messages: Message[],
  model?: string,
  chatId?: string,
  locale?: string
}
```

**Response:** Server-Sent Events stream

### GET /api/chat/history
Fetch user's chat history.

**Response:**
```typescript
{
  chats: Chat[]
}
```

### GET /api/chat/[id]
Get specific chat with messages.

**Response:**
```typescript
{
  chat: Chat,
  messages: ChatMessage[]
}
```

### PATCH /api/chat/[id]
Update chat title.

**Request:**
```typescript
{
  title: string
}
```

### DELETE /api/chat/[id]
Delete a chat and all its messages.

## 🗄️ Database Schema

### chats table
- `id`: UUID (primary key)
- `user_id`: Integer (foreign key to users)
- `title`: Varchar(255)
- `created_at`: Timestamp
- `updated_at`: Timestamp (auto-updated)

### messages table
- `id`: UUID (primary key)
- `chat_id`: UUID (foreign key to chats)
- `role`: Varchar(20) - 'user' | 'assistant' | 'system' | 'tool'
- `content`: Text
- `created_at`: Timestamp

### message_votes table
- `message_id`: UUID (primary key, foreign key to messages)
- `user_id`: Integer (foreign key to users)
- `is_upvoted`: Boolean
- `created_at`: Timestamp

## 🌍 Internationalization

All UI text is translated via the i18n system:

```typescript
// In components
import { useTranslation } from '@/shared/hooks/useTranslation';
const t = useTranslation();
t('chat.placeholder'); // Returns localized text

// In server components
import { getTranslations } from '@/lib/i18n/config';
const t = await getTranslations(locale);
```

Translation keys are in `src/i18n/{locale}/common.json` under the `chat` namespace.

## 🔧 Configuration

### AI Models

Edit `src/features/chat/lib/ai/models.ts` to add/remove models:

```typescript
export const chatModels: ChatModel[] = [
  {
    id: "grok-2-vision-1212",
    name: "Grok 2 Vision",
    description: "Advanced multimodal model",
    provider: 'xai',
  },
  // Add more models...
];
```

### System Prompts

Edit `src/features/chat/lib/ai/prompts.ts` to customize AI behavior:

```typescript
export function getSystemPrompt(userName, userRole, locale) {
  return `You are an AI assistant for GroosHub...`;
}
```

## 🔐 Authentication

Chat is protected by existing NextAuth middleware. Only authenticated users can:
- Send messages
- View chat history
- Create/delete chats

## 📝 Usage Example

```typescript
// In a server component
import { ChatInterface } from '@/features/chat/components/chat';

export default async function Page({ params }) {
  return <ChatInterface locale={params.locale} />;
}

// In a client component
import { useChat } from '@/features/chat/hooks';

function MyChat() {
  const { messages, input, handleSubmit, isLoading } = useChat({
    locale: 'en',
    model: 'grok-2-vision-1212',
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

## 🚧 Future Enhancements

- [ ] Chat history sidebar
- [ ] Message editing and regeneration
- [ ] File uploads (images, documents)
- [ ] Tool integration (location data queries)
- [ ] Export chat transcripts
- [ ] Voice input
- [ ] Markdown rendering with syntax highlighting
- [ ] Message reactions
- [ ] Share chats publicly

## 📚 References

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [AI Chatbot Template](https://github.com/vercel/ai-chatbot)
- [xAI API Documentation](https://docs.x.ai)

## 🐛 Troubleshooting

### Database Connection Errors
Ensure `POSTGRES_URL` is set correctly and migration has been run.

### Streaming Not Working
Check that your API route exports `export const maxDuration = 60`.

### API Key Errors
Verify API keys are set in `.env.local` and server has been restarted.

### Type Errors
Run `pnpm build` to check for TypeScript issues.
