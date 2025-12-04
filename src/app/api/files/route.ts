/**
 * Files API Route
 * GET /api/files - List files (optionally filtered by project_id)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDbConnection();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let files;

    if (projectId) {
      // Get files for specific project
      files = await db`
        SELECT
          f.id,
          f.filename as file_name,
          f.file_category as file_type,
          f.mime_type,
          f.file_size_bytes as file_size,
          f.storage_url,
          f.processing_status,
          f.created_at,
          f.chat_id,
          u.name as user_name
        FROM file_uploads f
        LEFT JOIN user_accounts u ON f.user_id = u.id
        WHERE f.project_id = ${projectId}
        AND f.deleted_at IS NULL
        ORDER BY f.created_at DESC
      `;
    } else {
      // Get all files for user (across all their projects)
      files = await db`
        SELECT
          f.id,
          f.filename as file_name,
          f.file_category as file_type,
          f.mime_type,
          f.file_size_bytes as file_size,
          f.storage_url,
          f.processing_status,
          f.created_at,
          f.chat_id,
          f.project_id,
          u.name as user_name
        FROM file_uploads f
        LEFT JOIN user_accounts u ON f.user_id = u.id
        WHERE f.user_id = ${session.user.id}
        AND f.deleted_at IS NULL
        ORDER BY f.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      files
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
