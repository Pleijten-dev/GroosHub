/**
 * API route for restoring deleted files
 * PATCH /api/files/[fileId]/restore - Restore a deleted file
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const db = getDbConnection();
    const userId = Number(session.user.id);

    // Get file details and check access
    const files = await db`
      SELECT
        fu.id,
        fu.user_id,
        fu.project_id,
        fu.chat_id,
        fu.deleted_at,
        CASE
          WHEN fu.project_id IS NOT NULL THEN (
            SELECT COUNT(*) FROM project_members pm
            WHERE pm.project_id = fu.project_id
            AND pm.user_id = ${userId}
            AND pm.left_at IS NULL
          )
          WHEN fu.chat_id IS NOT NULL THEN (
            SELECT CASE WHEN cc.user_id = ${userId} THEN 1 ELSE 0 END
            FROM chat_conversations cc
            WHERE cc.id = fu.chat_id
          )
          ELSE CASE WHEN fu.user_id = ${userId} THEN 1 ELSE 0 END
        END as has_access
      FROM file_uploads fu
      WHERE fu.id = ${fileId}
    `;

    if (files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = files[0];

    if (!file.has_access || file.has_access === 0) {
      return NextResponse.json({ error: 'No access to this file' }, { status: 403 });
    }

    if (!file.deleted_at) {
      return NextResponse.json({ error: 'File is not deleted' }, { status: 400 });
    }

    // Check if file was deleted more than 30 days ago
    const deletedDate = new Date(file.deleted_at);
    const now = new Date();
    const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceDeleted > 30) {
      return NextResponse.json(
        { error: 'File was deleted more than 30 days ago and cannot be restored' },
        { status: 400 }
      );
    }

    // Restore file (set deleted_at and deleted_by_user_id to null)
    await db`
      UPDATE file_uploads
      SET deleted_at = NULL,
          deleted_by_user_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${fileId}
    `;

    return NextResponse.json({
      success: true,
      message: 'File restored successfully'
    });

  } catch (error) {
    console.error('Error restoring file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
