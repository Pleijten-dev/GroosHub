# Week 3 Multi-Modal Testing Guide

> **Prerequisites**: Server must be running locally (`npm run dev`) or deployed to Vercel

---

## 🔐 Step 0: Authentication

All endpoints require authentication. You need to obtain a session cookie first.

### Option A: Use Browser Developer Tools

1. Open browser and navigate to `http://localhost:3000/nl/login`
2. Log in with your credentials
3. Open Developer Tools (F12) → Application/Storage → Cookies
4. Copy the `authjs.session-token` cookie value
5. Use in curl commands: `-H "Cookie: authjs.session-token=YOUR_TOKEN_HERE"`

### Option B: Programmatic Login (curl)

```bash
# Get CSRF token
curl -c cookies.txt http://localhost:3000/api/auth/csrf

# Extract CSRF token from response
CSRF_TOKEN=$(grep csrfToken cookies.txt | awk '{print $7}')

# Login
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "csrfToken": "'$CSRF_TOKEN'",
    "email": "your-email@example.com",
    "password": "your-password"
  }'

# Now cookies.txt contains your session - use it in subsequent requests
```

---

## ✅ Test 1: Health Check

**Endpoint**: `GET /api/chat`

**Purpose**: Verify Chat API is running with multimodal support

**Command**:
```bash
curl http://localhost:3000/api/chat
```

**Expected Response**:
```json
{
  "status": "ok",
  "message": "Chat API is running",
  "version": "3.0.0",
  "features": {
    "streaming": true,
    "persistence": true,
    "multimodal": true,
    "visionModels": 11
  }
}
```

**✅ Pass Criteria**:
- Status 200
- `version` is "3.0.0"
- `multimodal` is `true`
- `visionModels` is `11`

---

## ✅ Test 2: Create a Chat

**Endpoint**: `POST /api/chats`

**Purpose**: Create a new chat to use for file uploads

**Command**:
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Chat for Multimodal",
    "modelId": "claude-sonnet-4.5"
  }'
```

**Expected Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Test Chat for Multimodal",
  "modelId": "claude-sonnet-4.5",
  "createdAt": "2025-12-03T10:00:00.000Z"
}
```

**✅ Pass Criteria**:
- Status 201
- Returns chat ID (save this for next tests)

**💾 Save the chat ID**:
```bash
CHAT_ID="<paste-the-id-here>"
```

---

## ✅ Test 3: Upload Image File

**Endpoint**: `POST /api/upload`

**Purpose**: Upload an image to R2 and create database record

**Prerequisites**:
- Have a test image ready (e.g., `test-image.png`)
- Image must be < 10MB
- Supported formats: PNG, JPG, JPEG, WebP, GIF

**Command**:
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "chatId=$CHAT_ID" \
  -F "files=@/path/to/test-image.png"
```

**Expected Response**:
```json
{
  "success": true,
  "files": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "fileName": "test-image.png",
      "fileType": "image",
      "mimeType": "image/png",
      "fileSize": 245632,
      "storageKey": "development/users/1/chats/550e8400-.../1733227200000-test-image.png",
      "createdAt": "2025-12-03T10:00:00.000Z"
    }
  ]
}
```

**✅ Pass Criteria**:
- Status 200
- `success` is `true`
- Returns file ID, storage key, and metadata
- `fileType` is "image"

**💾 Save the file ID**:
```bash
FILE_ID="<paste-the-file-id-here>"
```

**🔍 Verify in Database**:
```sql
SELECT * FROM chat_files WHERE id = '<file-id>';
```

**🔍 Verify in R2**:
- Log into Cloudflare R2 dashboard
- Navigate to `grooshub-chat-files` bucket
- Check `development/users/...` path
- File should exist

---

## ✅ Test 4: Get File Access (Presigned URL)

**Endpoint**: `GET /api/files/[fileId]`

**Purpose**: Generate presigned URL and verify file access

**Command**:
```bash
curl http://localhost:3000/api/files/$FILE_ID \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "url": "https://account-id.r2.cloudflarestorage.com/grooshub-chat-files/development/users/1/chats/.../test-image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "expiresAt": "2025-12-03T11:00:00.000Z",
  "file": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "fileName": "test-image.png",
    "fileType": "image",
    "mimeType": "image/png",
    "fileSize": 245632,
    "createdAt": "2025-12-03T10:00:00.000Z"
  }
}
```

**✅ Pass Criteria**:
- Status 200
- `success` is `true`
- `url` contains R2 presigned URL with AWS signature
- `expiresAt` is ~1 hour in future

**🔍 Verify Presigned URL Works**:
```bash
# Download file using presigned URL (no auth needed)
curl "PASTE_PRESIGNED_URL_HERE" --output downloaded-image.png

# Check file size matches
ls -lh downloaded-image.png
```

---

## ✅ Test 5: Send Chat Message WITHOUT Files (Baseline)

**Endpoint**: `POST /api/chat`

**Purpose**: Verify chat works without files (existing functionality)

**Command**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "messages": [
      {
        "id": "msg-001",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Hello! This is a test message without any images."
          }
        ]
      }
    ],
    "chatId": "'$CHAT_ID'",
    "modelId": "claude-sonnet-4.5"
  }'
```

