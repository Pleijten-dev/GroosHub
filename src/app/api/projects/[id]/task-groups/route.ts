/**
 * API routes for task groups
 * GET /api/projects/[id]/task-groups - List all task groups for a project
 * POST /api/projects/[id]/task-groups - Create a new task group
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/task-groups
 * Get all task groups for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Get all task groups with task counts
    const groups = await db`
      SELECT
        tg.*,
        ua.name as created_by_name,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) as task_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'done') as completed_task_count
      FROM task_groups tg
      LEFT JOIN tasks t ON t.task_group_id = tg.id
      LEFT JOIN user_accounts ua ON ua.id = tg.created_by_user_id
      WHERE tg.project_id = ${projectId}
      GROUP BY tg.id, ua.name
      ORDER BY tg.position ASC, tg.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('Error fetching task groups:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/task-groups
 * Create a new task group
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Get the highest position
    const positionResult = await db`
      SELECT COALESCE(MAX(position), -1) + 1 as next_position
      FROM task_groups
      WHERE project_id = ${projectId}
    `;
    const position = positionResult[0].next_position;

    // Create task group
    const result = await db`
      INSERT INTO task_groups (
        project_id,
        name,
        description,
        color,
        position,
        created_by_user_id
      )
      VALUES (
        ${projectId},
        ${name.trim()},
        ${description || null},
        ${color || null},
        ${position},
        ${session.user.id}
      )
      RETURNING *
    `;

    const newGroup = result[0];

    // Get complete group with creator info
    const completeGroup = await db`
      SELECT
        tg.*,
        ua.name as created_by_name,
        0 as task_count,
        0 as completed_task_count
      FROM task_groups tg
      LEFT JOIN user_accounts ua ON ua.id = tg.created_by_user_id
      WHERE tg.id = ${newGroup.id}
    `;

    return NextResponse.json({
      success: true,
      data: completeGroup[0],
    });
  } catch (error) {
    console.error('Error creating task group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
