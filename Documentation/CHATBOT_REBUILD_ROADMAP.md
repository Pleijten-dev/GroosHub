# Chatbot Rebuild Roadmap
## GroosHub Database Restructuring Implementation Guide

> **Version**: 1.0
> **Date**: 2025-12-03
> **Status**: Implementation Ready
> **Related**: DATABASE_RESTRUCTURING_PROPOSAL.md

---

## Overview

This roadmap provides detailed implementation steps for the database restructuring outlined in DATABASE_RESTRUCTURING_PROPOSAL.md. It includes code examples, migration scripts, API changes, and UI updates.

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

[CONTINUED IN NEXT SECTION DUE TO LENGTH...]

---

**To be continued with:**
- Phase 3: Backend Implementation (API routes, middleware, access control)
- Phase 4: Frontend Implementation (UI components, pages, navigation)
- Phase 5: Security & Encryption (Encryption implementation, key management)
- Phase 6-9: Testing, Cleanup, Deployment, Monitoring

**Next Steps:**
1. Review and approve migration scripts
2. Test on staging database
3. Continue with backend API implementation

---

**Document Version**: 1.0
**Status**: In Progress - Migrations Complete
**Next Section**: Backend Implementation
