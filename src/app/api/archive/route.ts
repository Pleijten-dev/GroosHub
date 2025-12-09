/**
 * API routes for archive (soft-deleted items)
 * GET /api/archive - List archived projects and chats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

interface ArchivedProject {
  id: string;
  name: string;
  description: string | null;
  deleted_at: Date;
  deleted_by_user_id: number | null;
  role: string;
  days_until_permanent_delete: number;
  chat_count: number;
  file_count: number;
}

interface ArchivedChat {
  id: string;
  title: string | null;
  project_id: string | null;
  deleted_at: Date;
  deleted_by_user_id: number | null;
  days_until_permanent_delete: number;
  message_count: number;
  project_name: string | null;
}

/**
 * GET /api/archive
 * List archived (soft-deleted) projects and chats for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'projects', 'chats', or null for both

    const db = getDbConnection();

    let projects: ArchivedProject[] = [];
    let chats: ArchivedChat[] = [];

    // Get archived projects
    if (!type || type === 'projects') {
      projects = await db`
        SELECT
          pp.id,
          pp.name,
          pp.description,
          pp.deleted_at,
          pp.deleted_by_user_id,
          pm.role,
          (30 - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - pp.deleted_at))::INTEGER) as days_until_permanent_delete,
          (
            SELECT COUNT(*)
            FROM chat_conversations
            WHERE project_id = pp.id
          ) as chat_count,
          (
            SELECT COUNT(*)
            FROM file_uploads
            WHERE project_id = pp.id
          ) as file_count
        FROM project_projects pp
        JOIN project_members pm ON pm.project_id = pp.id
        WHERE pm.user_id = ${session.user.id}
          AND pp.deleted_at IS NOT NULL
          AND pp.deleted_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        ORDER BY pp.deleted_at DESC
      ` as ArchivedProject[];
    }

    // Get archived chats
    if (!type || type === 'chats') {
      chats = await db`
        SELECT
          cc.id,
          cc.title,
          cc.project_id,
          cc.deleted_at,
          cc.deleted_by_user_id,
          (30 - EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cc.deleted_at))::INTEGER) as days_until_permanent_delete,
          (
            SELECT COUNT(*)
            FROM chat_messages
            WHERE chat_id = cc.id
          ) as message_count,
          pp.name as project_name
        FROM chat_conversations cc
        LEFT JOIN project_projects pp ON pp.id = cc.project_id
        WHERE cc.user_id = ${session.user.id}
          AND cc.deleted_at IS NOT NULL
          AND cc.deleted_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        ORDER BY cc.deleted_at DESC
      ` as ArchivedChat[];
    }

    return NextResponse.json({
      success: true,
      data: {
        projects,
        chats,
      },
    });
  } catch (error) {
    console.error('Error fetching archived items:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
