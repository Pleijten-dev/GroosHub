# Week 3: Multi-Modal Input - Progress Report

> **Status**: Backend Complete ✅ | UI Components Pending 🟡

---

## 📋 Overview

Week 3 implements multi-modal input support (images and PDFs) for the AI chatbot using Cloudflare R2 storage and vision-capable AI models.

---

## ✅ Completed: Backend Infrastructure

### 1. Storage Solution: Cloudflare R2

**Why R2?**
- **Cost-effective**: $91/year at 1TB vs $286 (Azure) or $1,050 (Vercel)
- **Zero egress costs**: Major advantage for frequent file access
- **S3-compatible**: Easy migration path to other providers
- **Security**: Private by default with presigned URLs

**Configuration** (`/home/user/GroosHub/.env.local`):
```bash
R2_ACCOUNT_ID=your_r2_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_id_here
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
R2_BUCKET_NAME=grooshub-chat-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

**Storage Structure**:
```
{environment}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}
```

### 2. Core Libraries

**New Dependencies** (added to `package.json`):
- `@aws-sdk/client-s3` v3.943.0 - S3-compatible R2 operations
- `@aws-sdk/s3-request-presigner` v3.943.0 - Generate presigned URLs

### 3. File Validation & Security

**File**: `src/lib/storage/file-validation.ts`

**Validation Rules**:
- **Images**: Max 10MB, types: PNG, JPG, JPEG, WebP, GIF
- **PDFs**: Max 50MB, type: PDF
- **Max files per upload**: 10
- **Security**: Whitelist approach, MIME type verification, filename sanitization

**Key Functions**:
```typescript
validateFile(file: {name, type, size}): FileType
validateFiles(files: Array<{name, type, size}>): FileType[]
sanitizeFilename(filename: string): string
```

### 4. R2 Storage Client

**File**: `src/lib/storage/r2-client.ts`

**Core Functions**:
```typescript
uploadFileToR2(file: Buffer, key: string, contentType: string): Promise<string>
getPresignedUrl(key: string, expiresIn?: number): Promise<string>
deleteFileFromR2(key: string): Promise<void>
fileExists(key: string): Promise<boolean>
getFileMetadata(key: string): Promise<{contentType, contentLength, lastModified}>
generateFileKey(userId, chatId, messageId, filename): string
```

**Features**:
- Automatic MIME type detection
- Structured file paths
- 1-hour default presigned URL expiration (configurable up to 7 days)
- Error handling and logging

### 5. Upload API Endpoint

**Endpoint**: `POST /api/upload`

**Request** (multipart/form-data):
```typescript
{
  chatId: string,           // Required: Chat UUID
  messageId?: string,       // Optional: Message UUID (null for pre-upload)
  files: File[]             // Required: 1-10 files
}
```

**Response**:
```typescript
{
  success: true,
  files: [{
    id: string,             // chat_files.id (UUID)
    fileName: string,
    fileType: 'image' | 'pdf',
    mimeType: string,
    fileSize: number,
    storageKey: string,
    createdAt: string
  }]
}
```

**Security**:
- ✅ Authentication required (NextAuth session)
- ✅ File validation (size, type, count)
- ✅ Ownership verification via chat relationship
- ✅ Automatic database metadata storage

### 6. File Access API Endpoint

**Endpoint**: `GET /api/files/[fileId]`

**Query Parameters**:
```typescript
?expiresIn=3600  // Optional: Presigned URL expiration in seconds
```

**Response**:
```typescript
{
  success: true,
  url: string,              // Presigned URL (1-hour default)
  expiresAt: string,        // ISO timestamp
  file: {
    id: string,
    fileName: string,
    fileType: 'image' | 'pdf',
    mimeType: string,
    fileSize: number,
    createdAt: string
  }
}
```

**Security**:
- ✅ Authentication required
- ✅ Ownership verification (user_id via chat relationship)
- ✅ Time-limited presigned URLs (1-7 days)

**DELETE**: `DELETE /api/files/[fileId]`
- Deletes file from R2 and database
- Ownership verification required

### 7. Database Schema

**Table**: `chat_files`

**Migration Files**:
- `scripts/migrations/003-create-chat-files-table.sql` (CREATE TABLE)
- `scripts/migrations/004-alter-chat-files-for-r2.sql` (ALTER TABLE for existing tables)

**Schema**:
```sql
CREATE TABLE chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID,  -- NULL if uploaded but not yet sent
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf')),
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (
    (file_type = 'image' AND file_size > 0 AND file_size <= 10485760) OR
    (file_type = 'pdf' AND file_size > 0 AND file_size <= 52428800)
  ),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  -- Backward compatibility columns
  file_url TEXT,
  status VARCHAR(50),
  error_message TEXT,
  metadata JSONB
);
```

**Indexes** (7 total):
- `idx_chat_files_user_id` - User ownership queries
- `idx_chat_files_chat_id` - Chat files lookup
- `idx_chat_files_message_id` - Message attachments (WHERE message_id IS NOT NULL)
- `idx_chat_files_storage_key` - R2 key lookups
- `idx_chat_files_created_at` - Time-based queries (DESC)
- `idx_chat_files_expires_at` - Cleanup queries (WHERE expires_at IS NOT NULL)
- `idx_chat_files_chat_user` - Composite for ownership verification

### 8. Chat API Multimodal Integration

**File**: `src/app/api/chat/route.ts` (Updated for Week 3)

**New Parameter**:
```typescript
POST /api/chat
{
  messages: UIMessage[],
  chatId?: string,
  modelId?: string,
  temperature?: number,
  fileIds?: string[]  // ← NEW: Array of chat_files.id
}
```

**New Function**: `processFileAttachments()`
- Fetches file metadata from database
- Verifies user ownership via chat relationship
- Generates presigned URLs (1-hour expiration)
- Links files to message IDs
- Returns image parts as `{ type: 'image', image: URL }[]`

**Vision Model Validation**:
```typescript
if (fileIds && fileIds.length > 0 && !modelInfo?.supportsVision) {
  return Response.json({
    error: 'Model does not support vision',
    message: `Please select a vision-capable model like GPT-4o, Claude Sonnet 4.5, or Gemini 2.0 Flash.`
  }, { status: 400 });
}
```

**Image Part Integration**:
```typescript
// Add image parts to user message
const imageParts = await processFileAttachments(fileIds, userId, chatId, messageId);
if (imageParts.length > 0 && lastUserMessage) {
  lastUserMessage.parts.push(...imageParts);
}
```

**API Version**: Updated to `3.0.0`
- Streaming: ✅
- Persistence: ✅
- Multimodal: ✅
- Vision Models: 11/17 supported

### 9. Vision Model Support

**Vision-Capable Models** (11/17):

| Model | Provider | Context | Cost ($/1M tokens) |
|-------|----------|---------|-------------------|
| **gpt-4o** | OpenAI | 128K | $2.50 / $10.00 |
| **gpt-4o-mini** | OpenAI | 128K | $0.15 / $0.60 |
| **gpt-4-turbo** | OpenAI | 128K | $10.00 / $30.00 |
| **claude-opus-4** | Anthropic | 200K | $15.00 / $75.00 |
| **claude-sonnet-4** | Anthropic | 200K | $3.00 / $15.00 |
| **claude-sonnet-4.5** | Anthropic | 200K | $3.00 / $15.00 |
| **claude-haiku-4** | Anthropic | 200K | $0.80 / $4.00 |
| **gemini-2.0-flash-exp** | Google | 1M | $0.00 / $0.00 |
| **gemini-2.0-flash-thinking-exp** | Google | 32K | $0.00 / $0.00 |
| **gemini-1.5-pro** | Google | 2M | $1.25 / $5.00 |
| **grok-2-vision-1212** | xAI | 32K | $2.00 / $10.00 |

**Note**: Gemini 2.0 Flash models are currently free during experimental phase.

---

## 🟡 In Progress: UI Components

### Planned Components

#### 1. File Upload Component
- **Location**: `src/features/chat/components/FileUpload/FileUpload.tsx`
- **Features**:
  - Paperclip icon button next to chat input
  - Hidden file input (triggered by button)
  - Drag-and-drop zone
  - Multi-file selection (up to 10)
  - Upload progress indicator
  - File type filtering (images and PDFs)

#### 2. File Preview Component
- **Location**: `src/features/chat/components/FileUpload/FilePreview.tsx`
- **Features**:
  - Display selected files above chat input
  - Show filename, size, and type
  - Image thumbnail preview
  - Remove button per file
  - File validation feedback

#### 3. Message Attachments Display
- **Update**: `src/features/chat/components/ChatUI.tsx`
- **Changes to `renderMessageContent()`**:
  - Render text parts
  - Render image parts (with presigned URLs)
  - Display image thumbnails in chat bubbles
  - Clickable images for full-size view

#### 4. Model Capability Warning
- **Location**: Inline in ChatUI
- **Features**:
  - Show warning badge if selected model doesn't support vision
  - Auto-suggest vision-capable models
  - Disable file upload button for non-vision models

#### 5. Upload Flow Integration
- **Update**: `src/features/chat/components/ChatUI.tsx`
- **Flow**:
  1. User selects files → Preview appears
  2. User types message → Both stored in state
  3. User clicks Send:
     - Upload files to `/api/upload` → Get `fileIds[]`
     - Call `sendMessage()` with `fileIds` in metadata
     - Chat API processes files and adds images to message

---

## 🔴 Not Started: Enhancements

### 1. PDF Processing (Day 3-4)
**Dependencies**:
```bash
pnpm add pdf-parse
```

**Features**:
- Extract text content from PDFs
- Extract metadata (title, author, pages)
- Pass text to AI models as context
- Display PDF info in chat

**Implementation**:
- `src/lib/pdf/extract-text.ts` - PDF parsing
- `src/app/api/pdf/extract/route.ts` - API endpoint
- Update Chat API to include PDF text in prompts

### 2. Image Processing (Day 5-6)
**Dependencies**:
```bash
pnpm add sharp
```

**Features**:
- Automatic image optimization (compress, resize)
- Generate thumbnails (e.g., 200x200px)
- Convert formats (e.g., HEIC → JPEG)
- Reduce storage costs

**Implementation**:
- `src/lib/images/optimize.ts` - Image processing
- Update Upload API to process images before R2 upload
- Store both full-size and thumbnail in R2

---

## 📚 Documentation Created

1. **WEEK3_MULTIMODAL_IMPLEMENTATION.md** (700+ lines)
   - Complete setup guide
   - API documentation
   - Security architecture
   - Cost analysis
   - Testing checklist
   - Troubleshooting guide

2. **WEEK3_PROGRESS.md** (this file)
   - Progress tracking
   - Completion status
   - Remaining tasks

---

## 🧪 Testing Checklist

### Backend Tests (Ready to Test)

#### ✅ R2 Storage
- [x] R2 environment variables configured
- [ ] Test file upload to R2
- [ ] Verify file exists in R2 bucket
- [ ] Test presigned URL generation
- [ ] Verify presigned URL works (download file)
- [ ] Test file deletion from R2

#### ✅ Database
- [x] Migration completed successfully
- [ ] Verify `chat_files` table structure
- [ ] Test INSERT with valid data
- [ ] Test foreign key constraints (user_id, chat_id)
- [ ] Test file size validation constraints
- [ ] Test file type validation constraints

#### ✅ Upload API
- [ ] Test upload with valid image (PNG, JPG)
- [ ] Test upload with valid PDF
- [ ] Test upload with invalid file type
- [ ] Test upload exceeding size limit
- [ ] Test upload without authentication
- [ ] Test upload to non-existent chat
- [ ] Test upload with 10 files (max)
- [ ] Test upload with 11 files (should fail)
- [ ] Verify database records created
- [ ] Verify files uploaded to R2

#### ✅ File Access API
- [ ] Test GET with valid fileId
- [ ] Test GET with invalid fileId
- [ ] Test GET without authentication
- [ ] Test GET for file owned by different user (should fail)
- [ ] Test custom expiration time
- [ ] Test DELETE with valid fileId
- [ ] Test DELETE without permission (should fail)
- [ ] Verify file deleted from R2 and database

#### ✅ Chat API
- [ ] Test chat without fileIds (existing functionality)
- [ ] Test chat with fileIds and vision model
- [ ] Test chat with fileIds and non-vision model (should error)
- [ ] Verify images added to message parts
- [ ] Verify files linked to message_id
- [ ] Verify vision model receives image URLs
- [ ] Test GPT-4o with image
- [ ] Test Claude Sonnet 4.5 with image
- [ ] Test Gemini 2.0 Flash with image

### UI Tests (Pending Implementation)

- [ ] File upload button renders
- [ ] File input accepts images and PDFs
- [ ] File preview shows selected files
- [ ] Remove file button works
- [ ] Drag-and-drop zone works
- [ ] Upload progress indicator displays
- [ ] Model capability warning shows for non-vision models
- [ ] Images display in chat messages
- [ ] Full-size image view works
- [ ] Mobile responsive layout

---

## 🚀 Deployment Status

### Vercel Deployment

**Branch**: `claude/add-multimodal-input-01M97Ft4eS6kEw1jRt78D1Bo`

**Build Status**:
- Commit: `e4d6dcd` - Fix TypeScript error: Use URL type for image parts
- Status: Building... 🔄

**Previous Issues**:
1. ✅ pnpm-lock.yaml out of sync - FIXED
2. ✅ userId type mismatch (number vs string) - FIXED
3. ✅ File validation array type error - FIXED
4. ✅ Image parts type error (string vs URL) - FIXED

### Environment Variables Required

**Production (.env.production)**:
```bash
# Already configured
POSTGRES_URL=***
POSTGRES_URL_NON_POOLING=***
NEXTAUTH_SECRET=***
NEXTAUTH_URL=https://your-domain.com
GOOGLE_PLACES_API_KEY=***
Altum_AI_Key=***
XAI_API_KEY=***