**Expected Response**:
- Streaming response with assistant reply
- No errors

**✅ Pass Criteria**:
- Status 200
- Receives streaming text response
- Message saved to database

---

## ✅ Test 6: Send Chat Message WITH Image (Vision Model)

**Endpoint**: `POST /api/chat`

**Purpose**: Verify multimodal chat with image attachment

**Command**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "messages": [
      {
        "id": "msg-002",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "What do you see in this image? Please describe it in detail."
          }
        ]
      }
    ],
    "chatId": "'$CHAT_ID'",
    "modelId": "claude-sonnet-4.5",
    "fileIds": ["'$FILE_ID'"]
  }'
```

**Expected Response**:
- Streaming response with image analysis
- Assistant describes the image content

**✅ Pass Criteria**:
- Status 200
- Assistant response references image content
- No errors about image processing

**🔍 Check Server Logs**:
Look for these log messages:
```
[Chat API] 📎 Processing 1 file attachments
[Chat API] 🔗 Linked file <file-id> to message <message-id>
[Chat API] ✅ Added image: test-image.png (245632 bytes)
[Chat API] 📎 Successfully processed 1/1 file attachments
[Chat API] 📎 Added 1 images to user message
```

---

## ✅ Test 7: Upload Multiple Images

**Endpoint**: `POST /api/upload`

**Purpose**: Test multi-file upload (up to 10 files)

**Command**:
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "chatId=$CHAT_ID" \
  -F "files=@/path/to/image1.png" \
  -F "files=@/path/to/image2.jpg" \
  -F "files=@/path/to/image3.webp"
```

**Expected Response**:
```json
{
  "success": true,
  "files": [
    { "id": "...", "fileName": "image1.png", ... },
    { "id": "...", "fileName": "image2.jpg", ... },
    { "id": "...", "fileName": "image3.webp", ... }
  ]
}
```

**✅ Pass Criteria**:
- Status 200
- Returns array with 3 file objects
- All files have unique IDs

---

## ✅ Test 8: Chat with Multiple Images

**Purpose**: Verify multiple image attachments work

**Command**:
```bash
# Save multiple file IDs
FILE_ID_1="..."
FILE_ID_2="..."
FILE_ID_3="..."

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "messages": [
      {
        "id": "msg-003",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Compare these three images. What are the similarities and differences?"
          }
        ]
      }
    ],
    "chatId": "'$CHAT_ID'",
    "modelId": "gpt-4o",
    "fileIds": ["'$FILE_ID_1'", "'$FILE_ID_2'", "'$FILE_ID_3'"]
  }'
```

**✅ Pass Criteria**:
- Status 200
- Assistant analyzes all three images
- Response compares images

---

## ❌ Test 9: Non-Vision Model with Images (Should Fail)

**Purpose**: Verify vision validation works

**Command**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "messages": [
      {
        "id": "msg-004",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Analyze this image."
          }
        ]
      }
    ],
    "chatId": "'$CHAT_ID'",
    "modelId": "gpt-3.5-turbo",
    "fileIds": ["'$FILE_ID'"]
  }'
```

**Expected Response**:
```json
{
  "error": "Model does not support vision",
  "message": "The selected model \"gpt-3.5-turbo\" does not support image input. Please select a vision-capable model like GPT-4o, Claude Sonnet 4.5, or Gemini 2.0 Flash."
}
```

**✅ Pass Criteria**:
- Status 400
- Error message explains the issue
- Suggests vision-capable models

---

## ❌ Test 10: Invalid File Type Upload (Should Fail)

**Purpose**: Verify file validation works

**Command**:
```bash
# Try to upload a .txt file (not allowed)
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "chatId=$CHAT_ID" \
  -F "files=@/path/to/test.txt"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Invalid file type",
  "details": "File 'test.txt' has invalid type 'text/plain'. Allowed types: image/png, image/jpeg, image/webp, image/gif, application/pdf"
}
```

**✅ Pass Criteria**:
- Status 400
- Error explains the issue
- Lists allowed file types

---

## ❌ Test 11: File Too Large (Should Fail)

**Purpose**: Verify file size validation

**Command**:
```bash
# Create a large file (15MB, exceeds 10MB image limit)
dd if=/dev/zero of=large-image.png bs=1M count=15

