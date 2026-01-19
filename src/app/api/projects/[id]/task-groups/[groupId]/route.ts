/**
 * API routes for individual task group operations
 * GET /api/projects/[id]/task-groups/[groupId] - Get task group details
 * PATCH /api/projects/[id]/task-groups/[groupId] - Update task group
 * DELETE /api/projects/[id]/task-groups/[groupId] - Delete task group
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/task-groups/[groupId]
 * Get task group details with tasks
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, groupId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Get task group
    const groupResult = await db`
      SELECT
        tg.*,
        ua.name as created_by_name,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) as task_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'done') as completed_task_count
      FROM task_groups tg
      LEFT JOIN tasks t ON t.task_group_id = tg.id
      LEFT JOIN user_accounts ua ON ua.id = tg.created_by_user_id
      WHERE tg.id = ${groupId}
        AND tg.project_id = ${projectId}
      GROUP BY tg.id, ua.name
    `;

    if (groupResult.length === 0) {
      return NextResponse.json({ error: 'Task group not found' }, { status: 404 });
    }

    // Get tasks in this group
    const tasks = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT ua.name) FILTER (WHERE ua.name IS NOT NULL) as assigned_users
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      WHERE t.task_group_id = ${groupId}
        AND t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.position ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...groupResult[0],
        tasks,
      },
    });
  } catch (error) {
    console.error('Error fetching task group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/task-groups/[groupId]
 * Update task group
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, groupId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color, position } = body;

    if (!name && !description && !color && position === undefined) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Build update query
    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (position !== undefined) updates.position = position;

    const result = await db`
      UPDATE task_groups
      SET ${db(updates)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${groupId}
        AND project_id = ${projectId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task group not found' }, { status: 404 });
    }

    // Get complete group
    const completeGroup = await db`
      SELECT
        tg.*,
        ua.name as created_by_name,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) as task_count,
        COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL AND t.status = 'done') as completed_task_count
      FROM task_groups tg
      LEFT JOIN tasks t ON t.task_group_id = tg.id
      LEFT JOIN user_accounts ua ON ua.id = tg.created_by_user_id
      WHERE tg.id = ${groupId}
      GROUP BY tg.id, ua.name
    `;

    return NextResponse.json({
      success: true,
      data: completeGroup[0],
    });
  } catch (error) {
    console.error('Error updating task group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/task-groups/[groupId]
 * Delete task group (orphans tasks, doesn't delete them)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, groupId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Orphan tasks (set their task_group_id to NULL)
    await db`
      UPDATE tasks
      SET task_group_id = NULL
      WHERE task_group_id = ${groupId}
    `;

    // Delete group
    await db`
      DELETE FROM task_groups
      WHERE id = ${groupId}
        AND project_id = ${projectId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Task group deleted successfully. Tasks were ungrouped but not deleted.',
    });
  } catch (error) {
    console.error('Error deleting task group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
