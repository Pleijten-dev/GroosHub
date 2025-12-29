/**
 * API route for permanent file deletion
 * DELETE /api/files/[fileId]/permanent - Permanently delete a file (cannot be undone)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { deleteFileFromR2 } from '@/lib/storage/r2-client';

interface RouteContext {
  params: Promise<{
    fileId: string;
  }>;
}

/**
 * DELETE /api/files/[fileId]/permanent
 * Permanently delete a file from both database and R2 storage
 * Only the file owner or project admin can permanently delete
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get fileId from route params
    const { fileId } = await context.params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      );
    }

    // 3. Get file and verify ownership/access
    const sql = neon(process.env.POSTGRES_URL!);

    const files = await sql`
      SELECT
        fu.id,
        fu.file_path as storage_key,
        fu.user_id as file_user_id,
        fu.project_id,
        fu.chat_id,
        fu.deleted_at,
        fu.storage_provider,
        CASE
          WHEN fu.project_id IS NOT NULL THEN (
            SELECT pm.role FROM project_members pm
            WHERE pm.project_id = fu.project_id
            AND pm.user_id = ${userId}
            AND pm.left_at IS NULL
            LIMIT 1
          )
          WHEN fu.chat_id IS NOT NULL THEN (
            SELECT CASE WHEN cc.user_id = ${userId} THEN 'owner' ELSE NULL END
            FROM chat_conversations cc
            WHERE cc.id = fu.chat_id
          )
          ELSE CASE WHEN fu.user_id = ${userId} THEN 'owner' ELSE NULL END
        END as user_role
      FROM file_uploads fu
      WHERE fu.id = ${fileId};
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 4. Verify user has permission to permanently delete
    // Must be file owner, chat owner, or project admin/creator
    const canDelete =
      file.user_role === 'owner' ||
      file.user_role === 'creator' ||
      file.user_role === 'admin' ||
      Number(file.file_user_id) === Number(userId);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to permanently delete this file.' },
        { status: 403 }
      );
    }

    // 5. Verify file is already soft-deleted (must be in trash first)
    if (!file.deleted_at) {
      return NextResponse.json(
        { error: 'File must be deleted first (moved to trash) before permanent deletion' },
        { status: 400 }
      );
    }

    // 6. Delete file from R2 storage
    if (file.storage_provider === 'r2' && file.storage_key) {
      try {
        await deleteFileFromR2(file.storage_key);
        console.log(`[Files API] Deleted file from R2: ${file.storage_key}`);
      } catch (error) {
        console.error(`[Files API] Failed to delete file from R2: ${file.storage_key}`, error);
        // Continue with database deletion even if R2 deletion fails
        // The cleanup job will catch orphaned R2 files later
      }
    }

    // 7. Hard delete file from database
    await sql`
      DELETE FROM file_uploads
      WHERE id = ${fileId};
    `;

    console.log(`[Files API] Permanently deleted file ${fileId} (user: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'File permanently deleted',
    });

  } catch (error) {
    console.error('[Files API Permanent DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to permanently delete file' },
      { status: 500 }
    );
  }
}
