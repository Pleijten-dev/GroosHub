# RAG System Testing Guide

Complete guide to test the RAG (Retrieval-Augmented Generation) system end-to-end.

## ✅ What's Complete

All backend components are now implemented and ready:

1. **Document Processing Pipeline**
   - Text extraction (TXT, MD, PDF)
   - Semantic chunking (800 tokens, 100 overlap)
   - OpenAI embeddings (text-embedding-3-small)
   - Vector storage in PostgreSQL with pgvector

2. **RAG Retrieval System**
   - Vector similarity search (cosine distance)
   - Full-text search (BM25)
   - Hybrid search with RRF (Reciprocal Rank Fusion)
   - Similarity threshold filtering

3. **API Endpoints**
   - POST `/api/projects/[projectId]/files/[fileId]/process` - Manual processing
   - POST `/api/projects/[projectId]/rag/retrieve` - Direct retrieval testing
   - POST `/api/chat` - Chat with RAG context (auto-retrieves)
   - Automatic processing on upload for project files

4. **Chat Integration**
   - Auto-retrieves relevant chunks for project chats
   - Injects context into system prompt
   - Saves source citations in message metadata
   - UI displays sources with expand/collapse

---

## 🧪 Testing Workflow

### **Step 1: Upload Test Document**

1. **Deploy latest changes** (if testing on Vercel):
   ```bash
   git push origin claude/add-project-rag-system-01ABjvQDyRJjbmsiDnzHLiYP
   ```
   Wait for Vercel build to complete ✅

2. **Log in to your app** (localhost or production)

3. **Navigate to a project** or create a new test project

4. **Upload the test document**:
   - File: `/home/user/GroosHub/test-rag-document.txt`
   - The system will **automatically** start processing
   - Check server logs for progress:
     ```
     [Upload] 🚀 Auto-triggering RAG processing for test-rag-document.txt
     [Auto-RAG] test-rag-document.txt: 1/3 chunks (33%)
     [Auto-RAG] test-rag-document.txt: 2/3 chunks (67%)
     [Auto-RAG] test-rag-document.txt: 3/3 chunks (100%)
     [Auto-RAG] ✅ test-rag-document.txt processed: 3 chunks, 450 tokens
     ```

### **Step 2: Verify Processing Completed**

Check processing status via API:

```bash
# Get processing status
curl -X GET "http://localhost:3000/api/projects/[PROJECT_ID]/files/[FILE_ID]/process" \
  -H "Cookie: your-session-cookie"
```

Expected response:
```json
{
  "success": true,
  "status": "completed",
  "chunkCount": 3,
  "embeddedAt": "2024-01-15T10:30:00.000Z"
}
```

### **Step 3: Test Direct RAG Retrieval**

Test retrieval without chat to verify chunks are retrievable:

```bash
curl -X POST "http://localhost:3000/api/projects/[PROJECT_ID]/rag/retrieve" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "query": "What is GroosHub?",
    "topK": 3,
    "similarityThreshold": 0.5
  }'
```

Expected response:
```json
{
  "success": true,
  "query": "What is GroosHub?",
  "chunks": [
    {
      "id": "chunk-uuid",
      "sourceFile": "test-rag-document.txt",
      "pageNumber": null,
      "chunkText": "Section 1: Project Information\nThis document contains information about the GroosHub platform...",
      "similarity": 0.87,
      "fileId": "file-uuid",
      "chunkIndex": 0
    }
  ],
  "totalChunks": 1,
  "retrievalTimeMs": 45
}
```

**Good similarity scores:**
- 0.80-1.00: Excellent match (highly relevant)
- 0.70-0.80: Good match (relevant)
- 0.60-0.70: Moderate match (somewhat relevant)
- <0.60: Weak match (may not be relevant)

### **Step 4: Test Chat with RAG**

1. **Open chat in the project** (chat must be associated with the project)

2. **Ask a question about the document:**
   ```
   "What is GroosHub?"
   ```

3. **Check server logs** for RAG retrieval:
   ```
   [Chat API] 📚 Retrieving RAG context for project [PROJECT_ID]
   [Chat API] ✅ Retrieved 1 relevant chunks (avg similarity: 0.873)
   [Chat API] 📝 Enhanced system prompt with RAG context (1 sources)
   ```

4. **Verify AI response**:
   - Should mention GroosHub platform
   - Should reference urban development/location analysis
   - **Sources should be displayed below the message**

5. **Check source citations**:
   - File name: "test-rag-document.txt"
   - Relevance score: ~87%
   - Click expand to see original text
   - Should show exact excerpt from document

### **Step 5: Test Multiple Queries**

Try these queries to test different sections:

| Query | Expected Section | Min Similarity |
|-------|------------------|----------------|
| "What is GroosHub?" | Section 1 | >80% |
| "How does RAG work?" | Section 4 | >75% |
| "What embedding model is used?" | Section 2 | >80% |
| "What are the key features?" | Section 3 | >75% |

### **Step 6: Verify No Hallucinations**

Ask a question **NOT** in the document:
```
"What is the pricing for GroosHub?"
```

Expected behavior:
- AI should **not** cite the test document
- Should respond normally without false citations
- No sources should be displayed (or very low relevance <0.5)

---

## 🔍 Debugging

### Check Database for Chunks

```sql
-- Check if chunks were created
SELECT
  id,
  file_id,
  chunk_index,
  LEFT(chunk_text, 100) as preview,
  token_count,
  created_at
FROM project_doc_chunks
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY chunk_index;

-- Check file processing status
SELECT
  id,
  filename,
  embedding_status,
  chunk_count,
  embedded_at,
  embedding_error
FROM file_uploads
WHERE project_id = 'YOUR_PROJECT_ID';
```