# Try to upload
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "chatId=$CHAT_ID" \
  -F "files=@large-image.png"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "File too large",
  "details": "File 'large-image.png' is 15728640 bytes. Maximum size for images: 10485760 bytes (10MB)"
}
```

**✅ Pass Criteria**:
- Status 400
- Error explains size limit
- Shows actual vs max size

---

## ❌ Test 12: Too Many Files (Should Fail)

**Purpose**: Verify max file count validation

**Command**:
```bash
# Try to upload 11 files (exceeds max of 10)
curl -X POST http://localhost:3000/api/upload \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -F "chatId=$CHAT_ID" \
  -F "files=@image1.png" \
  -F "files=@image2.png" \
  -F "files=@image3.png" \
  -F "files=@image4.png" \
  -F "files=@image5.png" \
  -F "files=@image6.png" \
  -F "files=@image7.png" \
  -F "files=@image8.png" \
  -F "files=@image9.png" \
  -F "files=@image10.png" \
  -F "files=@image11.png"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Too many files",
  "details": "Maximum 10 files per upload. Received: 11"
}
```

**✅ Pass Criteria**:
- Status 400
- Error explains limit

---

## ❌ Test 13: Unauthorized Access to File (Should Fail)

**Purpose**: Verify ownership verification

**Prerequisites**:
- Have two different user accounts
- User A uploads a file
- User B tries to access it

**Command**:
```bash
# User A uploads file (save FILE_ID_A)
# Then logout and login as User B

# User B tries to access User A's file
curl http://localhost:3000/api/files/$FILE_ID_A \
  -H "Cookie: authjs.session-token=USER_B_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "You do not have permission to access this file"
}
```

**✅ Pass Criteria**:
- Status 403
- Access denied

---

## ✅ Test 14: Delete File

**Endpoint**: `DELETE /api/files/[fileId]`

**Purpose**: Verify file deletion

**Command**:
```bash
curl -X DELETE http://localhost:3000/api/files/$FILE_ID \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**✅ Pass Criteria**:
- Status 200
- File removed from database
- File removed from R2

**🔍 Verify Deletion**:
```sql
-- Should return no rows
SELECT * FROM chat_files WHERE id = '<file-id>';
```

```bash
# Presigned URL should no longer work
curl "PREVIOUS_PRESIGNED_URL" --output test.png
# Should get 404 or NoSuchKey error
```

---

## 🧪 Test 15: Vision Model Comparison

**Purpose**: Test different vision models with same image

**Models to Test**:
- `gpt-4o` (OpenAI)
- `claude-sonnet-4.5` (Anthropic)
- `gemini-2.0-flash-exp` (Google - Free!)
- `grok-2-vision-1212` (xAI)

**Command Template**:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_TOKEN_HERE" \
  -d '{
    "messages": [
      {
        "id": "msg-'$(date +%s)'",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Describe this image in detail. What objects do you see?"
          }
        ]
      }
    ],
    "chatId": "'$CHAT_ID'",
    "modelId": "MODEL_ID_HERE",
    "fileIds": ["'$FILE_ID'"]
  }'
```

**Replace `MODEL_ID_HERE` with**:
- `gpt-4o`
- `claude-sonnet-4.5`
- `gemini-2.0-flash-exp`
- `grok-2-vision-1212`

**✅ Pass Criteria**:
- All models successfully analyze image
- Responses vary by model
- No errors

---

## 📊 Test Results Checklist

| # | Test | Status | Notes |
|---|------|--------|-------|
| 0 | Authentication | ⬜ | |
| 1 | Health Check | ⬜ | |
| 2 | Create Chat | ⬜ | |
| 3 | Upload Image | ⬜ | |
| 4 | Get Presigned URL | ⬜ | |
| 5 | Chat Without Files | ⬜ | |
| 6 | Chat With Image | ⬜ | |
| 7 | Upload Multiple Images | ⬜ | |
| 8 | Chat With Multiple Images | ⬜ | |
| 9 | Non-Vision Model Error | ⬜ | |
| 10 | Invalid File Type Error | ⬜ | |
| 11 | File Too Large Error | ⬜ | |
| 12 | Too Many Files Error | ⬜ | |
| 13 | Unauthorized Access Error | ⬜ | |
| 14 | Delete File | ⬜ | |
| 15 | Vision Model Comparison | ⬜ | |

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Cause**: Session cookie expired or invalid
**Fix**: Re-authenticate and get new session token

### Issue: 500 Internal Server Error on Upload
**Cause**: R2 credentials not set or invalid
**Fix**:
1. Check `.env.local` has all R2 variables
2. Verify R2 API token has correct permissions
3. Check server logs for specific error

### Issue: Image uploaded but chat fails
**Cause**: File not properly linked to message
**Fix**: Check `message_id` in database - should be updated when chat is sent

### Issue: Presigned URL returns 403
**Cause**: R2 permissions or bucket settings
**Fix**:
1. Verify bucket name matches `.env`
2. Check R2 API token permissions
3. Verify storage key format

### Issue: Vision model doesn't analyze image
**Cause**: Presigned URL might be expired or inaccessible
**Fix**:
1. Check presigned URL is valid (< 1 hour old)
2. Test presigned URL directly in browser
3. Verify R2 bucket CORS settings if needed

---

## 📝 Notes

- **Session tokens** expire after inactivity (usually 30 days)
- **Presigned URLs** expire after 1 hour by default
- **Files without message_id** are orphaned (consider cleanup cron job)
- **R2 storage costs**: $0.015/GB/month + $0.36/million Class A operations
- **Gemini 2.0 Flash** is free during experimental phase (best for cost testing)

---

**Last Updated**: 2025-12-03
