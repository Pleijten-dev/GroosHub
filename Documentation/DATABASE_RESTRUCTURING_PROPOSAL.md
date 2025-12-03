# Database Restructuring Proposal
## GroosHub Multi-Organization & Project-Based Architecture

> **Version**: 1.0
> **Date**: 2025-12-03
> **Status**: Proposal - Pending Approval

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Table Specifications](#table-specifications)
5. [Data Migration Strategy](#data-migration-strategy)
6. [Security Considerations](#security-considerations)
7. [UI/UX Flow](#uiux-flow)
8. [Implementation Phases](#implementation-phases)

---

## Executive Summary

### Goals

This proposal addresses critical architectural limitations and prepares GroosHub for multi-organization scalability:

1. **Multi-tenancy**: Introduce organizations as the top-level entity
2. **Unified Projects**: Consolidate LCA, Chat, and Location features under shared projects
3. **Collaboration**: Enable team-based project management with proper roles
4. **Security**: Implement encryption for sensitive chat data
5. **Versioning**: Add temporal tracking for Location and LCA data
6. **Consistency**: Standardize table naming with domain prefixes

### Impact

- **Breaking Changes**: Yes - Major schema restructuring required
- **Data Migration**: Required for all existing records
- **API Changes**: Significant - All project-related endpoints
- **UI Changes**: Major - Sidebar, project pages, access control

---

## Current State Analysis

### Tables Status Assessment

#### ✅ **Actively Used Tables** (Keep & Refactor)

| Current Name | Domain | Status | Action |
|--------------|--------|--------|--------|
| `users` | User | Active | Rename to `user_accounts`, add org_id |
| `chats` | Chat | Active | Rename to `chat_conversations` |
| `chats_messages` | Chat | Active | Rename to `chat_messages`, add encryption |
| `chat_files` | Files | Active | Keep name, update references |
| `saved_locations` | Location | Active | Rename to `location_snapshots`, add versioning |
| `location_shares` | Location | Active | Remove (replaced by project access) |
| `lca_projects` | LCA | Active | Merge into main projects |
| `lca_elements` | LCA | Active | Add versioning |
| `lca_materials` | LCA | Active | Keep |
| `lca_layers` | LCA | Active | Add versioning |
| `lca_packages` | LCA | Active | Keep |
| `lca_package_layers` | LCA | Active | Keep |
| `lca_templates` | LCA | Active | Keep |
| `lca_service_lives` | LCA | Active | Keep |
| `lca_reference_values` | LCA | Active | Keep |
| `user_memories` | User | Active | Keep |
| `user_memory_updates` | User | Active | Keep |
| `llm_usage` | Analytics | Active | Keep |
| `image_generations` | Analytics | Active | Keep |
| `project_doc_chunks` | RAG | Active | Keep |
| `chats_messages_votes` | Chat | Partial | Keep |

#### 🔵 **Database Views** (Keep)

| View Name | Purpose | Status |
|-----------|---------|--------|
| `saved_locations_stats` | Location analytics | Keep |
| `user_accessible_locations` | Deprecated - replace with project permissions | Remove |
| `recent_memory_updates` | User activity | Keep |
| `daily_llm_cost_by_user` | Cost analytics | Keep |

#### ❌ **Non-existent Tables** (Referenced but don't exist)

| Table Name | Notes |
|------------|-------|
| `chat_lists` | Never existed - confusion with `chats` table |
| `plan_database` | Never existed - likely confusion with `lca_projects` |
| `saved_locations_stats` | Is a VIEW, not a table |
| `user_accessible_locations` | Is a VIEW, not a table |
| `project_users` | Never existed - needs to be created |

#### 🟡 **Future Feature Tables** (Keep for Roadmap)

| Table Name | Feature | Status |
|------------|---------|--------|
| `tasks` | Kanban board | Keep - future feature |
| `task_lists` | Task organization | Keep - future feature |
| `notes` | Project notes | Keep - future feature |
| `note_lists` | Note organization | Keep - future feature |
| `projects` | Main projects | **Missing - must create** |

### Key Issues Identified

#### 1. **No Organizational Structure**
- No multi-tenancy support
- Users not grouped into organizations
- No organizational hierarchy

#### 2. **Fragmented Project Model**
- `lca_projects` exists but no main `projects` table
- Location data not linked to projects
- Chat `project_id` references `lca_projects` (too specific)

#### 3. **Inconsistent Naming**
- Mix of prefixes: `chats` vs `chats_messages` vs `chat_files`
- No domain-based naming convention
- LCA tables use `lca_` prefix but others don't

#### 4. **Missing Collaboration Features**
- No `project_users` table
- No project-level permissions
- Single-owner model only

#### 5. **No Data Versioning**
- Location data overwrites previous versions
- LCA data overwrites previous versions
- No temporal tracking

#### 6. **Security Gaps**
- Chat messages stored as plain text
- Sensitive organizational data not encrypted
- No field-level encryption

---

## Proposed Architecture

### Core Principles

1. **Domain-Prefixed Naming**: All tables use consistent prefixes
   - `org_*` - Organizations
   - `user_*` - Users and authentication
   - `project_*` - Projects and collaboration
   - `chat_*` - Chat conversations
   - `location_*` - Location analysis
   - `lca_*` - Life Cycle Assessment
   - `file_*` - File management
   - `system_*` - System tables

2. **Hierarchical Structure**: Organization → Projects → Data
   ```
   org_organizations
   ├── user_accounts (members)
   └── project_projects
       ├── project_members (users in project)
       ├── chat_conversations (private & project)
       ├── location_snapshots (versioned)
       └── lca_snapshots (versioned)
   ```

3. **Versioning**: Temporal data with `snapshot_date` and `is_active`

4. **Soft Deletes**: Recoverable deletion with `deleted_at` timestamps

5. **Encryption**: Sensitive fields use application-level encryption

### Entity Relationship Overview

```
┌─────────────────────┐
│ org_organizations   │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│ user_accounts       │◄─────┐
└──────────┬──────────┘      │
           │                  │
           │ N:M              │
           │                  │
┌──────────▼──────────┐      │
│ project_projects    │      │
└──────────┬──────────┘      │
           │                  │
           │ 1:N              │
           │                  │
    ┌──────┴──────┬──────────┼──────────┬──────────┐
    │             │          │          │          │
    │             │          │          │          │
┌───▼──────┐  ┌──▼────┐  ┌──▼────┐  ┌──▼────┐  ┌──▼────┐
│ chat_*   │  │ loc_* │  │ lca_* │  │ file_*│  │ notes │
└──────────┘  └───────┘  └───────┘  └───────┘  └───────┘
```

### Unified project_id Across All Features

**Key Architectural Decision**: All major features share the same `project_id` reference:

| Feature | Table | project_id Column | Behavior |
|---------|-------|-------------------|----------|
| **Chat** | `chat_conversations` | `project_id UUID` (nullable) | NULL = private chat<br>UUID = project chat with access to project data |
| **Location** | `location_snapshots` | `project_id UUID` (required) | Each project has versioned location snapshots<br>Agent uses latest active snapshot |
| **LCA** | `lca_snapshots` | `project_id UUID` (required) | Each project has versioned LCA snapshots<br>Agent uses latest active snapshot |
| **Files** | `file_uploads` | `project_id UUID` (nullable) | NULL = private file<br>UUID = project file (RAG accessible) |
| **Notes** | `notes` | `project_id UUID` (required) | Project documentation |
| **Tasks** | `tasks` | `project_id UUID` (required) | Project task management |

**Benefits**:
1. **Unified Context**: Agents can access all project data via single `project_id`
2. **Access Control**: Single permission system via `project_members`
3. **Data Isolation**: Clear boundaries between personal and project data
4. **Historical Tracking**: Versioned snapshots preserve data over time
5. **Simplified Queries**: Join on `project_id` to get all related data

**Example Flow**:
```
User opens chat in "Amsterdam Renovation Project" (project_id: abc-123)
  → Chat agent can query:
    - location_snapshots WHERE project_id = 'abc-123' AND is_active = true
    - lca_snapshots WHERE project_id = 'abc-123' AND is_active = true
    - file_uploads WHERE project_id = 'abc-123' AND is_indexed = true
    - notes WHERE project_id = 'abc-123'
  → RAG system retrieves context from project files
  → Location agent uses latest active location snapshot
  → LCA agent uses latest active LCA snapshot
```

---

## Table Specifications

### 1. Organizations

#### `org_organizations`
**Purpose**: Top-level tenant entity for multi-organization support

```sql
CREATE TABLE org_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb, -- logo, colors, etc.

  -- Limits & Billing
  plan_tier VARCHAR(50) DEFAULT 'free', -- free, professional, enterprise
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_org_slug (slug),
  INDEX idx_org_active (is_active) WHERE deleted_at IS NULL
);
```

**Key Features**:
- Soft delete support
- Plan-based limits
- Customizable branding
- URL-friendly slugs

---

### 2. Users & Authentication

#### `user_accounts` (renamed from `users`)
**Purpose**: User authentication and profile

```sql
CREATE TABLE user_accounts (
  id SERIAL PRIMARY KEY,

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- bcrypt hashed

  -- Profile
  name VARCHAR(255),
  avatar_url TEXT,

  -- Roles
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'owner', 'admin', 'user'

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_user_org (org_id),
  INDEX idx_user_email (email),
  INDEX idx_user_role (role)
);
```

**Role Hierarchy**:
- **owner**: Platform-level access (you) - manages all orgs and users
- **admin**: Organization-level access - manages users within their org
- **user**: Project-level access - standard user permissions

**Changes from current**:
- Added `org_id` (required)
- Renamed to `user_accounts` for clarity
- Added `is_active`, `email_verified_at`, `last_login_at`

#### `user_sessions` (new table - optional)
**Purpose**: Track active user sessions for security

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL, -- Hashed session token
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_session_user (user_id),
  INDEX idx_session_token (token_hash),
  INDEX idx_session_expires (expires_at)
);
```

---

### 3. Projects

#### `project_projects` (new main table)
**Purpose**: Central projects table for all features (LCA, Location, Chat, Notes, Tasks)

```sql
CREATE TABLE project_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100), -- Client reference number

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'deleted'
  is_template BOOLEAN DEFAULT false,

  -- Soft Delete (30-day recovery window)
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_project_org (org_id),
  INDEX idx_project_status (status) WHERE deleted_at IS NULL,
  INDEX idx_project_last_accessed (last_accessed_at),
  INDEX idx_project_deleted (deleted_at) WHERE deleted_at IS NOT NULL
);
```

**Key Features**:
- Unified projects for all features
- Soft delete with 30-day recovery
- `last_accessed_at` for sorting
- Template support

#### `project_members` (replaces `project_users`)
**Purpose**: Project membership and roles

```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Role
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'creator', 'admin', 'member', 'viewer'

  -- Permissions (fine-grained)
  permissions JSONB DEFAULT '{
    "can_edit": true,
    "can_delete": false,
    "can_manage_members": false,
    "can_manage_files": true,
    "can_view_analytics": true
  }'::jsonb,

  -- Metadata
  invited_by_user_id INTEGER REFERENCES user_accounts(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP, -- User left project

  -- Indexes
  UNIQUE (project_id, user_id),
  INDEX idx_project_members_project (project_id),
  INDEX idx_project_members_user (user_id),
  INDEX idx_project_members_role (role)
);
```

**Project Roles**:
- **creator**: Full control, can transfer ownership, cannot leave (unless transferring)
- **admin**: Can manage members and settings
- **member**: Can edit project data, create chats, upload files
- **viewer**: Read-only access

**Business Rules**:
- Projects must have at least 1 creator
- Creators can transfer role or add additional creators
- Users can leave projects (except creators)
- Creators must transfer role before leaving

#### `project_invitations` (new table)
**Purpose**: Pending project invitations

```sql
CREATE TABLE project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  invited_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  invited_user_id INTEGER REFERENCES user_accounts(id), -- NULL if external email

  -- Invitation Details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  message TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  token_hash VARCHAR(255) UNIQUE NOT NULL,

  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_invitation_project (project_id),
  INDEX idx_invitation_email (email),
  INDEX idx_invitation_token (token_hash),
  INDEX idx_invitation_status (status)
);
```

---

### 4. Chat System

#### `chat_conversations` (renamed from `chats`)
**Purpose**: Chat conversation metadata

```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Project Linkage (NULL = private/personal chat)
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Chat Details
  title VARCHAR(500),

  -- Model Configuration
  model_id VARCHAR(100),
  model_settings JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_chat_user (user_id),
  INDEX idx_chat_project (project_id),
  INDEX idx_chat_last_message (last_message_at DESC)
);
```

**Key Changes**:
- Renamed from `chats` to `chat_conversations`
- `project_id` can be NULL for private chats
- Added `last_message_at` for sorting

**Business Logic**:
- `project_id = NULL`: Private/personal chat (user only)
- `project_id = UUID`: Project chat (private to user, but accesses project data)

#### `chat_messages` (renamed from `chats_messages`)
**Purpose**: Individual chat messages with encryption

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Message Content
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT, -- Plain text for indexing/search (ENCRYPTED)
  content_json JSONB, -- Rich content with artifacts (ENCRYPTED)
  content_encrypted BOOLEAN DEFAULT false, -- Flag indicating encryption status

  -- Model Info
  model_id VARCHAR(100),

  -- Token Usage
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_message_chat (chat_id),
  INDEX idx_message_role (role),
  INDEX idx_message_created (created_at DESC)
);
```

