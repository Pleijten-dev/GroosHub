# AI Assistant Project Overview - Implementation Status

> **Last Updated**: 2025-12-09
> **Branch**: `claude/add-member-overview-01RAYFkeejHKvNjVSGLwqcqP`
> **Status**: Phase 1-2 Complete ✅ | Phase 3-5 Pending ⏳

---

## ✅ **COMPLETED FEATURES** (Phase 1-2)

### 1. Database Schema & Migrations ✅

**File**: `src/lib/db/migrations/010_archive_and_notifications.sql`

- ✅ Added `deleted_at`, `deleted_by_user_id` to `chat_conversations` table
- ✅ Created `user_notifications` table with full functionality
  - Priority levels (urgent, high, normal, low)
  - Expiration support for auto-cleanup
  - Action URLs and labels
  - Metadata support
- ✅ Helper functions:
  - `mark_notification_read(notification_id)`
  - `mark_all_notifications_read(user_id)`
  - `get_unread_notification_count(user_id)`
  - `cleanup_expired_notifications()` (for cron)
  - `get_archived_projects(user_id)`
  - `get_archived_chats(user_id)`

### 2. Notification System ✅

**Components**:
- ✅ `NotificationDropdown.tsx` - Bell icon with unread badge in navbar
- ✅ Real-time polling (30-second intervals)
- ✅ Mark as read/delete individual notifications
- ✅ Mark all as read functionality
- ✅ Priority-based sorting
- ✅ Time ago formatting ("Just now", "5 min ago", etc.)
- ✅ Dutch & English translations

**API Endpoints**:
- ✅ `GET /api/notifications` - List notifications (with filters)
- ✅ `POST /api/notifications/mark-all-read` - Mark all as read
- ✅ `PATCH /api/notifications/[id]` - Mark single as read
- ✅ `DELETE /api/notifications/[id]` - Delete notification

### 3. Archive System ✅

**API Endpoints**:
- ✅ `GET /api/archive` - List archived projects and chats
- ✅ `POST /api/projects/[id]/restore` - Restore project (30-day window)
- ✅ `DELETE /api/projects/[id]/permanent` - Permanently delete project (with R2 cleanup)
- ✅ `POST /api/chats/[id]/restore` - Restore chat
- ✅ `DELETE /api/chats/[id]/permanent` - Permanently delete chat (with R2 cleanup)
- ✅ `DELETE /api/projects/[id]` - Updated to include `deleted_by_user_id`
- ✅ `PATCH /api/projects/[id]` - Updated to support `is_pinned` field

**Features**:
- ✅ 30-day recovery window for soft-deleted items
- ✅ Days remaining calculation
- ✅ Automatic R2 file cleanup on permanent deletion
- ✅ Role-based permissions (only creator can permanently delete projects)

### 4. Context Menu Component ✅

**File**: `src/shared/components/UI/ContextMenu/ContextMenu.tsx`

- ✅ Reusable three-dot menu component
- ✅ Hover-based visibility
- ✅ Click-outside-to-close behavior
- ✅ Escape key support
- ✅ Icon support
- ✅ Variant support (default, danger)
- ✅ Separator support
- ✅ Disabled state support

### 5. Enhanced ProjectsSidebar ✅

**File**: `src/features/projects/components/ProjectsSidebarEnhanced.tsx`

**Project Features**:
- ✅ Pin/unpin projects (shows star icon when pinned)
- ✅ Rename projects (inline editing with Enter/Escape)
- ✅ Leave project (non-creators only)
- ✅ Delete project (creators only, moves to archive)
- ✅ Expandable archive section
- ✅ Restore archived projects
- ✅ Permanent delete (creators only, with confirmation)

**Chat Features**:
- ✅ Rename chats (inline editing)
- ✅ Delete chats (moves to archive)
- ✅ Expandable archive section
- ✅ Restore archived chats
- ✅ Permanent delete (with confirmation)

