# External Reference Documentation

> **Purpose**: Official vendor documentation for external services used in GroosHub
> **Note**: These are NOT project-specific docs - they are reference materials from external sources

---

## Files in This Folder

### CloudFlareR2_Documentation.md (517 KB)
**Source**: Cloudflare R2 Official Documentation
**Last Retrieved**: 2025-12-08
**Purpose**: Complete reference for Cloudflare R2 object storage API

**Use Cases**:
- File upload implementation (`/api/upload`)
- R2 client configuration (`src/lib/r2.ts`)
- Presigned URL generation
- Bucket management
- Access control setup

**Key Sections**:
- S3-compatible API reference
- Authentication & credentials
- SDK examples (AWS SDK for JavaScript v3)
- Pricing & limits
- Best practices

---

### vercelAISDKv5.md (1.1 MB)
**Source**: Vercel AI SDK v5 Official Documentation
**Last Retrieved**: 2025-12-08
**Purpose**: Complete reference for Vercel AI SDK (Anthropic, OpenAI, Google, xAI integration)

**Use Cases**:
- AI chat implementation (`/api/chat`)
- Streaming responses
- Multi-provider support (Claude, GPT-4, Gemini, Grok)
- Function calling / tool use
- Multimodal support (images, files)
- Memory system integration

**Key Sections**:
- AI model configuration
- Streaming API (`streamText`)
- Provider-specific setup
- Message formats
- Error handling
- Cost optimization

---

## When to Reference These Files

### Working on File Upload/Storage
→ Reference `CloudFlareR2_Documentation.md`
- Check API method signatures
- Verify correct S3 commands
- Review error codes
- Check presigned URL options

### Working on AI Chat Features
→ Reference `vercelAISDKv5.md`
- Check model capabilities
- Verify message formats
- Review streaming implementation
- Check multimodal support options
- Review function calling patterns

---

## Updating These Files

**These files should be updated periodically to reflect latest vendor documentation.**

**Update Process**:
1. Visit official documentation:
   - Cloudflare R2: https://developers.cloudflare.com/r2/
   - Vercel AI SDK: https://sdk.vercel.ai/docs
2. Export/copy latest documentation
3. Replace files in this folder
4. Update "Last Retrieved" date in this README
5. Note any breaking changes in commit message

**Recommended Update Frequency**: Quarterly or when implementing new features from these services

---

## Important Notes

⚠️ **These are reference materials only** - do not modify these files
⚠️ **Always check official docs** for most up-to-date information
⚠️ **Breaking changes** may occur between versions - check changelog

✅ **Local copies preserved** for offline reference
✅ **Version-specific** - matches the implementation in this project
✅ **Searchable** - use text search to find specific API methods

---

## See Also

**Project-Specific Documentation**:
- Multimodal Implementation: `/docs/03-features/ai-chatbot/multimodal-support.md`
- Cloudflare R2 Setup: `/docs/09-deployment/cloudflare-r2.md`
- AI Models Configuration: `/docs/04-api-reference/ai-models.md`

---

**Last Updated**: 2025-12-08
