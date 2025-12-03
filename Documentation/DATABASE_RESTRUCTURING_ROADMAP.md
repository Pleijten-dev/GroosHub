# Database Restructuring Roadmap
## GroosHub Multi-Organization & Project Architecture Implementation Guide

> **Version**: 1.0
> **Date**: 2025-12-03
> **Status**: Implementation Ready
> **Related**: DATABASE_RESTRUCTURING_PROPOSAL.md
>
> **IMPORTANT**: This roadmap is for database restructuring (organizations, projects, multi-tenancy).
> It is separate from the original chatbot feature rebuild documented in `/CHATBOT_REBUILD_ROADMAP.md`.

---

## Overview

This roadmap provides detailed implementation steps for the database restructuring outlined in DATABASE_RESTRUCTURING_PROPOSAL.md. It includes complete SQL migration scripts (001-014), rollback procedures, and verification queries for all phases of the multi-organization project architecture.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 0: Preparation](#phase-0-preparation)
3. [Phase 1: Foundation](#phase-1-foundation)
4. [Phase 2: Data Migration](#phase-2-data-migration)
5. [Phase 3: Backend Implementation](#phase-3-backend-implementation)
6. [Phase 4: Frontend Implementation](#phase-4-frontend-implementation)
7. [Phase 5: Security & Encryption](#phase-5-security--encryption)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

- PostgreSQL 14+ (Neon database)
- Node.js 18+
- npm or yarn
- Git
- Database migration tool (custom scripts or Prisma migrate)

### Required Access

- Database admin credentials
- R2 storage access (for file uploads)
- Environment variables for all services
- Git repository write access

### Backup Strategy

Before any changes:

```bash
# 1. Full database backup
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup integrity
psql $POSTGRES_URL < backup_YYYYMMDD_HHMMSS.sql --single-transaction --dry-run

# 3. Store backup in secure location
# Upload to S3/R2 with encryption
```

---

## Phase 0: Preparation

### Week 1: Planning & Setup

#### Task 0.1: Environment Setup

Create a staging environment that mirrors production:

```bash
# .env.staging
POSTGRES_URL=<staging-database-url>
POSTGRES_URL_NON_POOLING=<staging-non-pooling-url>

# All other env vars same as production
```

#### Task 0.2: Create Migration Scripts Directory

```bash
mkdir -p src/lib/db/migrations/restructure
cd src/lib/db/migrations/restructure
```

#### Task 0.3: Set Up Encryption Keys

Generate organization-specific encryption keys:

```bash
# Generate master key (store in env)
openssl rand -base64 32 > master_key.txt

# Add to .env.local
echo "ENCRYPTION_MASTER_KEY=$(cat master_key.txt)" >> .env.local

# Securely delete the key file
shred -u master_key.txt
```

#### Task 0.4: Create Rollback Scripts

For each migration script, create a corresponding rollback:

```
migrations/restructure/
├── 001_create_organizations.sql
├── 001_rollback_organizations.sql
├── 002_create_projects.sql
├── 002_rollback_projects.sql
...
```

---

## Phase 1: Foundation

### Week 2-3: Create New Database Tables

#### Migration 001: Organizations

**File**: `migrations/restructure/001_create_organizations.sql`

```sql
-- ================================================
-- Migration 001: Create Organizations Table
-- Description: Top-level tenant entity for multi-org support
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create organizations table
CREATE TABLE IF NOT EXISTS org_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  branding JSONB DEFAULT '{}'::jsonb,

  -- Limits & Billing
  plan_tier VARCHAR(50) DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  max_projects INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 10,

  -- Status
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_org_slug ON org_organizations(slug);
CREATE INDEX idx_org_active ON org_organizations(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_org_deleted ON org_organizations(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_organizations_updated_at
  BEFORE UPDATE ON org_organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default GROOSMAN organization
INSERT INTO org_organizations (name, slug, plan_tier, max_users, max_projects, max_storage_gb)
VALUES ('GROOSMAN', 'groosman', 'professional', 100, 50, 100)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verification
SELECT
  'org_organizations' as table_name,
  COUNT(*) as row_count,
  (SELECT id FROM org_organizations WHERE slug = 'groosman') as groosman_id
FROM org_organizations;
```

**Rollback**: `migrations/restructure/001_rollback_organizations.sql`

```sql
BEGIN;
DROP TRIGGER IF EXISTS org_organizations_updated_at ON org_organizations;
DROP TABLE IF EXISTS org_organizations CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column();
COMMIT;
```

#### Migration 002: User Accounts

**File**: `migrations/restructure/002_create_user_accounts.sql`

```sql
-- ================================================
-- Migration 002: Create User Accounts Table
-- Description: Replaces 'users' with org_id support
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create user_accounts table (new version with org_id)
CREATE TABLE IF NOT EXISTS user_accounts (
  id SERIAL PRIMARY KEY,

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,

  -- Profile
  name VARCHAR(255),
  avatar_url TEXT,

  -- Roles: 'owner', 'admin', 'user'
  role VARCHAR(50) NOT NULL DEFAULT 'user',

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_accounts_org ON user_accounts(org_id);
CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_role ON user_accounts(role);
CREATE INDEX idx_user_accounts_active ON user_accounts(is_active);

-- Add updated_at trigger
CREATE TRIGGER user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'user_accounts' as table_name,
  COUNT(*) as row_count
FROM user_accounts;
```

#### Migration 003: Projects

**File**: `migrations/restructure/003_create_projects.sql`

```sql
-- ================================================
-- Migration 003: Create Projects Tables
-- Description: Unified project system for all features
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create main projects table
CREATE TABLE IF NOT EXISTS project_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization
  org_id UUID NOT NULL REFERENCES org_organizations(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_number VARCHAR(100),

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  is_template BOOLEAN DEFAULT false,

  -- Soft Delete
  deleted_at TIMESTAMP,
  deleted_by_user_id INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_project_org ON project_projects(org_id);
CREATE INDEX idx_project_status ON project_projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_last_accessed ON project_projects(last_accessed_at DESC);
CREATE INDEX idx_project_deleted ON project_projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create project members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Role: 'creator', 'admin', 'member', 'viewer'
  role VARCHAR(50) NOT NULL DEFAULT 'member',

  -- Permissions
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
  left_at TIMESTAMP,

  -- Constraints
  UNIQUE (project_id, user_id)
);

-- Create indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_active ON project_members(left_at) WHERE left_at IS NULL;

-- Create project invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
  invited_by_user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  invited_user_id INTEGER REFERENCES user_accounts(id),

  -- Invitation Details
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  message TEXT,

  -- Status: 'pending', 'accepted', 'declined', 'expired'
  status VARCHAR(50) DEFAULT 'pending',
  token_hash VARCHAR(255) UNIQUE NOT NULL,

  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_invitation_project ON project_invitations(project_id);
CREATE INDEX idx_invitation_email ON project_invitations(email);
CREATE INDEX idx_invitation_token ON project_invitations(token_hash);
CREATE INDEX idx_invitation_status ON project_invitations(status);

-- Add updated_at triggers
CREATE TRIGGER project_projects_updated_at
  BEFORE UPDATE ON project_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'project_projects' as table_name,
  COUNT(*) as row_count
FROM project_projects;
```

#### Migration 004: Chat Tables

**File**: `migrations/restructure/004_create_chat_tables.sql`

```sql
-- ================================================
-- Migration 004: Create Chat Tables
-- Description: Renamed and updated chat tables
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create chat_conversations table (replaces 'chats')
CREATE TABLE IF NOT EXISTS chat_conversations (
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
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_chat_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_project ON chat_conversations(project_id);
CREATE INDEX idx_chat_last_message ON chat_conversations(last_message_at DESC);

-- Create chat_messages table (replaces 'chats_messages')
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conversation
  chat_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,

  -- Message Content
  role VARCHAR(50) NOT NULL,
  content TEXT,
  content_json JSONB,
  content_encrypted BOOLEAN DEFAULT false,

  -- Model Info
  model_id VARCHAR(100),

  -- Token Usage
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_message_chat ON chat_messages(chat_id);
CREATE INDEX idx_message_role ON chat_messages(role);
CREATE INDEX idx_message_created ON chat_messages(created_at DESC);

-- Create chat_message_votes table (replaces 'chats_messages_votes')
CREATE TABLE IF NOT EXISTS chat_message_votes (
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,

  -- Vote
  is_upvoted BOOLEAN NOT NULL,
  feedback TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (message_id, user_id)
);

-- Add updated_at triggers
CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER chat_message_votes_updated_at
  BEFORE UPDATE ON chat_message_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'chat_conversations' as table_name,
  COUNT(*) as row_count
FROM chat_conversations;
```

#### Migration 005: File Uploads

**File**: `migrations/restructure/005_create_file_uploads.sql`

```sql
-- ================================================
-- Migration 005: Create File Uploads Table
-- Description: Unified file management (replaces chat_files)
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create file_uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),
  project_id UUID REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Chat Context (if uploaded via chat)
  chat_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- File Details
  file_name TEXT NOT NULL,
  file_type VARCHAR(100),
  mime_type VARCHAR(255),
  file_size INTEGER,

  -- Storage
  storage_provider VARCHAR(50) DEFAULT 'r2',
  storage_key TEXT NOT NULL,
  storage_url TEXT,

  -- Processing Status
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,

  -- RAG Processing
  is_indexed BOOLEAN DEFAULT false,
  indexed_at TIMESTAMP,
  chunk_count INTEGER DEFAULT 0,

  -- Expiration (for temporary files)
  expires_at TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_file_user ON file_uploads(user_id);
CREATE INDEX idx_file_project ON file_uploads(project_id);
CREATE INDEX idx_file_chat ON file_uploads(chat_id);
CREATE INDEX idx_file_status ON file_uploads(status);
CREATE INDEX idx_file_indexed ON file_uploads(is_indexed);
CREATE INDEX idx_file_expires ON file_uploads(expires_at) WHERE expires_at IS NOT NULL;

-- Add updated_at trigger
CREATE TRIGGER file_uploads_updated_at
  BEFORE UPDATE ON file_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'file_uploads' as table_name,
  COUNT(*) as row_count
FROM file_uploads;
```

#### Migration 006: Location Snapshots

**File**: `migrations/restructure/006_create_location_snapshots.sql`

```sql
-- ================================================
-- Migration 006: Create Location Snapshots Table
-- Description: Versioned location data (replaces saved_locations)
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create location_snapshots table
CREATE TABLE IF NOT EXISTS location_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project Linkage
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Created By
  user_id INTEGER NOT NULL REFERENCES user_accounts(id),

  -- Location Details
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  coordinates JSONB NOT NULL,

  -- Analysis Data
  location_data JSONB,
  amenities_data JSONB,
  selected_pve JSONB,
  selected_personas JSONB,
  llm_rapport JSONB,

  -- Versioning
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,

  -- Data Version
  data_version VARCHAR(50),
  data_sources JSONB,

  -- Status
  completion_status VARCHAR(50) DEFAULT 'partial',

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE (project_id, snapshot_date, version_number)
);

-- Create indexes
CREATE INDEX idx_location_project ON location_snapshots(project_id);
CREATE INDEX idx_location_user ON location_snapshots(user_id);
CREATE INDEX idx_location_active ON location_snapshots(is_active, project_id);
CREATE INDEX idx_location_snapshot_date ON location_snapshots(snapshot_date DESC);

-- Add updated_at trigger
CREATE TRIGGER location_snapshots_updated_at
  BEFORE UPDATE ON location_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for active snapshots
CREATE OR REPLACE VIEW active_location_snapshots AS
SELECT *
FROM location_snapshots
WHERE is_active = true
  AND project_id IN (SELECT id FROM project_projects WHERE deleted_at IS NULL);

COMMIT;

-- Verification
SELECT
  'location_snapshots' as table_name,
  COUNT(*) as row_count
FROM location_snapshots;
```

#### Migration 007: LCA Snapshots

**File**: `migrations/restructure/007_create_lca_snapshots.sql`

```sql
-- ================================================
-- Migration 007: Create LCA Snapshots Table
-- Description: Versioned LCA data
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create lca_snapshots table
CREATE TABLE IF NOT EXISTS lca_snapshots (
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

  -- Constraints
  UNIQUE (project_id, snapshot_date, version_number)
);

-- Create indexes
CREATE INDEX idx_lca_snapshot_project ON lca_snapshots(project_id);
CREATE INDEX idx_lca_snapshot_user ON lca_snapshots(user_id);
CREATE INDEX idx_lca_snapshot_active ON lca_snapshots(is_active, project_id);
CREATE INDEX idx_lca_snapshot_date ON lca_snapshots(snapshot_date DESC);

-- Add updated_at trigger
CREATE TRIGGER lca_snapshots_updated_at
  BEFORE UPDATE ON lca_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update lca_elements to reference snapshots
ALTER TABLE lca_elements
  ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES lca_snapshots(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_lca_element_snapshot ON lca_elements(snapshot_id);

-- Create view for active snapshots
CREATE OR REPLACE VIEW active_lca_snapshots AS
SELECT *
FROM lca_snapshots
WHERE is_active = true
  AND project_id IN (SELECT id FROM project_projects WHERE deleted_at IS NULL);

COMMIT;

-- Verification
SELECT
  'lca_snapshots' as table_name,
  COUNT(*) as row_count
FROM lca_snapshots;
```

#### Migration 008: Project Memory

**File**: `migrations/restructure/008_create_project_memory.sql`

```sql
-- ================================================
-- Migration 008: Create Project Memory Tables
-- Description: AI context memory for projects
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create project_memories table
CREATE TABLE IF NOT EXISTS project_memories (
  project_id UUID PRIMARY KEY REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Memory Content
  memory_content TEXT NOT NULL,

  -- Project Details
  project_summary TEXT,
  key_decisions JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  patterns JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,

  -- Update Tracking
  total_updates INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMP,

  -- Token Management
  token_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create project_memory_updates table
CREATE TABLE IF NOT EXISTS project_memory_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Project
  project_id UUID NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,

  -- Change Details
  previous_content TEXT,
  new_content TEXT,
  change_summary TEXT,
  change_type VARCHAR(50),

  -- Trigger
  trigger_source VARCHAR(50),
  trigger_id UUID,
  triggered_by_user_id INTEGER REFERENCES user_accounts(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_project_memory_updates_project ON project_memory_updates(project_id);
CREATE INDEX idx_project_memory_updates_created ON project_memory_updates(created_at DESC);
CREATE INDEX idx_project_memory_updates_user ON project_memory_updates(triggered_by_user_id);

-- Add updated_at trigger
CREATE TRIGGER project_memories_updated_at
  BEFORE UPDATE ON project_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verification
SELECT
  'project_memories' as table_name,
  COUNT(*) as row_count
FROM project_memories;
```

---

## Phase 2: Data Migration

### Week 4: Migrate Existing Data

#### Migration 009: Migrate Users

**File**: `migrations/restructure/009_migrate_users.sql`

```sql
-- ================================================
-- Migration 009: Migrate Users to user_accounts
-- Description: Copy all users to new table with GROOSMAN org_id
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate all existing users to user_accounts
INSERT INTO user_accounts (
  id, org_id, email, password, name, role,
  created_at, updated_at
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
FROM users
ON CONFLICT (id) DO NOTHING;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM users) as old_count,
  (SELECT COUNT(*) FROM user_accounts) as new_count,
  (SELECT COUNT(*) FROM users) = (SELECT COUNT(*) FROM user_accounts) as counts_match;

COMMIT;
```

#### Migration 010: Create Projects from LCA Projects

**File**: `migrations/restructure/010_migrate_lca_projects.sql`

```sql
-- ================================================
-- Migration 010: Migrate LCA Projects to Unified Projects
-- Description: Create project_projects from lca_projects
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create main projects from lca_projects
INSERT INTO project_projects (
  id, org_id, name, description, project_number,
  created_at, updated_at, last_accessed_at
)
SELECT
  lp.id,
  (SELECT id FROM org_organizations WHERE slug = 'groosman'),
  lp.name,
  lp.description,
  lp.project_number,
  lp.created_at,
  lp.updated_at,
  lp.updated_at
FROM lca_projects lp
ON CONFLICT (id) DO NOTHING;

-- Create project members (user as creator)
INSERT INTO project_members (
  project_id, user_id, role, invited_by_user_id, joined_at
)
SELECT
  lp.id,
  lp.user_id,
  'creator',
  NULL,
  lp.created_at
FROM lca_projects lp
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM lca_projects) as lca_count,
  (SELECT COUNT(*) FROM project_projects) as project_count,
  (SELECT COUNT(*) FROM project_members WHERE role = 'creator') as creator_count;

COMMIT;
```

#### Migration 011: Create LCA Snapshots

**File**: `migrations/restructure/011_migrate_lca_snapshots.sql`

```sql
-- ================================================
-- Migration 011: Create Initial LCA Snapshots
-- Description: Create snapshot records from existing lca_projects
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create initial snapshots from lca_projects
INSERT INTO lca_snapshots (
  id, project_id, user_id, name, description, project_number,
  gross_floor_area, building_type, construction_system, floors,
  dwelling_count, study_period, location,
  energy_label, heating_system, facade_cladding, foundation,
  roof, window_frames, window_to_wall_ratio,
  annual_gas_use, annual_electricity,
  total_gwp_a1_a3, total_gwp_a4, total_gwp_a5, total_gwp_b4,
  total_gwp_c, total_gwp_d, total_gwp_sum, total_gwp_per_m2_year,
  operational_carbon, total_carbon, mpg_reference_value, is_compliant,
  snapshot_date, is_active, version_number,
  is_template, is_public,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  lp.id,
  lp.user_id,
  lp.name,
  lp.description,
  lp.project_number,
  lp.gross_floor_area,
  lp.building_type,
  lp.construction_system,
  lp.floors,
  lp.dwelling_count,
  lp.study_period,
  lp.location,
  lp.energy_label,
  lp.heating_system,
  lp.facade_cladding,
  lp.foundation,
  lp.roof,
  lp.window_frames,
  lp.window_to_wall_ratio,
  lp.annual_gas_use,
  lp.annual_electricity,
  lp.total_gwp_a1_a3,
  lp.total_gwp_a4,
  lp.total_gwp_a5,
  lp.total_gwp_b4,
  lp.total_gwp_c,
  lp.total_gwp_d,
  lp.total_gwp_sum,
  lp.total_gwp_per_m2_year,
  lp.operational_carbon,
  lp.total_carbon,
  lp.mpg_reference_value,
  lp.is_compliant,
  CURRENT_DATE,
  true,
  1,
  lp.is_template,
  lp.is_public,
  lp.created_at,
  lp.updated_at
FROM lca_projects lp;

-- Update lca_elements to reference snapshots
UPDATE lca_elements e
SET
  snapshot_id = s.id,
  version_number = 1
FROM lca_snapshots s
WHERE e.project_id = s.project_id
  AND s.version_number = 1
  AND e.snapshot_id IS NULL;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM lca_snapshots) as snapshot_count,
  (SELECT COUNT(*) FROM lca_elements WHERE snapshot_id IS NOT NULL) as elements_linked,
  (SELECT COUNT(*) FROM lca_elements WHERE snapshot_id IS NULL) as elements_unlinked;

COMMIT;
```

#### Migration 012: Migrate Saved Locations

**File**: `migrations/restructure/012_migrate_saved_locations.sql`

```sql
-- ================================================
-- Migration 012: Migrate Saved Locations to Snapshots
-- Description: Create personal projects and location snapshots
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Create personal projects for users with saved locations
-- (Only if they don't already have a project)
INSERT INTO project_projects (id, org_id, name, description, created_at, updated_at)
SELECT
  gen_random_uuid(),
  (SELECT id FROM org_organizations WHERE slug = 'groosman'),
  'Location Analysis - ' || sl.name,
  'Migrated from saved location',
  sl.created_at,
  sl.updated_at
FROM saved_locations sl
WHERE NOT EXISTS (
  SELECT 1
  FROM project_members pm
  WHERE pm.user_id = sl.user_id
)
GROUP BY sl.user_id, sl.name, sl.created_at, sl.updated_at;

-- Add users as creators of their personal projects
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT
  pp.id,
  sl.user_id,
  'creator',
  pp.created_at
FROM saved_locations sl
JOIN project_projects pp ON pp.name = 'Location Analysis - ' || sl.name
WHERE NOT EXISTS (
  SELECT 1
  FROM project_members pm
  WHERE pm.project_id = pp.id AND pm.user_id = sl.user_id
);

-- Create location snapshots from saved_locations
INSERT INTO location_snapshots (
  id, project_id, user_id, name, address, coordinates,
  location_data, amenities_data, selected_pve, selected_personas,
  llm_rapport, snapshot_date, is_active, version_number,
  data_version, completion_status, metadata,
  created_at, updated_at
)
SELECT
  sl.id,
  pp.id,
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
JOIN project_projects pp ON pp.name = 'Location Analysis - ' || sl.name
ON CONFLICT (id) DO NOTHING;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM saved_locations) as saved_count,
  (SELECT COUNT(*) FROM location_snapshots) as snapshot_count,
  (SELECT COUNT(DISTINCT user_id) FROM saved_locations) as unique_users,
  (SELECT COUNT(*) FROM project_projects WHERE name LIKE 'Location Analysis -%') as personal_projects;

COMMIT;
```

#### Migration 013: Migrate Chats

**File**: `migrations/restructure/013_migrate_chats.sql`

```sql
-- ================================================
-- Migration 013: Migrate Chats to chat_conversations
-- Description: Copy chats and messages to new tables
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate chats to chat_conversations
INSERT INTO chat_conversations (
  id, user_id, project_id, title, model_id, metadata,
  created_at, updated_at, last_message_at
)
SELECT
  c.id,
  c.user_id,
  c.project_id,
  c.title,
  c.model_id,
  c.metadata,
  c.created_at,
  c.updated_at,
  COALESCE(
    (SELECT MAX(created_at) FROM chats_messages WHERE chat_id = c.id),
    c.updated_at
  )
FROM chats c
ON CONFLICT (id) DO NOTHING;

-- Migrate messages to chat_messages (without encryption initially)
INSERT INTO chat_messages (
  id, chat_id, role, content, content_json,
  content_encrypted, model_id, input_tokens, output_tokens,
  metadata, created_at
)
SELECT
  cm.id,
  cm.chat_id,
  cm.role,
  cm.content,
  cm.content_json,
  false,
  cm.model_id,
  cm.input_tokens,
  cm.output_tokens,
  cm.metadata,
  cm.created_at
FROM chats_messages cm
ON CONFLICT (id) DO NOTHING;

-- Migrate message votes
INSERT INTO chat_message_votes (
  message_id, user_id, is_upvoted, created_at
)
SELECT
  message_id, user_id, is_upvoted, created_at
FROM chats_messages_votes
ON CONFLICT (message_id, user_id) DO NOTHING;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM chats) as old_chats,
  (SELECT COUNT(*) FROM chat_conversations) as new_chats,
  (SELECT COUNT(*) FROM chats_messages) as old_messages,
  (SELECT COUNT(*) FROM chat_messages) as new_messages,
  (SELECT COUNT(*) FROM chats_messages_votes) as old_votes,
  (SELECT COUNT(*) FROM chat_message_votes) as new_votes;

COMMIT;
```

#### Migration 014: Migrate Files

**File**: `migrations/restructure/014_migrate_files.sql`

```sql
-- ================================================
-- Migration 014: Migrate Chat Files to file_uploads
-- Description: Copy file metadata to unified table
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate chat_files to file_uploads
INSERT INTO file_uploads (
  id, user_id, project_id, chat_id, message_id,
  file_name, file_type, mime_type, file_size,
  storage_provider, storage_key, storage_url,
  status, error_message, metadata, expires_at, created_at
)
SELECT
  cf.id,
  cf.user_id,
  cc.project_id,
  cf.chat_id,
  cf.message_id,
  cf.file_name,
  cf.file_type,
  cf.mime_type,
  cf.file_size,
  'r2',
  cf.storage_key,
  cf.file_url,
  cf.status,
  cf.error_message,
  cf.metadata,
  cf.expires_at,
  cf.created_at
FROM chat_files cf
LEFT JOIN chat_conversations cc ON cf.chat_id = cc.id
ON CONFLICT (id) DO NOTHING;

-- Verify migration
SELECT
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM chat_files) as old_files,
  (SELECT COUNT(*) FROM file_uploads) as new_files,
  (SELECT COUNT(*) FROM file_uploads WHERE project_id IS NOT NULL) as project_files,
  (SELECT COUNT(*) FROM file_uploads WHERE project_id IS NULL) as private_files;

COMMIT;
```

---

## Phase 3: Backend Implementation

### Weeks 5-7: Update API Layer

#### Week 5: Organization & User Management APIs

**Task 3.1: Update Authentication Middleware**

**File**: `src/lib/auth.ts`

```typescript
import { NextAuthOptions } from 'next-auth';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  // ... existing config
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fetch user with org_id from user_accounts
        const dbUser = await db.query(
          `SELECT id, email, name, role, org_id, is_active
           FROM user_accounts WHERE id = $1`,
          [user.id]
        );

        if (dbUser.rows[0]) {
          token.id = dbUser.rows[0].id;
          token.role = dbUser.rows[0].role;
          token.org_id = dbUser.rows[0].org_id;
          token.is_active = dbUser.rows[0].is_active;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.org_id = token.org_id;
        session.user.is_active = token.is_active;
      }
      return session;
    }
  }
};
```

**Task 3.2: Organization Management API**

**File**: `src/app/api/organizations/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/organizations - List organizations (owner only)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db.query(`
    SELECT
      id, name, slug, plan_tier, max_users, max_projects, max_storage_gb,
      is_active, created_at, updated_at
    FROM org_organizations
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `);

  return NextResponse.json({ organizations: result.rows });
}

// POST /api/organizations - Create organization (owner only)
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, plan_tier = 'free' } = body;

  // Validate input
  if (!name || !slug) {
    return NextResponse.json(
      { error: 'Name and slug are required' },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await db.query(
    'SELECT id FROM org_organizations WHERE slug = $1',
    [slug]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: 'Slug already exists' },
      { status: 409 }
    );
  }

  // Create organization
  const result = await db.query(`
    INSERT INTO org_organizations (name, slug, plan_tier)
    VALUES ($1, $2, $3)
    RETURNING id, name, slug, plan_tier, created_at
  `, [name, slug, plan_tier]);

  return NextResponse.json({ organization: result.rows[0] }, { status: 201 });
}
```

**Task 3.3: User Management API Updates**

**File**: `src/app/api/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users - List users in organization
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Admins can see users in their org, owners can see all
  let query = `
    SELECT id, email, name, role, is_active, created_at, updated_at
    FROM user_accounts
    WHERE org_id = $1
    ORDER BY created_at DESC
  `;

  const params = [session.user.org_id];

  if (session.user.role === 'owner') {
    // Owners see all users across all orgs
    query = `
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.org_id,
             o.name as org_name, u.created_at, u.updated_at
      FROM user_accounts u
      JOIN org_organizations o ON u.org_id = o.id
      ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    return NextResponse.json({ users: result.rows });
  }

  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db.query(query, params);
  return NextResponse.json({ users: result.rows });
}

// POST /api/users - Create new user (admin/owner only)
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user || !['admin', 'owner'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name, role = 'user' } = body;

  // Validate input
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Check if user exists
  const existing = await db.query(
    'SELECT id FROM user_accounts WHERE email = $1',
    [email]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: 'Email already exists' },
      { status: 409 }
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Determine org_id
  const org_id = session.user.role === 'owner' && body.org_id
    ? body.org_id
    : session.user.org_id;

  // Create user
  const result = await db.query(`
    INSERT INTO user_accounts (org_id, email, password, name, role)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, name, role, created_at
  `, [org_id, email, hashedPassword, name, role]);

  return NextResponse.json({ user: result.rows[0] }, { status: 201 });
}
```

#### Week 6: Project Management APIs

**Task 3.4: Project CRUD APIs**

**File**: `src/app/api/projects/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get projects where user is a member or is admin/owner
  const query = `
    SELECT DISTINCT
      p.id, p.name, p.description, p.status, p.is_template,
      p.created_at, p.updated_at, p.last_accessed_at,
      pm.role as user_role,
      pm.permissions,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM chat_conversations WHERE project_id = p.id) as chat_count,
      (SELECT COUNT(*) FROM file_uploads WHERE project_id = p.id) as file_count
    FROM project_projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
    WHERE p.org_id = $2
      AND p.deleted_at IS NULL
      AND (
        pm.user_id IS NOT NULL
        OR $3 IN ('admin', 'owner')
      )
    ORDER BY p.last_accessed_at DESC
  `;

  const result = await db.query(query, [
    session.user.id,
    session.user.org_id,
    session.user.role
  ]);

  return NextResponse.json({ projects: result.rows });
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, project_number } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'Project name is required' },
      { status: 400 }
    );
  }

  // Start transaction
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Create project
    const projectResult = await client.query(`
      INSERT INTO project_projects (org_id, name, description, project_number)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, project_number, created_at
    `, [session.user.org_id, name, description, project_number]);

    const project = projectResult.rows[0];

    // Add user as creator
    await client.query(`
      INSERT INTO project_members (project_id, user_id, role)
      VALUES ($1, $2, 'creator')
    `, [project.id, session.user.id]);

    // Initialize project memory
    await client.query(`
      INSERT INTO project_memories (project_id, memory_content, project_summary)
      VALUES ($1, $2, $3)
    `, [
      project.id,
      `Project: ${name}. Created by user.`,
      description || ''
    ]);

    await client.query('COMMIT');

    return NextResponse.json({ project }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
```

**File**: `src/app/api/projects/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/:id - Get project details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  const { id } = await context.params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check access
  const hasAccess = await checkProjectAccess(id, session.user.id, session.user.role);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get project with stats
  const result = await db.query(`
    SELECT
      p.*,
      pm.role as user_role,
      pm.permissions,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM chat_conversations WHERE project_id = p.id) as chat_count,
      (SELECT COUNT(*) FROM file_uploads WHERE project_id = p.id AND is_indexed = true) as file_count,
      (SELECT COUNT(*) FROM location_snapshots WHERE project_id = p.id) as location_count,
      (SELECT COUNT(*) FROM lca_snapshots WHERE project_id = p.id) as lca_count
    FROM project_projects p
    LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
    WHERE p.id = $1 AND p.deleted_at IS NULL
  `, [id, session.user.id]);

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Update last accessed
  await db.query(
    'UPDATE project_projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  return NextResponse.json({ project: result.rows[0] });
}

// PATCH /api/projects/:id - Update project
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  const { id } = await context.params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check edit permission
  const canEdit = await checkProjectPermission(id, session.user.id, 'can_edit');
  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, status } = body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  values.push(id);

  const result = await db.query(`
    UPDATE project_projects
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex} AND deleted_at IS NULL
    RETURNING *
  `, values);

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({ project: result.rows[0] });
}