### Check Server Logs

Look for these log patterns:

**Upload & Auto-Processing:**
```
[Upload] File uploaded: test-rag-document.txt
[Upload] 🚀 Auto-triggering RAG processing for test-rag-document.txt
Processing file: test-rag-document.txt (text/plain)
Extracted 450 characters using plain-text
Created 3 chunks (avg 150 tokens, min 100, max 200)
[Embedder] Generating 3 embeddings...
[Embedder] ✅ Generated 3 embeddings (450 tokens, ~$0.000009)
[Pipeline] ✅ Saved 3 chunks to database
[Pipeline] ✅ Updated file status to 'completed'
[Auto-RAG] ✅ test-rag-document.txt processed: 3 chunks, 450 tokens
```

**RAG Retrieval in Chat:**
```
[Chat API] 📚 Retrieving RAG context for project [PROJECT_ID]
[Retriever] Query: "What is GroosHub?"
[Retriever] Generated query embedding (8 tokens)
[Retriever] Found 1 chunks with similarity >= 0.70
[Chat API] ✅ Retrieved 1 relevant chunks (avg similarity: 0.873)
```

### Common Issues

**Issue: No chunks retrieved**
- Check if file processed: `embedding_status = 'completed'`
- Check similarity threshold (lower to 0.3 for testing)
- Verify chunks exist in database
- Check if chat belongs to project

**Issue: Processing failed**
- Check `embedding_error` in `file_uploads` table
- Verify OpenAI API key is set: `OPENAI_API_KEY`
- Check file is accessible in R2 storage
- Review server logs for specific error

**Issue: Low similarity scores (<0.5)**
- Query might not match document content
- Try more specific queries
- Check if embedding model is consistent
- Verify chunks contain expected content

**Issue: Sources not displayed in UI**
- Check message metadata has `ragSources` field
- Verify MessageSources component is imported
- Check browser console for React errors
- Ensure chat is associated with project

---

## 📊 Performance Benchmarks

Expected performance for test document (450 tokens):

| Operation | Expected Time | Notes |
|-----------|--------------|-------|
| Upload | <1 second | File saved to R2 |
| Text Extraction | <100ms | Plain text, instant |
| Chunking | <50ms | 3 chunks created |
| Embedding | 1-3 seconds | OpenAI API call |
| Storage | <100ms | PostgreSQL insert |
| **Total Processing** | **2-5 seconds** | End-to-end |
| Retrieval | <200ms | Hybrid search |
| Chat Response | 2-5 seconds | LLM generation |

---

## 💰 Cost per Test

Test document cost breakdown:

- **Embedding generation**: 450 tokens × $0.02/1M = $0.000009
- **Query embeddings**: 8 tokens × $0.02/1M = $0.0000002 (per query)
- **Total per test**: <$0.00001 (less than 1/100th of a cent)

You can run thousands of tests for less than $1.

---

## ✅ Success Criteria

The RAG system is working correctly if:

1. ✅ File uploads successfully
2. ✅ Auto-processing completes (status = 'completed')
3. ✅ Chunks are stored in database (3-5 chunks for test doc)
4. ✅ Direct retrieval returns chunks (similarity >0.7)
5. ✅ Chat retrieves context automatically
6. ✅ AI response uses document content
7. ✅ Sources are displayed with citations
8. ✅ Expand shows original text excerpt
9. ✅ Relevance scores are reasonable (>70%)
10. ✅ No hallucinations (doesn't cite when not relevant)

---

## 🚀 Next Steps

Once basic testing succeeds:

1. **Test with real documents**
   - Upload project PDFs, notes, documents
   - Ask questions about your actual data
   - Verify quality of answers

2. **Test with multiple files**
   - Upload 3-5 different documents
   - Ask questions spanning multiple sources
   - Check if correct sources are cited

3. **Test edge cases**
   - Large PDFs (50+ pages)
   - Documents with tables/complex formatting
   - Questions requiring multi-document context

4. **Optimize if needed**
   - Adjust similarity threshold (0.5-0.8 range)
   - Tune topK (number of chunks retrieved)
   - Enable/disable hybrid search
   - Adjust chunk size (600-1000 tokens)

5. **Production deployment**
   - Test on Vercel deployment
   - Monitor costs in OpenAI dashboard
   - Check performance under load
   - Review retrieval accuracy with real users

---

## 📚 API Reference

### File Processing

```bash
# Manually trigger processing (if auto-processing disabled)
POST /api/projects/[projectId]/files/[fileId]/process

# Get processing status
GET /api/projects/[projectId]/files/[fileId]/process
```

### RAG Retrieval

```bash
# Direct retrieval (testing)
POST /api/projects/[projectId]/rag/retrieve
{
  "query": "your question",
  "topK": 5,
  "similarityThreshold": 0.7,
  "useHybridSearch": true
}

# Get project RAG statistics
GET /api/projects/[projectId]/rag/retrieve
```

### Chat (Auto-RAG)

```bash
# Chat with automatic RAG
POST /api/chat
{
  "messages": [...],
  "metadata": {
    "chatId": "...",
    "modelId": "grok-2-latest"
  }
}
# RAG happens automatically if chat belongs to project with documents
```

---

## 🎉 You're Ready!

Everything is now in place to test the complete RAG workflow. Upload a file, ask questions, and see the magic happen! 🚀

For issues or questions, check:
- Server logs for detailed debugging
- Database for chunk storage verification
- OpenAI dashboard for API usage/errors
- Browser console for UI errors
