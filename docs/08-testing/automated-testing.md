# Automated Multimodal Testing

> **Endpoint**: `/api/test-multimodal`
> **No curl commands needed!** Just open in your browser.

---

## 🚀 Quick Start

### 1. Run Tests on Vercel

```
https://your-vercel-url.vercel.app/api/test-multimodal
```

**Steps**:
1. Log in to your app first (visit `/nl/login`)
2. Open the test URL in your browser
3. Wait 5-10 seconds for tests to complete
4. See results in JSON format

### 2. Run Tests Locally

```
http://localhost:3000/api/test-multimodal
```

Same process - just log in first, then visit the URL.

---

## 📊 What It Tests

The endpoint runs **13 automated tests**:

| # | Test | What It Checks |
|---|------|----------------|
| 1 | Authentication | Session is valid |
| 2 | Environment Variables | All R2 and DB vars set |
| 3 | Database Connection | Can connect to Neon |
| 4 | Vision Models | 11 vision models detected |
| 5 | Create Test Chat | Can create chat record |
| 6 | Generate Test Image | Creates 1x1 PNG (69 bytes) |
| 7 | Upload to R2 | File uploads successfully |
| 8 | Save Metadata | Database record created |
| 9 | Presigned URL | Generates valid URL |
| 10 | File Access API | `/api/files/[id]` works |
| 11 | Download from R2 | File downloads correctly |
| 12 | Database Query | Join query performs well |
| 13 | Vision Validation | Model detection accurate |

**Plus automatic cleanup** (deletes test data after tests complete).

---

## 🎯 Example Output

### Browser View (JSON)

```json
{
  "success": true,
  "summary": {
    "total": 13,
    "passed": 13,
    "failed": 0,
    "skipped": 0,
    "passRate": "100.0%",
    "duration": "3245ms",
    "timestamp": "2025-12-03T12:00:00.000Z"
  },
  "results": [
    {
      "test": "Authentication",
      "status": "pass",
      "message": "Authenticated as user 1",
      "duration": 45,
      "data": { "userId": 1 }
    },
    {
      "test": "Environment Variables",
      "status": "pass",
      "message": "All required environment variables present",
      "duration": 2,
      "data": {
        "bucket": "grooshub-chat-files",
        "accountId": "your-account-id"
      }
    },
    ...
  ],
  "testData": {
    "chatId": "550e8400-e29b-41d4-a716-446655440000",
    "fileId": "660e8400-e29b-41d4-a716-446655440001",
    "storageKey": "development/users/1/chats/.../test-1733227200000.png",
    "userId": 1
  }
}
```

### Vercel Logs View

```
================================================================================
🚀 MULTIMODAL TESTING SUITE - Week 3
================================================================================
Timestamp: 2025-12-03T12:00:00.000Z
Cleanup: Enabled

🧪 Running: Authentication
✅ PASS (45ms): Authentication - Authenticated as user 1

🧪 Running: Environment Variables
✅ PASS (2ms): Environment Variables - All required environment variables present

🧪 Running: Database Connection
✅ PASS (123ms): Database Connection - Database connection successful

🧪 Running: Vision Models Available
✅ PASS (5ms): Vision Models Available - 11 vision-capable models found

🧪 Running: Create Test Chat
✅ PASS (234ms): Create Test Chat - Created chat 550e8400-e29b-41d4-a716-446655440000

🧪 Running: Generate Test Image
✅ PASS (1ms): Generate Test Image - Generated 69 byte PNG

🧪 Running: Upload Image to R2
✅ PASS (456ms): Upload Image to R2 - File uploaded to R2

🧪 Running: Save File Metadata
✅ PASS (189ms): Save File Metadata - Metadata saved with ID 660e8400-...

🧪 Running: Generate Presigned URL
✅ PASS (234ms): Generate Presigned URL - Presigned URL generated

🧪 Running: File Access API
✅ PASS (345ms): File Access API - File access API working

🧪 Running: Download from R2
✅ PASS (567ms): Download from R2 - Downloaded 69 bytes

🧪 Running: Database Query Performance
✅ PASS (98ms): Database Query Performance - Query completed in 98ms

🧪 Running: Vision Model Validation
✅ PASS (3ms): Vision Model Validation - Vision model detection working correctly

🧪 Running: Cleanup: Delete File from Database
✅ PASS (123ms): Cleanup: Delete File from Database - File metadata deleted

🧪 Running: Cleanup: Delete File from R2
✅ PASS (345ms): Cleanup: Delete File from R2 - File deleted from R2

🧪 Running: Cleanup: Delete Test Chat
✅ PASS (156ms): Cleanup: Delete Test Chat - Test chat deleted

================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests: 13
✅ Passed: 13
❌ Failed: 0
⏭️  Skipped: 0
Pass Rate: 100.0%
Duration: 3245ms
================================================================================
```

---

## 🔧 Options

### Skip Cleanup

Keep test data for manual inspection:

```
/api/test-multimodal?cleanup=false
```

This leaves the test chat, file, and R2 object in place so you can:
- Check the database manually
- View the file in R2 dashboard
- Test file access separately

**Remember to clean up manually later!**

---

## 🔍 View Logs on Vercel

**After running tests:**

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Click **Deployments** → Latest deployment
4. Click **Functions**
5. Find `/api/test-multimodal`
6. Click to view logs

You'll see the detailed console output with all test results, timings, and any errors.

---

## ❌ Troubleshooting

### "Unauthorized" Error

**Problem**: Not logged in
**Fix**: Visit `/nl/login` first, then run tests

### All Tests Fail

**Problem**: Environment variables not set
**Fix**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify all R2 variables are set:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
3. Redeploy after adding variables

### R2 Upload Fails

**Problem**: Invalid R2 credentials or bucket doesn't exist
**Fix**:
1. Check R2 bucket exists in Cloudflare dashboard
2. Verify API token has "Object Read & Write" permissions
3. Confirm token is applied to correct bucket

### Database Tests Fail

**Problem**: `POSTGRES_URL` not set or invalid
**Fix**:
1. Check Neon dashboard for correct connection string
2. Verify environment variable in Vercel
3. Ensure database has `chat_files` table

### Download from R2 Fails

**Problem**: Presigned URL expired or CORS issue
**Fix**:
1. Check bucket is accessible (not behind firewall)
2. Verify Vercel can reach R2 (network connectivity)
3. Check presigned URL hasn't expired (5 min default in tests)

---

## 🎯 What Success Looks Like

**✅ All tests should pass:**
- `"success": true`
- `"passRate": "100.0%"`
- `"failed": 0`

**⚠️ If any test fails:**
1. Check the specific test's `message` field
2. Look at Vercel logs for detailed error
3. Verify environment variables
4. Confirm R2 bucket and credentials

**🎉 Once all pass:**
Your multimodal backend is fully functional and ready for UI integration!

---

## 💡 Pro Tips

1. **Run tests after every deployment** to verify everything works
2. **Check Vercel logs** for performance metrics (query times, upload speeds)
3. **Use `?cleanup=false`** when debugging to inspect test data
4. **Screenshot the JSON output** to track test results over time
5. **Run locally first** before testing on Vercel

---

## 📝 Manual Testing After Automated Tests Pass

Once automated tests pass, try manual end-to-end test:

1. **Upload a real image** via browser
2. **Send chat message** with that image
3. **Check vision model response** describes the image
4. **Verify in database** that file is linked to message
5. **Check R2 dashboard** to see the actual file

This confirms everything works with real user interaction, not just test data.

---

**Last Updated**: 2025-12-03
**Endpoint Version**: 1.0
