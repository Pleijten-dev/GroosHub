# 🚨 URGENT: Database Migration Required

> **Status**: ⚠️ CRITICAL
> **Deadline**: ASAP - Old tables will be deleted soon
> **Impact**: Code using old tables WILL BREAK

---

## Critical Information

**The database is in a hybrid state with both old and new tables.** The old legacy tables **WILL BE DELETED** in the near future. **ALL CODE must be migrated** to use the new table structure before the deletion happens.

---

## Tables That WILL BE DELETED

### ❌ OLD (To Be Deleted)

| Old Table | Status | Replace With |
|-----------|--------|--------------|
| `users` | ⚠️ DELETE SOON | `user_accounts` |
| `chats` | ⚠️ DELETE SOON | `chat_conversations` |
| `chats_messages` | ⚠️ DELETE SOON | `chat_messages` |
| `chats_messages_votes` | ⚠️ DELETE SOON | `chat_message_votes` |
| `chat_lists` | ⚠️ DELETE SOON | Remove |
| `chat_files` | ⚠️ DELETE SOON | `file_uploads` |
| `projects` | ⚠️ DELETE SOON | `project_projects` |
| `project_users` | ⚠️ DELETE SOON | `project_members` |
| `saved_locations` | ⚠️ DELETE SOON | `location_snapshots` |
| `location_shares` | ⚠️ DELETE SOON | TBD |

---

## Action Items

### 1. Audit Codebase ✅

**Find all references to old tables:**

```bash
# Search for old table references
grep -r "FROM users\|FROM chats\|FROM projects\|FROM saved_locations" src/
grep -r "INTO users\|INTO chats\|INTO projects\|INTO saved_locations" src/
grep -r "users\.id\|chats\.id\|projects\.id" src/
```

**Result**: Already audited - code uses new tables (`chat_conversations`, `file_uploads`)

### 2. Update All Queries ⚠️ IN PROGRESS

**Find and replace:**

```typescript
// OLD - WILL BREAK
await sql`SELECT * FROM users WHERE id = ${userId}`;
await sql`SELECT * FROM chats WHERE user_id = ${userId}`;
await sql`SELECT * FROM chats_messages WHERE chat_id = ${chatId}`;
await sql`SELECT * FROM saved_locations WHERE user_id = ${userId}`;

// NEW - CORRECT
await sql`SELECT * FROM user_accounts WHERE id = ${userId}`;
await sql`SELECT * FROM chat_conversations WHERE user_id = ${userId}`;
await sql`SELECT * FROM chat_messages WHERE chat_id = ${chatId}`;
await sql`SELECT * FROM location_snapshots WHERE project_id = ${projectId}`;
```

### 3. Update Foreign Keys ⚠️ CRITICAL

**Change all foreign key references:**

```typescript
// OLD
user_id INTEGER REFERENCES users(id)
chat_id UUID REFERENCES chats(id)
project_id INTEGER REFERENCES projects(id)

// NEW
user_id INTEGER REFERENCES user_accounts(id)
chat_id UUID REFERENCES chat_conversations(id)
project_id UUID REFERENCES project_projects(id)
```

### 4. Test Thoroughly

**Before deletion, verify:**

- [ ] All queries use new table names
- [ ] All foreign keys point to new tables
- [ ] No imports from legacy database files
- [ ] API endpoints work with new schema
- [ ] Frontend doesn't break
- [ ] Authentication still works
- [ ] File uploads work
- [ ] LCA calculations work

### 5. Data Migration

**Migrate data from old to new** (if not already done):

```sql
-- Migrate users → user_accounts (if needed)
INSERT INTO user_accounts (id, org_id, email, password, name, role, created_at)
SELECT
  id,
  (SELECT id FROM org_organizations WHERE slug = 'groosman'),
  email,
  password,
  name,
  role,
  created_at
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_accounts ua WHERE ua.id = users.id
);

-- Migrate saved_locations → location_snapshots (if needed)
INSERT INTO location_snapshots (
  id, project_id, user_id, address, latitude, longitude,
  demographics_data, health_data, safety_data, livability_data,
  amenities_data, housing_data, created_at
)
SELECT
  gen_random_uuid(),
  -- Create project for each location
  (INSERT INTO project_projects (org_id, name)
   VALUES ((SELECT id FROM org_organizations WHERE slug = 'groosman'), 'Migrated Location')
   RETURNING id),
  user_id,
  address,
  (coordinates->>'lat')::numeric,
  (coordinates->>'lng')::numeric,
  location_data->'demographics',
  location_data->'health',
  location_data->'safety',
  location_data->'livability',
  amenities_data,
  location_data->'housing',
  created_at
FROM saved_locations
WHERE NOT EXISTS (
  SELECT 1 FROM location_snapshots ls
  WHERE ls.address = saved_locations.address
  AND ls.user_id = saved_locations.user_id
);
```

---

## Migration Checklist

### Code Migration

- [ ] **Search for old table names** in src/
- [ ] **Update all SQL queries** to use new tables
- [ ] **Update TypeScript types** to match new schema
- [ ] **Update API routes** to use new tables
- [ ] **Update database queries** in /src/lib/db/
- [ ] **Remove imports** from legacy files

### Schema Updates

- [ ] **Foreign keys** point to new tables
- [ ] **Indexes** exist on new tables
- [ ] **Constraints** match new schema
- [ ] **Default values** updated

### Testing

- [ ] **Unit tests** pass
- [ ] **Integration tests** pass
- [ ] **Manual testing** of all features
- [ ] **Load testing** (if applicable)

### Data Safety

- [ ] **Backup database** before migration
- [ ] **Export legacy data** to JSON/CSV
- [ ] **Verify data integrity** after migration
- [ ] **Test rollback procedure**

---

## Files to Check

### High Priority

```
src/lib/db/queries/*.ts
src/app/api/*/route.ts
src/features/*/lib/db/*.ts
src/lib/auth.ts
```

### Medium Priority

```
src/features/*/hooks/*.ts
src/features/*/components/*.tsx
```

### Low Priority

```
src/shared/hooks/*.ts
scripts/*.ts
```

---

## Timeline

| Phase | Status | Priority |
|-------|--------|----------|
| **Code Audit** | ✅ Complete | CRITICAL |
| **Query Updates** | ⚠️ In Progress | CRITICAL |
| **Data Migration** | ⏳ Pending | HIGH |
| **Testing** | ⏳ Pending | HIGH |
| **Deployment** | ⏳ Pending | HIGH |
| **Legacy Table Deletion** | ⏳ Pending | FINAL |

---

## Support

If you find code using old tables:

1. **Don't ignore it** - it WILL break soon
2. **Update immediately** to new table names
3. **Test thoroughly** before committing
4. **Document changes** in commit message

---

## See Also

- [Current Schema](current-schema.md) - Complete database documentation
- [Migration Guide](migration-guide.md) - How to run migrations
- [Restructuring Proposal](restructuring-proposal.md) - Why we're doing this

---

**Last Updated**: 2025-12-08
**Urgency**: 🚨 CRITICAL
**Action Required**: ASAP