// DELETE /api/projects/:id - Soft delete project
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  const { id } = await context.params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only creators can delete
  const isCreator = await checkProjectRole(id, session.user.id, 'creator');
  if (!isCreator && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft delete
  await db.query(`
    UPDATE project_projects
    SET deleted_at = CURRENT_TIMESTAMP, deleted_by_user_id = $2
    WHERE id = $1
  `, [id, session.user.id]);

  return NextResponse.json({ message: 'Project deleted successfully' });
}

// Helper functions
async function checkProjectAccess(
  projectId: string,
  userId: number,
  userRole: string
): Promise<boolean> {
  if (userRole === 'owner') return true;

  const result = await db.query(`
    SELECT 1 FROM project_members
    WHERE project_id = $1 AND user_id = $2
  `, [projectId, userId]);

  return result.rows.length > 0;
}

async function checkProjectPermission(
  projectId: string,
  userId: number,
  permission: string
): Promise<boolean> {
  const result = await db.query(`
    SELECT role, permissions
    FROM project_members
    WHERE project_id = $1 AND user_id = $2
  `, [projectId, userId]);

  if (result.rows.length === 0) return false;

  const { role, permissions } = result.rows[0];
  if (role === 'creator') return true;

  return permissions[permission] === true;
}

async function checkProjectRole(
  projectId: string,
  userId: number,
  requiredRole: string
): Promise<boolean> {
  const result = await db.query(`
    SELECT role FROM project_members
    WHERE project_id = $1 AND user_id = $2
  `, [projectId, userId]);

  return result.rows.length > 0 && result.rows[0].role === requiredRole;
}
```

**Task 3.5: Project Members API**

**File**: `src/app/api/projects/[id]/members/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/:id/members - List project members
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  const { id } = await context.params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check access
  const hasAccess = await checkProjectAccess(id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db.query(`
    SELECT
      pm.id, pm.role, pm.permissions, pm.joined_at,
      u.id as user_id, u.name, u.email, u.avatar_url
    FROM project_members pm
    JOIN user_accounts u ON pm.user_id = u.id
    WHERE pm.project_id = $1 AND pm.left_at IS NULL
    ORDER BY pm.role DESC, pm.joined_at ASC
  `, [id]);

  return NextResponse.json({ members: result.rows });
}

