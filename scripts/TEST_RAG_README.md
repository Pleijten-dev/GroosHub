# RAG System Integration Test Suite

Comprehensive end-to-end tests for the RAG (Retrieval-Augmented Generation) system.

## Overview

This test suite validates the complete RAG pipeline from document upload through AI-powered question answering with source citations.

### What It Tests

1. **Authentication** - User login and session management
2. **Project Setup** - Creating test projects
3. **File Upload** - Uploading TXT and PDF documents
4. **Document Processing** - Text extraction, chunking, and embedding generation
5. **RAG Retrieval** - Vector similarity search and hybrid search
6. **Chat Integration** - AI responses with RAG context
7. **Source Citations** - Verification of sources in message metadata
8. **Cleanup** - Optional cleanup of test data

## Prerequisites

### 1. Test User Account

You need a valid user account to test with. Create one through the UI or database:

```sql
-- Create a test user (example - adjust for your auth system)
INSERT INTO users (email, password_hash, role)
VALUES ('test@example.com', 'hashed_password', 'user');
```

### 2. Environment Variables

Set these environment variables before running tests:

```bash
# Required
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="your_test_password"

# Optional
export CLEANUP="true"  # Delete test data after tests (default: false)
```

### 3. API Keys

Ensure your deployment has the required API keys configured:

- `OPENAI_API_KEY` - For embeddings (text-embedding-3-small)
- `XAI_API_KEY` or other AI provider keys - For chat responses

## Running Tests

### Local Development

