# Database Schema - Current State

> **Last Updated**: 2025-12-08
> **Database**: Neon PostgreSQL
> **Status**: Hybrid - Old + New tables coexisting

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Status](#schema-status)
3. [Core Tables](#core-tables)
4. [Migration Strategy](#migration-strategy)
5. [Table Reference](#table-reference)

---

## Overview

The GroosHub database is currently in a **hybrid state** with both old (legacy) and new (restructured) tables coexisting to ensure backwards compatibility. The restructured schema supports **multi-organization** architecture and **project-based** data management.

### Key Changes

| Old Table | New Table | Status |
|-----------|-----------|--------|
| `users` | `user_accounts` | ⚠️ Both active |
| `chats` | `chat_conversations` | ⚠️ Both active |
| `chats_messages` | `chat_messages` | ⚠️ Both active |
| `chats_messages_votes` | `chat_message_votes` | ⚠️ Both active |
| `projects` | `project_projects` | ⚠️ Both active |
| `saved_locations` | `location_snapshots` | ⚠️ Both active |
| N/A | `org_organizations` | ✅ New |
| N/A | `file_uploads` | ✅ New (unified) |
| `chat_files` | `file_uploads` | 🔄 Migrating |
| `lca_projects` | Separate | ⚠️ LCA projects separate from project management |

---

## Schema Status

### ✅ New Tables (Active - Use These)

**Multi-Organization Support:**
- `org_organizations` - Organizations (GROOSMAN as default)
- `user_accounts` - User accounts with org_id

**Project Management:**
- `project_projects` - Projects with org_id
- `project_members` - Project membership & roles
- `project_invitations` - Project invitations

**Chat System (Restructured):**
- `chat_conversations` - Chat conversations
- `chat_messages` - Messages with encryption support
- `chat_message_votes` - Message voting
- `file_uploads` - Unified file management (R2 storage)
- `llm_usage` - LLM usage tracking & costs

**Memory System:**
- `user_memories` - User preferences & patterns
- `user_memory_updates` - Memory change history
- `project_memories` - Project-specific memory
- `project_memory_updates` - Project memory history

**Versioned Data:**
- `location_snapshots` - Versioned location analysis
- `lca_snapshots` - Versioned LCA calculations

**Security:**
- `audit_logs` - Security & compliance logging

### ⚠️ Legacy Tables (Deprecated - To Be Removed)

**Old User/Auth:**
- `users` - Old user table (→ `user_accounts`)

**Old Chat System:**
- `chats` - Old chat conversations (→ `chat_conversations`)
- `chats_messages` - Old messages (→ `chat_messages`)
- `chats_messages_votes` - Old votes (→ `chat_message_votes`)
- `chat_lists` - Old chat lists
- `chat_files` - Old file management (→ `file_uploads`)

**Old Project Management:**
- `projects` - Old projects (→ `project_projects`)
- `project_users` - Old project membership

**Old Location Storage:**
- `saved_locations` - Old location saves (→ `location_snapshots`)
- `location_shares` - Location sharing (may migrate)

### ⚙️ Feature-Specific Tables (Active)

**LCA (Life Cycle Assessment):**
- `lca_projects` - LCA project data
- `lca_elements` - Building elements
- `lca_layers` - Material layers
- `lca_materials` - Material database
- `lca_packages` - Material packages
- `lca_package_layers` - Package layer compositions
- `lca_templates` - LCA templates
- `lca_reference_values` - MPG reference values
- `lca_service_lives` - Material lifespans

**Task Management:**
- `tasks` - Task items
- `task_lists` - Task lists
- `notes` - Note items
- `note_lists` - Note lists

**Other:**
- `image_generations` - AI image generation tracking
- `plan_database` - Drawing/floor plan database
- `project_doc_chunks` - Document embeddings for RAG

---

## Core Tables

### Users & Organizations

```sql
-- NEW: Multi-org user table
CREATE TABLE user_accounts (
  id SERIAL PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES org_organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Organizations
CREATE TABLE org_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  plan_tier VARCHAR(50) DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEGACY: Old user table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Projects

```sql
-- NEW: Project management with org support
CREATE TABLE project_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org_organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  is_template BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER REFERENCES user_accounts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Project membership
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'viewer'
  permissions JSONB DEFAULT '{"can_edit": true, "can_delete": false}',
  invited_by_user_id INTEGER REFERENCES user_accounts(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- LEGACY: Old projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Chat System

```sql
-- NEW: Chat conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  title VARCHAR(500),
  model_id VARCHAR(100),
  model_settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Chat messages (with encryption support)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
  content TEXT,
  content_json JSONB,
  content_encrypted BOOLEAN DEFAULT false,
  model_id VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NEW: Unified file uploads (R2 storage)
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_category VARCHAR(50), -- 'chat', 'project', 'lca', etc.
  storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 'r2', 'azure'
  storage_url TEXT,
  is_public BOOLEAN DEFAULT false,
  access_level VARCHAR(50) DEFAULT 'private',
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER REFERENCES user_accounts(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEGACY: Old chat tables
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project_id UUID REFERENCES lca_projects(id),
  model_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE chats_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  content_json JSONB NOT NULL,
  model_id VARCHAR(100),
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chats_messages(id),
  file_url TEXT,
  file_name TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'uploaded',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  storage_key TEXT,
  expires_at TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);
```

### Memory System

```sql
-- User memory (persists across chats)
CREATE TABLE user_memories (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  memory_content TEXT NOT NULL DEFAULT '',
  user_name VARCHAR(255),
  user_role VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  interests JSONB DEFAULT '[]',
  patterns JSONB DEFAULT '[]',
  context JSONB DEFAULT '[]',
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project memory (shared within project)
CREATE TABLE project_memories (
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,
  memory_content TEXT NOT NULL,
  project_summary TEXT,
  key_decisions JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  patterns JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Versioned Data (Snapshots)

```sql
-- Location analysis snapshots
CREATE TABLE location_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  neighborhood_code VARCHAR(20),
  district_code VARCHAR(20),
  municipality_code VARCHAR(20),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  demographics_data JSONB DEFAULT '{}',
  health_data JSONB DEFAULT '{}',
  safety_data JSONB DEFAULT '{}',
  livability_data JSONB DEFAULT '{}',
  amenities_data JSONB DEFAULT '{}',
  housing_data JSONB DEFAULT '{}',
  overall_score NUMERIC,
  category_scores JSONB DEFAULT '{}',
  data_sources JSONB DEFAULT '{}',
  api_versions JSONB DEFAULT '{}',
  notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT one_active_per_project UNIQUE (project_id, is_active) WHERE is_active = true
);

-- LCA calculation snapshots
CREATE TABLE lca_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  project_name VARCHAR(500) NOT NULL,
  project_description TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  functional_unit VARCHAR(255),
  system_boundary TEXT,
  allocation_method VARCHAR(100),
  processes JSONB DEFAULT '[]',
  flows JSONB DEFAULT '[]',
  impact_categories JSONB DEFAULT '[]',
  results JSONB DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  comparisons JSONB DEFAULT '[]',
  calculation_status VARCHAR(50) DEFAULT 'pending',
  calculation_error TEXT,
  last_calculated_at TIMESTAMP,
  database_source VARCHAR(100),
  database_version VARCHAR(50),
  notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT one_active_per_project UNIQUE (project_id, is_active) WHERE is_active = true
);

-- LEGACY: Old saved locations
CREATE TABLE saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  location_data JSONB NOT NULL,
  selected_pve JSONB,
  selected_personas JSONB,
  llm_rapport JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  data_version VARCHAR(20) DEFAULT '1.0.0',
  completion_status VARCHAR(50) DEFAULT 'location_only',
  metadata JSONB DEFAULT '{}',
  amenities_data JSONB,
  UNIQUE(user_id, address)
);
```

### LCA Tables

LCA tables remain unchanged (feature-specific, not part of restructure):

- `lca_projects` - LCA project metadata
- `lca_elements` - Building elements (walls, floors, roof, etc.)
- `lca_layers` - Material layers within elements
- `lca_materials` - Material database (Ökobaudat)
- `lca_packages` - Pre-configured material packages
- `lca_package_layers` - Layers within packages
- `lca_templates` - Project templates
- `lca_reference_values` - MPG compliance values
- `lca_service_lives` - Material service life data

### Security & Tracking

```sql
-- Security audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES user_accounts(id),
  org_id UUID REFERENCES org_organizations(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LLM usage tracking
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id),
  chat_id UUID REFERENCES chat_conversations(id),
  message_id UUID REFERENCES chats_messages(id),
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER,
  cost_input NUMERIC NOT NULL DEFAULT 0,
  cost_output NUMERIC NOT NULL DEFAULT 0,
  cost_total NUMERIC,
  request_type VARCHAR(50) NOT NULL,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Migration Strategy

### Phase 1: Coexistence (Current)

**Status**: ✅ Complete

Both old and new tables exist. New code uses new tables, old code continues working.

### Phase 2: Code Migration (In Progress)

**Tasks**:
- [ ] Update all queries to use `user_accounts` instead of `users`
- [ ] Update all queries to use `chat_conversations` instead of `chats`
- [ ] Update all queries to use `chat_messages` instead of `chats_messages`
- [ ] Update all queries to use `file_uploads` instead of `chat_files`
- [ ] Update all queries to use `location_snapshots` instead of `saved_locations`

### Phase 3: Data Migration (Pending)

**Tasks**:
- [ ] Migrate data from `saved_locations` → `location_snapshots`
- [ ] Verify all legacy tables are no longer in use
- [ ] Create backup of all legacy data

### Phase 4: Cleanup (Future)

**Tasks**:
- [ ] Drop legacy tables: `users`, `chats`, `chats_messages`, `chat_files`, `saved_locations`
- [ ] Update documentation
- [ ] Performance optimization

---

## Table Reference

### Table Count: 49 tables

**Category Breakdown:**
- ✅ **New/Active**: 20 tables (org, user_accounts, project_projects, chat_conversations, etc.)
- ⚠️ **Legacy**: 8 tables (users, chats, chats_messages, projects, saved_locations, etc.)
- ⚙️ **LCA**: 10 tables (lca_projects, lca_elements, lca_materials, etc.)
- 📝 **Feature-Specific**: 11 tables (tasks, notes, image_generations, etc.)

### Foreign Key Relationships

**Key relationships documented in schema SQL above.**

Notable patterns:
- **Cascading Deletes**: Most foreign keys use `ON DELETE CASCADE` for automatic cleanup
- **Soft Deletes**: Some tables use `deleted_at` timestamp instead of hard deletes
- **User References**: Mixed between `users.id` (legacy) and `user_accounts.id` (new)

### Indexes

**Performance Indexes** (200+ total):
- Primary keys on all tables
- User/project relationship indexes
- Timestamp indexes for sorting (created_at, updated_at)
- JSONB GIN indexes for metadata searching
- Text search indexes (full-text search on project_doc_chunks)
- Vector indexes for embeddings (project_doc_chunks)

---

## Common Queries

### Get User's Projects

```sql
-- NEW
SELECT p.*
FROM project_projects p
JOIN project_members pm ON pm.project_id = p.id
JOIN user_accounts u ON u.id = pm.user_id
WHERE u.email = 'user@example.com'
  AND p.deleted_at IS NULL
  AND pm.left_at IS NULL;
```

### Get Project's Chat Conversations

```sql
-- NEW
SELECT c.*
FROM chat_conversations c
JOIN user_accounts u ON u.id = c.user_id
WHERE c.project_id = 'project-uuid'
ORDER BY c.last_message_at DESC;
```

### Get Location Snapshot History

```sql
-- NEW
SELECT *
FROM location_snapshots
WHERE project_id = 'project-uuid'
ORDER BY version_number DESC;
```

---

## See Also

- [Restructuring Proposal](restructuring-proposal.md) - Original design document
- [Restructuring Roadmap](restructuring-roadmap.md) - Implementation timeline
- [Migration Guide](migration-guide.md) - How to run migrations
- [Saved Locations Versioning](saved-locations.md) - Location snapshot details

---

**Schema Export Date**: 2025-12-08
**Total Tables**: 49
**Database**: Neon PostgreSQL
**Status**: Hybrid (old + new coexisting)
