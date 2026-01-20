# Test Data for RAG System

This directory contains sample documents for testing the RAG (Retrieval-Augmented Generation) system.

## Files

### sample-document.txt
A comprehensive text document with 7 sections covering different topics:
1. Urban Development
2. Project Management Methodologies
3. Data Analysis and Business Intelligence
4. Environmental Sustainability Practices
5. Artificial Intelligence and Machine Learning
6. GroosHub Platform Features
7. Testing Best Practices

**Purpose**: Tests text extraction, chunking, embedding, and retrieval accuracy.

**Size**: ~7,000 words, ~48,000 characters

**Expected Behavior**: Each section should be semantically retrievable based on relevant queries.

## Adding Custom Test Documents

To add your own test documents:

1. **Create file** in this directory:
   ```bash
   # Text file
   echo "Your content here..." > my-test.txt

   # Or copy existing file
   cp /path/to/your/file.pdf .
   ```

2. **Update test script** to use your file:
   ```typescript
   // scripts/test-rag-system.ts
   await this.uploadTestFile('my-test.txt', 'text/plain');
   ```

3. **Run tests**:
   ```bash
   TEST_USER_EMAIL=test@example.com TEST_USER_PASSWORD=pass123 npm run test:rag
   ```

## Supported File Types

Currently tested formats:
- ✅ `.txt` - Plain text
- ✅ `.md` - Markdown
- ✅ `.pdf` - PDF documents (basic extraction with pdf-parse)

Future support planned:
- 📋 `.csv` - CSV files
- 📄 `.docx` - Word documents
- 🖼️ `.png`, `.jpg` - Images (with OCR)

## Testing Specific Retrieval Scenarios

### High Similarity Queries
These should return results with >80% similarity:

```
Query: "What is urban development?"
Expected: Section 1 (Urban Development)

Query: "Tell me about the GroosHub platform"
Expected: Section 6 (GroosHub Platform Features)
```

### Medium Similarity Queries
These should return results with 60-80% similarity:

```
Query: "How do organizations become more environmentally friendly?"
Expected: Section 4 (Environmental Sustainability)

Query: "What tools are used for analyzing data?"
Expected: Section 3 (Data Analysis)
```

### Cross-Topic Queries
These should retrieve from multiple sections:

```
Query: "How can AI help with project management?"
Expected: Sections 2 + 5 (Project Management + AI)

Query: "Testing data analysis systems"
Expected: Sections 3 + 7 (Data Analysis + Testing)
```

## Quality Validation

After processing, verify:

1. **Chunk Count**: Should be ~10-15 chunks for sample-document.txt
2. **Token Count**: Should be ~8,000-10,000 tokens
3. **Embedding Dimensions**: Should be 1536 (text-embedding-3-small)
4. **Retrieval Accuracy**: Top result should be >70% similarity for direct queries
5. **Source Citations**: Should include file name and chunk text

## Troubleshooting

**Issue**: No chunks created
- **Check**: File encoding (should be UTF-8)
- **Check**: File size (should be >100 characters)
- **Check**: Text extraction succeeded

**Issue**: Low similarity scores (<50%)
- **Check**: Query matches document content
- **Check**: Embeddings generated correctly
- **Check**: Similarity threshold not too high

**Issue**: Wrong sections retrieved
- **Check**: Embedding model consistent (text-embedding-3-small)
- **Check**: Chunk size appropriate (800 tokens)
- **Check**: Semantic overlap between sections

## Cost Tracking

Processing sample-document.txt costs approximately:
- **Embedding generation**: ~$0.0002 (9,000 tokens)
- **Query embeddings**: ~$0.000004 per query (20 tokens each)

Total cost for full test suite: **<$0.001** (less than 1 cent)
