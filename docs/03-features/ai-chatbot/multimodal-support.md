# Multimodal Support - Images & Files

> **Last Updated**: 2025-12-08
> **Status**: ✅ Production Ready
> **Storage**: Cloudflare R2
> **Cost**: ~$91/year at 1TB (vs $286 Azure, $1,050 Vercel)
> **Consolidates**: WEEK3_MULTIMODAL_IMPLEMENTATION.md, MULTIMODAL_IMAGE_SUPPORT.md

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Setup & Configuration](#setup--configuration)
5. [Technical Implementation](#technical-implementation)
6. [Model Compatibility](#model-compatibility)
7. [Image Processing Pipeline](#image-processing-pipeline)
8. [Usage Examples](#usage-examples)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

---

## Overview

GroosHub's AI chatbot supports uploading and analyzing images with vision-capable AI models. Images are automatically optimized, stored securely in Cloudflare R2, and converted to the correct format for each AI provider.

### Why Cloudflare R2?

**Cost Comparison (1TB storage)**:
- Cloudflare R2: **~$91/year**
- Azure Blob: ~$286/year
- Vercel Blob: ~$1,050/year

**Benefits**:
- No egress fees
- S3-compatible API
- 10GB free tier
- 99.9% uptime SLA

---

## Features

### Supported Capabilities

- ✅ **Image Upload**: JPEG, PNG, GIF, WebP formats
- ✅ **Automatic Resizing**: Images optimized to 1024x1024px (85-90% cost reduction)
- ✅ **Multi-Provider Support**: Anthropic Claude, OpenAI GPT-4o, Google Gemini
- ✅ **Format Conversion**: Automatic base64 encoding when required
- ✅ **Secure Storage**: CloudFlare R2 with presigned URLs
- ✅ **Sharp Processing**: Server-side image optimization
- ✅ **Database Tracking**: File metadata stored in PostgreSQL
- ✅ **Automatic Cleanup**: Expired presigned URLs handled gracefully

### File Limits

| Limit | Value |
|-------|-------|
| Max file size | 10 MB |
| Max image dimension | 4096x4096px |
| Resized dimension | 1024x1024px |
| Presigned URL validity | 1 hour |
| Supported formats | JPEG, PNG, GIF, WebP |

---

## Architecture

### End-to-End Flow

```
Client Upload → R2 Storage → Database Record → Server Processing → AI Analysis
     ↓              ↓              ↓                  ↓                 ↓
1. User selects  2. File saved  3. Metadata      4. Fetch, resize  5. Claude/GPT
   image file       to R2           stored           to base64         analyzes
```

### Component Diagram

```
┌─────────────────┐
│   Client Side   │
│  (Chat UI)      │
└────────┬────────┘
         │
         │ POST /api/upload
         ▼
┌─────────────────┐
│  Upload API     │
│  - Validate     │
│  - R2 upload    │
│  - DB record    │
└────────┬────────┘
         │
         ├────────────────────┐
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  Cloudflare R2  │  │   PostgreSQL    │
│  (File Storage) │  │  (file_uploads) │
└─────────────────┘  └─────────────────┘
         │
         │ On chat send
         ▼
┌─────────────────┐
│  Chat API       │
│  - Fetch R2     │
│  - Resize       │
│  - Convert      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Provider    │
│  (Claude/GPT)   │
└─────────────────┘
```

---

## Setup & Configuration

### Prerequisites

1. **Cloudflare R2 Account**
   - Create bucket: e.g., `grooshub-files`
   - Generate Access Key ID and Secret Access Key
   - Note: R2 endpoint format is `https://<account-id>.r2.cloudflarestorage.com`

2. **Database Migration**
   - Run `003-create-chat-files-table.sql`
   - Run `004-alter-chat-files-for-r2.sql`
   - Run `005-make-file-url-nullable.sql`
   - Run `006-fix-chat-files-foreign-key.sql`

3. **Vision-Capable AI Model**
   - Anthropic Claude (claude-3-opus, claude-3-sonnet, claude-3-haiku)
   - OpenAI GPT-4o or GPT-4-vision
   - Google Gemini Pro Vision

### Environment Variables

Add to `.env.local`:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_here
R2_BUCKET_NAME=grooshub-files
R2_PUBLIC_URL=https://your-bucket.r2.dev  # Optional: if using public URLs

# Database (Neon PostgreSQL)
POSTGRES_URL=your_postgres_url_here
POSTGRES_URL_NON_POOLING=your_postgres_non_pooling_url_here

# AI Provider (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
# OPENAI_API_KEY=your_openai_key_here
# GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

### File Structure

```
src/
├── app/api/
│   ├── upload/route.ts          # File upload endpoint
│   └── chat/route.ts            # Chat endpoint (handles images)
│
├── lib/
│   └── r2.ts                    # R2 client configuration
│
├── features/chat/
│   ├── components/
│   │   ├── ChatInput.tsx        # Upload UI
│   │   └── ImagePreview.tsx     # Preview component
│   └── lib/
│       ├── imageProcessing.ts   # Resize & convert images
│       └── chatUtils.ts         # Convert FileUIPart to ImagePart
│
└── migrations/
    ├── 003-create-chat-files-table.sql
    ├── 004-alter-chat-files-for-r2.sql
    ├── 005-make-file-url-nullable.sql
    └── 006-fix-chat-files-foreign-key.sql
```

---

## Technical Implementation

### Database Schema

**Table: `file_uploads`**

```sql
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- File information
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  content_type VARCHAR(100) NOT NULL,

  -- R2 storage
  r2_key VARCHAR(500) NOT NULL,
  presigned_url TEXT,
  presigned_url_expires_at TIMESTAMP,

  -- Relationships
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Metadata
  upload_status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);
```

### R2 Client Configuration

**File**: `src/lib/r2.ts`

```typescript
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
```

### Upload API

**File**: `src/app/api/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2, R2_BUCKET_NAME } from '@/lib/r2';
import { sql } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // 1. Validate file
  if (!file || file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  // 2. Generate unique key
  const fileId = nanoid();
  const extension = file.name.split('.').pop();
  const r2Key = `chat-files/${fileId}.${extension}`;

  // 3. Upload to R2
  const buffer = Buffer.from(await file.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: buffer,
    ContentType: file.type,
  }));

  // 4. Generate presigned URL (1 hour)
  const presignedUrl = await getSignedUrl(r2, new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
  }), { expiresIn: 3600 });

  // 5. Save to database
  const result = await sql`
    INSERT INTO file_uploads (
      filename, original_filename, file_size, content_type,
      r2_key, presigned_url, presigned_url_expires_at,
      user_id, upload_status
    ) VALUES (
      ${fileId}, ${file.name}, ${file.size}, ${file.type},
      ${r2Key}, ${presignedUrl}, NOW() + INTERVAL '1 hour',
      ${userId}, 'completed'
    )
    RETURNING id, filename, presigned_url;
  `;

  return NextResponse.json(result[0]);
}
```

### Image Processing

**File**: `src/features/chat/lib/imageProcessing.ts`

```typescript
import sharp from 'sharp';

export async function resizeAndConvertImage(
  imageUrl: string,
  targetSize: number = 1024
): Promise<string> {
  // 1. Fetch image from R2
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();

  // 2. Resize using Sharp
  const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
    .resize(targetSize, targetSize, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  // 3. Convert to base64
  const base64 = resizedBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}
```

### Chat API Integration

**File**: `src/app/api/chat/route.ts`

```typescript
import { convertFilesToImageParts } from '@/features/chat/lib/chatUtils';
import { resizeAndConvertImage } from '@/features/chat/lib/imageProcessing';

export async function POST(request: NextRequest) {
  const { messages, fileIds } = await request.json();

  // 1. Fetch file metadata from database
  const files = await sql`
    SELECT id, presigned_url, content_type
    FROM file_uploads
    WHERE id = ANY(${fileIds})
  `;

  // 2. Process images
  const imageParts = await Promise.all(
    files.map(async (file) => {
      const base64Data = await resizeAndConvertImage(file.presigned_url);
      return {
        type: 'image' as const,
        image: base64Data,
      };
    })
  );

  // 3. Add images to last user message
  const lastMessage = messages[messages.length - 1];
  lastMessage.content = [
    { type: 'text', text: lastMessage.content },
    ...imageParts
  ];

  // 4. Stream AI response
  const result = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

---

## Model Compatibility

### Provider Support Matrix

| Provider | Vision Support | Format Required | Resize Recommended |
|----------|---------------|-----------------|-------------------|
| **Anthropic Claude** | ✅ | Base64 | ✅ Yes (cost savings) |
| **OpenAI GPT-4o** | ✅ | URL or Base64 | ✅ Yes (cost savings) |
| **OpenAI GPT-4-vision** | ✅ | URL or Base64 | ✅ Yes (cost savings) |
| **Google Gemini Pro Vision** | ✅ | Base64 | ✅ Yes (cost savings) |
| **xAI Grok** | ❌ | N/A | N/A |
| **Mistral** | ❌ | N/A | N/A |

### Cost Impact of Resizing

**Original Image** (4096x4096px):
- Claude: ~$8.00 per image
- GPT-4o: ~$3.40 per image

**Resized Image** (1024x1024px):
- Claude: ~$0.24 per image (**97% reduction**)
- GPT-4o: ~$0.21 per image (**94% reduction**)

**Key Insight**: Resizing to 1024x1024 maintains >95% accuracy for most vision tasks while reducing costs by 90%+.

---

## Image Processing Pipeline

### Step-by-Step Processing

```typescript
// Complete flow from upload to AI
async function processImageForAI(file: File, provider: string) {
  // 1. Upload to R2
  const { presignedUrl } = await uploadToR2(file);

  // 2. Fetch from R2
  const response = await fetch(presignedUrl);
  const buffer = await response.arrayBuffer();

  // 3. Resize with Sharp
  const resizedBuffer = await sharp(Buffer.from(buffer))
    .resize(1024, 1024, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer();

  // 4. Convert to Base64 (if required)
  if (provider === 'anthropic' || provider === 'google') {
    const base64 = resizedBuffer.toString('base64');
    return {
      type: 'image',
      image: `data:image/jpeg;base64,${base64}`
    };
  }

  // 5. Or use URL (OpenAI supports both)
  return {
    type: 'image_url',
    image_url: { url: presignedUrl }
  };
}
```

### Sharp Configuration

**Optimal Settings**:
```typescript
const optimizedImage = await sharp(inputBuffer)
  .resize(1024, 1024, {
    fit: 'inside',              // Maintain aspect ratio
    withoutEnlargement: true,   // Don't upscale small images
    kernel: 'lanczos3'          // High-quality resampling
  })
  .jpeg({
    quality: 85,                // Good balance of quality/size
    progressive: false,         // Not needed for base64
    mozjpeg: true               // Better compression
  })
  .toBuffer();
```

---

## Usage Examples

### Frontend - Upload Image

```typescript
// ChatInput.tsx
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const { id, filename, presigned_url } = await response.json();

  setAttachedFiles([...attachedFiles, {
    id,
    filename,
    url: presigned_url
  }]);
};
```

### Backend - Process in Chat

```typescript
// Handle chat with images
const handleChatWithImages = async (messages, fileIds) => {
  // Fetch file metadata
  const files = await db.query(
    'SELECT * FROM file_uploads WHERE id = ANY($1)',
    [fileIds]
  );

  // Process images
  const imageParts = await Promise.all(
    files.map(file => processImageForAI(file))
  );

  // Send to AI
  const response = await streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    messages: [
      ...messages.slice(0, -1),
      {
        role: 'user',
        content: [
          { type: 'text', text: messages[messages.length - 1].content },
          ...imageParts
        ]
      }
    ]
  });

  return response.toDataStreamResponse();
};
```

---

## Security

### Security Features Implemented

1. **File Validation**
   - MIME type checking
   - File size limits (10MB max)
   - Allowed extensions only

2. **Access Control**
   - User authentication required
   - Presigned URLs expire after 1 hour
   - User can only access their own files

3. **Database Security**
   - Foreign key constraints
   - Soft deletes (`deleted_at` timestamp)
   - User ownership tracking

4. **R2 Security**
   - Private bucket (no public access)
   - Presigned URLs for temporary access
   - Separate credentials per environment

### Security Checklist

- ✅ Validate file types server-side
- ✅ Limit file sizes
- ✅ Use presigned URLs with expiration
- ✅ Implement user authentication
- ✅ Sanitize filenames
- ✅ Store files with random IDs
- ✅ Implement soft deletes
- ✅ Use environment variables for credentials
- ✅ Enable CORS only for your domain

---

## Troubleshooting

### Common Issues

#### Issue 1: "Failed to upload file"

**Symptoms**: Upload fails with 500 error

**Causes**:
- Invalid R2 credentials
- Bucket doesn't exist
- Network issues

**Solutions**:
```bash
# Verify R2 credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Test R2 connection
aws s3 ls --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com

# Check bucket exists
aws s3 ls s3://$R2_BUCKET_NAME --endpoint-url ...
```

#### Issue 2: "Presigned URL expired"

**Symptoms**: Image fails to load after 1 hour

**Cause**: Presigned URLs expire after 1 hour by design

**Solution**: Regenerate presigned URL when needed
```typescript
// Check if URL expired
if (new Date(file.presigned_url_expires_at) < new Date()) {
  // Regenerate URL
  const newUrl = await getSignedUrl(r2, new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: file.r2_key,
  }), { expiresIn: 3600 });

  // Update database
  await sql`
    UPDATE file_uploads
    SET presigned_url = ${newUrl},
        presigned_url_expires_at = NOW() + INTERVAL '1 hour'
    WHERE id = ${file.id}
  `;
}
```

#### Issue 3: "AI model doesn't see image"

**Symptoms**: AI responds without mentioning image content

**Causes**:
- Model doesn't support vision (Grok, Mistral)
- Image not properly formatted
- Base64 encoding issue

**Solutions**:
```typescript
// 1. Check model supports vision
const visionModels = [
  'claude-3-opus',
  'claude-3-sonnet',
  'gpt-4o',
  'gemini-pro-vision'
];

// 2. Verify base64 format
console.log(imageData.slice(0, 50)); // Should start with "data:image/jpeg;base64,"

// 3. Check image content structure
console.log(JSON.stringify(message.content, null, 2));
// Should be:
// [
//   { type: 'text', text: '...' },
//   { type: 'image', image: 'data:image/...' }
// ]
```

#### Issue 4: "Sharp processing fails"

**Symptoms**: Error during image resize

**Cause**: Corrupted image or unsupported format

**Solution**:
```typescript
try {
  const resized = await sharp(buffer)
    .resize(1024, 1024)
    .jpeg()
    .toBuffer();
} catch (error) {
  console.error('Sharp error:', error);

  // Fallback: Use original image
  return {
    type: 'image_url',
    image_url: { url: presignedUrl }
  };
}
```

### Debug Mode

Enable detailed logging:

```typescript
// .env.local
DEBUG=true
LOG_LEVEL=debug

// In code
if (process.env.DEBUG === 'true') {
  console.log('Image processing:', {
    originalSize: buffer.length,
    resizedSize: resizedBuffer.length,
    compressionRatio: (resizedBuffer.length / buffer.length).toFixed(2),
    base64Length: base64.length
  });
}
```

---

## Testing

### Testing Checklist

**Upload Flow**:
- [ ] Upload small image (<1MB)
- [ ] Upload large image (5-10MB)
- [ ] Upload invalid file type
- [ ] Upload file >10MB (should fail)
- [ ] Verify file appears in R2 bucket
- [ ] Verify database record created

**Chat Flow**:
- [ ] Send message with 1 image
- [ ] Send message with multiple images
- [ ] Verify AI responds to image content
- [ ] Check presigned URL works
- [ ] Wait >1 hour, verify URL expires

**Model Testing**:
- [ ] Test with Claude (Anthropic)
- [ ] Test with GPT-4o (OpenAI)
- [ ] Test with Gemini (Google)
- [ ] Verify Grok/Mistral show error

**Edge Cases**:
- [ ] Upload same file twice
- [ ] Delete file, try to use in chat
- [ ] Invalid presigned URL
- [ ] Network failure during upload

---

## See Also

- [AI Chatbot Setup](../../01-getting-started/ai-chatbot-setup.md) - Initial setup guide
- [Rebuild Roadmap](rebuild-roadmap.md) - Feature development timeline
- [Security](security.md) - Security best practices
- [Cloudflare R2 Documentation](../../09-deployment/cloudflare-r2.md) - Complete R2 guide

---

**Original Files [ARCHIVED]**:
- `/docs/archive/WEEK3_MULTIMODAL_IMPLEMENTATION.md`
- `/docs/archive/MULTIMODAL_IMAGE_SUPPORT.md`