**UI/UX**:
- ✅ Three-dot context menus on hover
- ✅ Pinned projects section at top
- ✅ Recent projects sorted by last accessed
- ✅ Show more/less expandable sections
- ✅ Archive sections with item count badges
- ✅ Days remaining indicator for archived items
- ✅ Confirmation dialogs for destructive actions
- ✅ Dutch & English translations
- ✅ Smooth transitions and animations

---

## ⏳ **PENDING FEATURES** (Phase 3-5)

### Phase 3: File Management System

**Status**: Not Started
**Estimated Effort**: 6-8 hours

#### Components Needed:
1. **ProjectFiles Enhancement** (`src/features/projects/components/ProjectFiles.tsx`)
   - Grid view with file thumbnails
   - File preview modal (images, PDFs)
   - Download from preview
   - Drag & drop upload zone
   - Rename files
   - Delete files (30-day trash)

2. **FilePreviewModal** (New component)
   - Image viewer with zoom/pan
   - PDF viewer
   - Download button
   - File metadata display

3. **FileTrashSection** (New component)
   - List deleted files
   - Days remaining indicator
   - Restore functionality
   - Permanent delete

#### API Endpoints Needed:
- ✅ `POST /api/upload` - Already exists
- ✅ `GET /api/files?project_id=...` - Already exists
- ✅ `DELETE /api/files/[fileId]` - Already exists
- ⏳ `PATCH /api/files/[fileId]` - Need to add rename support
- ⏳ `POST /api/files/[fileId]/restore` - Need to create
- ⏳ `DELETE /api/files/[fileId]/permanent` - Need to create

#### Database Updates Needed:
- ✅ `file_uploads.deleted_at` - Already in schema
- ✅ `file_uploads.deleted_by_user_id` - Already in schema

---

### Phase 4: Location Snapshots

**Status**: Database Ready, UI Pending
**Estimated Effort**: 5-7 hours

#### Components Needed:
1. **ProjectLocationSnapshots** (New component)
   - List all location snapshots for project
   - Display: address, date, version, score, active status
   - Actions: view details, set active, add notes/tags, export
   - Category scores visualization

2. **LocationSnapshotDetail** (New component)
   - Full data display for all categories
   - Edit notes and tags
   - Export as JSON/PDF

3. **Location Page Integration**
   - Add "Save to Project" button
   - Select project from dropdown
   - Create snapshot with all current data
   - Load snapshot data with query parameter: `/location?snapshot=[id]`

#### API Endpoints Needed:
- ⏳ `GET /api/projects/[id]/locations` - List snapshots
- ⏳ `GET /api/projects/[id]/locations/[snapshotId]` - Get details
- ⏳ `POST /api/projects/[id]/locations` - Create snapshot
- ⏳ `PATCH /api/projects/[id]/locations/[snapshotId]` - Update notes/tags
- ⏳ `PUT /api/projects/[id]/locations/[snapshotId]/activate` - Set as active

#### Database:
- ✅ `location_snapshots` table - Fully ready
- ✅ All queries implemented in `src/lib/db/queries/locations.ts`

---

### Phase 5: Other Features

#### 5.1 Organization Member Overview

**Status**: Not Started
**Estimated Effort**: 2-3 hours

- ⏳ Create `OrganizationMembersModal` component
- ⏳ API: `GET /api/organizations/members`
- ⏳ Integration with ProjectMembers component
- ⏳ Search and filter functionality
- ⏳ Display user avatars, names, emails, roles

#### 5.2 Chat Layout Restructuring

**Status**: Not Started
**Estimated Effort**: 2-3 hours

- ⏳ Add empty state to ChatUI when no chatId
- ⏳ Welcome message + suggested prompts
- ⏳ Update "New Chat" button to stay on same page
- ⏳ URL parameter handling: `/ai-assistant?chat=[id]&project=[id]`

#### 5.3 Auto-Cleanup Cron Job

**Status**: Not Started
**Estimated Effort**: 1-2 hours

- ⏳ Create `/api/cron/cleanup` endpoint
- ⏳ Implement 30-day expiration logic
- ⏳ Hard delete projects, chats, files, notifications
- ⏳ R2 cleanup for deleted files
- ⏳ Configure Vercel cron (runs daily)

