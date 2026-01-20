# File Deletion System

## Overview

GroosHub implements a two-tier file deletion system with automatic cleanup:

1. **Soft Delete** - Files are marked for deletion and moved to trash (30-day recovery window)
2. **Permanent Delete** - Files are completely removed from R2 storage and database
3. **Automatic Cleanup** - Files in trash for 30+ days are automatically deleted

---

## Deletion Workflow

```
Active File → Soft Delete → Trash (30 days) → Permanent Delete
             ↓             ↓
             Restore ←──────┘
```

---

## API Endpoints

### 1. Soft Delete (Move to Trash)

**Endpoint:** `DELETE /api/files/[fileId]`

**Description:** Marks a file for deletion. File remains in storage and can be restored.

**Authorization:**
- File owner
- Project member (for project files)
- Chat owner (for chat files)

**Example:**
```bash
curl -X DELETE https://yourdomain.com/api/files/abc123 \
  -H "Cookie: your-auth-cookie"
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully. Can be restored within 30 days."
}
```

**Database Changes:**
- Sets `deleted_at = CURRENT_TIMESTAMP`
- Sets `deleted_by_user_id = userId`
- File remains in R2 storage

---

### 2. Restore File

**Endpoint:** `POST /api/files/[fileId]/restore`

**Description:** Restore a soft-deleted file from trash (within 30 days)

**Authorization:** Same as soft delete

**Example:**
```bash
curl -X POST https://yourdomain.com/api/files/abc123/restore \
  -H "Cookie: your-auth-cookie"
```

**Response:**
```json
{
  "success": true,
  "message": "File restored successfully"
}
```

**Database Changes:**
- Sets `deleted_at = NULL`

---

### 3. Permanent Delete

**Endpoint:** `DELETE /api/files/[fileId]/permanent`

**Description:** Permanently delete a file. **Cannot be undone.**

**Authorization:**
- File owner
- Project admin/creator (for project files)
- Chat owner (for chat files)

**Requirements:**
- File must already be soft-deleted (in trash)

**Example:**
```bash
curl -X DELETE https://yourdomain.com/api/files/abc123/permanent \
  -H "Cookie: your-auth-cookie"
```

**Response:**
```json
{
  "success": true,
  "message": "File permanently deleted"
}
```

**Actions Performed:**
1. Deletes file from R2 storage
2. Hard deletes record from database
3. **Cannot be undone**

---

### 4. View Trash

**Endpoint:** `GET /api/files/trash`

**Description:** List all deleted files (for current user or project)

**Query Parameters:**
- `project_id` (optional) - Filter by project

**Example:**
```bash
# User's trash
curl https://yourdomain.com/api/files/trash \
  -H "Cookie: your-auth-cookie"

# Project trash
curl https://yourdomain.com/api/files/trash?project_id=project-123 \
  -H "Cookie: your-auth-cookie"
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "abc123",
      "file_name": "document.pdf",
      "file_type": "project",
      "mime_type": "application/pdf",
      "file_size": 1024000,
      "deleted_at": "2025-12-01T10:30:00.000Z",
      "deleted_by_user_name": "John Doe",
      "created_at": "2025-11-15T09:00:00.000Z"
    }
  ]
}
```

---

## Automatic Cleanup

Files that remain in trash for **30+ days** are automatically and permanently deleted.

### Cleanup Methods

#### 1. Automated (Recommended)

**Vercel Cron** - Configured in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/files/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- Runs daily at 2:00 AM UTC
- No configuration needed on Vercel
- Automatically authenticates using Vercel's cron header

#### 2. Manual Trigger

**Endpoint:** `POST /api/files/cleanup`

**Authorization:**
- Admin user session, OR
- Valid cron secret in `x-cron-secret` header

**Example (Admin):**
```bash
curl -X POST https://yourdomain.com/api/files/cleanup \
  -H "Cookie: your-admin-auth-cookie"
```

**Example (Cron):**
```bash
curl -X POST https://yourdomain.com/api/files/cleanup \
  -H "x-cron-secret: your-secret-from-env"
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "result": {
    "totalFilesFound": 15,
    "successfulDeletions": 14,
    "failedDeletions": 1,
    "deletedFiles": [
      {
        "id": "abc123",
        "filename": "old-file.pdf",
        "deletedAt": "2025-11-01T10:30:00.000Z"
      }
    ],
    "errors": [
      {
        "fileId": "xyz789",
        "error": "File not found in R2"
      }
    ]
  }
}
```

#### 3. CLI Script

**Run manually:**
```bash
npx tsx scripts/cleanup-deleted-files.ts
```

**Use case:** One-time cleanup or debugging

---

### Cleanup Stats (Preview)

**Endpoint:** `GET /api/files/cleanup`

**Description:** Check how many files are eligible for cleanup (without deleting)

**Authorization:** Admin only

**Example:**
```bash
curl https://yourdomain.com/api/files/cleanup \
  -H "Cookie: your-admin-auth-cookie"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "eligibleFilesCount": 15,
    "oldestDeletion": "2025-10-15T08:00:00.000Z",
    "newestDeletion": "2025-11-28T14:30:00.000Z",
    "totalSizeBytes": 52428800,
    "totalSizeMB": 50.0
  }
}
```

---

## Environment Configuration

### Required Variables

Add to `.env.local`:

