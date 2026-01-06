/**
 * API routes for task assignments
 * POST /api/projects/[id]/tasks/[taskId]/assign - Assign users to task
 * DELETE /api/projects/[id]/tasks/[taskId]/assign - Unassign user from task
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * POST /api/projects/[id]/tasks/[taskId]/assign
 * Assign one or more users to a task
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_ids, role } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'user_ids array is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Verify task exists and belongs to project
    const taskResult = await db`
      SELECT id, title, deadline FROM tasks
      WHERE id = ${taskId}
        AND project_id = ${projectId}
        AND deleted_at IS NULL
    `;

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskResult[0];

    // Get project name for notifications
    const projectResult = await db`
      SELECT name FROM project_projects WHERE id = ${projectId}
    `;
    const projectName = projectResult[0]?.name;

    const assignedUsers = [];

    for (const userId of user_ids) {
      // Verify user is a member of the project
      const isUserMember = await isProjectMember(projectId, userId);

      if (!isUserMember) {
        continue; // Skip non-members
      }

      // Assign user to task
      const result = await db`
        INSERT INTO task_assignments (
          task_id,
          user_id,
          assigned_by_user_id,
          role
        )
        VALUES (
          ${taskId},
          ${userId},
          ${session.user.id},
          ${role || null}
        )
        ON CONFLICT (task_id, user_id)
        DO UPDATE SET
          assigned_by_user_id = ${session.user.id},
          assigned_at = CURRENT_TIMESTAMP,
          role = ${role || null}
        RETURNING *
      `;

      assignedUsers.push(result[0]);

      // Create notification for assigned user (if not self-assigning)
      if (userId !== session.user.id && projectName) {
        await db`
          INSERT INTO user_notifications (
            user_id,
            type,
            title,
            message,
            project_id,
            action_url,
            action_label,
            priority,
            metadata
          )
          VALUES (
            ${userId},
            'task_assigned',
            'New Task Assigned',
            ${'You have been assigned to task "' + task.title + '" in project "' + projectName + '"'},
            ${projectId},
            ${'/nl/ai-assistant?project=' + projectId},
            'View Task',
            'normal',
            ${JSON.stringify({
              task_id: taskId,
              task_title: task.title,
              deadline: task.deadline,
            })}
          )
        `;
      }
    }

    // Fetch updated task with assignments
    const updatedTask = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT jsonb_build_object(
          'id', ua.id,
          'name', ua.name,
          'email', ua.email,
          'role', ta.role,
          'assigned_at', ta.assigned_at
        )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      WHERE t.id = ${taskId}
      GROUP BY t.id
    `;

    return NextResponse.json({
      success: true,
      data: updatedTask[0],
      message: `${assignedUsers.length} user(s) assigned to task`,
    });
  } catch (error) {
    console.error('Error assigning users to task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tasks/[taskId]/assign
 * Unassign a user from a task
 * Body: { user_id: number }
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Verify task exists and belongs to project
    const taskResult = await db`
      SELECT id FROM tasks
      WHERE id = ${taskId}
        AND project_id = ${projectId}
        AND deleted_at IS NULL
    `;

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Remove assignment
    await db`
      DELETE FROM task_assignments
      WHERE task_id = ${taskId}
        AND user_id = ${user_id}
    `;

    // Fetch updated task with assignments
    const updatedTask = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT jsonb_build_object(
          'id', ua.id,
          'name', ua.name,
          'email', ua.email,
          'role', ta.role
        )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      WHERE t.id = ${taskId}
      GROUP BY t.id
    `;

    return NextResponse.json({
      success: true,
      data: updatedTask[0],
      message: 'User unassigned from task',
    });
  } catch (error) {
    console.error('Error unassigning user from task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