**Encryption Strategy**:
- `content` and `content_json` fields encrypted at application level
- Use AES-256-GCM encryption
- Encryption key derived from org-specific secret + message-specific IV
- `content_encrypted` flag for migration compatibility

#### `chat_message_votes` (renamed from `chats_messages_votes`)
**Purpose**: User feedback on assistant messages

```sql
CREATE TABLE chat_message_votes (
  -- References
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Vote
  is_upvoted BOOLEAN NOT NULL,
  feedback TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (message_id, user_id)
);
```

---

### 5. File Management

#### `file_uploads` (renamed from `chat_files`)
**Purpose**: Unified file management for chats and projects

```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE, -- NULL for private files

  -- Chat Context (if uploaded via chat)
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- File Details
  file_name TEXT NOT NULL,
  file_type VARCHAR(100), -- 'document', 'image', 'spreadsheet', etc.
  mime_type VARCHAR(255),
  file_size INTEGER, -- bytes

  -- Storage
  storage_provider VARCHAR(50) DEFAULT 'r2', -- 'r2', 's3', 'local'
  storage_key TEXT NOT NULL, -- R2 object key
  storage_url TEXT, -- Public URL (if applicable)

  -- Processing Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
  error_message TEXT,

  -- RAG Processing
  is_indexed BOOLEAN DEFAULT false, -- Processed for RAG
  indexed_at TIMESTAMP,
  chunk_count INTEGER DEFAULT 0,

  -- Expiration (for temporary files)
  expires_at TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_file_user (user_id),
  INDEX idx_file_project (project_id),
  INDEX idx_file_chat (chat_id),
  INDEX idx_file_status (status),
  INDEX idx_file_indexed (is_indexed),
  INDEX idx_file_expires (expires_at) WHERE expires_at IS NOT NULL
);
```