// POST /api/projects/:id/members - Add member to project
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  const { id } = await context.params;

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check manage_members permission
  const canManage = await checkProjectPermission(id, session.user.id, 'can_manage_members');
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, role = 'member' } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  // Check if already member
  const existing = await db.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
    [id, user_id]
  );

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: 'User is already a member' },
      { status: 409 }
    );
  }

  // Add member
  const result = await db.query(`
    INSERT INTO project_members (project_id, user_id, role, invited_by_user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, role, joined_at
  `, [id, user_id, role, session.user.id]);

  return NextResponse.json({ member: result.rows[0] }, { status: 201 });
}
```

#### Week 7: Feature-Specific APIs

**Task 3.6: Update Chat APIs**

**File**: `src/app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/chat - Create new chat
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, project_id, model_id } = body;

  // If project_id provided, verify access
  if (project_id) {
    const hasAccess = await checkProjectAccess(project_id, session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No access to this project' },
        { status: 403 }
      );
    }
  }

  // Create chat
  const result = await db.query(`
    INSERT INTO chat_conversations (user_id, project_id, title, model_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, user_id, project_id, title, model_id, created_at
  `, [session.user.id, project_id || null, title, model_id]);

  return NextResponse.json({ chat: result.rows[0] }, { status: 201 });
}

