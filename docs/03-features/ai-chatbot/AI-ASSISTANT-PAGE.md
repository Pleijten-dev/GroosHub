# AI Assistant Page - Complete Documentation

> **Last Updated**: 2026-01-27
> **Version**: 3.0.0 (Multi-Modal Input)
> **Location**: `/src/app/[locale]/ai-assistant/`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Page Structure & URL Parameters](#3-page-structure--url-parameters)
4. [Views & Navigation](#4-views--navigation)
5. [Chat Feature - Deep Dive](#5-chat-feature---deep-dive)
6. [Memory System - Deep Dive](#6-memory-system---deep-dive)
7. [File Handling & Multimodal Support](#7-file-handling--multimodal-support)
8. [AI Tools & Capabilities](#8-ai-tools--capabilities)
9. [RAG System (Document Retrieval)](#9-rag-system-document-retrieval)
10. [Database Schema](#10-database-schema)
11. [API Endpoints](#11-api-endpoints)
12. [Integration with Other Pages](#12-integration-with-other-pages)
13. [Quick Notes Feature](#13-quick-notes-feature)
14. [Tasks Integration](#14-tasks-integration)
15. [Model Configuration](#15-model-configuration)
16. [Security & Authentication](#16-security--authentication)
17. [File Reference](#17-file-reference)

---

## 1. Overview

The AI Assistant page is the central hub for AI-powered interactions in GroosHub. It provides:

- **Multi-model Chat**: Stream conversations with 17+ AI models
- **Three-Tier Memory System**: Personal, project, and domain-level memory
- **Multimodal Input**: Image and file attachments with vision models
- **RAG (Retrieval Augmented Generation)**: Search project documents
- **Location Analysis Tools**: Access saved locations and data via AI
- **Task Management**: Create and manage tasks through conversation
- **Quick Notes**: Local persistent note-taking
- **Project Integration**: Project-specific chats with document context

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 15.5.4 with App Router |
| **AI SDK** | Vercel AI SDK v5 (`@ai-sdk/react`) |
| **Database** | Neon PostgreSQL with pgvector |
| **File Storage** | Cloudflare R2 |
| **Default Model** | Claude Sonnet 4.5 |
| **Streaming** | Server-Sent Events (SSE) |

---

## 2. Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Assistant Page                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌────────────────────────────────────────────┐ │
│  │   Sidebar    │    │              Main Content                   │ │
│  │  (Projects)  │    │  ┌──────────────────────────────────────┐  │ │
│  │              │    │  │  OverviewPage (default)               │  │ │
│  │ - Projects   │    │  │  - Welcome message                    │  │ │
│  │ - Chats      │    │  │  - Sample prompts                     │  │ │
│  │ - Tasks      │    │  │  - Message input                      │  │ │
│  │ - Files      │    │  │  - Deadlines calendar                 │  │ │
│  │ - Notes      │    │  │  - Task summary                       │  │ │
│  │              │    │  │  - Quick notes                        │  │ │
│  │              │    │  └──────────────────────────────────────┘  │ │
│  │              │    │                    OR                       │ │
│  │              │    │  ┌──────────────────────────────────────┐  │ │
│  │              │    │  │  ChatUI (when chat selected)          │  │ │
│  │              │    │  │  - Message history                    │  │ │
│  │              │    │  │  - Streaming responses                │  │ │
│  │              │    │  │  - File uploads                       │  │ │
│  │              │    │  │  - Model selector                     │  │ │
│  │              │    │  │  - RAG toggle                         │  │ │
│  │              │    │  └──────────────────────────────────────┘  │ │
│  └──────────────┘    └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    POST /api/chat     │
                        ├───────────────────────┤
                        │ 1. Authentication     │
                        │ 2. Message history    │
                        │ 3. Memory injection   │
                        │ 4. RAG retrieval      │
                        │ 5. File processing    │
                        │ 6. Tool definitions   │
                        │ 7. Stream response    │
                        │ 8. Save to database   │
                        │ 9. Track usage        │
                        │ 10. Queue memory sync │
                        └───────────────────────┘
```

### Component Hierarchy

```
page.tsx (Server Component)
└── AIAssistantClient.tsx (Client Component)
    ├── ProjectsSidebarEnhanced
    │   ├── Project list
    │   ├── Chat history
    │   └── Navigation items
    │
    └── Main Content (conditional)
        ├── OverviewPage (default view)
        │   ├── SamplePrompts
        │   ├── MessageInput
        │   ├── MiniCalendar
        │   ├── TaskListPreview
        │   └── QuickNotes
        │
        └── ChatUI (conversation view)
            ├── Header (model selector)
            ├── Messages Area
            │   ├── MarkdownMessage
            │   ├── ImageAttachment
            │   ├── ChartVisualization
            │   └── MessageSources (RAG)
            ├── FileUploadZone
            │   └── FilePreview
            └── Input Area
                ├── RAG toggle
                ├── Text input
                └── Send/Stop button
```

---

## 3. Page Structure & URL Parameters

### URL Pattern

```
/{locale}/ai-assistant?chat={chatId}&project_id={projectId}&view={view}&message={message}&fileIds={fileIds}
```

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `chat` | `string` (UUID) | Load existing chat by ID |
| `project_id` | `string` (UUID) | Associate chat with project |
| `view` | `enum` | Active sidebar view |
| `message` | `string` | Initial message to send automatically |
| `fileIds` | `string` | Comma-separated file IDs for initial message |

### View Options

```typescript
type View = 'overview' | 'chats' | 'tasks' | 'files' | 'notes' | 'members' | 'trash';
```

### Page Component (`page.tsx`)

**Location**: `src/app/[locale]/ai-assistant/page.tsx`

**Responsibilities**:
1. Server-side authentication check
2. Parse URL parameters
3. Redirect unauthenticated users to login
4. Render `AIAssistantClient` with Suspense fallback

**Key Code**:

```typescript
export default async function AIAssistantPage({ params, searchParams }: AIAssistantPageProps) {
  const session = await auth();
  const { locale } = await params;
  const { chat, project_id, view, message, fileIds } = await searchParams;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  // Parse comma-separated fileIds into array
  const initialFileIds = fileIds ? fileIds.split(',').filter(id => id.trim()) : undefined;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AIAssistantClient
        locale={locale}
        userEmail={session.user.email}
        userName={session.user.name}
        chatId={chat}
        projectId={project_id}
        activeView={view || 'overview'}
        initialMessage={message}
        initialFileIds={initialFileIds}
      />
    </Suspense>
  );
}
```

---

## 4. Views & Navigation

### AIAssistantClient Component

**Location**: `src/app/[locale]/ai-assistant/AIAssistantClient.tsx`

**Responsibilities**:
1. Manage view transitions with animations
2. Route between OverviewPage and ChatUI
3. Integrate sidebar navigation
4. Handle responsive layout

**View Transition System**:

```typescript
type TransitionPhase = 'idle' | 'exiting' | 'entering';

// Transition phases:
// 1. 'idle' → 'exiting' (200ms exit animation)
// 2. 'exiting' → 'entering' (switch content)
// 3. 'entering' → 'idle' (400ms enter animation)
```

**Animation Classes**:
- `page-exit-active` - Exit animation
- `animate-content-flow` - Enter animation
- `animate-fade-slide-up` - Slide up with fade
- `animate-scale-fade-in` - Scale with fade

### OverviewPage Component

**Location**: `src/features/chat/components/OverviewPage/OverviewPage.tsx`

**Layout**:
```
┌─────────────────────────────────────┬────────────────┐
│           Main Section              │  Side Section  │
│                                     │                │
│  ┌───────────────────────────────┐  │  Deadlines     │
│  │     "How can I help you?"     │  │  Calendar      │
│  │                               │  │                │
│  │     [ Sample Prompt 1 ]       │  │  Task Summary  │
│  │     [ Sample Prompt 2 ]       │  │  - To do: 5    │
│  │     [ Sample Prompt 3 ]       │  │  - Doing: 2    │
│  │     [ Sample Prompt 4 ]       │  │  - Overdue: 1  │
│  │                               │  │                │
│  │     [🔄 More examples]        │  │  My Tasks      │
│  │                               │  │  - Task 1      │
│  └───────────────────────────────┘  │  - Task 2      │
│                                     │  - Task 3      │
│  ┌───────────────────────────────┐  │                │
│  │  [📎] Type your message...    │  │  Quick Notes   │
│  └───────────────────────────────┘  │  [+ Add note]  │
│                                     │  - Note 1      │
└─────────────────────────────────────┴────────────────┘
```

**Features**:

1. **Sample Prompts**: Randomized suggestions from `samplePrompts.ts`
2. **Message Input**: With file attachment support
3. **Mini Calendar**: Shows task deadlines
4. **Task Summary**: Todo/Doing/Overdue/Due this week counts
5. **Task List**: Recent tasks with project names
6. **Quick Notes**: localStorage-based note-taking

### ChatUI Component

**Location**: `src/features/chat/components/ChatUI.tsx`

**This is the main chat interface - documented in detail in [Section 5](#5-chat-feature---deep-dive)**.

---

## 5. Chat Feature - Deep Dive

### ChatUI Component (~1,100 lines)

**Location**: `src/features/chat/components/ChatUI.tsx`

**Props Interface**:

```typescript
interface ChatUIProps {
  locale: 'nl' | 'en';
  chatId?: string;           // Load existing chat
  projectId?: string;        // Project context
  initialMessage?: string;   // Auto-send message
  initialFileIds?: string[]; // Files for initial message
  isEntering?: boolean;      // Animation state
}
```

### State Management

```typescript
// Core chat state
const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
const [input, setInput] = useState('');
const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);
const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);

// File upload state
const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([]);
const [pendingMessageText, setPendingMessageText] = useState<string | null>(null);

// RAG state
const [isRagEnabled, setIsRagEnabled] = useState(!!projectId);
const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
const [userProjects, setUserProjects] = useState<Project[]>([]);
const [isRagLoading, setIsRagLoading] = useState(false);
const [ragStatus, setRagStatus] = useState<string>('');

// Lightbox state
const [lightboxImage, setLightboxImage] = useState<LightboxState | null>(null);
```

### Vercel AI SDK v5 Integration

```typescript
const {
  messages,      // UIMessage[] - conversation history
  sendMessage,   // Send new message with metadata
  status,        // 'idle' | 'submitted' | 'streaming' | 'error'
  stop,          // Stop streaming
  setMessages,   // Override messages array
} = useChat();
```

### Message Flow

```
1. User types message + optionally attaches files
   │
2. handleSubmit() triggered
   │
   ├─ Clear input immediately
   ├─ Store pending message/attachments for display
   │
3. If RAG enabled:
   │  ├─ POST /api/rag/classify-query (cheap LLM call)
   │  │  └─ Determines if query is document-related
   │  │
   │  └─ If document-related:
   │     └─ POST /api/projects/{id}/rag/agent
   │        └─ Returns answer + sources + confidence
   │
4. sendMessage() called with:
   │  ├─ text: User's message
   │  └─ metadata: { chatId, modelId, locale, fileIds, projectId, ragContext }
   │
5. POST /api/chat processes request:
   │  ├─ Authentication
   │  ├─ Chat creation/loading
   │  ├─ File processing (image resize + base64)
   │  ├─ Memory injection
   │  ├─ RAG context injection
   │  ├─ Tool definitions
   │  └─ Stream response
   │
6. Frontend receives streaming chunks
   │  └─ Messages array updates in real-time
   │
7. On stream completion:
   │  ├─ Refetch messages (for visualization JSON)
   │  ├─ Clear pending state
   │  └─ Save assistant message to database
   │
8. Memory analysis queued (background)
```

### Key Functions

#### `handleSubmit(e: FormEvent)`

Main form submission handler:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading || isRagLoading) return;

  const queryText = input;
  setInput(''); // Clear input immediately

  // Store pending state for immediate display
  setPendingMessageText(queryText);
  if (imageAttachments.length > 0) {
    setPendingAttachments(imageAttachments);
  }

  // RAG processing (if enabled)
  if (isRagEnabled && selectedProjectId) {
    // ... RAG pipeline (see Section 9)
  }

  // Send message with metadata
  sendMessage({
    text: queryText,
    metadata: {
      chatId: currentChatIdRef.current,
      modelId: selectedModel,
      locale,
      fileIds: allFileIds,
      projectId,
      ragContext, // If RAG found results
    },
  });
};
```

#### `renderMessageContent(message: UIMessage)`

Renders message parts with special handling:

```typescript
const renderMessageContent = (message: UIMessage) => {
  return message.parts.map((part, index) => {
    if (part.type === 'text') {
      // Try to parse as chart visualization
      const chartData = tryParseChartData(part.text);
      if (chartData) {
        return <ChartVisualization {...chartData} />;
      }
      // Regular markdown
      return <MarkdownMessage content={part.text} variant={message.role} />;
    }
    return null;
  });
};
```

#### `extractImages(message: UIMessage)`

Extracts image attachments from message parts:

```typescript
const extractImages = (message: UIMessage) => {
  const images: ImageData[] = [];

  message.parts.forEach((part, index) => {
    // Handle FileUIPart with type 'file' and image mediaType
    if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
      images.push({
        url: part.url,
        fileName: `image-${index}.${part.mediaType.split('/')[1]}`,
        index
      });
    }
  });

  return images;
};
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + Enter` | Send message |
| `Escape` | Stop streaming |

### RAG Citations Display

When RAG sources are included in a message:

```typescript
// In message metadata
message.metadata.ragSources = [
  {
    id: string,
    sourceFile: string,
    pageNumber: number,
    chunkText: string,
    similarity: number,  // 0-1
    fileId: string       // For opening document
  }
];
```

The UI displays:
1. Source number badge (`[Source 1]`)
2. Direct quote from document
3. File name and page number
4. Relevance percentage
5. "Open complete document" button

---

## 6. Memory System - Deep Dive

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory System                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tier 1: Personal Memory (per user)                         │
│  ├─ Identity (name, position, organization)                 │
│  ├─ Learned preferences with confidence scores              │
│  └─ Stored in: user_memories table                          │
│                                                              │
│  Tier 2: Project Memory (per project)                       │
│  ├─ Hard values (BVO, units, target groups, etc.)           │
│  ├─ Soft context (design decisions, client preferences)     │
│  └─ Stored in: project_memories table                       │
│                                                              │
│  Tier 3: Domain Memory (organization-wide)                  │
│  ├─ Explicit knowledge (admin-entered)                      │
│  ├─ Learned patterns (cross-project analysis)               │
│  └─ Stored in: domain_memories table                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Personal Memory Store

**Location**: `src/features/ai-assistant/lib/personal-memory-store.ts`

#### Key Functions

| Function | Description |
|----------|-------------|
| `getPersonalMemory(userId)` | Load user's memory from database |
| `updatePreference(params)` | Learn/update a preference with confidence |
| `deletePreference(userId, preferenceId)` | Remove a preference (GDPR) |
| `editPreference(userId, preferenceId, newValue)` | Manual user override |
| `addPreferenceManually(userId, key, value)` | Admin/user manual add |
| `clearPersonalMemory(userId)` | Delete all memory (GDPR) |
| `formatPersonalMemoryForPrompt(memory)` | Format for system prompt |

#### Confidence Calculation

```typescript
function calculateConfidence(reinforcements: number, contradictions: number): number {
  return reinforcements / (reinforcements + contradictions + 1);
}

// Examples:
// New (0, 0): 0 / 1 = 0.00
// After 1 reinforcement: 1 / 2 = 0.50
// After 5 reinforcements: 5 / 6 = 0.83
// 25 reinforcements, 5 contradictions: 25 / 31 = 0.81
```

#### Preference Update Logic

```typescript
async function updatePreference(params: UpdatePreferenceParams): Promise<PreferenceUpdateResult> {
  const { userId, key, value, source, isExplicit } = params;

  // Get current memory
  const memory = await getPersonalMemory(userId);
  const existing = memory.preferences.find(p => p.key === key);

  if (!existing) {
    // NEW PREFERENCE
    // Start with confidence 0.3 (or 0.5 if explicit)
    return { action: 'created', preference: newPreference };
  }

  if (existing.value === value) {
    // SAME VALUE - Reinforce
    existing.reinforcements += 1;
    existing.confidence = calculateConfidence(existing.reinforcements, existing.contradictions);
    return { action: 'reinforced', preference: existing };
  }

  // DIFFERENT VALUE - Handle contradiction
  return handleContradiction(memory, existing, value, source, isExplicit);
}
```

#### Contradiction Handling

Four cases based on existing preference state:

1. **Explicit correction** (`isExplicit = true`): Always wins
   - User said "I actually prefer X"
   - Reset preference with new value

2. **Well-established** (confidence ≥ 0.7): Track but don't change
   - Single implicit contradiction doesn't override
   - Confidence naturally decays

3. **Weak preference** (< 3 reinforcements): Replace
   - Not enough evidence to keep
   - Replace with new value

4. **Medium confidence**: Track contradiction
   - Increment contradictions
   - Don't update value yet

### Memory Sources

```typescript
type MemorySource =
  | 'chat'      // AI chat conversations
  | 'panel'     // AI panel interactions
  | 'document'  // Uploaded documents
  | 'location'  // Location analysis
  | 'lca'       // LCA calculations
  | 'task'      // Task management
  | 'manual'    // User manual edit
  | 'admin'     // Admin edit
  | 'system';   // System-generated
```

### Memory Injection into Prompts

**Location**: `src/features/ai-assistant/lib/memory-injector.ts`

```typescript
async function getMemoryPromptSection(
  userId: number,
  projectId?: string,
  maxTokens: number = 1500
): Promise<FormattedMemoryPrompt> {
  const context = await getCombinedMemoryContext(userId, projectId);

  // Token budget allocation
  const allocation = {
    personal: 0.30,  // 30%
    project: 0.50,   // 50% (highest priority)
    domain: 0.20,    // 20%
  };

  // Format each tier and combine
  return {
    text: formattedText,
    tokenEstimate: totalTokens,
    sources: contributingSources,
  };
}
```

### Memory Synthesis Triggers

Memory analysis runs in the background when:

1. Every 5 messages in a conversation
2. After 3+ messages if never synthesized
3. Every 24 hours since last synthesis
4. On significant events (explicit preferences, corrections)

---

## 7. File Handling & Multimodal Support

### File Upload Flow

```
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  FileUploadZone  │────>│  POST /api/upload│────>│  Cloudflare R2  │
│  (drag & drop)   │     │  (validation)    │     │  (storage)      │
└──────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  FilePreview     │     │  Message Send   │     │  POST /api/chat │
│  (local preview) │────>│  (attach IDs)   │────>│  (process)      │
└──────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Image Resize   │
                                                 │  (sharp)        │
                                                 │  1024x1024 max  │
                                                 │  JPEG 80%       │
                                                 │  Base64 encode  │
                                                 └─────────────────┘
```

### FileUploadZone Component

**Location**: `src/features/chat/components/FileUploadZone.tsx`

**Features**:
- Drag-and-drop file selection
- Click-to-select file picker
- Model vision capability checking
- Warning for non-vision models
- Upload progress tracking
- File preview with FilePreview component
- Retry failed uploads

**Accepted File Types**:
```
image/png, image/jpeg, image/webp, image/gif, application/pdf
```

**Props**:

```typescript
interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles: UploadedFile[];
  chatId: string;              // Required for R2 path
  projectId?: string;          // Optional: show in project files
  disabled: boolean;           // During message sending
  modelSupportsVision: boolean; // Hide upload if false
  locale: 'nl' | 'en';
}
```

### Image Processing in API

**Location**: `src/app/api/chat/route.ts` - `processFileAttachments()`

```typescript
async function processFileAttachments(
  fileIds: string[],
  userId: number,
  chatId: string,
  messageId: string
): Promise<FileUIPart[]> {
  for (const fileId of fileIds) {
    // 1. Verify ownership via database join
    const file = await db`
      SELECT ... FROM file_uploads fu
      JOIN chat_conversations cc ON cc.id = fu.chat_id
      WHERE fu.id = ${fileId} AND cc.user_id = ${userId}
    `;

    // 2. Only process images (PDFs handled separately)
    if (file.file_type !== 'image') continue;

    // 3. Get presigned URL from R2
    const presignedUrl = await getPresignedUrl(file.storage_key, 3600);

    // 4. Download and resize with sharp
    const imageBuffer = await fetch(presignedUrl).then(r => r.arrayBuffer());

    const resizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(1024, 1024, {
        fit: 'inside',           // Maintain aspect ratio
        withoutEnlargement: true // Don't upscale small images
      })
      .jpeg({ quality: 80 })     // Convert to JPEG 80%
      .toBuffer();

    // 5. Convert to base64 data URL
    const base64 = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // 6. Create FileUIPart
    fileParts.push({
      type: 'file',
      mediaType: 'image/jpeg',
      url: dataUrl,
    });
  }

  return fileParts;
}
```

**Size Reduction**: 85-90% reduction typical (e.g., 2MB → 200KB)

### Vision-Capable Models

11 out of 17 models support vision input:

| Provider | Vision Models |
|----------|---------------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| **Anthropic** | claude-sonnet-4.5, claude-sonnet-3.7 |
| **Google** | gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash |
| **Mistral** | mistral-large, mistral-nemo |
| **xAI** | grok-2-vision |

---

## 8. AI Tools & Capabilities

### Location Analysis Tools

The AI has access to tools for querying saved locations:

| Tool | Description |
|------|-------------|
| `listUserSavedLocations` | Get all saved locations via project memberships |
| `getLocationData` | Get specific category data (demographics, health, safety, etc.) |
| `getPersonaInfo` | Housing personas reference (30+ types) |
| `compareLocations` | Side-by-side comparison of 2-4 locations |
| `searchAmenities` | Filter amenities by category and distance |
| `explainDataSource` | Educational info about CBS, RIVM, Politie, etc. |

### Visualization Tools

| Tool | Description |
|------|-------------|
| `visualizeDemographics` | Age, marital status, migration, family charts |
| `visualizeSafety` | Crime statistics charts |
| `visualizeHealth` | Health indicator charts |
| `visualizeLivability` | Quality of life metrics |
| `visualizeHousing` | Housing market data |

**Visualization Output Format**:

```json
{
  "success": true,
  "address": "Hoofdstraat 1, Amsterdam",
  "visualizationType": "demographics",
  "charts": {
    "age": {
      "title": "Age Distribution",
      "type": "density",
      "data": [
        { "name": "0-15", "value": 15.2, "color": "#477638" },
        { "name": "15-25", "value": 12.8, "color": "#5a8a4d" }
      ]
    }
  }
}
```

### Task Management Tools

| Tool | Description |
|------|-------------|
| `listUserTasks` | Filter by status, priority, deadline |
| `createTask` | Create with dependencies and tags |
| `updateTask` | Update status, priority, deadline |
| `completeTask` | Mark task as done |
| `deleteTask` | Soft delete task |

### Tool Implementation

Tools are defined in the API route with user context injected:

```typescript
const locationTools = {
  listUserSavedLocations: tool({
    description: `Get all saved locations accessible to the current user...`,
    inputSchema: z.object({}),
    async execute() {
      // userId injected from session - not exposed to LLM
      const results = await db`
        SELECT ... FROM location_snapshots ls
        JOIN project_members pm ON ...
        WHERE pm.user_id = ${userId}
      `;
      return { success: true, locations: results };
    },
  }),
  // ... more tools
};
```

---

## 9. RAG System (Document Retrieval)

### Two RAG Modes

1. **Phase 4 Agent RAG** (Priority)
   - External agent processes query
   - Returns confidence score
   - Pre-filtered sources
   - Used when `metadata.ragContext` is provided

2. **Legacy Project RAG** (Fallback)
   - Vector similarity search (pgvector)
   - Hybrid search (semantic + full-text)
   - Used for project-linked chats

### RAG Flow

```
┌─────────────────┐
│  User Query     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  POST /api/rag/classify-query           │
│  (Cheap LLM call to classify relevance) │
└────────┬────────────────────────────────┘
         │
         ▼
    Is document-related?
         │
    ┌────┴────┐
    │         │
    Yes       No
    │         │
    ▼         ▼
┌──────────┐  ┌────────────┐
│ RAG Agent│  │ Normal Chat│
└────┬─────┘  └────────────┘
     │
     ▼
┌──────────────────────────────────────┐
│  POST /api/projects/{id}/rag/agent   │
│  - Vector search                      │
│  - Chunk retrieval                    │
│  - Answer synthesis                   │
│  - Confidence scoring                 │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Inject into System Prompt           │
│  - Agent analysis                     │
│  - Supporting sources                 │
│  - Citation instructions              │
└──────────────────────────────────────┘
```

### RAG Context Injection

```typescript
// In POST /api/chat
let ragContext = '\n\n---\n\nRELEVANT CONTEXT FROM PROJECT DOCUMENTS (Agent RAG):\n\n';
ragContext += `Agent Analysis (${confidence} confidence):\n${answer}\n\n`;
ragContext += 'Supporting Sources:\n';

sources.forEach((source, i) => {
  ragContext += `[Source ${i + 1}: ${source.file}]\n`;
  ragContext += `${source.text}\n\n`;
});

ragContext += '---\n\n';
ragContext += 'CRITICAL INSTRUCTIONS FOR USING PROJECT DOCUMENTS:\n';
ragContext += '1. MANDATORY: Cite sources using [Source N] notation\n';
ragContext += '2. MANDATORY: Cite INLINE immediately after each fact\n';
// ... more instructions

systemPrompt = systemPrompt + ragContext;
```

### RAG Sources Storage

Sources are saved in message metadata for display:

```typescript
messageMetadata.metadata = {
  ragSources: retrievedChunks.map(chunk => ({
    id: chunk.id,
    sourceFile: chunk.sourceFile,
    pageNumber: chunk.pageNumber,
    chunkText: chunk.chunkText,
    similarity: chunk.similarity,
    fileId: chunk.fileId
  }))
};
```

---

## 10. Database Schema

### Chat Tables

#### `chat_conversations`

```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  project_id UUID REFERENCES project_projects(id),
  title TEXT NOT NULL DEFAULT 'New Chat',
  model_id VARCHAR(100),
  model_settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER
);
```

#### `chat_messages`

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id),
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,      -- Legacy text (for search)
  content_json JSONB,         -- UIMessage parts array
  content_encrypted BOOLEAN DEFAULT FALSE,
  model_id VARCHAR(100),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}', -- Includes ragSources
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `file_uploads`

```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  project_id UUID REFERENCES project_projects(id),
  file_category VARCHAR(50) NOT NULL, -- 'image', 'pdf', 'document'
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- R2 storage key
  file_size_bytes INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Memory Tables

#### `user_memories`

```sql
CREATE TABLE user_memories (
  user_id INTEGER PRIMARY KEY REFERENCES user_accounts(id),
  identity JSONB DEFAULT '{}',        -- {name, position, organization}
  memory_content TEXT DEFAULT '',      -- Legacy content
  preferences_v2 JSONB DEFAULT '[]',   -- Array of LearnedPreference
  token_count INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `memory_updates` (Audit Trail)

```sql
CREATE TABLE memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type VARCHAR(20) NOT NULL, -- 'personal', 'project', 'domain'
  memory_id VARCHAR(100) NOT NULL,
  update_type VARCHAR(20) NOT NULL, -- 'learned', 'reinforced', etc.
  preference_key VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  old_confidence FLOAT,
  new_confidence FLOAT,
  source VARCHAR(20) NOT NULL,
  source_ref UUID,
  source_text TEXT,
  updated_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### RAG Tables

#### `project_doc_chunks`

```sql
CREATE TABLE project_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id),
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),  -- pgvector
  source_file TEXT NOT NULL,
  source_url TEXT,
  page_number INTEGER,
  section_title TEXT,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector similarity index
CREATE INDEX ON project_doc_chunks
USING ivfflat (embedding vector_cosine_ops);

-- Full-text search index
CREATE INDEX ON project_doc_chunks
USING GIN (to_tsvector('dutch', chunk_text));
```

### Usage Tracking

#### `llm_usage`

```sql
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  chat_id UUID REFERENCES chat_conversations(id),
  message_id UUID,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_input DECIMAL(10, 6),
  cost_output DECIMAL(10, 6),
  request_type VARCHAR(50) NOT NULL, -- 'chat', 'embedding', etc.
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 11. API Endpoints

### Main Chat Endpoint

#### `POST /api/chat`

**Request**:
```typescript
{
  messages: UIMessage[];
  metadata: {
    chatId: string;
    modelId: string;
    locale: 'nl' | 'en';
    fileIds?: string[];
    projectId?: string;
    ragContext?: {
      answer: string;
      sources: RagSource[];
      confidence: 'low' | 'medium' | 'high';
    };
  };
}
```

**Response**: Server-Sent Events stream with UIMessage format

**Flow**:
1. Authentication check
2. Chat creation/loading
3. File processing (image resize)
4. Memory injection
5. RAG context injection
6. Tool definitions
7. Stream response
8. Save messages
9. Track usage
10. Queue memory analysis

#### `GET /api/chat`

Health check endpoint:

```json
{
  "status": "ok",
  "version": "3.0.0",
  "features": {
    "streaming": true,
    "persistence": true,
    "multimodal": true,
    "visionModels": 11
  }
}
```

### Chat Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chats` | `POST` | Create new chat |
| `/api/chats` | `GET` | List user's chats |
| `/api/chats/[id]` | `GET` | Get chat with messages |
| `/api/chats/[id]` | `PUT` | Update chat title/metadata |
| `/api/chats/[id]` | `DELETE` | Soft delete chat |
| `/api/chats/[id]/messages` | `GET` | Load messages only |

### File Upload

#### `POST /api/upload`

**Request**: `multipart/form-data`
- `file`: File binary
- `chatId`: UUID
- `projectId`: UUID (optional)

**Response**:
```json
{
  "success": true,
  "files": [{
    "id": "uuid",
    "fileName": "image.jpg",
    "fileType": "image",
    "mimeType": "image/jpeg",
    "fileSize": 102400
  }]
}
```

### RAG Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/classify-query` | `POST` | Classify if query is document-related |
| `/api/projects/[id]/rag/agent` | `POST` | Full RAG agent query |
| `/api/projects/[id]/rag/search` | `POST` | Vector similarity search |

### User Tasks

#### `GET /api/tasks/user`

Returns user's tasks across all projects with stats:

```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "stats": {
      "total_tasks": 25,
      "todo_count": 10,
      "doing_count": 5,
      "done_count": 10,
      "overdue_count": 2,
      "due_this_week": 4,
      "urgent_count": 1
    }
  }
}
```

---

## 12. Integration with Other Pages

### Location Page Integration

The AI Assistant can access saved locations from the Location page:

```typescript
// Tool: listUserSavedLocations
// Returns locations saved via Location page's "Save Analysis" feature

const locations = await db`
  SELECT ls.*, p.name as project_name
  FROM location_snapshots ls
  JOIN project_projects p ON ls.project_id = p.id
  JOIN project_members pm ON p.id = pm.project_id
  WHERE pm.user_id = ${userId}
`;
```

**Data Categories Available**:
- Demographics (CBS)
- Health (RIVM)
- Safety (Politie)
- Livability (CBS)
- Amenities (Google Places)
- Housing (Altum AI)
- WMS Grading (map layers)

### Project Files Integration

Files uploaded in chat can be associated with projects:

```typescript
// FileUploadZone supports projectId
<FileUploadZone
  chatId={currentChatId}
  projectId={projectId}  // Files appear in project files
/>
```

### Tasks Integration

Tasks from any project can be:
- Listed in AI conversations
- Created via AI tools
- Updated via AI tools
- Displayed in OverviewPage sidebar

### Navigation Links

From AI Assistant to other pages:
- Click task → Project tasks page
- Click deadline → Project tasks page
- Click project → Project overview

---

## 13. Quick Notes Feature

### Overview

Simple, localStorage-based note-taking in the OverviewPage sidebar.

### Implementation

```typescript
interface QuickNote {
  id: string;
  text: string;
  createdAt: Date;
}

const [notes, setNotes] = useState<QuickNote[]>([]);

// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('quickNotes');
  if (saved) setNotes(JSON.parse(saved));
}, []);

// Save to localStorage on change
useEffect(() => {
  if (notes.length > 0) {
    localStorage.setItem('quickNotes', JSON.stringify(notes));
  }
}, [notes]);
```

### Features

- Add notes with Enter key or button click
- Delete notes with hover reveal X button
- Maximum 5 notes displayed (scrollable)
- Persists across sessions (localStorage)
- No database storage (client-only)

### Future Enhancements (TODO)

- Database storage for sync across devices
- Rich text editing
- Note categories/tags
- Search functionality
- Share notes with projects

---

## 14. Tasks Integration

### Task Display in OverviewPage

```typescript
interface TaskPreview {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deadline: string | null;
  createdAt: string;
  projectName: string;
  isOverdue: boolean;
  daysUntilDeadline: number | null;
  assignedUsers: User[];
}
```

### Components

1. **TaskListPreview**: Recent tasks with sort options
2. **MiniCalendar**: Calendar view with deadline dots
3. **Task Summary Cards**: Todo/Doing/Overdue/Due this week

### Task Tools in Chat

The AI can manage tasks through conversation:

```typescript
// Example conversation
User: "Create a task to review the floor plans by Friday"

AI: [calls createTask tool]
    {
      title: "Review the floor plans",
      deadline: "2026-01-31",
      priority: "normal"
    }

AI: "I've created a task 'Review the floor plans' with a deadline of Friday, January 31st."
```

---

## 15. Model Configuration

### Available Models (17 total)

**Location**: `src/lib/ai/models.ts`

| Provider | Model ID | Vision | Context |
|----------|----------|--------|---------|
| **OpenAI** | gpt-4o | Yes | 128K |
| | gpt-4o-mini | Yes | 128K |
| | gpt-4-turbo | Yes | 128K |
| | gpt-3.5-turbo | No | 16K |
| **Anthropic** | claude-sonnet-4.5 | Yes | 200K |
| | claude-sonnet-3.7 | Yes | 200K |
| | claude-haiku-3.5 | No | 200K |
| | claude-opus-3.5 | No | 200K |
| **Google** | gemini-2.0-flash | Yes | 1M |
| | gemini-1.5-pro | Yes | 2M |
| | gemini-1.5-flash | Yes | 1M |
| **Mistral** | mistral-large | Yes | 128K |
| | mistral-small | No | 32K |
| | mistral-nemo | Yes | 128K |
| **xAI** | grok-2-latest | No | 128K |
| | grok-2-vision | Yes | 128K |
| | grok-beta | No | 128K |

### Model Capabilities

```typescript
interface ModelCapabilities {
  supportsVision: boolean;
  supportsTools: boolean;
  supportsImageGeneration: boolean;
  maxTokens: number;
  contextWindow: number;
  streamingSupported: boolean;
  providers: string[];
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

const MODEL_CAPABILITIES: Record<ModelId, ModelCapabilities> = {
  'claude-sonnet-4.5': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 200000,
    streamingSupported: true,
    providers: ['anthropic'],
    costPer1kTokens: { input: 0.003, output: 0.015 }
  },
  // ... more models
};
```

### Default Model

```typescript
const DEFAULT_MODEL: ModelId = 'claude-sonnet-4.5';
```

---

## 16. Security & Authentication

### Authentication Flow

1. **Server-side check** in `page.tsx`:
   ```typescript
   const session = await auth();
   if (!session?.user) {
     redirect(`/${locale}/login`);
   }
   ```

2. **API route check** in `/api/chat`:
   ```typescript
   const session = await auth();
   if (!session?.user) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized' }),
       { status: 401 }
     );
   }
   ```

### Data Access Control

**Location data**: User can only access locations through project memberships:
```sql
WHERE pm.user_id = ${userId}
  AND pm.left_at IS NULL
  AND ls.is_active = true
```

**Chat data**: User can only access their own chats:
```sql
WHERE user_id = ${userId}
  AND deleted_at IS NULL
```

**File data**: Ownership verified via chat join:
```sql
SELECT ... FROM file_uploads fu
JOIN chat_conversations cc ON cc.id = fu.chat_id
WHERE fu.id = ${fileId}
  AND cc.user_id = ${userId}
```

### File Security

- **Presigned URLs**: 1-hour expiration for R2 access
- **Ownership verification**: Database join before generating URL
- **Image processing**: Server-side resize prevents large uploads
- **Type validation**: Client and server-side MIME type checking

### Memory Privacy

- **User isolation**: Each user has separate memory record
- **GDPR compliance**: `clearPersonalMemory()` for full deletion
- **Manual override**: Users can edit/delete preferences
- **Audit trail**: `memory_updates` table tracks all changes

### Soft Deletes

Chats use soft deletion with 30-day recovery:
```typescript
await db`
  UPDATE chat_conversations
  SET deleted_at = CURRENT_TIMESTAMP,
      deleted_by_user_id = ${userId}
  WHERE id = ${chatId}
`;
```

---

## 17. File Reference

### Page Components

| File | Lines | Description |
|------|-------|-------------|
| `src/app/[locale]/ai-assistant/page.tsx` | ~55 | Server component, auth, URL params |
| `src/app/[locale]/ai-assistant/AIAssistantClient.tsx` | ~165 | Client component, view routing |
| `src/app/[locale]/ai-assistant/chats/[id]/page.tsx` | ~30 | Individual chat page |
| `src/app/[locale]/ai-assistant/notes/page.tsx` | ~20 | Notes page placeholder |

### Chat Components

| File | Lines | Description |
|------|-------|-------------|
| `src/features/chat/components/ChatUI.tsx` | ~1,100 | Main chat interface |
| `src/features/chat/components/OverviewPage/OverviewPage.tsx` | ~575 | Landing page |
| `src/features/chat/components/MarkdownMessage.tsx` | ~150 | Markdown rendering |
| `src/features/chat/components/ImageAttachment.tsx` | ~100 | Image display |
| `src/features/chat/components/FileUploadZone.tsx` | ~450 | File upload UI |
| `src/features/chat/components/FilePreview.tsx` | ~150 | File preview cards |
| `src/features/chat/components/ImageLightbox.tsx` | ~80 | Fullscreen image viewer |
| `src/features/chat/components/ChartVisualization.tsx` | ~200 | 3D chart rendering |
| `src/features/chat/components/MessageSources.tsx` | ~100 | RAG citation display |
| `src/features/chat/components/SamplePrompts/index.tsx` | ~100 | Sample prompt cards |

### AI Assistant Feature

| File | Lines | Description |
|------|-------|-------------|
| `src/features/ai-assistant/lib/personal-memory-store.ts` | ~670 | Personal memory CRUD |
| `src/features/ai-assistant/lib/project-memory-store.ts` | ~400 | Project memory CRUD |
| `src/features/ai-assistant/lib/domain-memory-store.ts` | ~300 | Domain memory CRUD |
| `src/features/ai-assistant/lib/memory-injector.ts` | ~340 | Memory prompt injection |
| `src/features/ai-assistant/types/memory.ts` | ~460 | TypeScript types |
| `src/features/ai-assistant/components/AIButton.tsx` | ~100 | Quick AI access button |
| `src/features/ai-assistant/components/AIPanel.tsx` | ~200 | Floating AI panel |

### API Routes

| File | Lines | Description |
|------|-------|-------------|
| `src/app/api/chat/route.ts` | ~1,740 | Main chat streaming endpoint |
| `src/app/api/chats/route.ts` | ~200 | Chat CRUD |
| `src/app/api/chats/[id]/route.ts` | ~150 | Single chat operations |
| `src/app/api/chats/[id]/messages/route.ts` | ~80 | Message loading |
| `src/app/api/upload/route.ts` | ~200 | File upload handler |

### Libraries

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/ai/chat-store.ts` | ~530 | Chat persistence layer |
| `src/lib/ai/models.ts` | ~300 | Model configuration |
| `src/lib/ai/memory-store.ts` | ~200 | Memory utilities |
| `src/lib/ai/memory-analyzer.ts` | ~150 | Background memory analysis |
| `src/lib/ai/rag/retriever.ts` | ~200 | RAG vector search |
| `src/lib/storage/r2-client.ts` | ~100 | Cloudflare R2 client |
| `src/lib/storage/file-validation.ts` | ~80 | File type validation |

### Database Queries

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/db/queries/chats.ts` | ~150 | Chat queries |
| `src/lib/db/queries/files.ts` | ~100 | File queries |
| `src/lib/db/queries/project-doc-chunks.ts` | ~80 | RAG chunk queries |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total chat-related files** | ~35 |
| **Total memory system files** | ~20 |
| **API endpoints** | 7+ routes |
| **Database tables** | 8+ chat/memory specific |
| **AI models available** | 17 |
| **Vision-capable models** | 11/17 |
| **Tools available to AI** | 20+ (13 location + 7 task) |
| **Memory tiers** | 3 (personal, project, domain) |
| **Message history retention** | 20 messages per context |
| **Lines of code (estimate)** | ~8,000 |

---

## 18. Quick Actions System

### Overview

The AI Assistant provides context-aware quick actions through the `useAIAssistant` hook and floating AIButton/AIPanel components.

**Location**: `src/features/ai-assistant/hooks/useAIAssistant.tsx` (~670 lines)

### AIAssistantProvider

```typescript
interface AIAssistantProviderProps {
  children: ReactNode;
  feature: AIFeature;      // 'location' | 'project' | 'task' | 'lca' | 'chat'
  projectId?: string;
  initialContext?: Partial<AIContextData>;
  showButton?: boolean;    // Show floating AI button
}
```

### Quick Actions by Location Tab

The Location page has **11 tabs**, each with 3 context-specific quick actions:

| Tab | Primary Action | Other Actions |
|-----|----------------|---------------|
| **doelgroepen** | Explain scenario | Suggest best, Compare all |
| **score** | Explain breakdown | Improvement tips, Executive summary |
| **demografie** | Population profile | Recommend services, Compare scenarios |
| **veiligheid** | Safety assessment | Recommend improvements, Benchmark |
| **gezondheid** | Health needs | Wellness programs, Facility priorities |
| **leefbaarheid** | Livability factors | Community plan, Facility improvements |
| **voorzieningen** | Find missing amenities | Recommend new, Local guide |
| **woningmarkt** | Market analysis | Investment recommendation, Demand analysis |
| **kaarten** | Site constraints | Environmental risks, Development strategy |
| **pve** | Program mix | Generate specifications, Compare scenarios |
| **genereer-rapport** | Full report (disabled) | Executive summary, Investor pitch |

### Animation States

```typescript
type AIButtonAnimationState = 'idle' | 'pulse' | 'glow';

// Animation triggers:
// - Tab change → 'glow' for 5s
// - New suggestions available → 'glow'
// - Auto-decay: glow → pulse (10s) → idle (20s)
```

### Hook Usage

```typescript
const {
  // Panel controls
  isPanelOpen,
  openPanel,
  closePanel,
  togglePanel,

  // Context
  context,
  setContext,
  registerAction,

  // Animation
  animationState,
  triggerAnimation,

  // Quick actions
  quickActions,
  registerQuickAction,
  unregisterQuickAction,

  // Analytics
  trackEvent,
} = useAIAssistant();
```

---

## 19. Additional Components

### ChatList Component

**Location**: `src/features/chat/components/ChatList.tsx` (~210 lines)

Standalone page for viewing all user conversations.

**Features**:
- List all chats with title, model, and timestamp
- Delete chats with confirmation dialog
- Navigate to individual chats
- Relative time formatting (now, 5m, 2h, 3d)
- Empty state with "Start new conversation" prompt

### NotesPageClient Component

**Location**: `src/app/[locale]/ai-assistant/notes/NotesPageClient.tsx` (~176 lines)

**Status**: UI Only - Backend Not Implemented

**Current State**:
- Grid layout for note cards (responsive)
- "Coming Soon" placeholder message
- Create note button (logs to console only)
- ProjectsSidebarEnhanced integration

**TODOs** (from source code):
1. Create notes table in database
2. Create API endpoints for CRUD operations
3. Implement note creation modal
4. Add rich text editor support
5. Link notes to projects/tasks

### ProjectOverviewPage Component

**Location**: `src/features/chat/components/ProjectOverviewPage/ProjectOverviewPage.tsx`

Project-specific landing page with:
- Project summary and metadata
- Recent project chats
- Project-specific sample prompts
- Quick actions for the project

---

## 20. Complete API Endpoint Reference

### Chat Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | `POST` | Stream chat response |
| `/api/chat` | `GET` | Health check |
| `/api/chat/[id]/messages` | `GET` | Load messages for chat |
| `/api/chat/conversations` | `GET` | List conversations |
| `/api/chats` | `POST` | Create new chat |
| `/api/chats` | `GET` | List user's chats |
| `/api/chats/[id]` | `GET` | Get single chat |
| `/api/chats/[id]` | `PATCH` | Update chat |
| `/api/chats/[id]` | `DELETE` | Soft delete chat |
| `/api/chats/[id]/restore` | `POST` | Restore deleted chat |
| `/api/chats/[id]/permanent` | `DELETE` | Permanently delete |

### File Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | `POST` | Upload file to R2 |
| `/api/upload/presigned` | `POST` | Get presigned URL for direct upload |
| `/api/upload/complete` | `POST` | Mark upload complete |
| `/api/files` | `GET` | List files |
| `/api/files/[fileId]` | `GET` | Get file metadata |
| `/api/files/[fileId]` | `DELETE` | Soft delete file |
| `/api/files/[fileId]/restore` | `POST` | Restore deleted file |
| `/api/files/[fileId]/permanent` | `DELETE` | Permanently delete |
| `/api/files/trash` | `GET` | List deleted files |
| `/api/files/cleanup` | `POST` | Cleanup old files |

### RAG Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/classify-query` | `POST` | Classify if query is document-related |
| `/api/projects/[id]/rag/agent` | `POST` | Full RAG agent query |
| `/api/projects/[id]/rag/retrieve` | `POST` | Vector similarity search |
| `/api/projects/[id]/rag/inspect-chunks` | `GET` | Debug document chunks |

### AI Assistant

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai-assistant/execute-tool` | `POST` | Execute quick action tool |

---

## 21. Incomplete Features (TODOs)

### Notes Feature (HIGH PRIORITY)

**Status**: UI only, no backend

**Required Implementation**:
1. Database schema for `notes` table
2. API endpoints: `/api/notes` (CRUD)
3. Note creation modal with rich text editor
4. Project/task linking
5. Search and filtering

**Files affected**:
- `src/app/[locale]/ai-assistant/notes/page.tsx`
- `src/app/[locale]/ai-assistant/notes/NotesPageClient.tsx`

### Analytics Tracking (LOW PRIORITY)

**Status**: Console logging only

**Location**: `src/features/ai-assistant/hooks/useAIAssistant.tsx:577`

```typescript
const trackEvent = useCallback(async (action: string, metadata?: Record<string, unknown>) => {
  // TODO: Implement actual analytics tracking
  console.log(`[AIAssistant] Track: ${feature}/${action}`, metadata);
}, [feature]);
```

### Report Generation (DISABLED)

**Status**: Actions defined but marked as `available: false`

Quick actions for `genereer-rapport` tab are disabled:
- Full report generation
- Executive summary
- Investor pitch

---

## 22. Complete File Inventory

### Page Components (6 files)

```
src/app/[locale]/ai-assistant/
├── page.tsx                     # Main page (server component)
├── AIAssistantClient.tsx        # Client orchestrator
├── new/page.tsx                 # New chat page
├── chats/[id]/page.tsx          # Individual chat page
├── notes/page.tsx               # Notes page (server)
└── notes/NotesPageClient.tsx    # Notes page (client)
```

### Chat Components (15 files)

```
src/features/chat/components/
├── ChatUI.tsx                   # Main chat interface (~1,100 lines)
├── ChatList.tsx                 # Chat list view (~210 lines)
├── MarkdownMessage.tsx          # Markdown rendering
├── ImageAttachment.tsx          # Image display
├── ImageLightbox.tsx            # Fullscreen viewer
├── FileUploadZone.tsx           # File upload UI
├── FilePreview.tsx              # File preview cards
├── ChartVisualization.tsx       # 3D chart rendering
├── MessageSources.tsx           # RAG citations
├── OverviewPage/
│   ├── OverviewPage.tsx         # Landing page (~575 lines)
│   └── index.ts
├── ProjectOverviewPage/
│   ├── ProjectOverviewPage.tsx  # Project overview
│   └── index.ts
└── SamplePrompts/
    ├── SamplePrompts.tsx        # Prompt suggestions
    └── index.ts
```

### Chat Data Layer (5 files)

```
src/features/chat/
├── types/index.ts               # Type definitions
├── config/samplePrompts.ts      # Sample prompts config
├── lib/prompts/
│   ├── system-prompt.ts         # System prompts
│   └── agent-prompts.ts         # Agent prompts
└── tools/taskTools.ts           # Task management tools
```

### AI Assistant Feature (15 files)

```
src/features/ai-assistant/
├── components/
│   ├── AIButton/AIButton.tsx    # Floating button
│   ├── AIButton/index.ts
│   ├── AIPanel/AIPanel.tsx      # Side panel
│   ├── AIPanel/index.ts
│   └── index.ts
├── hooks/
│   ├── useAIAssistant.tsx       # Context + hook (~670 lines)
│   └── index.ts
├── lib/
│   ├── memory-injector.ts       # Memory prompt injection (~340 lines)
│   ├── personal-memory-store.ts # Personal memory (~670 lines)
│   ├── project-memory-store.ts  # Project memory
│   ├── domain-memory-store.ts   # Domain memory
│   └── index.ts
├── config/model-config.ts       # Model configuration
├── types/
│   ├── memory.ts                # Memory types (~460 lines)
│   ├── components.ts            # Component types
│   └── index.ts
├── utils/
│   ├── aiToolsPayloadBuilder.ts # Tool payload builder
│   └── index.ts
└── index.ts
```

### API Routes (17+ files)

```
src/app/api/
├── chat/
│   ├── route.ts                 # Main streaming (~1,740 lines)
│   ├── [id]/messages/route.ts   # Load messages
│   └── conversations/route.ts   # List conversations
├── chats/
│   ├── route.ts                 # Create/list chats
│   └── [id]/
│       ├── route.ts             # Get/update/delete
│       ├── restore/route.ts     # Restore deleted
│       └── permanent/route.ts   # Permanent delete
├── upload/
│   ├── route.ts                 # Upload handler
│   ├── presigned/route.ts       # Presigned URLs
│   └── complete/route.ts        # Complete upload
├── files/
│   ├── route.ts                 # List files
│   ├── trash/route.ts           # Deleted files
│   ├── cleanup/route.ts         # Cleanup
│   └── [fileId]/
│       ├── route.ts             # Get/delete
│       ├── restore/route.ts     # Restore
│       └── permanent/route.ts   # Permanent delete
├── rag/
│   └── classify-query/route.ts  # Query classification
├── projects/[id]/rag/
│   ├── agent/route.ts           # RAG agent
│   ├── retrieve/route.ts        # Vector search
│   └── inspect-chunks/route.ts  # Debug chunks
└── ai-assistant/
    └── execute-tool/route.ts    # Tool execution
```

### Library Files (8 files)

```
src/lib/ai/
├── chat-store.ts                # Chat persistence (~530 lines)
├── models.ts                    # Model configuration
├── memory-store.ts              # Memory utilities
└── memory-analyzer.ts           # Background analysis

src/lib/storage/
├── r2-client.ts                 # Cloudflare R2 client
└── file-validation.ts           # File type validation

src/lib/db/queries/
├── chats.ts                     # Chat queries
└── files.ts                     # File queries
```

---

## 23. Verification Checklist

Use this checklist to verify documentation accuracy:

### Core Features
- [x] Chat streaming with Vercel AI SDK v5
- [x] Multi-model support (17 models)
- [x] File upload to Cloudflare R2
- [x] Image processing with sharp
- [x] Three-tier memory system
- [x] RAG document retrieval
- [x] Location analysis tools (13)
- [x] Task management tools (5)
- [x] Visualization tools (5)

### UI Components
- [x] ChatUI main interface
- [x] OverviewPage landing
- [x] ChatList view
- [x] FileUploadZone
- [x] MessageSources (RAG citations)
- [x] ChartVisualization
- [x] Quick Notes (localStorage)
- [x] Task summary & calendar

### API Endpoints
- [x] Chat streaming endpoint
- [x] Chat CRUD operations
- [x] File upload/management
- [x] RAG endpoints
- [x] Soft delete + restore
- [x] Permanent delete

### Quick Actions
- [x] AIButton floating button
- [x] AIPanel side panel
- [x] 11 tab-specific action sets
- [x] Animation states

### Incomplete Features
- [ ] Notes backend (database + API)
- [ ] Analytics tracking implementation
- [ ] Report generation (genereer-rapport)

---

## Related Documentation

- [Memory System](./memory-system.md)
- [Multimodal Support](./multimodal-support.md)
- [Model Configuration](./model-config.md)
- [Database Schema](/docs/07-database/current-schema.md)
- [API Reference](/docs/04-api-reference/endpoints.md)
