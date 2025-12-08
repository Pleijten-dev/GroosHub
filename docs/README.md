# GroosHub Documentation

> **Project**: GroosHub - Urban Development & Location Analysis Platform
> **Framework**: Next.js 15.5.4 with React 19 and TypeScript
> **Last Updated**: 2025-12-08

---

## Quick Navigation

### 🚀 [01. Getting Started](01-getting-started/)
Setup guides and configuration
- [Setup Environment](01-getting-started/setup-environment.md)
- [Authentication Setup](01-getting-started/auth-setup.md)
- [Database Setup](01-getting-started/database-setup.md)
- [AI Chatbot Setup](01-getting-started/ai-chatbot-setup.md)

### 🏗️ [02. Core Concepts](02-core-concepts/)
Architecture and design patterns
- [Project Architecture](02-core-concepts/project-architecture.md)
- [Coding Standards](02-core-concepts/coding-standards.md)
- [Data Pipeline](02-core-concepts/data-pipeline.md)
- [Caching System](02-core-concepts/caching-system.md)

### ✨ [03. Features](03-features/)
Feature-specific documentation

#### [Location Analysis](03-features/location-analysis/)
- **[Scoring System](03-features/location-analysis/scoring-system.md)** ⭐ - Primary & secondary scoring
- [Amenities](03-features/location-analysis/amenities.md) - Amenities search implementation
- [Design System](03-features/location-analysis/design-system.md) - UI/UX patterns
- [Normalizers](03-features/location-analysis/normalizers.md) - Data normalization

#### [AI Chatbot](03-features/ai-chatbot/)
- **[Multimodal Support](03-features/ai-chatbot/multimodal-support.md)** ⭐ - Images & files
- **[Memory System](03-features/ai-chatbot/memory-system.md)** ⭐ - User & project memory
- [Rebuild Roadmap](03-features/ai-chatbot/rebuild-roadmap.md) - Development timeline
- [Security](03-features/ai-chatbot/security.md) - Security guidelines

#### [LCA (Life Cycle Assessment)](03-features/lca/)
- [Overview](03-features/lca/overview.md) - LCA setup summary
- [Project Status](03-features/lca/project-status.md) - Current status
- [Implementation Guide](03-features/lca/implementation-guide.md) - Implementation todos
- [Calculator Guide](03-features/lca/calculator-guide.md) - Calculator utilities

### 📡 [04. API Reference](04-api-reference/)
API documentation and AI models
- [Endpoints](04-api-reference/endpoints.md) - All API endpoints
- [AI Models](04-api-reference/ai-models.md) - AI model configuration & API keys
- [Vercel AI SDK](04-api-reference/vercel-ai-sdk.md) - Vercel AI SDK v5 guide

### 🎨 [05. UI Components](05-ui-components/)
Component library and design catalog
- [Design Catalog](05-ui-components/design-catalog.md) - Component showcase
- [Chart Components](05-ui-components/chart-components.md) - 3D charts (Three.js)
- [3D Coordinates](05-ui-components/3d-coordinates.md) - Coordinate system

### 📊 [06. Data Management](06-data-management/)
Data handling and validation
- [JSON Inventory](06-data-management/json-inventory.md) - JSON files inventory
- [Validation Setup](06-data-management/validation-setup.md) - Data validation system
- [Validation Results](06-data-management/validation-results.md) - Validation output
- [Parser Analysis](06-data-management/parser-analysis.md) - Data parser analysis
- [Persona Mapping](06-data-management/persona-mapping.md) - Persona naming conventions

### 🗄️ [07. Database](07-database/)
Database schema, migrations, and management

⚠️ **CRITICAL**: [URGENT: Migration Required](07-database/URGENT-MIGRATION-REQUIRED.md) - Old tables will be deleted soon!

- **[Current Schema](07-database/current-schema.md)** ⭐ - Complete database documentation
- [Restructuring Proposal](07-database/restructuring-proposal.md) - Multi-org architecture
- [Restructuring Roadmap](07-database/restructuring-roadmap.md) - Implementation plan
- [Migration Guide](07-database/migration-guide.md) - How to run migrations
- [Saved Locations](07-database/saved-locations.md) - Location versioning

### ✅ [08. Testing](08-testing/)
Testing strategy and guides
- [Testing Strategy](08-testing/testing-strategy.md) - Overall testing approach
- [Week3 Testing](08-testing/week3-testing.md) - Multimodal testing guide
- [Automated Testing](08-testing/automated-testing.md) - Automated test endpoints