```bash
# Cron Job Secret (for automated cleanup)
# Generate: openssl rand -base64 32
CRON_SECRET=your_secure_random_secret_here
```

### Vercel Setup

1. Add `CRON_SECRET` to Vercel environment variables
2. Deploy `vercel.json` with cron configuration
3. Cron will run automatically daily at 2 AM UTC

---

## Security

### Permission Checks

| Action | Requirements |
|--------|-------------|
| Soft Delete | File owner, project member, or chat owner |
| Restore | Same as soft delete |
| Permanent Delete | File owner, project admin/creator, or chat owner |
| View Trash | File owner or project member |
| Trigger Cleanup | Admin user or valid cron secret |
| View Cleanup Stats | Admin user |

### Safety Features

1. **Two-step deletion** - Must soft delete before permanent delete
2. **30-day grace period** - Ample time to restore accidentally deleted files
3. **Audit trail** - Tracks who deleted files and when
4. **Error resilience** - Continues cleanup even if individual files fail
5. **R2 cleanup** - Removes orphaned files from storage
6. **Database cascade** - Automatically handles related records

---

## Database Schema

### file_uploads Table

```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY,
  file_path TEXT NOT NULL,              -- R2 storage key
  original_filename TEXT NOT NULL,
  storage_provider TEXT DEFAULT 'r2',
  file_size_bytes BIGINT,
  deleted_at TIMESTAMP,                 -- NULL = active, NOT NULL = deleted
  deleted_by_user_id INTEGER,           -- Who deleted it
  -- ... other fields
);

-- Index for cleanup query
CREATE INDEX idx_file_uploads_deleted_at
ON file_uploads(deleted_at)
WHERE deleted_at IS NOT NULL;
```

---

## Testing

### Test Soft Delete

```bash
# 1. Upload a file
# 2. Delete it
curl -X DELETE https://yourdomain.com/api/files/[fileId]

# 3. Verify it's in trash
curl https://yourdomain.com/api/files/trash

# 4. Restore it
curl -X POST https://yourdomain.com/api/files/[fileId]/restore

# 5. Verify it's active again
```

### Test Permanent Delete

```bash
# 1. Soft delete a file first
curl -X DELETE https://yourdomain.com/api/files/[fileId]

# 2. Permanently delete it
curl -X DELETE https://yourdomain.com/api/files/[fileId]/permanent

# 3. Verify it's gone from database and R2
```

### Test Cleanup

```bash
# 1. Check cleanup stats
curl https://yourdomain.com/api/files/cleanup

# 2. Manually trigger cleanup
curl -X POST https://yourdomain.com/api/files/cleanup \
  -H "Cookie: admin-auth-cookie"

# 3. Verify files are deleted
```

---

## Monitoring

### Logs

All deletion operations are logged:

```
[Files API] Soft deleted file abc123 (user: 456)
[Cleanup] Found 15 files to clean up
[Cleanup] ✓ Deleted from R2: production/users/123/...
[Cleanup] ✓ Deleted from database: abc123
[Cleanup] Summary: 14 successful, 1 failed
```

### Metrics to Track

- Number of files in trash
- Total size of trash
- Cleanup success/failure rate
- Time to cleanup completion
- R2 storage costs saved

---

## Troubleshooting

### File stuck in trash

**Symptom:** File doesn't appear in cleanup

**Solutions:**
1. Check `deleted_at` timestamp: `SELECT deleted_at FROM file_uploads WHERE id = 'abc123'`
2. Verify 30 days have passed: `SELECT NOW() - deleted_at FROM file_uploads WHERE id = 'abc123'`
3. Manually trigger cleanup: `POST /api/files/cleanup`

### R2 deletion failed

**Symptom:** "Failed to delete file from R2" in logs

**Solutions:**
1. File may already be deleted from R2 (not an error)
2. Check R2 credentials are valid
3. Verify R2 bucket name is correct
4. Database will still be cleaned up

### Cleanup not running automatically

**Symptom:** Old files remain in trash

**Solutions:**
1. Verify `vercel.json` is deployed
2. Check Vercel cron logs in dashboard
3. Ensure `CRON_SECRET` is set in environment
4. Manually trigger: `POST /api/files/cleanup`

---

## Migration Guide

### Existing Soft-Deleted Files

If you have files that were soft-deleted before implementing permanent deletion:

1. They will be automatically picked up by the cleanup job
2. Files deleted 30+ days ago will be permanently deleted on next cleanup run
3. No manual migration needed

### Disable Automatic Cleanup

To disable automatic cleanup:

1. Remove cron configuration from `vercel.json`
2. Redeploy
3. Manually trigger cleanup when needed: `POST /api/files/cleanup`

---

## Best Practices

1. **Always soft delete first** - Gives users a chance to recover
2. **Monitor cleanup logs** - Ensure it's running successfully
3. **Set up alerts** - Notify if cleanup fails repeatedly
4. **Test restore flow** - Ensure users can recover files
5. **Document for users** - Inform users about the 30-day policy
6. **Backup critical files** - Don't rely solely on trash for backups

---

## Future Enhancements

- [ ] User-configurable retention period (7, 14, 30, 60 days)
- [ ] Bulk permanent deletion
- [ ] Email notifications before permanent deletion
- [ ] Trash size quotas per user/project
- [ ] Archive to cheaper storage before deletion
- [ ] Permanent deletion audit log in admin panel
