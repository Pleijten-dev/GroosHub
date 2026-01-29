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
   - [Miscellaneous](#miscellaneous)
4. [Cloudflare R2 Storage](#cloudflare-r2-storage)
5. [Legacy Tables](#legacy-tables)
6. [Views](#views)

---

## Overview

GroosHub uses **Neon PostgreSQL** (serverless) as its primary database with **pgvector** extension for embedding storage and vector similarity search.

### Database Systems
| System | Purpose |
|--------|---------|
| Neon PostgreSQL | Primary relational database |
| Cloudflare R2 | Object storage for files, images, documents |
| pgvector | Vector embeddings for RAG/semantic search (1536-dim) |

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
│   ├── task_groups (project_id)
│   └── project_notes (project_id, user_id)
├── domain_memories (org_id)
└── ai_analytics (org_id, user_id, project_id)

LCA System (legacy user_id references):
lca_projects (user_id → users_old)
├── lca_elements (project_id)
│   └── lca_layers (element_id, material_id)
├── lca_materials (user_id → users_old)
├── lca_packages (user_id → users_old)
│   └── lca_package_layers (package_id, material_id)
├── lca_templates (user_id → users_old)
├── lca_reference_values
└── lca_service_lives

Location System (legacy):
saved_locations (user_id → users_old)
└── location_shares (saved_location_id)
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

#### `project_projects`
Main projects table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| org_id | uuid | NO | - | FK → org_organizations.id |
| name | varchar | NO | - | Project name |
| description | text | YES | - | Project description |
| project_number | varchar | YES | - | External project number |
| settings | jsonb | YES | '{}' | Project settings |
| metadata | jsonb | YES | '{}' | Additional metadata |
| status | varchar | YES | 'active' | Project status |
| is_template | boolean | YES | false | Is a template project |
| deleted_at | timestamp | YES | - | Soft delete timestamp |
| deleted_by_user_id | integer | YES | - | FK → user_accounts.id |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |
| last_accessed_at | timestamp | YES | CURRENT_TIMESTAMP | Last access time |

#### `project_members`
Project membership and roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| role | varchar | NO | 'member' | Member role |
| permissions | jsonb | YES | (see below) | Granular permissions |
| invited_by_user_id | integer | YES | - | FK → user_accounts.id |
| joined_at | timestamp | YES | CURRENT_TIMESTAMP | Join time |
| left_at | timestamp | YES | - | Leave time |
| is_pinned | boolean | YES | false | Pinned in user's list |

**Default permissions:**
```json
{"can_edit": true, "can_delete": false, "can_manage_files": true, "can_manage_members": false, "can_view_analytics": true}
```

#### `project_invitations`
Pending project invitations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| invited_by_user_id | integer | NO | - | FK → user_accounts.id |
| invited_user_id | integer | YES | - | FK → user_accounts.id (if existing) |
| email | varchar | NO | - | Invitee email |
| role | varchar | NO | 'member' | Offered role |
| message | text | YES | - | Invitation message |
| status | varchar | YES | 'pending' | pending/accepted/declined |
| token_hash | varchar | NO | - | Secure invitation token |
| expires_at | timestamp | NO | - | Expiration time |
| responded_at | timestamp | YES | - | Response time |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `project_doc_chunks`
RAG document chunks with vector embeddings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| file_id | uuid | YES | - | FK → file_uploads.id |
| chunk_text | text | NO | - | Chunk content |
| chunk_index | integer | NO | - | Position in document |
| embedding | vector(1536) | YES | - | pgvector embedding |
| source_file | text | NO | - | Original filename |
| source_url | text | YES | - | Source URL if applicable |
| page_number | integer | YES | - | Page number in document |
| section_title | text | YES | - | Section heading |
| metadata | jsonb | YES | '{}' | Additional metadata |
| token_count | integer | YES | - | Token count |
| embedding_model | varchar | YES | 'text-embedding-3-small' | Model used |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

---

### Chat System

#### `chat_conversations`
Chat sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → user_accounts.id |
| project_id | uuid | YES | - | FK → project_projects.id |
| title | varchar | YES | - | Conversation title |
| model_id | varchar | YES | - | Default model |
| model_settings | jsonb | YES | '{}' | Model parameters |
| metadata | jsonb | YES | '{}' | Additional metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |
| last_message_at | timestamp | YES | CURRENT_TIMESTAMP | Last message time |
| deleted_at | timestamp | YES | - | Soft delete timestamp |
| deleted_by_user_id | integer | YES | - | FK → user_accounts.id |

#### `chat_messages`
Individual chat messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| chat_id | uuid | NO | - | FK → chat_conversations.id |
| role | varchar | NO | - | user/assistant/system |
| content | text | YES | - | Plain text content |
| content_json | jsonb | YES | - | Structured content |
| content_encrypted | boolean | YES | false | Is content encrypted |
| model_id | varchar | YES | - | Model used |
| input_tokens | integer | YES | - | Input token count |
| output_tokens | integer | YES | - | Output token count |
| metadata | jsonb | YES | '{}' | Additional metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `image_generations`
AI-generated images.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| chat_id | uuid | NO | - | FK → chats_old.id |
| message_id | uuid | YES | - | FK → chats_messages.id |
| user_id | integer | NO | - | FK → users_old.id |
| prompt | text | NO | - | Generation prompt |
| negative_prompt | text | YES | - | Negative prompt |
| model | varchar | NO | - | Model used |
| image_url | text | NO | - | Generated image URL |
| thumbnail_url | text | YES | - | Thumbnail URL |
| parameters | jsonb | YES | '{}' | Generation parameters |
| generation_time_ms | integer | YES | - | Generation time |
| cost | numeric | YES | - | Generation cost |
| status | varchar | YES | 'completed' | Generation status |
| error_message | text | YES | - | Error if failed |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

---

### File Storage

#### `file_uploads`
File metadata and R2 references.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → user_accounts.id |
| project_id | uuid | YES | - | FK → project_projects.id |
| chat_id | uuid | YES | - | FK → chat_conversations.id |
| filename | varchar | NO | - | Storage filename |
| original_filename | varchar | NO | - | Original filename |
| file_path | text | NO | - | Storage path/key |
| file_size_bytes | bigint | NO | - | File size |
| mime_type | varchar | NO | - | MIME type |
| file_category | varchar | YES | - | Category (image/document/etc) |
| storage_provider | varchar | YES | 'local' | Storage provider |
| storage_url | text | YES | - | Public URL if applicable |
| is_public | boolean | YES | false | Is publicly accessible |
| access_level | varchar | YES | 'private' | Access level |
| processing_status | varchar | YES | 'pending' | Processing status |
| processing_error | text | YES | - | Processing error |
| embedding_status | varchar | YES | 'pending' | RAG embedding status |
| embedding_error | text | YES | - | Embedding error |
| chunk_count | integer | YES | 0 | Number of chunks |
| embedded_at | timestamp | YES | - | Embedding completion time |
| metadata | jsonb | YES | '{}' | Additional metadata |
| deleted_at | timestamp | YES | - | Soft delete timestamp |
| deleted_by_user_id | integer | YES | - | FK → user_accounts.id |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

---

### Memory System

#### `user_memories`
Personal user memory/preferences.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | integer | NO | - | PK, FK → users_old.id |
| memory_content | text | NO | '' | Synthesized memory text |
| user_name | varchar | YES | - | User's preferred name |
| user_role | varchar | YES | - | User's role/profession |
| identity | jsonb | YES | '{}' | Identity information |
| preferences | jsonb | YES | '{}' | User preferences |
| preferences_v2 | jsonb | YES | '[]' | Preferences v2 format |
| interests | jsonb | YES | '[]' | User interests |
| patterns | jsonb | YES | '[]' | Behavioral patterns |
| context | jsonb | YES | '[]' | Contextual information |
| total_updates | integer | YES | 0 | Total update count |
| last_analysis_at | timestamp | YES | - | Last analysis time |
| token_count | integer | YES | 0 | Memory token count |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `user_memory_updates`
User memory change audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → users_old.id |
| previous_content | text | YES | - | Previous memory state |
| new_content | text | NO | - | New memory state |
| change_summary | text | YES | - | Summary of changes |
| change_type | varchar | YES | - | Type of change |
| trigger_source | varchar | NO | - | What triggered update |
| trigger_id | uuid | YES | - | Related entity ID |
| metadata | jsonb | YES | '{}' | Additional metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `project_memories`
Project-level learned context.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| project_id | uuid | NO | - | PK, FK → project_projects.id |
| memory_content | text | NO | - | Synthesized memory text |
| project_summary | text | YES | - | Project summary |
| key_decisions | jsonb | YES | '[]' | Key decisions made |
| preferences | jsonb | YES | '{}' | Project preferences |
| patterns | jsonb | YES | '{}' | Identified patterns |
| context | jsonb | YES | '{}' | Project context |
| hard_values | jsonb | YES | '{}' | Fixed values/constraints |
| soft_context | jsonb | YES | '[]' | Flexible context |
| total_updates | integer | YES | 0 | Update count |
| last_analysis_at | timestamp | YES | - | Last analysis time |
| last_synthesized_at | timestamp | YES | - | Last synthesis time |
| synthesis_sources | jsonb | YES | '[]' | Sources used |
| token_count | integer | YES | 0 | Token count |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `project_memory_updates`
Project memory audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| previous_content | text | YES | - | Previous state |
| new_content | text | YES | - | New state |
| change_summary | text | YES | - | Change summary |
| change_type | varchar | YES | - | Change type |
| trigger_source | varchar | YES | - | Trigger source |
| trigger_id | uuid | YES | - | Related entity ID |
| triggered_by_user_id | integer | YES | - | FK → user_accounts.id |
| metadata | jsonb | YES | '{}' | Additional metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `domain_memories`
Organization-wide learned patterns.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| org_id | uuid | NO | - | FK → org_organizations.id |
| explicit_knowledge | jsonb | YES | '[]' | Explicit knowledge items |
| learned_patterns | jsonb | YES | '[]' | Learned patterns |
| token_estimate | integer | YES | 0 | Token estimate |
| last_synthesized_at | timestamp | YES | - | Last synthesis time |
| last_updated_by | integer | YES | - | FK → user_accounts.id |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `memory_updates`
Generic memory update audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| memory_type | varchar | NO | - | Type of memory |
| memory_id | text | NO | - | Memory entity ID |
| update_type | varchar | NO | - | Type of update |
| field_path | text | YES | - | JSON path updated |
| preference_key | text | YES | - | Preference key |
| old_value | jsonb | YES | - | Previous value |
| new_value | jsonb | YES | - | New value |
| old_confidence | numeric | YES | - | Previous confidence |
| new_confidence | numeric | YES | - | New confidence |
| reinforcement_delta | integer | YES | - | Reinforcement change |
| source | varchar | NO | - | Update source |
| source_ref | text | YES | - | Source reference |
| source_text | text | YES | - | Source text excerpt |
| updated_by | integer | YES | - | FK → user_accounts.id |
| metadata | jsonb | YES | '{}' | Additional metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

---

### LCA (Life Cycle Assessment)

#### `lca_projects`
LCA project definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → users_old.id |
| name | varchar | NO | - | Project name |
| description | text | YES | - | Description |
| project_number | varchar | YES | - | External reference |
| gross_floor_area | numeric | NO | - | GFA in m² |
| building_type | varchar | YES | - | Building type |
| construction_system | varchar | YES | - | Construction system |
| floors | integer | NO | 2 | Number of floors |
| dwelling_count | integer | YES | 1 | Number of dwellings |
| study_period | integer | NO | 75 | Study period (years) |
| location | varchar | YES | - | Location |
| energy_label | varchar | YES | - | Energy label |
| heating_system | varchar | YES | - | Heating system type |
| annual_gas_use | numeric | YES | - | Annual gas (m³) |
| annual_electricity | numeric | YES | - | Annual electricity (kWh) |
| facade_cladding | varchar | YES | - | Facade type |
| foundation | varchar | YES | - | Foundation type |
| roof | varchar | YES | - | Roof type |
| window_frames | varchar | YES | - | Window frame material |
| window_to_wall_ratio | numeric | YES | - | WWR ratio |
| total_gwp_a1_a3 | numeric | YES | - | Production phase GWP |
| total_gwp_a4 | numeric | YES | - | Transport GWP |
| total_gwp_a5 | numeric | YES | - | Construction GWP |
| total_gwp_b4 | numeric | YES | - | Replacement GWP |
| total_gwp_c | numeric | YES | - | End of life GWP |
| total_gwp_d | numeric | YES | - | Benefits beyond boundary |
| total_gwp_sum | numeric | YES | - | Total GWP |
| total_gwp_per_m2_year | numeric | YES | - | GWP per m²/year |
| operational_carbon | numeric | YES | - | Operational carbon |
| total_carbon | numeric | YES | - | Total carbon |
| mpg_reference_value | numeric | YES | - | MPG reference |
| is_compliant | boolean | YES | - | Meets requirements |
| is_template | boolean | NO | false | Is template |
| is_public | boolean | NO | false | Is public |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `lca_elements`
Building elements in LCA projects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → lca_projects.id |
| package_id | uuid | YES | - | FK → lca_packages.id |
| name | varchar | NO | - | Element name |
| sfb_code | varchar | YES | - | SfB classification code |
| category | varchar | NO | - | Element category |
| quantity | numeric | NO | - | Quantity |
| quantity_unit | varchar | NO | 'm2' | Unit of measure |
| description | text | YES | - | Description |
| notes | text | YES | - | Notes |
| total_gwp_a1_a3 | numeric | YES | - | Production GWP |
| total_gwp_a4 | numeric | YES | - | Transport GWP |
| total_gwp_a5 | numeric | YES | - | Construction GWP |
| total_gwp_b4 | numeric | YES | - | Replacement GWP |
| total_gwp_c | numeric | YES | - | End of life GWP |
| total_gwp_d | numeric | YES | - | Benefits beyond boundary |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `lca_layers`
Material layers within elements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| element_id | uuid | NO | - | FK → lca_elements.id |
| material_id | uuid | NO | - | FK → lca_materials.id |
| position | integer | NO | - | Layer position |
| thickness | numeric | NO | - | Thickness (mm) |
| coverage | numeric | NO | 1.0 | Coverage factor |
| custom_lifespan | integer | YES | - | Override lifespan |
| custom_transport_km | numeric | YES | - | Override transport |
| custom_eol_scenario | varchar | YES | - | Override EOL |

#### `lca_materials`
Material database with environmental data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | YES | - | FK → users_old.id (if custom) |
| oekobaudat_uuid | varchar | YES | - | Ökobaudat UUID |
| oekobaudat_version | varchar | YES | - | Ökobaudat version |
| name_de | varchar | NO | - | German name |
| name_en | varchar | YES | - | English name |
| name_nl | varchar | YES | - | Dutch name |
| category | varchar | NO | - | Material category |
| subcategory | varchar | YES | - | Subcategory |
| material_type | varchar | NO | - | Material type |
| density | numeric | YES | - | Density (kg/m³) |
| bulk_density | numeric | YES | - | Bulk density |
| area_weight | numeric | YES | - | Area weight (kg/m²) |
| reference_thickness | numeric | YES | - | Reference thickness |
| thermal_conductivity | numeric | YES | - | Lambda (W/mK) |
| declared_unit | varchar | NO | - | EPD declared unit |
| conversion_to_kg | numeric | NO | - | Conversion factor |
| gwp_a1_a3 | numeric | NO | - | GWP A1-A3 |
| gwp_a4 | numeric | YES | - | GWP A4 |
| gwp_a5 | numeric | YES | - | GWP A5 |
| gwp_c1 | numeric | YES | - | GWP C1 |
| gwp_c2 | numeric | YES | - | GWP C2 |
| gwp_c3 | numeric | YES | - | GWP C3 |
| gwp_c4 | numeric | YES | - | GWP C4 |
| gwp_d | numeric | YES | - | GWP D |
| odp_a1_a3 | numeric | YES | - | ODP A1-A3 |
| pocp_a1_a3 | numeric | YES | - | POCP A1-A3 |
| ap_a1_a3 | numeric | YES | - | AP A1-A3 |
| ep_a1_a3 | numeric | YES | - | EP A1-A3 |
| adpe_a1_a3 | numeric | YES | - | ADPE A1-A3 |
| adpf_a1_a3 | numeric | YES | - | ADPF A1-A3 |
| biogenic_carbon | numeric | YES | - | Biogenic carbon |
| fossil_carbon | numeric | YES | - | Fossil carbon |
| transport_distance | numeric | YES | - | Transport distance |
| transport_mode | varchar | YES | - | Transport mode |
| reference_service_life | integer | YES | - | RSL (years) |
| rsl_source | varchar | YES | - | RSL source |
| rsl_confidence | varchar | YES | - | RSL confidence |
| eol_scenario | varchar | YES | - | End of life scenario |
| recyclability | numeric | YES | - | Recyclability % |
| region | varchar | NO | 'NL' | Region |
| dutch_availability | boolean | NO | true | Available in NL |
| epd_validity | timestamp | YES | - | EPD valid until |
| epd_owner | varchar | YES | - | EPD owner |
| epd_url | text | YES | - | EPD URL |
| background_database | varchar | YES | - | Background DB |
| quality_rating | integer | NO | 3 | Data quality (1-5) |
| is_verified | boolean | NO | false | Is verified |
| is_generic | boolean | NO | true | Is generic data |
| is_public | boolean | NO | false | Is public |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `lca_packages`
Reusable element packages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | YES | - | FK → users_old.id |
| name | varchar | NO | - | Package name |
| description | text | YES | - | Description |
| category | varchar | NO | - | Category |
| subcategory | varchar | YES | - | Subcategory |
| construction_system | varchar | YES | - | Construction system |
| insulation_level | varchar | YES | - | Insulation level |
| total_thickness | numeric | YES | - | Total thickness |
| total_rc_value | numeric | YES | - | Rc value |
| total_weight | numeric | YES | - | Total weight |
| is_template | boolean | NO | false | Is template |
| is_public | boolean | NO | true | Is public |
| usage_count | integer | NO | 0 | Usage count |
| tags | text[] | YES | - | Tags array |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `lca_package_layers`
Layers within packages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| package_id | uuid | NO | - | FK → lca_packages.id |
| material_id | uuid | NO | - | FK → lca_materials.id |
| position | integer | NO | - | Layer position |
| thickness | numeric | NO | - | Thickness (mm) |
| coverage | numeric | NO | 1.0 | Coverage factor |
| layer_function | varchar | YES | - | Layer function |
| notes | text | YES | - | Notes |

#### `lca_templates`
LCA project templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | YES | - | FK → users_old.id |
| name | varchar | NO | - | Template name |
| description | text | YES | - | Description |
| building_type | varchar | YES | - | Building type |
| construction_system | varchar | NO | - | Construction system |
| elements_data | jsonb | NO | - | Elements JSON |
| source | varchar | NO | 'system' | Source |
| is_public | boolean | NO | true | Is public |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `lca_snapshots`
LCA calculation snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| project_name | varchar | NO | - | Snapshot project name |
| project_description | text | YES | - | Description |
| snapshot_date | date | NO | CURRENT_DATE | Snapshot date |
| version_number | integer | NO | 1 | Version |
| is_active | boolean | YES | true | Is active version |
| functional_unit | varchar | YES | - | Functional unit |
| system_boundary | text | YES | - | System boundary |
| allocation_method | varchar | YES | - | Allocation method |
| processes | jsonb | YES | '[]' | Processes |
| flows | jsonb | YES | '[]' | Flows |
| impact_categories | jsonb | YES | '[]' | Impact categories |
| results | jsonb | YES | '{}' | Results |
| parameters | jsonb | YES | '{}' | Parameters |
| comparisons | jsonb | YES | '[]' | Comparisons |
| calculation_status | varchar | YES | 'pending' | Status |
| calculation_error | text | YES | - | Error message |
| last_calculated_at | timestamp | YES | - | Last calc time |
| database_source | varchar | YES | - | Database source |
| database_version | varchar | YES | - | Database version |
| notes | text | YES | - | Notes |
| tags | text[] | YES | - | Tags |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `lca_reference_values`
MPG reference values.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| building_type | varchar | NO | - | Building type |
| mpg_limit | numeric | NO | - | MPG limit |
| energy_label | varchar | NO | - | Energy label |
| operational_carbon | numeric | NO | - | Operational carbon |
| source | varchar | NO | - | Data source |
| valid_from | timestamp | NO | - | Valid from date |

#### `lca_service_lives`
Reference service life data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| category | varchar | NO | - | Category |
| subcategory | varchar | YES | - | Subcategory |
| material_name | varchar | NO | - | Material name |
| reference_service_life | integer | NO | - | RSL (years) |
| min_lifespan | integer | YES | - | Minimum lifespan |
| max_lifespan | integer | YES | - | Maximum lifespan |
| environmental_factor | jsonb | YES | - | Environmental factors |
| maintenance_factor | jsonb | YES | - | Maintenance factors |
| source | varchar | NO | - | Data source |
| confidence_level | varchar | NO | - | Confidence level |
| region | varchar | NO | 'NL' | Region |
| notes | text | YES | - | Notes |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

---

### Location System

#### `location_snapshots`
Geographic analysis snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| address | text | NO | - | Full address |
| latitude | numeric | NO | - | Latitude |
| longitude | numeric | NO | - | Longitude |
| neighborhood_code | varchar | YES | - | CBS neighborhood code |
| district_code | varchar | YES | - | CBS district code |
| municipality_code | varchar | YES | - | CBS municipality code |
| snapshot_date | date | NO | CURRENT_DATE | Snapshot date |
| version_number | integer | NO | 1 | Version |
| is_active | boolean | YES | true | Is active version |
| demographics_data | jsonb | YES | '{}' | Demographics |
| health_data | jsonb | YES | '{}' | Health data |
| safety_data | jsonb | YES | '{}' | Safety data |
| livability_data | jsonb | YES | '{}' | Livability data |
| amenities_data | jsonb | YES | '{}' | Amenities data |
| housing_data | jsonb | YES | '{}' | Housing data |
| wms_grading_data | jsonb | YES | '{}' | WMS grading |
| pve_data | jsonb | YES | '{}' | PvE data |
| rapport_data | jsonb | YES | '{}' | LLM-generated rapport texts |
| overall_score | numeric | YES | - | Overall score |
| category_scores | jsonb | YES | '{}' | Category scores |
| data_sources | jsonb | YES | '{}' | Data sources |
| api_versions | jsonb | YES | '{}' | API versions |
| scoring_algorithm_version | varchar | YES | '1.0.0' | Scoring version |
| notes | text | YES | - | Notes |
| tags | text[] | YES | - | Tags |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `saved_locations`
User saved locations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → users_old.id |
| name | varchar | YES | - | Location name |
| address | text | NO | - | Address |
| coordinates | jsonb | NO | - | {lat, lng} |
| location_data | jsonb | NO | - | Location analysis data |
| amenities_data | jsonb | YES | - | Amenities data |
| selected_pve | jsonb | YES | - | Selected PvE items |
| selected_personas | jsonb | YES | - | Selected personas |
| llm_rapport | jsonb | YES | - | LLM-generated rapport |
| data_version | varchar | YES | '1.0.0' | Data version |
| completion_status | varchar | YES | 'location_only' | Completion status |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamptz | YES | now() | Creation time |
| updated_at | timestamptz | YES | now() | Last update time |

#### `location_shares`
Location sharing between users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| saved_location_id | uuid | NO | - | FK → saved_locations.id |
| shared_by_user_id | integer | NO | - | FK → users_old.id |
| shared_with_user_id | integer | NO | - | FK → users_old.id |
| can_edit | boolean | YES | false | Edit permission |
| shared_at | timestamptz | YES | now() | Share time |

---

### Tasks & Notes

#### `tasks`
Project tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| parent_task_id | uuid | YES | - | FK → tasks.id (subtask) |
| task_group_id | uuid | YES | - | FK → task_groups.id |
| title | varchar | NO | - | Task title |
| description | text | YES | - | Description |
| status | varchar | NO | 'todo' | todo/in_progress/done |
| priority | varchar | YES | 'normal' | low/normal/high/urgent |
| position | integer | NO | 0 | Sort position |
| deadline | timestamp | YES | - | Due date |
| start_date | timestamp | YES | - | Start date |
| estimated_hours | numeric | YES | - | Estimated hours |
| actual_hours | numeric | YES | - | Actual hours |
| tags | text[] | YES | - | Tags |
| created_by_user_id | integer | NO | - | FK → user_accounts.id |
| completed_by_user_id | integer | YES | - | FK → user_accounts.id |
| completed_at | timestamp | YES | - | Completion time |
| deleted_by_user_id | integer | YES | - | FK → user_accounts.id |
| deleted_at | timestamp | YES | - | Soft delete time |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `task_groups`
Task grouping/categories.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| name | varchar | NO | - | Group name |
| description | text | YES | - | Description |
| color | varchar | YES | - | Display color |
| position | integer | NO | 0 | Sort position |
| created_by_user_id | integer | NO | - | FK → user_accounts.id |
| deleted_at | timestamp | YES | - | Soft delete time |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `task_assignments`
Task user assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| task_id | uuid | NO | - | FK → tasks.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| assigned_by_user_id | integer | NO | - | FK → user_accounts.id |
| role | varchar | YES | - | Assignment role |
| assigned_at | timestamp | YES | CURRENT_TIMESTAMP | Assignment time |
| metadata | jsonb | YES | '{}' | Metadata |

#### `task_notes`
Comments/notes on tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| task_id | uuid | NO | - | FK → tasks.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| content | text | NO | - | Note content |
| is_edited | boolean | YES | false | Has been edited |
| edited_at | timestamp | YES | - | Edit time |
| deleted_at | timestamp | YES | - | Soft delete time |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `project_notes`
Project notes (database-backed, replaces localStorage).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK → project_projects.id |
| user_id | integer | NO | - | FK → user_accounts.id |
| content | text | NO | - | Note content |
| is_pinned | boolean | YES | false | Pinned notes appear at top |
| deleted_at | timestamp | YES | - | Soft delete time |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

#### `task_lists` (Legacy)
Legacy task lists.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto-increment | Primary key |
| project_id | integer | NO | - | FK → projects.id |
| name | text | NO | - | List name |
| created_at | timestamptz | YES | now() | Creation time |
| updated_at | timestamptz | YES | now() | Last update time |

#### `notes`
User notes (legacy).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto-increment | Primary key |
| user_id | integer | NO | - | FK → users_old.id |
| note_list_id | integer | NO | - | FK → note_lists.id |
| content | text | NO | - | Note content |
| created_at | timestamptz | NO | now() | Creation time |
| updated_at | timestamp | YES | now() | Last update time |

#### `note_lists`
Note organization (legacy).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto-increment | Primary key |
| project_id | integer | NO | - | FK → projects.id |
| name | text | NO | - | List name |
| created_at | timestamptz | YES | now() | Creation time |
| updated_at | timestamptz | YES | now() | Last update time |

---

### Analytics & Usage

#### `llm_usage`
LLM API usage tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → users_old.id |
| chat_id | uuid | YES | - | FK → chat_conversations.id |
| message_id | uuid | YES | - | FK → chats_messages.id |
| model | varchar | NO | - | Model name |
| provider | varchar | NO | - | Provider (openai/anthropic) |
| input_tokens | integer | NO | 0 | Input tokens |
| output_tokens | integer | NO | 0 | Output tokens |
| total_tokens | integer | YES | - | Total tokens |
| cost_input | numeric | NO | 0 | Input cost |
| cost_output | numeric | NO | 0 | Output cost |
| cost_total | numeric | YES | - | Total cost |
| request_type | varchar | NO | - | Request type |
| response_time_ms | integer | YES | - | Response time |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `ai_analytics`
AI feature usage analytics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| org_id | uuid | YES | - | FK → org_organizations.id |
| user_id | integer | YES | - | FK → user_accounts.id |
| project_id | uuid | YES | - | FK → project_projects.id |
| feature | varchar | NO | - | Feature name |
| action | varchar | NO | - | Action taken |
| entry_point | varchar | YES | - | UI entry point |
| button_was_animated | boolean | YES | false | Button was animated |
| panel_was_opened | boolean | YES | false | Panel was opened |
| suggestion_shown | boolean | YES | false | Suggestion shown |
| suggestion_accepted | boolean | YES | - | Suggestion accepted |
| items_created | integer | YES | - | Items created |
| response_time_ms | integer | YES | - | Response time |
| tokens_used | integer | YES | - | Tokens used |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |

#### `user_notifications`
User notification system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | integer | NO | - | FK → user_accounts.id |
| type | varchar | NO | - | Notification type |
| title | varchar | NO | - | Title |
| message | text | NO | - | Message content |
| project_id | uuid | YES | - | FK → project_projects.id |
| chat_id | uuid | YES | - | FK → chat_conversations.id |
| file_id | uuid | YES | - | FK → file_uploads.id |
| action_url | text | YES | - | Action URL |
| action_label | varchar | YES | - | Action button label |
| is_read | boolean | YES | false | Read status |
| read_at | timestamp | YES | - | Read time |
| priority | varchar | YES | 'normal' | Priority level |
| expires_at | timestamp | YES | - | Expiration time |
| metadata | jsonb | YES | '{}' | Metadata |
| created_at | timestamp | YES | CURRENT_TIMESTAMP | Creation time |
| updated_at | timestamp | YES | CURRENT_TIMESTAMP | Last update time |

---

### Miscellaneous

#### `plan_database`
Floor plan database.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | auto-increment | Primary key |
| building | text | YES | - | Building name |
| floor | text | NO | - | Floor identifier |
| aantal | integer | YES | - | Count |
| bnr | text | YES | - | Building number |
| bvo | double | YES | - | Gross floor area |
| go | double | YES | - | Usable area |
| buitenruimte | double | YES | - | Outdoor space |
| lagen | integer | YES | - | Number of layers |
| vorm | text | YES | - | Form/shape |
| beuk | integer | YES | - | Bay width |
| locatie_dwg | text | YES | - | DWG file location |
| locatie_png | varchar | YES | - | PNG file location |
| verdieping | text | YES | - | Floor level |
| woning_naam | text | YES | - | Dwelling name |
| woning_typologie | text | YES | - | Dwelling typology |
| bedrooms | integer | YES | - | Number of bedrooms |
| bathrooms | integer | YES | - | Number of bathrooms |
| separate_toilet | boolean | YES | - | Has separate toilet |
| intern | boolean | YES | - | Is internal |
| afmeting_x | integer | YES | - | X dimension |
| afmeting_y | integer | YES | - | Y dimension |

#### `_prisma_migrations`
Prisma migration tracking (internal).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | varchar | NO | - | Migration ID |
| checksum | varchar | NO | - | Migration checksum |
| migration_name | varchar | NO | - | Migration name |
| logs | text | YES | - | Migration logs |
| started_at | timestamptz | NO | now() | Start time |
| finished_at | timestamptz | YES | - | Finish time |
| rolled_back_at | timestamptz | YES | - | Rollback time |
| applied_steps_count | integer | NO | 0 | Applied steps |

---

## Cloudflare R2 Storage

Files are stored in Cloudflare R2 with the following key structure:

```
{bucket}/
├── files/
│   └── {user_id}/
│       └── {project_id}/
│           └── {uuid}-{filename}
├── images/
│   └── {user_id}/
│       └── {uuid}.{ext}
└── avatars/
    └── {user_id}.{ext}
```

### Environment Variables
- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - Bucket name
- `R2_PUBLIC_URL` - Public URL base

---

## Legacy Tables

The following tables are deprecated and maintained for backwards compatibility:

| Table | Replacement | Notes |
|-------|-------------|-------|
| `users_old` | `user_accounts` | Still referenced by LCA, location, memory tables |
| `projects` | `project_projects` | Referenced by task_lists, note_lists |
| `chats_old` | `chat_conversations` | Still referenced by image_generations |
| `chats_messages` | `chat_messages` | Still referenced by llm_usage, image_generations |
| `chat_files_old` | `file_uploads` | Deprecated |
| `chat_lists_old` | - | Deprecated |
| `chat_message_votes_old` | - | Deprecated |
| `chats_messages_votes_old` | - | Deprecated |
| `project_users_old` | `project_members` | Deprecated |

---

## Views

The following are database views (read-only aggregations):

| View | Purpose |
|------|---------|
| `ai_usage_summary` | AI feature usage aggregation |
| `chat_statistics` | Chat statistics per conversation |
| `daily_llm_cost_by_user` | Daily LLM costs by user |
| `memory_health_overview` | Memory system health metrics |
| `overdue_tasks` | Tasks past deadline |
| `recent_memory_updates` | Recent memory changes |
| `saved_locations_stats` | Saved location statistics |
| `task_assignment_summary` | Task assignment overview |
| `user_accessible_locations` | Locations accessible to users |
| `user_notification_stats` | Notification statistics |

---

## Indexes

### Index Types Used

| Type | Description |
|------|-------------|
| `btree` | Standard B-tree index for equality and range queries |
| `gin` | Generalized Inverted Index for JSONB and full-text search |
| `ivfflat` | pgvector index for approximate nearest neighbor search |

### Key Indexes by Table

#### Organizations & Users

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| org_organizations | org_organizations_slug_key | UNIQUE | slug | URL-friendly lookup |
| org_organizations | idx_org_active | btree | is_active | WHERE deleted_at IS NULL |
| user_accounts | user_accounts_email_key | UNIQUE | email | Login lookup |
| user_accounts | idx_user_accounts_org | btree | org_id | Filter by organization |

#### Projects

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| project_projects | idx_project_org | btree | org_id | Filter by organization |
| project_projects | idx_project_status | btree | status | WHERE deleted_at IS NULL |
| project_projects | idx_project_last_accessed | btree | last_accessed_at DESC | Recent projects |
| project_members | project_members_project_id_user_id_key | UNIQUE | project_id, user_id | Prevent duplicates |
| project_members | idx_project_members_user_pinned | btree | user_id, is_pinned | WHERE is_pinned = true |
| project_invitations | project_invitations_token_hash_key | UNIQUE | token_hash | Secure lookup |

#### Chat System

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| chat_conversations | idx_chat_user | btree | user_id | User's chats |
| chat_conversations | idx_chat_project | btree | project_id | Project's chats |
| chat_conversations | idx_chat_last_message | btree | last_message_at DESC | Recent chats |
| chat_messages | idx_message_chat | btree | chat_id | Messages in chat |
| chat_messages | idx_message_created | btree | created_at DESC | Chronological order |
| chat_messages | idx_chat_messages_encrypted | btree | content_encrypted | WHERE content_encrypted = true |

#### RAG / Document Chunks

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| project_doc_chunks | idx_project_doc_chunks_embedding | ivfflat | embedding vector_cosine_ops | WITH (lists=100) - Vector similarity |
| project_doc_chunks | idx_project_doc_chunks_text_search | gin | to_tsvector(chunk_text) | Full-text search |
| project_doc_chunks | idx_project_doc_chunks_project_id | btree | project_id | Filter by project |
| project_doc_chunks | idx_project_doc_chunks_file_id | btree | file_id | Filter by source file |

#### File Uploads

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| file_uploads | idx_file_user | btree | user_id | User's files |
| file_uploads | idx_file_project | btree | project_id | Project's files |
| file_uploads | idx_file_chat | btree | chat_id | Chat attachments |
| file_uploads | idx_file_uploads_embedding_status | btree | embedding_status, project_id | RAG processing queue |
| file_uploads | idx_file_deleted | btree | deleted_at | WHERE deleted_at IS NOT NULL |

#### Memory System

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| user_memories | user_memories_pkey | UNIQUE | user_id | One per user |
| user_memories | idx_user_memories_updated | btree | updated_at DESC | Recently updated |
| project_memories | project_memories_pkey | UNIQUE | project_id | One per project |
| domain_memories | domain_memories_org_id_key | UNIQUE | org_id | One per organization |
| memory_updates | idx_memory_updates_type_id | btree | memory_type, memory_id | Lookup by memory |

#### LCA System

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| lca_materials | lca_materials_oekobaudat_uuid_key | UNIQUE | oekobaudat_uuid | EPD lookup |
| lca_materials | idx_lca_materials_category | btree | category, subcategory | Material search |
| lca_materials | idx_lca_materials_dutch | btree | dutch_availability, quality_rating | NL availability |
| lca_layers | lca_layers_element_id_position_key | UNIQUE | element_id, position | Layer ordering |
| lca_packages | idx_lca_packages_tags | gin | tags | Tag search |
| lca_snapshots | idx_lca_snapshots_active_project | UNIQUE | project_id, is_active | WHERE is_active = true |

#### Location System

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| location_snapshots | idx_location_snapshots_active_project | UNIQUE | project_id, is_active | WHERE is_active = true |
| location_snapshots | idx_location_coords | btree | latitude, longitude | Geographic queries |
| location_snapshots | idx_location_wms_grading | gin | wms_grading_data | JSONB search |
| location_snapshots | idx_location_pve_data | gin | pve_data | JSONB search |
| location_snapshots | idx_location_rapport_data | gin | rapport_data | JSONB search |
| saved_locations | unique_user_address | UNIQUE | user_id, address | Prevent duplicates |
| saved_locations | idx_saved_locations_location_data | gin | location_data | JSONB search |
| location_shares | unique_share | UNIQUE | saved_location_id, shared_with_user_id | Prevent duplicate shares |

#### Tasks

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| tasks | idx_tasks_project_status | btree | project_id, status | WHERE deleted_at IS NULL |
| tasks | idx_tasks_upcoming_deadlines | btree | deadline | WHERE deadline IS NOT NULL AND status != 'done' |
| tasks | idx_tasks_parent_task | btree | parent_task_id | Subtask lookup |
| task_assignments | task_assignments_task_id_user_id_key | UNIQUE | task_id, user_id | One assignment per user |

#### Analytics

| Table | Index | Type | Columns | Notes |
|-------|-------|------|---------|-------|
| llm_usage | idx_llm_usage_user_date | btree | user_id, created_at DESC | User usage history |
| llm_usage | idx_llm_usage_model | btree | model | Model analytics |
| ai_analytics | idx_ai_analytics_feature | btree | feature, action | Feature usage |
| audit_logs | idx_audit_entity | btree | entity_type, entity_id | Entity history |
| audit_logs | idx_audit_metadata | gin | metadata | JSONB search |
| user_notifications | idx_user_notifications_user_unread | btree | user_id, is_read | WHERE is_read = false |

### Performance Notes

1. **Vector Search**: `project_doc_chunks` uses IVFFlat index with 100 lists for approximate nearest neighbor search on 1536-dim embeddings
2. **JSONB Indexes**: GIN indexes on JSONB columns enable efficient containment queries (`@>`, `?`, `?|`)
3. **Partial Indexes**: Many indexes use WHERE clauses to index only relevant rows (active records, non-deleted, etc.)
4. **Composite Indexes**: Frequently queried column combinations have composite indexes for efficient filtering