// GET /api/chat - List user's chats
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const project_id = searchParams.get('project_id');

  let query = `
    SELECT
      c.id, c.title, c.project_id, c.model_id,
      c.created_at, c.updated_at, c.last_message_at,
      p.name as project_name,
      (SELECT COUNT(*) FROM chat_messages WHERE chat_id = c.id) as message_count
    FROM chat_conversations c
    LEFT JOIN project_projects p ON c.project_id = p.id
    WHERE c.user_id = $1
  `;

  const params: any[] = [session.user.id];

  if (project_id) {
    query += ' AND c.project_id = $2';
    params.push(project_id);
  }

  query += ' ORDER BY c.last_message_at DESC';

  const result = await db.query(query, params);

  return NextResponse.json({ chats: result.rows });
}
```

**Task 3.7: Update Location APIs**

**File**: `src/app/api/location/snapshots/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/location/snapshots - Create location snapshot
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    project_id,
    name,
    address,
    coordinates,
    location_data,
    amenities_data
  } = body;

  if (!project_id || !name || !address || !coordinates) {
    return NextResponse.json(
      { error: 'Required fields missing' },
      { status: 400 }
    );
  }

  // Verify project access
  const hasAccess = await checkProjectAccess(project_id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Deactivate previous snapshots
    await client.query(`
      UPDATE location_snapshots
      SET is_active = false
      WHERE project_id = $1 AND is_active = true
    `, [project_id]);

    // Create new snapshot
    const result = await client.query(`
      INSERT INTO location_snapshots (
        project_id, user_id, name, address, coordinates,
        location_data, amenities_data, snapshot_date, is_active, version_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, true,
        COALESCE((
          SELECT MAX(version_number) + 1
          FROM location_snapshots
          WHERE project_id = $1 AND snapshot_date = CURRENT_DATE
        ), 1)
      )
      RETURNING *
    `, [
      project_id,
      session.user.id,
      name,
      address,
      JSON.stringify(coordinates),
      JSON.stringify(location_data),
      JSON.stringify(amenities_data)
    ]);

    await client.query('COMMIT');

    return NextResponse.json({ snapshot: result.rows[0] }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Location snapshot creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// GET /api/location/snapshots - List location snapshots for project
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const project_id = searchParams.get('project_id');

  if (!project_id) {
    return NextResponse.json(
      { error: 'project_id is required' },
      { status: 400 }
    );
  }

  // Verify access
  const hasAccess = await checkProjectAccess(project_id, session.user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await db.query(`
    SELECT *
    FROM location_snapshots
    WHERE project_id = $1
    ORDER BY snapshot_date DESC, version_number DESC
  `, [project_id]);

  return NextResponse.json({ snapshots: result.rows });
}
```

---

## Phase 4: Frontend Implementation

### Weeks 8-11: UI Components and Pages

#### Week 8: Core Navigation & Sidebar

**Task 4.1: Update Sidebar Component**

**File**: `src/shared/components/UI/Sidebar/Sidebar.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Project {
  id: string;
  name: string;
  last_accessed_at: string;
  is_pinned?: boolean;
}

interface Chat {
  id: string;
  title: string;
  project_id?: string;
  last_message_at: string;
}

export function Sidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
      fetchChats();
    }
  }, [session]);

  async function fetchProjects() {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data.projects || []);
  }

  async function fetchChats() {
    const res = await fetch('/api/chat');
    const data = await res.json();
    setChats(data.chats || []);
  }

  const pinnedProjects = projects.filter(p => p.is_pinned);
  const recentProjects = projects
    .filter(p => !p.is_pinned)
    .sort((a, b) =>
      new Date(b.last_accessed_at).getTime() -
      new Date(a.last_accessed_at).getTime()
    );

  const visibleProjects = showAllProjects
    ? recentProjects
    : recentProjects.slice(0, 10);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* User Menu */}
      <div className="p-base border-b border-gray-200">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
            {session?.user?.name?.[0] || 'U'}
          </div>
          <span className="font-medium">{session?.user?.name}</span>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-base">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">
              Projects
            </h3>
            <button
              onClick={() => router.push('/ai-assistant/projects/new')}
              className="text-sm text-primary hover:text-primary-dark"
            >
              + New
            </button>
          </div>

          {/* Pinned Projects */}
          {pinnedProjects.map(project => (
            <button
              key={project.id}
              onClick={() => router.push(`/ai-assistant/projects/${project.id}`)}
              className="w-full text-left px-sm py-xs rounded hover:bg-gray-100 mb-xs"
            >
              <span className="text-sm">[Pin] {project.name}</span>
            </button>
          ))}

          {/* Recent Projects */}
          {visibleProjects.map(project => (
            <button
              key={project.id}
              onClick={() => router.push(`/ai-assistant/projects/${project.id}`)}
              className="w-full text-left px-sm py-xs rounded hover:bg-gray-100 mb-xs"
            >
              <span className="text-sm">{project.name}</span>
            </button>
          ))}

          {/* Show More Button */}
          {recentProjects.length > 10 && !showAllProjects && (
            <button
              onClick={() => setShowAllProjects(true)}
              className="text-sm text-gray-500 hover:text-gray-700 px-sm py-xs"
            >
              Show {recentProjects.length - 10} more projects...
            </button>
          )}
        </div>

        {/* Chats Section */}
        <div className="p-base border-t border-gray-200">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">
              Chats
            </h3>
            <button
              onClick={() => router.push('/ai-assistant')}
              className="text-sm text-primary hover:text-primary-dark"
            >
              + New
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => router.push(`/ai-assistant/chats/${chat.id}`)}
                className="w-full text-left px-sm py-xs rounded hover:bg-gray-100 mb-xs"
              >
                <span className="text-sm truncate block">
                  {chat.title || 'Untitled Chat'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
```

#### Week 9: Project Pages

**Task 4.2: Project Page**

**File**: `src/app/[locale]/ai-assistant/projects/[id]/page.tsx`

```typescript
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProjectOverview } from '@/features/projects/components/ProjectOverview';

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const session = await auth();
  const { locale, id } = await params;

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<div>Loading...</div>}>
          <ProjectOverview projectId={id} locale={locale} />
        </Suspense>
      </main>
    </div>
  );
}
```

**File**: `src/features/projects/components/ProjectOverview.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/shared/components/UI/Card/Card';
import { Button } from '@/shared/components/UI/Button/Button';

