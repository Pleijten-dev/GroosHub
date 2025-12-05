# Database Restructuring Migrations

This directory contains SQL migration scripts for the multi-organization database restructuring.

## Migration Order

Run migrations in numerical order:

### Foundation Tables (001-008)
1. **001_create_organizations.sql** - Organization table with GROOSMAN default
2. **002_create_user_accounts.sql** - User accounts with org_id support
3. **003_create_projects.sql** - Projects, members, invitations tables
4. **004_create_chat_tables.sql** - Chat conversations, messages, votes
5. **005_create_file_uploads.sql** - Unified file management
6. **006_create_location_snapshots.sql** - Versioned location data
7. **007_create_lca_snapshots.sql** - Versioned LCA data
8. **008_create_project_memory.sql** - Project memory system

### Data Migration (009-014)
9. **009_migrate_users.sql** - Migrate existing users to GROOSMAN org
10. **010_migrate_lca_projects.sql** - Create projects from lca_projects
11. **011_migrate_lca_snapshots.sql** - Create initial LCA snapshots
12. **012_migrate_saved_locations.sql** - Migrate locations to snapshots
13. **013_migrate_chats.sql** - Migrate chats and messages
14. **014_migrate_files.sql** - Migrate chat files

## Rollback Scripts

Each migration has a corresponding rollback script:
- `00X_rollback_*.sql` - Reverses the changes from migration 00X

## Usage

### Manual Execution

```bash
# Run a migration
psql $POSTGRES_URL < 001_create_organizations.sql

# Rollback a migration
psql $POSTGRES_URL < 001_rollback_organizations.sql
```

### Automated Execution

Use the migration execution script:

```bash
# Run all migrations
node execute-migrations.js

# Run specific migration
node execute-migrations.js 001

# Rollback specific migration
node execute-migrations.js rollback 001
```

## Pre-requisites

Before running migrations:

1. **Backup database**: `pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d).sql`
2. **Test on staging**: Run migrations on staging database first
3. **Environment variables**: Ensure all required env vars are set

## Verification

Each migration includes verification queries that run after execution.
Check the output to ensure migrations completed successfully.

## Important Notes

- **Run in order**: Migrations must be run in numerical sequence
- **Idempotent**: Migrations use `IF NOT EXISTS` where possible
- **Transactions**: Each migration wrapped in BEGIN/COMMIT
- **Foreign keys**: Cascading deletes configured appropriately
- **Indexes**: Created for performance optimization

## Status

- [x] Migration scripts 001-002 created
- [ ] Migration scripts 003-014 in progress
- [ ] Rollback scripts for all migrations
- [ ] Execution script
- [ ] Testing on staging database

## See Also

- `/Documentation/DATABASE_RESTRUCTURING_PROPOSAL.md` - Architecture overview
- `/Documentation/DATABASE_RESTRUCTURING_ROADMAP.md` - Implementation guide
