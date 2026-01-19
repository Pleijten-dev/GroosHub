/**
 * API routes for individual task operations
 * GET /api/projects/[id]/tasks/[taskId] - Get task details
 * PATCH /api/projects/[id]/tasks/[taskId] - Update task
 * DELETE /api/projects/[id]/tasks/[taskId] - Delete task (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/tasks/[taskId]
 * Get task details with assignments, notes, and metadata
 */
export async function GET(
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

    const db = getDbConnection();

    // Get task with all related data
    const result = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT jsonb_build_object(
          'id', ua.id,
          'name', ua.name,
          'email', ua.email,
          'assigned_at', ta.assigned_at,
          'role', ta.role
        )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
        jsonb_agg(DISTINCT jsonb_build_object(
          'id', tn.id,
          'content', tn.content,
          'user_id', tn.user_id,
          'user_name', tn_user.name,
          'created_at', tn.created_at,
          'updated_at', tn.updated_at,
          'is_edited', tn.is_edited
        )) FILTER (WHERE tn.id IS NOT NULL) as notes,
        tg.name as group_name,
        tg.color as group_color,
        creator.name as created_by_name,
        parent.title as parent_task_title,
        CASE
          WHEN t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done'
          THEN true
          ELSE false
        END as is_overdue,
        CASE
          WHEN t.deadline IS NOT NULL
          THEN EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER
          ELSE NULL
        END as days_until_deadline
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      LEFT JOIN task_notes tn ON tn.task_id = t.id
      LEFT JOIN user_accounts tn_user ON tn_user.id = tn.user_id
      LEFT JOIN task_groups tg ON tg.id = t.task_group_id
      LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
      LEFT JOIN tasks parent ON parent.id = t.parent_task_id
      WHERE t.id = ${taskId}
        AND t.project_id = ${projectId}
        AND t.deleted_at IS NULL
      GROUP BY t.id, tg.name, tg.color, creator.name, parent.title
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get subtasks if this is a parent task
    const subtasks = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT ua.name) FILTER (WHERE ua.name IS NOT NULL) as assigned_users
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      WHERE t.parent_task_id = ${taskId}
        AND t.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.position ASC
    `;

    return NextResponse.json({
      success: true,
      data: {
        ...result[0],
        subtasks,
      },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]/tasks/[taskId]
 * Update task (including status changes for Kanban drag-and-drop)
 */
export async function PATCH(
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
    const {
      title,
      description,
      status,
      position,
      priority,
      deadline,
      start_date,
      estimated_hours,
      actual_hours,
      parent_task_id,
      task_group_id,
      tags,
    } = body;

    const db = getDbConnection();

    // Get current task
    const currentTask = await db`
      SELECT * FROM tasks WHERE id = ${taskId} AND project_id = ${projectId} AND deleted_at IS NULL
    `;

    if (currentTask.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: any = {};

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (deadline !== undefined) updates.deadline = deadline;
    if (start_date !== undefined) updates.start_date = start_date;
    if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updates.actual_hours = actual_hours;
    if (parent_task_id !== undefined) updates.parent_task_id = parent_task_id;
    if (task_group_id !== undefined) updates.task_group_id = task_group_id;
    if (tags !== undefined) updates.tags = tags;

    // Handle status change (Kanban column change)
    if (status !== undefined && status !== currentTask[0].status) {
      updates.status = status;

      // Auto-set completed_by when moving to 'done'
      if (status === 'done') {
        updates.completed_by_user_id = session.user.id;
      }

      // If position not provided, put at end of new column
      if (position === undefined) {
        const positionResult = await db`
          SELECT COALESCE(MAX(position), -1) + 1 as next_position
          FROM tasks
          WHERE project_id = ${projectId}
            AND status = ${status}
            AND deleted_at IS NULL
        `;
        updates.position = positionResult[0].next_position;
      }
    }

    // Handle position change (reordering within column)
    if (position !== undefined) {
      updates.position = position;
    }

    // Check if at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build SET clause parts for tagged template
    const setParts: string[] = [];
    const setValues: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      setParts.push(`${key} = $${setParts.length + 1}`);
      setValues.push(value);
    });

    // Execute update query using neon's query method for dynamic placeholders
    const result = await db.query(
      `UPDATE tasks
       SET ${setParts.join(', ')},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $${setParts.length + 1}
         AND project_id = $${setParts.length + 2}
       RETURNING *`,
      [...setValues, taskId, projectId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Fetch complete updated task
    const completeTask = await db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT jsonb_build_object(
          'id', ua.id,
          'name', ua.name,
          'email', ua.email
        )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
        creator.name as created_by_name
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
      WHERE t.id = ${taskId}
      GROUP BY t.id, creator.name
    `;

    return NextResponse.json({
      success: true,
      data: completeTask[0],
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tasks/[taskId]
 * Soft delete task
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

    const db = getDbConnection();

    // Soft delete the task
    await db`
      UPDATE tasks
      SET deleted_at = CURRENT_TIMESTAMP,
          deleted_by_user_id = ${session.user.id},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
        AND project_id = ${projectId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