interface ProjectOverviewProps {
  projectId: string;
  locale: string;
}

export function ProjectOverview({ projectId, locale }: ProjectOverviewProps) {
  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'members' | 'chats'>('overview');

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`);
    const data = await res.json();
    setProject(data.project);
  }

  if (!project) return <div>Loading...</div>;

  return (
    <div className="p-lg">
      <div className="flex items-center justify-between mb-base">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <Button variant="secondary" size="sm">
          Settings
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-base border-b border-gray-200 mb-base">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-sm ${activeTab === 'overview' ? 'border-b-2 border-primary' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`pb-sm ${activeTab === 'files' ? 'border-b-2 border-primary' : ''}`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-sm ${activeTab === 'members' ? 'border-b-2 border-primary' : ''}`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          className={`pb-sm ${activeTab === 'chats' ? 'border-b-2 border-primary' : ''}`}
        >
          Chats
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-base">
          <Card>
            <h2 className="text-xl font-semibold mb-base">Project Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-base">
              <div>
                <div className="text-2xl font-bold">{project.chat_count}</div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{project.file_count}</div>
                <div className="text-sm text-gray-600">Files</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{project.member_count}</div>
                <div className="text-sm text-gray-600">Members</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{project.location_count}</div>
                <div className="text-sm text-gray-600">Locations</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Other tabs implementation... */}
    </div>
  );
}
```

---

## Phase 5: Security & Encryption

### Week 12: Implement Encryption

**Task 5.1: Encryption Utilities**

**File**: `src/lib/encryption/messageEncryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive encryption key from master key and org ID
function deriveKey(masterKey: string, orgId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey + orgId,
    salt,
    100000,
    32,
    'sha256'
  );
}