**Key Features**:
- Unified file table for chats and projects
- R2 storage integration
- RAG processing tracking
- Temporary file support (expires_at)

**Business Logic**:
- Files uploaded in project chats: `project_id` set, becomes accessible to all project members
- Files uploaded in private chats: `project_id = NULL`, accessible only to user
- RAG system indexes files where `project_id IS NOT NULL`

---

### 6. Location Analysis

#### `location_snapshots` (renamed from `saved_locations`)
**Purpose**: Versioned location analysis data

```sql
CREATE TABLE location_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Created By
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),

  -- Location Details
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- { "lat": 52.xxx, "lng": 4.xxx }

  -- Analysis Data
  location_data JSONB, -- Demographics, health, safety, etc.
  amenities_data JSONB,
  selected_pve JSONB,
  selected_personas JSONB,
  llm_rapport JSONB,

  -- Versioning
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true, -- Latest version for this project
  version_number INTEGER DEFAULT 1,

  -- Data Version
  data_version VARCHAR(50), -- CBS data version, etc.
  data_sources JSONB, -- Track which APIs were used

  -- Status
  completion_status VARCHAR(50) DEFAULT 'partial', -- 'partial', 'complete'

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_location_project (project_id),
  INDEX idx_location_user (user_id),
  INDEX idx_location_active (is_active, project_id),
  INDEX idx_location_snapshot_date (snapshot_date DESC),

  -- Constraints
  UNIQUE (project_id, snapshot_date, version_number)
);
```

**Versioning Logic**:
- Each project can have multiple location snapshots
- `is_active = true`: Latest/current version used by location agent
- Only one active snapshot per project at a time
- Historical snapshots retained for comparison
- `version_number` increments for same date updates

**Migration from `saved_locations`**:
- Existing locations become initial snapshots
- `project_id` assigned based on user (create default project per user)

#### ~~`location_shares`~~ (REMOVED)
**Purpose**: Replaced by project-based access control

**Rationale**:
- Location data now belongs to projects
- Access controlled via `project_members`
- Eliminates redundant permission system

---

### 7. LCA (Life Cycle Assessment)

#### `lca_snapshots` (new table - metadata for versioned LCA data)
**Purpose**: Version tracking for LCA project data

```sql
CREATE TABLE lca_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Created By
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),

  -- LCA Project Details (from lca_projects)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100),

  -- Building Info
  gross_floor_area NUMERIC,
  building_type VARCHAR(100),
  construction_system VARCHAR(100),
  floors INTEGER,
  dwelling_count INTEGER,
  study_period INTEGER,
  location VARCHAR(255),

  -- System Details
  energy_label VARCHAR(10),
  heating_system VARCHAR(100),
  facade_cladding VARCHAR(100),
  foundation VARCHAR(100),
  roof VARCHAR(100),
  window_frames VARCHAR(100),
  window_to_wall_ratio NUMERIC,

  -- Energy Consumption
  annual_gas_use NUMERIC,
  annual_electricity NUMERIC,

  -- LCA Results (aggregated from elements)
  total_gwp_a1_a3 NUMERIC,
  total_gwp_a4 NUMERIC,
  total_gwp_a5 NUMERIC,
  total_gwp_b4 NUMERIC,
  total_gwp_c NUMERIC,
  total_gwp_d NUMERIC,
  total_gwp_sum NUMERIC,
  total_gwp_per_m2_year NUMERIC,
  operational_carbon NUMERIC,
  total_carbon NUMERIC,

  -- Compliance
  mpg_reference_value NUMERIC,
  is_compliant BOOLEAN,

  -- Versioning
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,

  -- Template/Sharing
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_lca_snapshot_project (project_id),
  INDEX idx_lca_snapshot_user (user_id),
  INDEX idx_lca_snapshot_active (is_active, project_id),
  INDEX idx_lca_snapshot_date (snapshot_date DESC),

  -- Constraints
  UNIQUE (project_id, snapshot_date, version_number)
);
```

#### `lca_elements` (updated)
**Purpose**: Building elements within LCA snapshots (ADD snapshot versioning)

```sql
-- Add columns to existing table:
ALTER TABLE lca_elements
  ADD COLUMN snapshot_id UUID REFERENCES lca_snapshots(id) ON DELETE CASCADE,
  ADD COLUMN version_number INTEGER DEFAULT 1,
  ADD INDEX idx_lca_element_snapshot (snapshot_id);

-- Keep existing project_id for backward compatibility during migration
-- project_id can be derived from snapshot_id
```

#### `lca_layers` (updated)
**Purpose**: Material layers - no changes needed (cascades via elements)

#### All other LCA tables remain unchanged:
- `lca_materials` - Material database
- `lca_packages` - Reusable building packages
- `lca_package_layers` - Package compositions
- `lca_templates` - Project templates
- `lca_service_lives` - Material lifespans
- `lca_reference_values` - Regulatory limits

---

### 8. Project Memory System (New Feature)

#### `project_memories` (new table)
**Purpose**: AI context memory for projects (similar to user_memories)

