/**
 * API route for viewing deleted files (trash)
 * GET /api/files/trash - Get all deleted files for current user or project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbConnection();
    const userId = Number(session.user.id);

    // Get project_id from query params if provided
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let files;

    if (projectId) {
      // Get deleted files for a specific project
      // Check if user is a member of the project
      const membership = await db`
        SELECT id FROM project_members
        WHERE project_id = ${projectId}
        AND user_id = ${userId}
        AND left_at IS NULL
        LIMIT 1
      `;

      if (membership.length === 0) {
        return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
      }

      files = await db`
        SELECT
          fu.id,
          fu.original_filename as file_name,
          fu.file_category as file_type,
          fu.mime_type,
          fu.file_size_bytes as file_size,
          fu.deleted_at,
          fu.deleted_by_user_id,
          u.name as deleted_by_user_name,
          u2.name as uploaded_by_user_name,
          fu.created_at
        FROM file_uploads fu
        LEFT JOIN user_accounts u ON fu.deleted_by_user_id = u.id
        LEFT JOIN user_accounts u2 ON fu.user_id = u2.id
        WHERE fu.project_id = ${projectId}
        AND fu.deleted_at IS NOT NULL
        AND fu.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY fu.deleted_at DESC
      `;
    } else {
      // Get all deleted files for current user
      files = await db`
        SELECT
          fu.id,
          fu.original_filename as file_name,
          fu.file_category as file_type,
          fu.mime_type,
          fu.file_size_bytes as file_size,
          fu.deleted_at,
          fu.deleted_by_user_id,
          u.name as deleted_by_user_name,
          fu.created_at
        FROM file_uploads fu
        LEFT JOIN user_accounts u ON fu.deleted_by_user_id = u.id
        WHERE fu.user_id = ${userId}
        AND fu.deleted_at IS NOT NULL
        AND fu.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY fu.deleted_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      files
    });

  } catch (error) {
    console.error('Error fetching deleted files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
