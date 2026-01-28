# Claude Code Instructions for GroosHub

## Documentation Workflow

### Before Writing Code

**Always read the relevant documentation in `docs/` before making any code changes.**

Check which documentation applies to your task:

| Documentation File | When to Read |
|-------------------|--------------|
| `docs/AI-ASSISTANT-PAGE.md` | Working on AI assistant, chat, or LLM features |
| `docs/COMPLETE-LOCATION-PAGE-DOCUMENTATION.md` | Working on location analysis, maps, or geographic features |
| `docs/DATABASE-SCHEMA.md` | Any database changes, new tables, migrations, or queries |

This ensures you understand the existing architecture, data flows, and conventions before making changes.

### After Writing Code

**Update the corresponding documentation when changes affect:**

- Component structure or new components
- API endpoints or route changes
- Database schema (tables, columns, indexes, relationships)
- Data flows or state management
- Configuration options or environment variables
- File/folder structure
- Integration with external services

Remember to update the "Last Updated" date at the top of any modified documentation.

### Creating New Documentation

**Do NOT create new documentation files unless:**

1. The user explicitly requests new documentation
2. You are working on a new feature that has no existing documentation coverage

**If working on a new feature without docs** (e.g., a new LCA tool, new page, or major feature):
- Ask the user first: "This feature doesn't have existing documentation. Would you like me to create a new documentation file for it?"
- Wait for confirmation before creating the doc
- Follow the existing documentation style and structure from other docs in `docs/`

## Project Context

GroosHub is a Next.js application with:
- PostgreSQL database (Neon serverless) with pgvector for embeddings
- Cloudflare R2 for file storage
- Multi-tenant organization structure
- AI-powered features (chat, RAG, memory system)
- LCA (Life Cycle Assessment) calculations
- Location analysis with Dutch CBS data integration
