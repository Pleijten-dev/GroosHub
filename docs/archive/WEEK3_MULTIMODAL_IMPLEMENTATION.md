# Week 3: Multi-Modal Input Implementation Guide

> **Status**: ✅ Backend Complete - Ready for Testing
> **Date**: 2025-12-02
> **Storage Solution**: Cloudflare R2
> **Cost at 1TB**: ~$91/year (vs $286 Azure, $1,050 Vercel)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [File Structure](#file-structure)
5. [API Endpoints](#api-endpoints)
6. [Security Features](#security-features)
7. [Vision-Capable Models](#vision-capable-models)
8. [Usage Examples](#usage-examples)
9. [Testing Checklist](#testing-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What Was Implemented

✅ **Complete backend infrastructure for multimodal input**:
- Cloudflare R2 storage integration (S3-compatible)
- File upload API with validation
- Presigned URL generation for secure access
- PostgreSQL metadata storage
- Vision model detection and validation

### Supported File Types

| Type | Extensions | Max Size | MIME Types |
|------|-----------|----------|------------|
| **Images** | .png, .jpg, .jpeg, .webp, .gif | 10 MB | image/png, image/jpeg, image/webp, image/gif |
| **PDFs** | .pdf | 50 MB | application/pdf |

### Security Features

- ✅ Private by default (no public access)
- ✅ Authentication required (NextAuth session)
- ✅ User ownership verification
- ✅ Presigned URLs with expiration (1 hour default, max 7 days)
- ✅ File type validation (whitelist)
- ✅ File size limits
- ✅ MIME type verification
- ✅ SQL injection protection
- ✅ Structured storage paths

---

## Architecture

### Data Flow

```
1. User uploads file
   ↓
2. POST /api/upload
   ↓
3. Authentication check (NextAuth)
   ↓
4. File validation (type, size, MIME)
   ↓
5. Upload to R2 storage
   ↓
6. Save metadata to PostgreSQL (chat_files table)
   ↓
7. Return file metadata to client
   ↓
8. User sends message with file attachment
   ↓
9. Client requests file URL
   ↓
10. GET /api/files/[fileId]
   ↓
11. Ownership verification
   ↓
12. Generate presigned URL (expires in 1 hour)
   ↓
13. Client displays/accesses file via presigned URL
```

### Storage Structure

```
R2 Bucket: grooshub-chat-files

Structure:
{environment}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}

Example:
production/users/abc123/chats/def456/messages/ghi789/1733155200000-document.pdf
development/users/xyz789/chats/uvw012/messages/rst345/1733155300000-image.png
```

### Database Schema

```sql
chat_files (
  id UUID PRIMARY KEY,
  chat_id UUID → chats(id) ON DELETE CASCADE,
  message_id UUID (nullable),
  user_id UUID → users(id) ON DELETE CASCADE,
  storage_key TEXT UNIQUE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK ('image' | 'pdf'),
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP,
  expires_at TIMESTAMP (nullable)
)
```

---

## Setup Instructions

### Step 1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
   - Name: `grooshub-chat-files`
   - Location: Auto (or choose region)
4. Click **Create bucket**

### Step 2: Generate API Tokens

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
   - Token name: `grooshub-file-uploads`
   - Permissions: **Object Read & Write**
   - Bucket: Select `grooshub-chat-files`
   - TTL: No expiry (or set as needed)
3. Click **Create API token**
4. **Save credentials immediately** (you won't see them again):
   - Access Key ID
   - Secret Access Key
   - Account ID (shown in overview)

### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=grooshub-chat-files
R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
```

### Step 4: Run Database Migration

```bash
npx tsx scripts/run-migration-chat-files.ts
```

Expected output:
```
✅ Migration completed successfully!
📝 Created table: chat_files
📝 Created 6 indexes for performance
```

### Step 5: Verify Installation

```bash
# Check TypeScript compilation
npm run build

# Check for any errors
npm run lint
```

---

## File Structure

```
src/
├── lib/
│   ├── storage/
│   │   ├── r2-client.ts              # R2 storage operations
│   │   └── file-validation.ts        # File validation utilities
│   └── ai/
│       └── models.ts                  # ✅ Already configured (11 vision models)
│
├── app/
│   └── api/
│       ├── upload/
│       │   └── route.ts               # POST: Upload files, GET: List files
│       └── files/
│           └── [fileId]/
│               └── route.ts           # GET: Presigned URL, DELETE: Delete file
│
└── scripts/
    ├── migrations/
    │   └── 003-create-chat-files-table.sql
    └── run-migration-chat-files.ts
```

---

## API Endpoints

### 1. Upload Files

**POST** `/api/upload`

**Headers:**
- `Cookie`: NextAuth session (automatic)

**Body** (multipart/form-data):
```typescript
{
  files: File[],           // 1-10 files
  chatId: string,          // Required
  messageId?: string       // Optional
}
```

**Response** (200):
```json
{
  "success": true,
  "files": [
    {
      "id": "uuid",
      "fileName": "document.pdf",
      "fileType": "pdf",
      "mimeType": "application/pdf",
      "fileSize": 1024000,
      "storageKey": "production/users/.../document.pdf",
      "createdAt": "2025-12-02T..."
    }
  ],
  "message": "Successfully uploaded 1 file(s)"
}
```

**Error Codes:**
- `401`: Unauthorized (not logged in)
- `400`: Validation error (INVALID_EXTENSION, FILE_TOO_LARGE, etc.)
- `500`: Upload failed

---

### 2. Get Presigned URL

**GET** `/api/files/[fileId]?expiresIn=3600`

**Headers:**
- `Cookie`: NextAuth session

**Query Params:**
- `expiresIn`: number (optional, 1-604800 seconds, default: 3600)

**Response** (200):
```json
{
  "success": true,
  "url": "https://...r2.cloudflarestorage.com/...?X-Amz-...",
  "expiresAt": "2025-12-02T13:00:00Z",
  "expiresIn": 3600,
  "file": {
    "id": "uuid",
    "name": "document.pdf",
    "type": "pdf",
    "mimeType": "application/pdf",
    "size": 1024000
  }
}
```

**Error Codes:**
- `401`: Unauthorized
- `403`: Forbidden (user doesn't own file)
- `404`: File not found

---

### 3. List Files

**GET** `/api/upload?chatId=uuid`

**Response** (200):
```json
{
  "success": true,
  "files": [...]
}
```

---

### 4. Delete File

**DELETE** `/api/files/[fileId]`

Deletes file from both R2 storage and database.

**Response** (200):
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

## Security Features

### 1. Authentication

All endpoints require valid NextAuth session:
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 2. Ownership Verification

Files are always verified against user ownership:
```typescript
// User can only access files from their own chats
const files = await sql`
  SELECT cf.*
  FROM chat_files cf
  JOIN chats c ON c.id = cf.chat_id
  WHERE cf.id = ${fileId}
    AND c.user_id = ${userId};  -- Ownership check
`;
```

### 3. File Validation

Comprehensive validation before upload:
```typescript
// Type whitelist (images and PDFs only)
validateFileExtension(filename, fileType);

// MIME type verification
validateMimeType(mimeType, fileType);

// Size limits (10MB images, 50MB PDFs)
validateFileSize(size, fileType);
```

### 4. Presigned URLs

Temporary access with expiration:
```typescript
// URLs expire after 1 hour by default (max 7 days)
const url = await getPresignedUrl(storageKey, 3600);

// After expiration, URL returns 403 Forbidden
```

### 5. SQL Injection Protection

Parameterized queries with Neon:
```typescript
// ✅ Safe (parameterized)
await sql`SELECT * FROM files WHERE id = ${fileId}`;

// ❌ Never do this
await sql(`SELECT * FROM files WHERE id = '${fileId}'`);
```

---

## Vision-Capable Models

**11 out of 17 models support vision** (multimodal input):

### OpenAI (4/4)
- ✅ `gpt-4o` - **Recommended** ($0.0025 input / $0.01 output per 1k tokens)
- ✅ `gpt-4o-mini` - Cheapest ($0.00015 / $0.0006)
- ✅ `gpt-4-turbo` - ($0.01 / $0.03)
- ❌ `gpt-3.5-turbo` - No vision

### Anthropic (4/4)
- ✅ `claude-sonnet-4.5` - **Default** ($0.003 / $0.015)
- ✅ `claude-sonnet-3.7` - ($0.003 / $0.015)
- ✅ `claude-haiku-3.5` - Cheapest Claude ($0.001 / $0.005)
- ✅ `claude-opus-3.5` - Most capable ($0.015 / $0.075)

### Google (3/3)
- ✅ `gemini-2.0-flash` - **FREE** ($0 / $0)
- ✅ `gemini-1.5-pro` - Largest context 2M ($0.00125 / $0.005)
- ✅ `gemini-1.5-flash` - Cheapest ($0.000075 / $0.0003)

### xAI (1/3)
- ✅ `grok-2-vision` - Only vision model ($0.002 / $0.01)
- ❌ `grok-2-latest` - No vision
- ❌ `grok-beta` - No vision

### Mistral (0/3)
- ❌ All Mistral models: No vision support

### Helper Functions

```typescript
import { getModelsByFeature, modelSupportsFeature } from '@/lib/ai/models';

// Get all vision-capable models
const visionModels = getModelsByFeature('vision');
// ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4.5', ...]

// Check specific model
const hasVision = modelSupportsFeature('gpt-4o', 'vision'); // true
const hasVision2 = modelSupportsFeature('mistral-large', 'vision'); // false

// Default vision model
import { DEFAULT_VISION_MODEL } from '@/lib/ai/models';
// 'gpt-4o'
```

---

## Usage Examples

### Frontend: Upload File

```typescript
// In your chat component
async function uploadFile(file: File, chatId: string) {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('chatId', chatId);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    console.log('Uploaded:', data.files[0]);
    return data.files[0];
  } else {
    throw new Error(data.error);
  }
}
```

### Frontend: Get File URL

```typescript
async function getFileUrl(fileId: string) {
  const response = await fetch(`/api/files/${fileId}`);
  const data = await response.json();

  if (data.success) {
    // Use presigned URL (valid for 1 hour)
    return data.url;
  } else {
    throw new Error(data.error);
  }
}
```

### Backend: Validate Model Supports Vision

```typescript
import { modelSupportsFeature } from '@/lib/ai/models';

// Before sending image to model
if (!modelSupportsFeature(selectedModel, 'vision')) {
  throw new Error(
    `Model ${selectedModel} does not support vision. ` +
    `Please use a vision-capable model like gpt-4o or claude-sonnet-4.5`
  );
}
```

---

## Testing Checklist

### Manual Testing (After Setup)

- [ ] **Upload single image**
  - [ ] PNG file (< 10MB)
  - [ ] JPG file (< 10MB)
  - [ ] Verify file appears in R2 bucket
  - [ ] Verify metadata in `chat_files` table

- [ ] **Upload single PDF**
  - [ ] PDF file (< 50MB)
  - [ ] Verify file appears in R2 bucket
  - [ ] Verify metadata in database

- [ ] **Upload multiple files** (up to 10)
  - [ ] Mix of images and PDFs
  - [ ] Verify all files uploaded

- [ ] **Validation errors**
  - [ ] Try uploading > 10MB image (should fail)
  - [ ] Try uploading > 50MB PDF (should fail)
  - [ ] Try uploading unsupported type (.txt, .docx) (should fail)
  - [ ] Try uploading > 10 files (should fail)

- [ ] **Get presigned URL**
  - [ ] Request URL for uploaded file
  - [ ] Verify URL works in browser
  - [ ] Verify URL expires after time limit

- [ ] **Access control**
  - [ ] Try accessing another user's file (should fail 403)
  - [ ] Try accessing without login (should fail 401)

- [ ] **Delete file**
  - [ ] Delete uploaded file
  - [ ] Verify file removed from R2
  - [ ] Verify metadata removed from database

### Automated Testing (TODO - Week 8)

```typescript
// test/upload.test.ts
describe('File Upload API', () => {
  it('should upload valid image', async () => {
    // Test implementation
  });

  it('should reject oversized file', async () => {
    // Test implementation
  });

  // ... more tests
});
```

---

## Troubleshooting

### Issue: "No database connection string"

**Solution**: Ensure `.env.local` has `POSTGRES_URL` set:
```bash
POSTGRES_URL=postgresql://...
```

### Issue: "Missing required environment variable: R2_ACCOUNT_ID"

**Solution**: Complete R2 setup and add all R2 env vars to `.env.local`:
```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=grooshub-chat-files
```

### Issue: "Failed to upload file to R2"

**Possible causes**:
1. Invalid API credentials
2. Bucket doesn't exist
3. Insufficient permissions on API token
4. Network connectivity issues

**Debug**:
```bash
# Check R2 credentials
echo $R2_ACCOUNT_ID
echo $R2_BUCKET_NAME

# Test R2 access manually
# (Use AWS CLI configured for R2)
```

### Issue: "File not found" when accessing

**Possible causes**:
1. File was deleted
2. Storage key mismatch
3. User doesn't own the chat

**Debug**:
```sql
-- Check if file exists in database
SELECT * FROM chat_files WHERE id = 'file-uuid';

-- Check if user owns the chat
SELECT c.user_id FROM chat_files cf
JOIN chats c ON c.id = cf.chat_id
WHERE cf.id = 'file-uuid';
```

### Issue: Presigned URL returns 403

**Possible causes**:
1. URL expired (default 1 hour)
2. Storage key doesn't match file in R2
3. CORS misconfiguration (if accessing from browser)

**Solution**:
- Generate new presigned URL
- Check R2 bucket CORS settings (if needed)

---

## Cost Estimates

Based on Cloudflare R2 pricing (November 2025):

### Storage Costs

| Usage | Monthly | Annually |
|-------|---------|----------|
| 10 GB | $0.15 | $1.80 |
| 50 GB | $0.75 | $9.00 |
| 100 GB | $1.50 | $18.00 |
| 500 GB | $7.50 | $90.00 |
| 1 TB | $15.00 | $180.00 |

### Operations Costs

| Operation | Cost | Free Tier |
|-----------|------|-----------|
| Upload (Class A) | $4.50 per 1M | 10M/month |
| Download (Class B) | $0.36 per 1M | 100M/month |
| **Egress** | **$0** | **Unlimited** |

### Example: 100 Users, 1 Year

Assumptions:
- 100 active users
- 20 files per user per year = 2,000 files
- Average file size: 2 MB
- Total storage: 4 GB
- 2,000 uploads, 10,000 downloads

**Costs:**
- Storage: 4 GB × $0.015/GB/month × 12 = $0.72/year
- Uploads: 2,000 ÷ 1,000,000 × $4.50 = $0.01
- Downloads: 10,000 ÷ 1,000,000 × $0.36 = $0.00
- Egress: **$0**

**Total: ~$0.73/year** (essentially free)

---

## Next Steps

### Week 3 Remaining Tasks

1. **PDF Processing** (Day 3-4)
   - [ ] Install PDF libraries (`pdf-parse`)
   - [ ] Create PDF parser
   - [ ] Extract text and metadata
   - [ ] Test with vision models

2. **Image Processing** (Day 5-6)
   - [ ] Image optimization (resize to 2048x2048 max)
   - [ ] Generate thumbnails
   - [ ] Test with vision models

3. **Multi-Modal UI** (Day 7)
   - [ ] File attachment UI component
   - [ ] Drag-and-drop zone
   - [ ] File preview before sending
   - [ ] Display attached files in messages
   - [ ] Model capability warnings

### Future Enhancements (Week 7+)

- [ ] Automatic file cleanup (delete expired files)
- [ ] File compression before upload
- [ ] OCR for scanned PDFs
- [ ] Image resizing/optimization
- [ ] Virus scanning integration
- [ ] File usage analytics
- [ ] Batch file operations
- [ ] File version history

---

## Resources

### Documentation
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [AWS SDK v3 for JavaScript](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
- [Vercel AI SDK - Multimodal](https://sdk.vercel.ai/docs)

### Internal Docs
- [CLAUDE.md](../CLAUDE.md) - Project guide
- [CHATBOT_REBUILD_ROADMAP.md](../CHATBOT_REBUILD_ROADMAP.md) - Full roadmap

### Related Files
- `src/lib/storage/r2-client.ts` - R2 operations
- `src/lib/storage/file-validation.ts` - Validation utilities
- `src/lib/ai/models.ts` - Model capabilities
- `src/app/api/upload/route.ts` - Upload endpoint
- `src/app/api/files/[fileId]/route.ts` - File access endpoint

---

**Last Updated**: 2025-12-02
**Status**: ✅ Backend Complete - Ready for Testing
**Next**: PDF Processing & UI Components