```sql
CREATE TABLE project_memories (
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Memory Content
  memory_content TEXT NOT NULL, -- Consolidated project knowledge

  -- Project Details
  project_summary TEXT,
  key_decisions JSONB DEFAULT '[]'::jsonb, -- Important decisions made
  preferences JSONB DEFAULT '{}'::jsonb, -- Team preferences
  patterns JSONB DEFAULT '{}'::jsonb, -- Recurring patterns
  context JSONB DEFAULT '{}'::jsonb, -- Additional context

  -- Update Tracking
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,

  -- Token Management
  token_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `project_memory_updates` (new table)
**Purpose**: Audit trail for project memory changes

```sql
CREATE TABLE project_memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Change Details
  previous_content TEXT,
  new_content TEXT,
  change_summary TEXT,
  change_type VARCHAR(50), -- 'addition', 'modification', 'removal', 'consolidation'

  -- Trigger
  trigger_source VARCHAR(50), -- 'chat', 'note', 'task', 'file_upload', 'manual'
  trigger_id UUID, -- ID of chat, note, etc.
  triggered_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  INDEX idx_project_memory_updates_project (project_id),
  INDEX idx_project_memory_updates_created (created_at DESC)
);
```

**Relationship with Notes**:
- Notes are structured documents stored in `notes` table
- Project memories are consolidated, AI-optimized summaries
- Notes feed into project memory but aren't replaced by it
- Both coexist: Notes for explicit documentation, memories for implicit context

---

### 9. Analytics & System Tables

#### `llm_usage` (keep unchanged)
**Purpose**: Track LLM token usage and costs

#### `image_generations` (keep unchanged)
**Purpose**: Track AI image generation requests

#### `chat_statistics` (missing from schema - needs creation)
**Purpose**: Aggregated chat analytics

```sql
CREATE TABLE chat_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  chat_id UUID NOT NULL REFERENCES chat_conversations(id),

  -- Statistics
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC(10,4) DEFAULT 0,
  average_response_time_ms INTEGER,

  -- Date
  date DATE NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE (chat_id, date)
);
```

---

### 10. Future Feature Tables (Keep for Roadmap)

These tables exist but aren't actively used yet:

#### `tasks` (keep)
**Purpose**: Kanban task management

**Needed Updates**:
```sql
ALTER TABLE tasks
  ADD COLUMN project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  ADD INDEX idx_task_project (project_id);
```

#### `task_lists` (keep)
**Purpose**: Kanban columns/lists

**Needed Updates**:
```sql
ALTER TABLE task_lists
  ADD COLUMN project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  DROP COLUMN project_id, -- Remove old INTEGER reference
  ADD INDEX idx_task_list_project (project_id);
```

#### `notes` (keep)
**Purpose**: Project documentation

**Needed Updates**:
```sql
ALTER TABLE notes
  ADD COLUMN project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  ADD COLUMN is_public BOOLEAN DEFAULT true, -- Visible to all project members
  ADD INDEX idx_note_project (project_id);
```

#### `note_lists` (keep)
**Purpose**: Note organization

**Needed Updates**:
```sql
ALTER TABLE note_lists
  ADD COLUMN project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,
  DROP COLUMN project_id, -- Remove old INTEGER reference
  ADD INDEX idx_note_list_project (project_id);
```

---

## Data Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)

1. Create new tables:
   - `org_organizations`
   - `project_projects`
   - `project_members`
   - `project_invitations`
   - `project_memories`
   - `project_memory_updates`
   - `location_snapshots`
   - `lca_snapshots`

2. Rename tables (create new, don't drop old yet):
   - `users` → `user_accounts` (with org_id)
   - `chats` → `chat_conversations`
   - `chats_messages` → `chat_messages`
   - `chats_messages_votes` → `chat_message_votes`
   - `chat_files` → `file_uploads`
   - `saved_locations` → `location_snapshots`

### Phase 2: Data Migration

#### Step 1: Create Default Organization
```sql
-- Create GROOSMAN organization for existing data
INSERT INTO org_organizations (id, name, slug, plan_tier)
VALUES (
  gen_random_uuid(), -- Will be generated: e.g., '550e8400-e29b-41d4-a716-446655440000'
  'GROOSMAN',
  'groosman',
  'professional'
);
```

#### Step 2: Migrate Users
```sql
-- Add org_id to all existing users (using GROOSMAN organization)
INSERT INTO user_accounts (
  id, org_id, email, password, name, role, created_at, updated_at
)
SELECT
  id,
  (SELECT id FROM org_organizations WHERE slug = 'groosman'),
  email,
  password,
  name,
  role,
  created_at,
  updated_at
FROM users;
```

#### Step 3: Create Projects from LCA Projects
```sql
-- Create main projects from lca_projects (all under GROOSMAN organization)
INSERT INTO project_projects (id, org_id, name, description, project_number, created_at, updated_at)
SELECT
  id,
  (SELECT id FROM org_organizations WHERE slug = 'groosman'),
  name,
  description,
  project_number,
  created_at,
  updated_at
FROM lca_projects;

-- Create project members (user as creator)
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT
  id,
  user_id,
  'creator',
  created_at
