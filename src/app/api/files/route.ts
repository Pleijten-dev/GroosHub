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
          cf.id,
          cf.file_name,
          cf.file_type,
          cf.mime_type,
          cf.file_size,
          cf.storage_url,
          cf.is_indexed,
          cf.chunk_count,
          cf.created_at,
          cf.chat_id,
          u.name as user_name
        FROM chat_files cf
        LEFT JOIN user_accounts u ON cf.uploaded_by_user_id = u.id
        WHERE cf.project_id = ${projectId}
        ORDER BY cf.created_at DESC
      `;
    } else {
      // Get all files for user (across all their projects)
      files = await db`
        SELECT
          cf.id,
          cf.file_name,
          cf.file_type,
          cf.mime_type,
          cf.file_size,
          cf.storage_url,
          cf.is_indexed,
          cf.chunk_count,
          cf.created_at,
          cf.chat_id,
          cf.project_id,
          u.name as user_name
        FROM chat_files cf
        LEFT JOIN user_accounts u ON cf.uploaded_by_user_id = u.id
        WHERE cf.uploaded_by_user_id = ${session.user.id}
        ORDER BY cf.created_at DESC
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