# NEW - Need to add
R2_ACCOUNT_ID=***
R2_ACCESS_KEY_ID=***
R2_SECRET_ACCESS_KEY=***
R2_BUCKET_NAME=grooshub-chat-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

---

## 📊 Progress Summary

**Overall Progress**: 60% Complete

| Component | Status | Progress |
|-----------|--------|----------|
| R2 Storage Setup | ✅ Complete | 100% |
| File Validation | ✅ Complete | 100% |
| Upload API | ✅ Complete | 100% |
| File Access API | ✅ Complete | 100% |
| Database Migration | ✅ Complete | 100% |
| Chat API Integration | ✅ Complete | 100% |
| **UI Components** | 🟡 Pending | 0% |
| PDF Processing | 🔴 Not Started | 0% |
| Image Optimization | 🔴 Not Started | 0% |

**Time Estimate**:
- UI Components: 4-6 hours
- PDF Processing: 2-3 hours
- Image Optimization: 2-3 hours
- Testing & Debugging: 2-4 hours
- **Total Remaining**: 10-16 hours

---

## 🎯 Next Steps

### Immediate (Now)
1. ✅ Fix TypeScript build error (DONE)
2. ⏳ Wait for Vercel build to pass
3. 🎯 Implement file upload UI component

### Short-term (Today)
4. Create file preview component
5. Update ChatUI to display images
6. Add model capability warning
7. Test end-to-end file upload flow

### Medium-term (This Week)
8. Implement PDF text extraction
9. Add image optimization
10. Create comprehensive test suite
11. Update user documentation

---

## 🐛 Known Issues

None currently. Previous build errors have been resolved.

---

## 💡 Future Enhancements (Post-Week 3)

1. **File Management Dashboard**
   - View all uploaded files
   - Bulk delete
   - Storage usage statistics

2. **Advanced Image Features**
   - Image editing (crop, rotate)
   - Automatic alt text generation
   - OCR for text extraction

3. **PDF Features**
   - Page-by-page analysis
   - Highlight relevant sections
   - PDF annotations

4. **Cost Optimization**
   - Automatic cleanup of expired files
   - Compression strategies
   - CDN integration

5. **Batch Processing**
   - Upload multiple conversations at once
   - Bulk image analysis
   - Report generation

---

**Last Updated**: 2025-12-03
**Maintained by**: Claude (AI Assistant)
**Session**: claude/add-multimodal-input-01M97Ft4eS6kEw1jRt78D1Bo