Test against your local development server (http://localhost:3000):

```bash
# Start your dev server first
npm run dev

# In another terminal, run tests
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 npm run test:rag
```

### Production (Vercel)

Test against your deployed Vercel application:

```bash
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 npm run test:rag -- https://your-app.vercel.app
```

### With Cleanup

To automatically delete test data after tests:

```bash
TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 CLEANUP=true npm run test:rag
```

## Test Flow

The tests run sequentially in this order:

```
┌─────────────────────────────────────┐
│ 1. Authentication                   │
│    - Login as test user             │
│    - Establish session              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. Project Setup                    │
│    - Create test project            │
│    - Store project ID               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. File Upload                      │
│    - Upload sample-document.txt     │
│    - Upload sample-document.pdf     │
│    - Store file IDs                 │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 4. Document Processing              │
│    - Extract text from files        │
│    - Chunk text (800 tokens)        │
│    - Generate embeddings (OpenAI)   │
│    - Store in database              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 5. RAG Retrieval (Direct API)       │
│    - Test various queries:          │
│      * "What is urban development?" │
│      * "Tell me about PM"           │
│      * "How is data analyzed?"      │
│      * "Environmental sustainability"│
│    - Verify chunk retrieval         │
│    - Check similarity scores        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 6. Chat with RAG Context            │
│    - Create chat in project         │
│    - Send message with query        │
│    - Receive streaming response     │
│    - Verify RAG sources in metadata │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 7. Cleanup (Optional)               │
│    - Delete test project            │
│    - Remove uploaded files          │
│    - Clean up database              │
└─────────────────────────────────────┘
```

## Expected Output

Successful test run example:

```
🚀 RAG System Integration Test Suite

Base URL: http://localhost:3000
Test User: test@example.com

✅ 1. Authentication (234ms)
   Logged in as: test@example.com
✅ 2. Create Test Project (187ms)
   Created project: RAG Test Project 1702345678901 (proj_abc123...)
✅ 3.1 Upload TXT File (543ms)
   Uploaded: sample-document.txt (file_xyz789...)
✅ 3.2 Upload PDF File (612ms)
   Uploaded: sample-document.pdf (file_def456...)
✅ 4.1 Process File file_xyz7... (3456ms)
   Chunks: 12, Tokens: 8542
✅ 4.2 Process File file_def4... (3789ms)
   Chunks: 14, Tokens: 9234
✅ 5.1 Retrieve: "What is urban development?" (423ms)
   Retrieved 3 chunks
   Top similarity: 87.3%
✅ 5.2 Retrieve: "Tell me about project management" (398ms)
   Retrieved 3 chunks
   Top similarity: 84.1%
✅ 5.3 Retrieve: "How is data analysis performed?" (412ms)
   Retrieved 3 chunks
   Top similarity: 81.9%
✅ 5.4 Retrieve: "What is environmental sustainability?" (387ms)
   Retrieved 3 chunks
   Top similarity: 83.5%
✅ 6.1 Create Chat in Project (156ms)
   Created chat: chat_ghi123...
✅ 6.2 Send Message with RAG Query (2341ms)
   Response length: 1247 chars
✅ 6.3 Verify RAG Sources in Message (189ms)
   Found 3 RAG sources
   Top source: sample-document.txt (84.2%)

⏭️  Skipping cleanup (set cleanup: true to enable)

============================================================
TEST SUMMARY
============================================================
Total Tests: 13
✅ Passed: 13
❌ Failed: 0
⏱️  Total Duration: 12847ms

============================================================
```

## Test Data

### Sample Document Content

The test uses `scripts/test-data/sample-document.txt` which contains:

- **Section 1**: Urban Development
- **Section 2**: Project Management Methodologies
- **Section 3**: Data Analysis and Business Intelligence
- **Section 4**: Environmental Sustainability Practices
- **Section 5**: Artificial Intelligence and Machine Learning
- **Section 6**: GroosHub Platform Features
- **Section 7**: Testing Best Practices

Each section is designed to be semantically distinct for retrieval testing.

### Expected Retrieval Behavior

| Query | Expected Section | Min Similarity |
|-------|------------------|----------------|
| "urban development" | Section 1 | >80% |
| "project management" | Section 2 | >80% |
| "data analysis" | Section 3 | >75% |
| "environmental sustainability" | Section 4 | >80% |
| "artificial intelligence" | Section 5 | >75% |
| "GroosHub features" | Section 6 | >85% |
| "software testing" | Section 7 | >75% |

## Troubleshooting

### Authentication Failed

**Error**: `Login failed: 401 Unauthorized`

**Solution**: Verify test user credentials are correct and user exists in database.

```bash
# Check if user exists
psql $POSTGRES_URL -c "SELECT email, role FROM users WHERE email='test@example.com';"
```

### File Upload Failed

**Error**: `File upload failed: 413 Payload Too Large`

**Solution**: Check your file size limits. Adjust Vercel or Next.js config if needed.

```typescript
// next.config.ts
export default {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
```

### Processing Failed

**Error**: `Processing unsuccessful: OPENAI_API_KEY not configured`

**Solution**: Ensure OpenAI API key is set in your environment:

```bash
# Vercel
vercel env add OPENAI_API_KEY

# Local
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

### No Chunks Retrieved

**Error**: `No chunks retrieved`

**Possible Causes**:
1. Documents not processed yet (wait for embeddings to complete)
2. Similarity threshold too high (default: 0.5)
3. Query embedding generation failed
4. Database connection issues

**Solution**: Check processing status:

```sql
SELECT file_id, embedding_status, chunk_count, embedding_error
FROM file_uploads
WHERE project_id = 'your_project_id';
```

### RAG Sources Not Found

**Error**: `No RAG sources found in message metadata`

**Possible Causes**:
1. Chat not associated with project
2. No documents in project
3. Query didn't match any chunks (similarity too low)
4. API didn't save metadata correctly

**Solution**: Check if chat is linked to project:

```sql
SELECT id, project_id FROM chats WHERE id = 'your_chat_id';
```

## Performance Benchmarks

Expected timing ranges for each test phase:

| Test Phase | Expected Duration | Notes |
|------------|-------------------|-------|
| Authentication | 100-500ms | Network dependent |
| Project Creation | 100-300ms | Database write |
| File Upload (TXT) | 300-1000ms | File size dependent |
| File Upload (PDF) | 500-2000ms | File size dependent |
| Processing (per file) | 2-10 seconds | Depends on file size and OpenAI API |
| RAG Retrieval | 200-800ms | Depends on chunk count |
| Chat Response | 1-5 seconds | Depends on AI model and response length |
| Verification | 100-300ms | Database read |

**Total Test Duration**: ~15-30 seconds (without cleanup)

## API Endpoints Tested

- `POST /api/auth/signin` - Authentication
- `POST /api/projects` - Project creation
- `POST /api/projects/:id/files/upload` - File upload
- `POST /api/projects/:id/files/:fileId/process` - Document processing
- `POST /api/projects/:id/rag/retrieve` - RAG retrieval
- `POST /api/chats` - Chat creation
- `POST /api/chat` - Send message (streaming)
- `GET /api/chats/:id` - Get chat with messages
- `DELETE /api/projects/:id` - Cleanup

## Adding New Tests

To add a new test:

1. **Create test method** in `RAGSystemTester` class:

```typescript
async testMyNewFeature() {
  await this.runTest('X. My New Feature', async () => {
    // Test implementation
    const response = await this.apiRequest('/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify({ ... })
    });

    if (!response.ok) {
      throw new Error(`Test failed: ${response.status}`);
    }

    // Assertions
    const data = await response.json();
    if (!data.expectedField) {
      throw new Error('Expected field missing');
    }

    console.log(`   Success: ${data.someMetric}`);
  });
}
```

2. **Add to test sequence** in `runAllTests()`:

```typescript
async runAllTests() {
  // ... existing tests
  await this.testMyNewFeature();
  // ...
}
```

## Continuous Integration

To run tests in CI/CD pipeline:

```yaml
# .github/workflows/test-rag.yml
name: RAG System Tests

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:rag
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
          CLEANUP: true
```

## Cost Estimation

### OpenAI API Costs per Test Run

- **Embedding generation** (text-embedding-3-small):
  - ~18,000 tokens per test (2 files)
  - Cost: ~$0.0004 per test run

- **RAG retrieval** (query embeddings):
  - 4 test queries × ~20 tokens each
  - Cost: ~$0.000002 per test run

- **Chat completion** (Grok or other provider):
  - Varies by provider and model
  - Grok-2: ~$2/1M input tokens

**Total cost per test run**: < $0.001 (less than 1 cent)

## Support

If tests fail consistently:

1. Check environment variables are set correctly
2. Verify API keys are valid and have sufficient quota
3. Check database connection and pgvector extension
4. Review server logs for detailed error messages
5. Ensure test user has appropriate permissions

For issues, see:
- `/docs/03-features/ai-chatbot/RAG_IMPLEMENTATION_PLAN.md` - Full RAG system documentation
- `/docs/07-database/current-schema.md` - Database schema reference
- Project CLAUDE.md - Development guidelines
