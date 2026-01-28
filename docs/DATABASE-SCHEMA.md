# GroosHub Database Schema Documentation

This document provides a comprehensive reference for all database tables, columns, relationships, and storage systems used in GroosHub.

**Last Updated**: 2026-01-28

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
   - [Organizations & Users](#organizations--users)
   - [Projects](#projects)
   - [Chat System](#chat-system)
   - [File Storage](#file-storage)
   - [Memory System](#memory-system)
   - [LCA (Life Cycle Assessment)](#lca-life-cycle-assessment)
   - [Location System](#location-system)
   - [Tasks & Notes](#tasks--notes)
   - [Analytics & Usage](#analytics--usage)
4. [Cloudflare R2 Storage](#cloudflare-r2-storage)
5. [Legacy Tables](#legacy-tables)
6. [Views](#views)
7. [Indexes](#indexes)

---

## Overview

GroosHub uses **Neon PostgreSQL** (serverless) as its primary database with **pgvector** extension for embedding storage and vector similarity search.

### Database Systems
| System | Purpose |
|--------|---------|
| Neon PostgreSQL | Primary relational database |
| Cloudflare R2 | Object storage for files, images, documents |
| pgvector | Vector embeddings for RAG/semantic search |

### Connection
- Environment variable: `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING`
- Connection helper: `src/lib/db/connection.ts`

---

## Entity Relationship Diagram

```
org_organizations
├── user_accounts (org_id)
├── project_projects (org_id)
│   ├── project_members (project_id, user_id)
│   ├── project_invitations (project_id)
│   ├── chat_conversations (project_id, user_id)
│   │   ├── chat_messages (chat_id)
│   │   ├── file_uploads (chat_id)
│   │   └── llm_usage (chat_id)
│   ├── project_doc_chunks (project_id, file_id)
│   ├── project_memories (project_id)
│   ├── location_snapshots (project_id)
│   ├── lca_snapshots (project_id)
│   ├── tasks (project_id)
│   │   ├── task_assignments (task_id, user_id)
│   │   └── task_notes (task_id, user_id)
│   └── task_groups (project_id)
├── domain_memories (org_id)
└── ai_analytics (org_id, user_id, project_id)
```

---

## Core Tables

### Organizations & Users

#### `org_organizations`
Organization/tenant management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar | NO | - | Organization name |
| slug | varchar | NO | - | URL-friendly identifier |
| settings | jsonb | YES | '{}' | Organization settings |
| branding | jsonb | YES | '{}' | Custom branding config |
| plan_tier | varchar | YES | 'free' | Subscription tier |
| max_users | integer | YES | 10 | User limit |
| max_projects | integer | YES | 5 | Project limit |
| max_storage_gb | integer | YES | 10 | Storage quota (GB) |
| is_active | boolean | YES | true | Active status |
| deleted_at | timestamp | YES | - | Soft delete timestamp |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `user_accounts`
User authentication and profile data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto-increment | Primary key |
| org_id | uuid | NO | - | FK → org_organizations.id |
| email | varchar | NO | - | User email (unique) |
| password | varchar | NO | - | Hashed password |
| name | varchar | YES | - | Display name |
| avatar_url | text | YES | - | Profile picture URL |
| role | varchar | NO | 'user' | User role (user/admin/owner) |
| is_active | boolean | YES | true | Account active status |
| email_verified_at | timestamp | YES | - | Email verification time |
| last_login_at | timestamp | YES | - | Last login timestamp |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Account creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `audit_logs`
System audit trail for security and compliance.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | YES | - | FK → user_accounts.id |
| org_id | uuid | YES | - | FK → org_organizations.id |
| action | varchar | NO | - | Action performed |
| entity_type | varchar | NO | - | Type of entity affected |
| entity_id | varchar | YES | - | ID of affected entity |
| ip_address | inet | YES | - | Client IP address |
| user_agent | text | YES | - | Browser/client user agent |
| request_method | varchar | YES | - | HTTP method (GET/POST/etc) |
| request_path | text | YES | - | Request URL path |
| status_code | integer | YES | - | HTTP response status |
| error_message | text | YES | - | Error details if failed |
| metadata | jsonb | YES | '{}' | Additional context data |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Log timestamp |

---

### Projects

<!-- Batch 2c data will be added here -->

---

### Chat System

<!-- Batch 2b data will be added here -->

---

### File Storage

<!-- Batch 2b data will be added here -->

---

### Memory System

<!-- Batch 2d data will be added here -->

---

### LCA (Life Cycle Assessment)

<!-- Batch 2e data will be added here -->

---

### Location System

<!-- Batch 2f data will be added here -->

---

### Tasks & Notes

<!-- Batch 2g data will be added here -->

---

### Analytics & Usage

<!-- Batch 2h data will be added here -->

---

## Cloudflare R2 Storage

<!-- R2 bucket structure will be documented here -->

---

## Legacy Tables

The following tables are deprecated and maintained for backwards compatibility:

- `users_old` - Replaced by `user_accounts`
- `projects` - Replaced by `project_projects`
- `chats_old` - Replaced by `chat_conversations`
- `chats_messages` - Replaced by `chat_messages`
- `chat_files_old` - Replaced by `file_uploads`
- `chat_lists_old` - Deprecated
- `chat_message_votes_old` - Deprecated
- `chats_messages_votes_old` - Deprecated
- `project_users_old` - Replaced by `project_members`

---

## Views

<!-- Views will be documented here -->

---

## Indexes

<!-- Batch 4 data will be added here -->