FROM lca_projects;
```

#### Step 4: Create Initial LCA Snapshots
```sql
-- Create snapshot records from existing lca_projects
INSERT INTO lca_snapshots (
  id, project_id, user_id, name, description,
  gross_floor_area, building_type, construction_system,
  snapshot_date, is_active, version_number,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id, -- project_id is same as lca_project id
  user_id,
  name,
  description,
  gross_floor_area,
  building_type,
  construction_system,
  CURRENT_DATE,
  true,
  1,
  created_at,
  updated_at
FROM lca_projects;

-- Update lca_elements to reference snapshots
UPDATE lca_elements e
SET snapshot_id = s.id, version_number = 1
FROM lca_snapshots s
WHERE e.project_id = s.project_id AND s.version_number = 1;
```

#### Step 5: Migrate Saved Locations to Snapshots
```sql
-- Create personal projects for users with saved locations
INSERT INTO project_projects (id, org_id, name, description, created_at)
SELECT
  gen_random_uuid(),
  (SELECT org_id FROM user_accounts WHERE id = sl.user_id),
  'Location Analysis - ' || sl.name,
  'Migrated from saved location',
  sl.created_at
FROM saved_locations sl
WHERE NOT EXISTS (
  SELECT 1 FROM project_projects pp WHERE pp.org_id = (
    SELECT org_id FROM user_accounts WHERE id = sl.user_id
  )
);

-- Create location snapshots
INSERT INTO location_snapshots (
  id, project_id, user_id, name, address, coordinates,
  location_data, amenities_data, selected_pve, selected_personas,
  llm_rapport, snapshot_date, is_active, version_number,
  data_version, completion_status, metadata, created_at, updated_at
)
SELECT
  sl.id,
  pp.id, -- Link to newly created project
  sl.user_id,
  sl.name,
  sl.address,
  sl.coordinates,
  sl.location_data,
  sl.amenities_data,
  sl.selected_pve,
  sl.selected_personas,
  sl.llm_rapport,
  CURRENT_DATE,
  true,
  1,
  sl.data_version,
  sl.completion_status,
  sl.metadata,
  sl.created_at,
  sl.updated_at
FROM saved_locations sl
JOIN project_projects pp ON pp.name = 'Location Analysis - ' || sl.name;
```

#### Step 6: Migrate Chats
```sql
-- Migrate chats to chat_conversations
INSERT INTO chat_conversations (
  id, user_id, project_id, title, model_id, metadata,
  created_at, updated_at, last_message_at
)
SELECT
  id,
  user_id,
  project_id, -- Already exists in chats table
  title,
  model_id,
  metadata,
  created_at,
  updated_at,
  updated_at -- Use updated_at as initial last_message_at
FROM chats;

-- Migrate messages (without encryption initially)
INSERT INTO chat_messages (
  id, chat_id, role, content, content_json,
  content_encrypted, model_id, input_tokens, output_tokens,
  metadata, created_at
)
SELECT
  id,
  chat_id,
  role,
  content,
  content_json,
  false, -- Not encrypted yet
  model_id,
  input_tokens,
  output_tokens,
  metadata,
  created_at
FROM chats_messages;

-- Migrate votes
INSERT INTO chat_message_votes (message_id, user_id, is_upvoted, created_at)
SELECT message_id, user_id, is_upvoted, created_at
FROM chats_messages_votes;
```

#### Step 7: Migrate Files
```sql
-- Migrate chat files to file_uploads
INSERT INTO file_uploads (
  id, user_id, project_id, chat_id, message_id,
  file_name, file_type, mime_type, file_size,
  storage_provider, storage_key, storage_url,
  status, error_message, metadata,
  expires_at, created_at
)
SELECT
  cf.id,
  cf.user_id,
  cc.project_id, -- Derive from chat
  cf.chat_id,
  cf.message_id,
  cf.file_name,
  cf.file_type,
  cf.mime_type,
  cf.file_size,
  'r2', -- Default storage provider
  cf.storage_key,
  cf.file_url,
  cf.status,
  cf.error_message,
  cf.metadata,
  cf.expires_at,
  cf.created_at
FROM chat_files cf
JOIN chat_conversations cc ON cf.chat_id = cc.id;
```

### Phase 3: Update Views

#### Drop old views
```sql
DROP VIEW IF EXISTS user_accessible_locations; -- Replaced by project permissions
```

#### Create new views
```sql
-- User's accessible projects (via organization and membership)
CREATE VIEW user_accessible_projects AS
SELECT
  u.id AS user_id,
  p.id AS project_id,
  p.org_id,
  p.name,
  p.status,
  pm.role,
  pm.permissions,
  p.created_at,
  p.last_accessed_at
FROM user_accounts u
JOIN project_projects p ON p.org_id = u.org_id
LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = u.id
WHERE p.deleted_at IS NULL
  AND (pm.user_id IS NOT NULL OR u.role IN ('admin', 'owner'));

-- Active location snapshots per project
CREATE VIEW active_location_snapshots AS
SELECT *
FROM location_snapshots
WHERE is_active = true AND project_id IN (
  SELECT id FROM project_projects WHERE deleted_at IS NULL
);

-- Active LCA snapshots per project
CREATE VIEW active_lca_snapshots AS
SELECT *
FROM lca_snapshots
WHERE is_active = true AND project_id IN (
  SELECT id FROM project_projects WHERE deleted_at IS NULL
);
```

### Phase 4: Update Application Code

1. Update all database queries to use new table names
2. Update API routes to enforce project-based access control
3. Add organization context to authentication middleware
4. Update UI components to use new data structure

### Phase 5: Drop Old Tables (After Testing)

```sql
-- Only after thorough testing and verification
DROP TABLE IF EXISTS users; -- Replaced by user_accounts
DROP TABLE IF EXISTS chats; -- Replaced by chat_conversations
DROP TABLE IF EXISTS chats_messages; -- Replaced by chat_messages
DROP TABLE IF EXISTS chats_messages_votes; -- Replaced by chat_message_votes
DROP TABLE IF EXISTS chat_files; -- Replaced by file_uploads
DROP TABLE IF EXISTS saved_locations; -- Replaced by location_snapshots
DROP TABLE IF EXISTS location_shares; -- Replaced by project_members
DROP TABLE IF EXISTS lca_projects; -- Merged into project_projects + lca_snapshots
```

---

## Security Considerations

### 1. Chat Message Encryption

#### Implementation Strategy

**Encryption Method**: AES-256-GCM (Galois/Counter Mode)

**Key Derivation**:
```typescript
// Pseudo-code
const organizationSecret = process.env.ORG_ENCRYPTION_KEY; // Per-org key
const messageIV = crypto.randomBytes(16); // Unique per message
const key = deriveKey(organizationSecret, messageIV);

const encrypted = encrypt(plaintext, key, messageIV);
const stored = `${messageIV.toString('hex')}:${encrypted.toString('hex')}`;
```

**Fields to Encrypt**:
- `chat_messages.content` (TEXT)
- `chat_messages.content_json` (JSONB)

**Migration Process**:
1. Add `content_encrypted` flag (default false)
2. Gradual encryption of old messages (background job)
3. All new messages encrypted by default
4. Application decrypts on read

**Benefits**:
- At-rest encryption for sensitive data
- Org-level isolation (different keys per org)
- No performance impact on queries (only on read/write)

**Limitations**:
- Cannot search encrypted content directly (use metadata or tags)
- Key rotation requires re-encryption

### 2. Access Control

#### Organization-Level Isolation

```sql
-- Row-Level Security (RLS) example for PostgreSQL
ALTER TABLE project_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_org_isolation ON project_projects
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

#### Project-Level Permissions

**Permission Check Flow**:
1. User authenticated → get `user_id` and `org_id`
2. Check `project_members` for membership
3. Verify `role` and `permissions` JSON
4. Grant/deny access

**API Middleware**:
```typescript
async function requireProjectAccess(
  projectId: string,
  userId: number,
  requiredPermission: string
): Promise<boolean> {
  const member = await db.query(`
    SELECT role, permissions
    FROM project_members
    WHERE project_id = $1 AND user_id = $2
  `, [projectId, userId]);

  if (!member) return false;
  if (member.role === 'creator') return true; // Full access
  return member.permissions[requiredPermission] === true;
}
```

### 3. Soft Deletes & Recovery

#### Project Recovery Window

**30-Day Recovery**:
- `deleted_at` timestamp set on deletion
- Projects remain in database for 30 days
- Cron job permanently deletes after 30 days
- UI shows "Restore" option for deleted projects

**Implementation**:
```sql
-- Soft delete
UPDATE project_projects
SET deleted_at = CURRENT_TIMESTAMP, deleted_by_user_id = $1
WHERE id = $2;

-- Restore
UPDATE project_projects
SET deleted_at = NULL, deleted_by_user_id = NULL
WHERE id = $1 AND deleted_at IS NOT NULL;

-- Permanent deletion (cron job)
DELETE FROM project_projects
WHERE deleted_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
```

### 4. Audit Logging

#### Critical Operations to Log

- User login/logout
- Project creation/deletion
- Member addition/removal
- Role changes
- File uploads/deletions
- Data exports

**Audit Table** (optional):
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES user_accounts(id),
  org_id UUID REFERENCES org_organizations(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_audit_user (user_id),
  INDEX idx_audit_org (org_id),
  INDEX idx_audit_created (created_at DESC)
);
```

---

## UI/UX Flow

### UI Design Principles

**IMPORTANT: No Emoticons Policy**

All UI elements, mockups, and actual implementation **MUST NOT** include any emoticons, emojis, or icon characters in:
- Text labels
- Button labels
- Navigation items
- Form placeholders
- Messages or notifications
- Database content
- Any user-facing text

**Rationale**: Professional appearance, consistency with brand guidelines, and accessibility requirements.

**Allowed**: SVG icons, icon fonts (Font Awesome, Material Icons), and properly designed UI iconography.

**Not Allowed**: Unicode emoticons (📊, 💬, 🏗️, etc.) in any UI context.

---

### Sidebar Structure

```
┌─────────────────────────────────────┐
│  [User Avatar] [Name] [Settings]    │  ← User menu
├─────────────────────────────────────┤
│                                     │
│  PROJECTS                           │
│  [+ New Project]                    │  ← Create button
│                                     │
│  [Pin] Project A (pinned)           │  ← Pinned projects (sortable)
│  [Pin] Project B (pinned)           │
│                                     │
│  Project C                          │  ← Recent projects (auto-sorted)
│  Project D                          │
│  Project E                          │
│  ...                                │
│  [Show 12 more projects...]         │  ← Expand menu (if > 10)
│                                     │
├─────────────────────────────────────┤
│                                     │
│  CHATS                              │
│  [+ New Chat]                       │  ← Create button
│                                     │
│  Personal Planning                  │  ← Recent chats (scrollable)
│  Project A - Requirements           │
│  Location Analysis Q&A              │
│  LCA Calculation Help               │
│  Project B - Design                 │
│  Material Selection                 │
│  ...                                │
│  (scrollable list)                  │
│                                     │
└─────────────────────────────────────┘
```

**Interaction Behavior**:
- **Projects**: Click to open project page
- **Chats**: Click to open chat conversation
- **Pinning**: Right-click or drag to pin/unpin projects
- **Sorting**: Projects auto-sort by `last_accessed_at` unless pinned
- **Expansion**: "Show N more" button appears when > 10 projects

### Page Flows

#### 1. Landing Page (`/ai-assistant`)

```
┌─────────────────────────────────────────────────┐
│  [Sidebar]  │                                   │
│             │  Welcome back, [Name]!            │
│             │                                   │
│             │  Start a new conversation:        │
│             │                                   │
│             │  ┌──────────────────────────────┐ │
│             │  │ Analyze a new location       │ │
│             │  └──────────────────────────────┘ │
│             │  ┌──────────────────────────────┐ │
│             │  │ Calculate LCA for project    │ │
│             │  └──────────────────────────────┘ │
│             │  ┌──────────────────────────────┐ │
│             │  │ Help me create a report      │ │
│             │  └──────────────────────────────┘ │
│             │  ┌──────────────────────────────┐ │
│             │  │ Search project documents     │ │
│             │  └──────────────────────────────┘ │
│             │                                   │
│             │  ───────────────────────────────  │
│             │                                   │
│             │  [Input field: Ask me anything...│
│             │                        [Send] ]   │
└─────────────────────────────────────────────────┘
```

**Behavior**:
- Clicking a suggestion creates a new chat with that prompt
- Typing in input field creates a new personal chat
- No project selected = private/personal chat

#### 2. Project Page (`/ai-assistant/projects/[id]`)

```
┌─────────────────────────────────────────────────┐
│  [Sidebar]  │  [Project Name] [Settings]       │
│             │                                   │
│             │  ┌─────────────┬─────────────┐   │
│             │  │ Overview    │ Files       │   │
│             │  │ [Active]    │ Members     │   │
│             │  │             │ Chats       │   │
│             │  └─────────────┴─────────────┘   │
│             │                                   │
│             │  PROJECT STATISTICS              │
│             │  ┌─────────────────────────────┐ │
│             │  │ Messages: 23                │ │
│             │  │ Files: 12 (2.3 MB)          │ │
│             │  │ Members: 5                  │ │
│             │  │ Location: Amsterdam         │ │
│             │  │ LCA Score: 0.67 kg CO2/m2   │ │
│             │  └─────────────────────────────┘ │
│             │                                   │
│             │  PROJECT FILES                   │
│             │  ┌──────────────────────────────┐│
│             │  │   [Drag & Drop Files Here]   ││
│             │  │   or click to browse         ││
│             │  └──────────────────────────────┘│
│             │                                   │
│             │  requirements.pdf     [Delete]   │
│             │  floor-plan.dwg       [Delete]   │
│             │  budget.xlsx          [Delete]   │
│             │                                   │
│             │  PROJECT CHATS                   │
│             │  [+ New Project Chat]            │
│             │                                   │
│             │  Project A - Requirements        │
│             │  LCA Calculation Help            │
│             │                                   │
└─────────────────────────────────────────────────┘
```

**Tabs**:
- **Overview**: Stats, recent activity
- **Files**: Upload/manage files for RAG
- **Members**: View/manage team members (if creator/admin)
- **Chats**: List of all project chats

**Behavior**:
- Files uploaded here are available to RAG system
- Project chats can access project data (location, LCA, files)
- Members tab only visible to creators and admins

#### 3. Chat Page (`/ai-assistant/chats/[id]`)

```
┌─────────────────────────────────────────────────┐
│  [Sidebar]  │  [Chat Title]  [Project: X v]    │
│             │                                   │
│             │  ┌─────────────────────────────┐ │
│             │  │ User: Analyze this location │ │
│             │  │                             │ │
│             │  │ Assistant: I'll help you... │ │
│             │  │ [Location map]              │ │
│             │  │ Demographics: ...           │ │
│             │  └─────────────────────────────┘ │
│             │  ┌─────────────────────────────┐ │
│             │  │ User: What about safety?    │ │
│             │  └─────────────────────────────┘ │
│             │  ┌─────────────────────────────┐ │
│             │  │ Assistant: According to...  │ │
│             │  └─────────────────────────────┘ │
│             │                                   │
│             │  (chat history)                   │
│             │                                   │
│             │  ───────────────────────────────  │
│             │                                   │
│             │  [Input: Type message...  [Send]]│
└─────────────────────────────────────────────────┘
```

**Project Dropdown**:
- Shows current project (if any)
- Click to change project or set to "Personal"
- Changing project creates a new chat (prevents cross-contamination)

**Behavior**:
- Personal chats: No project context
- Project chats: AI can access project files, location data, LCA data

#### 4. New Chat Flow

**Option A: From Landing Page**
1. User types message in input field
2. System creates new personal chat
3. Redirects to chat page with message sent

**Option B: From Sidebar**
1. User clicks [+ New Chat]
2. Redirects to landing page (new chat state)
3. User selects suggestion or types message

**Option C: From Project Page**
1. User clicks [+ New Project Chat]
2. System creates new chat linked to project
3. Redirects to chat page with project context active

#### 5. Project Creation Flow

```
1. User clicks [+ New Project] in sidebar
2. Modal opens:

   ┌─────────────────────────────────────┐
   │  Create New Project                 │
   │                                     │
   │  Project Name: [_________________]  │
   │  Description:  [_________________]  │
   │                [_________________]  │
   │                                     │
   │  Template:     [None v]             │
   │                - Residential        │
   │                - Commercial         │
   │                - Infrastructure     │
   │                                     │
   │         [Cancel]  [Create Project]  │
   └─────────────────────────────────────┘

3. Project created → Redirects to project page
4. User can upload files, add members, start chats
```

---

## Implementation Phases

### Phase 0: Preparation (Week 1)

**Goals**: Plan, design, and set up infrastructure

- [ ] Review and approve this proposal
- [ ] Create detailed technical specifications
- [ ] Set up development environment
- [ ] Create database backup strategy
- [ ] Design encryption key management system
- [ ] Create migration rollback plan

**Deliverables**:
- Approved proposal document
- Technical specification document
- Encryption implementation guide
- Migration scripts (draft)

### Phase 1: Foundation (Weeks 2-3)

**Goals**: Create new tables and views without breaking existing functionality

- [ ] Create new database tables:
  - `org_organizations`
  - `project_projects`
  - `project_members`
  - `project_invitations`
  - `location_snapshots`
  - `lca_snapshots`
  - `project_memories`
  - `project_memory_updates`

- [ ] Create renamed tables (alongside old ones):
  - `user_accounts`
  - `chat_conversations`
  - `chat_messages`
  - `chat_message_votes`
  - `file_uploads`

- [ ] Create new database views
- [ ] Write migration scripts
- [ ] Test on development database

**Deliverables**:
- All new tables created
- Migration scripts tested
- Development database running dual tables

### Phase 2: Data Migration (Week 4)

**Goals**: Migrate all existing data to new structure

- [ ] Create default organization
- [ ] Migrate users to `user_accounts`
- [ ] Create projects from `lca_projects`
- [ ] Create project members
- [ ] Migrate location data to snapshots
- [ ] Create initial LCA snapshots
- [ ] Migrate chats and messages
- [ ] Migrate files
- [ ] Verify data integrity
- [ ] Test access patterns

**Deliverables**:
- All data migrated
- Verification report
- Performance benchmarks

### Phase 3: Backend Implementation (Weeks 5-7)

**Goals**: Update API layer to use new database structure

#### Week 5: Organization & User APIs
- [ ] Update authentication to include `org_id`
- [ ] Create organization management APIs
- [ ] Update user management APIs
- [ ] Implement role-based access control
- [ ] Add organization middleware

#### Week 6: Project APIs
- [ ] Create project CRUD APIs
- [ ] Create project member management APIs
- [ ] Create project invitation APIs
- [ ] Implement project access control middleware
- [ ] Add project soft delete/restore
- [ ] Create project statistics APIs

#### Week 7: Feature APIs
- [ ] Update chat APIs for new structure
- [ ] Implement chat encryption/decryption
- [ ] Update location APIs with snapshot versioning
- [ ] Update LCA APIs with snapshot versioning
- [ ] Update file upload APIs
- [ ] Create project memory APIs

**Deliverables**:
- All APIs updated and tested
- API documentation
- Postman/Swagger collection

### Phase 4: Frontend Implementation (Weeks 8-11)

**Goals**: Update UI to support new features

#### Week 8: Core Navigation
- [ ] Implement new sidebar with projects and chats
- [ ] Add project list with pinning functionality
- [ ] Add chat list with sorting
- [ ] Create project dropdown in chat header
- [ ] Update routing structure

#### Week 9: Project Pages
- [ ] Create project page layout
- [ ] Implement project statistics dashboard
- [ ] Create file upload interface
- [ ] Add project member management UI
- [ ] Create project settings page
- [ ] Implement project creation modal

#### Week 10: Chat Updates
- [ ] Update landing page with suggestions
- [ ] Implement project context switching
- [ ] Add file upload to chats
- [ ] Update chat input to support project files
- [ ] Add visual indicators for project vs personal chats

#### Week 11: Location & LCA Updates
- [ ] Update location page to use projects
- [ ] Add snapshot version selector
- [ ] Update LCA page to use projects
- [ ] Add snapshot version selector
- [ ] Implement comparison views (historical data)

**Deliverables**:
- Full UI implementation
- Responsive design verified
- User acceptance testing completed

### Phase 5: Security & Encryption (Week 12)

**Goals**: Implement encryption and security features

- [ ] Implement chat message encryption
- [ ] Set up encryption key management
- [ ] Add encryption to existing messages (background job)
- [ ] Implement audit logging
- [ ] Add rate limiting
- [ ] Security testing and penetration testing
- [ ] Create security documentation

**Deliverables**:
- Encryption fully implemented
- Security audit report
- Security documentation

### Phase 6: Testing & Optimization (Week 13)

**Goals**: Comprehensive testing and performance optimization

- [ ] Unit tests for all new APIs
- [ ] Integration tests for workflows
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Database query optimization
- [ ] Frontend performance optimization
- [ ] Load testing
- [ ] User acceptance testing

**Deliverables**:
- Test coverage report
- Performance benchmarks
- Optimization recommendations implemented

### Phase 7: Cleanup & Documentation (Week 14)

**Goals**: Remove old tables and finalize documentation

- [ ] Verify all functionality on new tables
- [ ] Create final backup of old tables
- [ ] Drop old tables (users, chats, etc.)
- [ ] Remove old API endpoints
- [ ] Update all documentation
- [ ] Create user migration guide
- [ ] Create developer onboarding guide
- [ ] Record video tutorials

**Deliverables**:
- Old tables removed
- Complete documentation
- User guides
- Training materials

### Phase 8: Deployment (Week 15)

**Goals**: Deploy to production with zero downtime

- [ ] Create deployment plan
- [ ] Set up database migration rollback procedures
- [ ] Deploy to staging environment
- [ ] Staging validation and smoke testing
- [ ] Deploy to production (off-peak hours)
- [ ] Monitor for issues
- [ ] Verify all functionality
- [ ] Communicate with users

**Deliverables**:
- Production deployment completed
- Monitoring dashboards active
- Incident response plan ready

### Phase 9: Post-Launch (Weeks 16-17)

**Goals**: Monitor, support, and iterate

- [ ] Monitor performance and errors
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Optimize based on real usage
- [ ] Create FAQ based on support tickets
- [ ] Plan future enhancements

**Deliverables**:
- Stable production system
- User feedback report
- Enhancement roadmap

---

## Success Metrics

### Technical Metrics

- **Migration Success Rate**: 100% data migrated without loss
- **API Response Time**: < 200ms for 95th percentile
- **Database Query Performance**: No queries > 1s
- **Encryption Overhead**: < 5% performance impact
- **Test Coverage**: > 80% for critical paths
- **Zero Downtime**: No outages during deployment

### User Metrics

- **User Adoption**: 90% of users active in new system within 2 weeks
- **Project Creation**: Average 2+ projects per organization
- **Chat Usage**: 20% increase in chat messages after project context
- **File Uploads**: 50% increase in files uploaded to projects
- **Error Rate**: < 0.1% user-facing errors

### Business Metrics

- **Multi-tenancy Ready**: Support for 10+ organizations
- **Collaboration**: 30% of projects have 2+ members
- **Data Retention**: 100% historical data preserved
- **Security Compliance**: Pass security audit
- **Documentation**: 100% of features documented

---

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Severity**: Critical
**Mitigation**:
- Full database backup before migration
- Test migration on copy of production data
- Verify data integrity with checksum comparisons
- Rollback plan with < 1 hour recovery time
- Run migration during low-traffic window

### Risk 2: Performance Degradation
**Severity**: High
**Mitigation**:
- Load testing before deployment
- Database indexing strategy
- Query optimization
- Caching layer (Redis)
- Monitor and alert on slow queries

### Risk 3: Breaking Changes to Existing Features
**Severity**: High
**Mitigation**:
- Comprehensive testing suite
- Maintain old tables during transition
- Feature flags for gradual rollout
- Rollback capability at API level
- User acceptance testing

### Risk 4: User Confusion with New UI
**Severity**: Medium
**Mitigation**:
- In-app tutorial/onboarding
- Migration guide and documentation
- Video tutorials
- Support chat/email for questions
- Gradual rollout to user segments

### Risk 5: Encryption Key Management Issues
**Severity**: Critical
**Mitigation**:
- Use established key management service (AWS KMS, Vault)
- Document key rotation procedures
- Test key recovery procedures
- Encrypted backup of keys
- Multi-person key access controls

### Risk 6: Project Timeline Overruns
**Severity**: Medium
**Mitigation**:
- Buffer time in each phase (20%)
- Weekly progress reviews
- Clear scope boundaries
- Defer non-critical features to Phase 2
- Parallel workstreams where possible

---

## Appendix

### A. Table Renaming Summary

| Old Name | New Name | Reason |
|----------|----------|--------|
| `users` | `user_accounts` | Clearer naming, add org support |
| `chats` | `chat_conversations` | Consistency with domain prefix |
| `chats_messages` | `chat_messages` | Remove redundant 's' |
| `chats_messages_votes` | `chat_message_votes` | Consistency |
| `chat_files` | `file_uploads` | Broader scope beyond chats |
| `saved_locations` | `location_snapshots` | Versioning support |
| `lca_projects` | `project_projects` + `lca_snapshots` | Unify with main projects |

### B. New Tables Summary

| Table Name | Purpose |
|------------|---------|
| `org_organizations` | Multi-tenancy support |
| `project_projects` | Central project management |
| `project_members` | Team collaboration |
| `project_invitations` | Invite workflow |
| `project_memories` | AI context for projects |
| `project_memory_updates` | Memory audit trail |
| `location_snapshots` | Versioned location data |
| `lca_snapshots` | Versioned LCA data |

### C. Removed Tables/Views

| Name | Reason |
|------|--------|
| `location_shares` | Replaced by project-based access |
| `user_accessible_locations` (view) | Replaced by project permissions |
| `chat_lists` | Never existed |
| `plan_database` | Never existed |

### D. Encryption Details

**Algorithm**: AES-256-GCM
**Key Size**: 256 bits
**IV Size**: 128 bits (16 bytes)
**Tag Size**: 128 bits (authentication tag)

**Encrypted Fields**:
- `chat_messages.content`
- `chat_messages.content_json`

**Key Hierarchy**:
```
Master Key (env: ENCRYPTION_MASTER_KEY)
  └─> Organization Key (derived: org_id + master)
       └─> Message Key (derived: org_key + message_iv)
```

**Storage Format**:
```
[IV (16 bytes, hex)]:[Ciphertext (hex)]:[Auth Tag (16 bytes, hex)]
```

### E. API Endpoint Changes

**New Endpoints**:
- `POST /api/organizations` - Create organization
- `GET /api/organizations/:id` - Get organization
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `POST /api/projects/:id/members` - Add member
- `DELETE /api/projects/:id/members/:userId` - Remove member
- `POST /api/projects/:id/restore` - Restore deleted project
- `GET /api/projects/:id/snapshots/location` - Get location snapshots
- `GET /api/projects/:id/snapshots/lca` - Get LCA snapshots
- `POST /api/projects/:id/memories` - Update project memory

**Updated Endpoints**:
- `POST /api/chat` - Now supports `projectId` parameter
- `GET /api/location/saved` - Now returns snapshots grouped by project
- `GET /api/lca/projects` - Now uses unified project system

**Deprecated Endpoints**:
- `POST /api/location/share` - Use project members instead
- `GET /api/location/shared-with-me` - Use project access instead

---

## Questions for Review

Before proceeding with implementation, please review and confirm:

1. **Organization Model**: Is the multi-organization structure aligned with business goals?
2. **Project Roles**: Are the defined roles (creator, admin, member, viewer) sufficient?
3. **Versioning**: Is date-based snapshot versioning the right approach?
4. **Encryption**: Is application-level encryption acceptable vs. database-level?
5. **UI Flow**: Does the proposed sidebar and navigation structure work?
6. **Migration**: Is the 15-week timeline realistic?
7. **Project Memory**: Should we implement project memory alongside user memory?
8. **Soft Delete Window**: Is 30 days the right recovery window?
9. **File Storage**: Continue with R2 or consider alternatives?
10. **Notes vs. Memory**: How should notes and project memories interact?

---

## Next Steps

Once approved:

1. Create `CHATBOT_REBUILD_ROADMAP.md` with implementation details
2. Create `DATABASE_MIGRATION_SCRIPTS.md` with SQL scripts
3. Create `ENCRYPTION_IMPLEMENTATION_GUIDE.md` with code examples
4. Set up project tracking (GitHub Projects or similar)
5. Begin Phase 0: Preparation

---

**Document Version**: 1.0
**Last Updated**: 2025-12-03
**Status**: 🟡 Awaiting Approval
**Next Review**: After stakeholder feedback