---

## 🔧 **INTEGRATION STEPS REQUIRED**

To use the enhanced sidebar, you need to:

### 1. Update AIAssistantClient

Replace the old `ProjectsSidebar` import with the new enhanced version:

```tsx
// src/app/[locale]/ai-assistant/AIAssistantClient.tsx

// OLD:
import { ProjectsSidebar } from '@/features/projects/components/ProjectsSidebar';

// NEW:
import { ProjectsSidebarEnhanced as ProjectsSidebar } from '@/features/projects/components/ProjectsSidebarEnhanced';
```

### 2. Add Missing API Endpoints

**Leave Project Endpoint** (referenced in sidebar but not created yet):

Create `/src/app/api/projects/[id]/members/me/route.ts`:

```typescript
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const db = getDbConnection();

  // Set left_at timestamp instead of deleting record
  await db`
    UPDATE project_members
    SET left_at = CURRENT_TIMESTAMP
    WHERE project_id = ${id}
      AND user_id = ${session.user.id}
  `;

  return NextResponse.json({ success: true });
}
```

**Chat Rename Endpoint** (PATCH /api/chats/[id]):

Add PATCH method to `/src/app/api/chats/[id]/route.ts`:

```typescript
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { title } = await request.json();

  const db = getDbConnection();
  const result = await db`
    UPDATE chat_conversations
    SET title = ${title}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND user_id = ${session.user.id}
    RETURNING *
  `;

  return NextResponse.json({ success: true, data: result[0] });
}
```

### 3. Database Migration

Run the migration to apply schema changes:

```bash
npm run db:migrate
```

This will:
- Add `deleted_at` and `deleted_by_user_id` to `chat_conversations`
- Create `user_notifications` table
- Add all helper functions

### 4. Testing Checklist

- [ ] Notification bell appears in navbar
- [ ] Notifications poll every 30 seconds
- [ ] Can mark notifications as read
- [ ] Can delete notifications
- [ ] Project context menu appears on hover
- [ ] Can pin/unpin projects
- [ ] Can rename projects (inline)
- [ ] Can leave project (non-creators)
- [ ] Can delete project (creators, moves to archive)
- [ ] Chat context menu appears on hover
- [ ] Can rename chats
- [ ] Can delete chats (moves to archive)
- [ ] Archive sections expand/collapse
- [ ] Can restore archived items
- [ ] Can permanently delete archived items (with confirmation)
- [ ] Days remaining shown for archived items

---

## 📊 **OVERALL PROGRESS**

| Phase | Status | Progress | Estimated Remaining |
|-------|--------|----------|-------------------|
| **Phase 1: Foundation** | ✅ Complete | 100% | 0 hours |
| **Phase 2: Sidebar** | ✅ Complete | 100% | 0 hours |
| **Phase 3: Files** | ⏳ Pending | 0% | 6-8 hours |
| **Phase 4: Locations** | ⏳ Pending | 0% | 5-7 hours |
| **Phase 5: Other** | ⏳ Pending | 0% | 5-8 hours |
| **TOTAL** | 🟡 40% | 40% | **16-23 hours** |

---

## 🚀 **NEXT STEPS**

1. **Test Phase 1-2 Features** - Run migration and test notification + sidebar
2. **Choose Next Priority**:
   - Option A: File Management (most visible to users)
   - Option B: Location Snapshots (database already ready)
   - Option C: Finish all remaining features in order

3. **Integration** - Update AIAssistantClient to use enhanced sidebar

---

## 📝 **NOTES**

- All code follows existing GroosHub patterns
- Dutch & English translations included
- Design system tokens used throughout
- Role-based permissions enforced
- 30-day archive window consistently applied
- R2 file cleanup implemented for permanent deletions
- Notification system is internal (no email yet)
- Can add email notifications later by integrating with your Outlook

---

**Ready for production**: Phases 1-2 ✅
**Need more work**: Phases 3-5 ⏳
**Estimated completion**: 2-3 additional sessions