### 🚀 [09. Deployment](09-deployment/)
Deployment and infrastructure
- [Cloudflare R2](09-deployment/cloudflare-r2.md) - File storage documentation

### 🛠️ [10. Development Tools](10-development-tools/)
Tools and utilities for development
- [Agent Tool Guide](10-development-tools/agent-tool-guide.md) - Agent development
- [Location Agent](10-development-tools/location-agent.md) - Location agent outline
- [Target Group Scoring](10-development-tools/target-group-scoring.md) - Scoring status

### 📦 [Archive](archive/)
Historical and outdated documentation
- Original files before consolidation
- Week 3 progress snapshots
- LCA phase completion docs
- Old scoring system files
- Old multimodal implementation docs
- Old memory system docs

---

## 📚 External Reference Documentation

**Location**: [`/references/`](../references/) (in project root)

Official vendor documentation for external services:
- **CloudFlareR2_Documentation.md** (517 KB) - Complete Cloudflare R2 API reference
- **vercelAISDKv5.md** (1.1 MB) - Complete Vercel AI SDK v5 documentation

**When to Use**:
- Implementing file upload/storage features → Reference Cloudflare R2 docs
- Working on AI chat/streaming → Reference Vercel AI SDK docs
- Checking API method signatures → Search these files
- Verifying correct implementation patterns → Follow vendor examples

**Note**: These are external reference materials, not project-specific documentation. They are preserved for offline reference and match the versions currently implemented in the project.

---

## Documentation Organization

### File Naming Conventions

- **lowercase-with-hyphens.md** - Standard documentation files
- **UPPERCASE-FOR-ALERTS.md** - Critical warnings/urgent notices
- **README.md** - Directory index files

### Documentation Status Indicators

- ⭐ **Star** - Core/essential documentation
- ✅ **Check** - Complete and up-to-date
- ⚠️ **Warning** - Requires attention
- 🚧 **Construction** - Work in progress
- 📦 **Box** - Archived/historical

---

## For AI Assistants

### Primary Reference
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant quick reference (root directory)

### Most Important Docs

1. **Database**:
   - [Current Schema](07-database/current-schema.md) - Know the tables
   - [URGENT Migration](07-database/URGENT-MIGRATION-REQUIRED.md) - Critical updates

2. **Features**:
   - [Scoring System](03-features/location-analysis/scoring-system.md) - Location scoring logic
   - [Multimodal Support](03-features/ai-chatbot/multimodal-support.md) - Image handling
   - [Memory System](03-features/ai-chatbot/memory-system.md) - User memory

3. **API**:
   - [Endpoints](04-api-reference/endpoints.md) - All API routes
   - [AI Models](04-api-reference/ai-models.md) - Model configuration

### Common Workflows

**Adding a New Feature**:
1. Read [Core Concepts](02-core-concepts/)
2. Check [Feature Documentation](03-features/)
3. Review [Coding Standards](02-core-concepts/coding-standards.md)
4. Understand [Data Pipeline](02-core-concepts/data-pipeline.md)

**Database Changes**:
1. Review [Current Schema](07-database/current-schema.md)
2. Check [URGENT Migration](07-database/URGENT-MIGRATION-REQUIRED.md)
3. Follow [Migration Guide](07-database/migration-guide.md)

**Debugging**:
1. Check [Testing Strategy](08-testing/testing-strategy.md)
2. Review [API Reference](04-api-reference/endpoints.md)
3. Consult feature-specific docs

---

## Contributing to Documentation

### Guidelines

1. **Keep docs up-to-date** - Update when code changes
2. **Be concise** - Readers want quick answers
3. **Use examples** - Code snippets help understanding
4. **Link related docs** - Help readers navigate
5. **Archive old docs** - Move outdated files to archive/

### Documentation Updates

When updating documentation:
- [ ] Update "Last Updated" date
- [ ] Check for broken links
- [ ] Update related documentation
- [ ] Add to this index if new file
- [ ] Archive old versions if replacing

---

## External Resources

- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Three.js**: https://threejs.org/docs

---

## Questions?

- Check [CLAUDE.md](../CLAUDE.md) first
- Search this documentation
- Review related feature docs
- Check archived docs if looking for historical context

**Last Updated**: 2025-12-08