export function encryptMessage(
  plaintext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured');
  }

  // Generate random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key
  const key = deriveKey(masterKey, orgId, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const tag = cipher.getAuthTag();

  // Format: salt:iv:encrypted:tag
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted,
    tag.toString('hex')
  ].join(':');
}

export function decryptMessage(
  ciphertext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured');
  }

  // Parse components
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [saltHex, ivHex, encryptedHex, tagHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // Derive key
  const key = deriveKey(masterKey, orgId, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}
```

**Task 5.2: Update Chat Message Storage**

**File**: `src/lib/ai/chat-store.ts`

```typescript
import { db } from '@/lib/db';
import { encryptMessage, decryptMessage } from '@/lib/encryption/messageEncryption';

export async function saveMessage(params: {
  chatId: string;
  role: string;
  content: string;
  contentJson?: any;
  orgId: string;
}) {
  const { chatId, role, content, contentJson, orgId } = params;

  // Encrypt sensitive content
  const encryptedContent = encryptMessage(content, orgId);
  const encryptedContentJson = contentJson
    ? encryptMessage(JSON.stringify(contentJson), orgId)
    : null;

  const result = await db.query(`
    INSERT INTO chat_messages (
      chat_id, role, content, content_json, content_encrypted
    )
    VALUES ($1, $2, $3, $4, true)
    RETURNING id, created_at
  `, [chatId, role, encryptedContent, encryptedContentJson]);

  return result.rows[0];
}

export async function getMessages(chatId: string, orgId: string) {
  const result = await db.query(`
    SELECT id, chat_id, role, content, content_json, content_encrypted, created_at
    FROM chat_messages
    WHERE chat_id = $1
    ORDER BY created_at ASC
  `, [chatId]);

  // Decrypt messages
  return result.rows.map(msg => {
    if (msg.content_encrypted) {
      return {
        ...msg,
        content: decryptMessage(msg.content, orgId),
        content_json: msg.content_json
          ? JSON.parse(decryptMessage(msg.content_json, orgId))
          : null
      };
    }
    return msg;
  });
}
```

---

## Phase 6-9: Testing, Deployment & Monitoring

### Phase 6: Testing (Week 13)

- Unit tests for all API endpoints
- Integration tests for workflows
- Database migration tests
- Encryption/decryption tests
- Performance testing

### Phase 7: Cleanup (Week 14)

- Remove old tables after verification
- Update all documentation
- Code review and refactoring
- Security audit

### Phase 8: Deployment (Week 15)

- Deploy to staging
- User acceptance testing
- Production deployment
- Monitor for issues

### Phase 9: Post-Launch (Weeks 16-17)

- Bug fixes
- Performance optimization
- User feedback incorporation
- Documentation updates

---

## Rollback Procedures

If migration fails at any step:

1. Restore from backup
2. Run rollback scripts in reverse order
3. Verify data integrity
4. Document issues

---

## Testing Strategy

### Migration Testing

```bash
# Test on staging database
psql $STAGING_DB < migrations/restructure/001_create_organizations.sql
psql $STAGING_DB < migrations/restructure/002_create_user_accounts.sql
# ... continue with all migrations

# Verify data
psql $STAGING_DB -c "SELECT COUNT(*) FROM user_accounts;"
psql $STAGING_DB -c "SELECT COUNT(*) FROM project_projects;"
```

### API Testing

```bash
# Test organization API
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $TOKEN"

# Test project creation
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Testing"}'
```

---

## Deployment Plan

### Pre-Deployment

1. Full database backup
2. Verify staging environment
3. Run all migrations on staging
4. Complete integration testing
5. Get stakeholder approval

### Deployment Steps

1. Announce maintenance window
2. Create production backup
3. Run migrations (001-014)
4. Verify data integrity
5. Deploy new code
6. Monitor for errors
7. Announce completion

### Post-Deployment

1. Monitor logs for 48 hours
2. Check performance metrics
3. Gather user feedback
4. Fix critical bugs immediately

---

**Document Version**: 1.0 (Complete)
**Last Updated**: 2025-12-03
**Status**: Ready for Implementation
**Total Phases**: 9 (Complete)
**Timeline**: 15-17 weeks
