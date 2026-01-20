/**
 * API routes for project tasks
 * GET /api/projects/[id]/tasks - List all tasks for a project (with filters)
 * POST /api/projects/[id]/tasks - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/tasks
 * Get all tasks for a project with optional filtering
 * Query params:
 * - status: 'todo' | 'doing' | 'done'
 * - assignedTo: user_id (filter by assigned user)
 * - groupId: task_group_id (filter by task group)
 * - sortBy: 'created' | 'deadline' | 'priority' | 'position'
 * - sortOrder: 'asc' | 'desc'
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
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const groupId = searchParams.get('groupId');
    const sortBy = searchParams.get('sortBy') || 'position';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query with filters
    let query = db`
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT jsonb_build_object(
          'id', ua.id,
          'name', ua.name,
          'email', ua.email
        )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
        COUNT(DISTINCT tn.id) as note_count,
        tg.name as group_name,
        tg.color as group_color,
        creator.name as created_by_name,
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
      LEFT JOIN task_groups tg ON tg.id = t.task_group_id
      LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
      WHERE t.project_id = ${projectId}
        AND t.deleted_at IS NULL
    `;

    // Apply filters
    const filters = [];

    if (status) {
      filters.push(db`AND t.status = ${status}`);
    }

    if (groupId) {
      filters.push(db`AND t.task_group_id = ${groupId}`);
    }

    // Build final query
    const finalQuery = db`
      ${query}
      ${assignedTo ? db`AND ta.user_id = ${parseInt(assignedTo)}` : db``}
      GROUP BY t.id, tg.name, tg.color, creator.name
      ORDER BY
        ${sortBy === 'deadline' ? db`t.deadline ${sortOrder === 'asc' ? db`ASC` : db`DESC`} NULLS LAST` :
          sortBy === 'priority' ? db`
            CASE t.priority
              WHEN 'urgent' THEN 1
              WHEN 'high' THEN 2
              WHEN 'normal' THEN 3
              WHEN 'low' THEN 4
            END ${sortOrder === 'asc' ? db`ASC` : db`DESC`}
          ` :
          sortBy === 'created' ? db`t.created_at ${sortOrder === 'asc' ? db`ASC` : db`DESC`}` :
          db`t.position ASC`}
    `;

    const tasks = await finalQuery;

    return NextResponse.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/tasks
 * Create a new task
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
    const {
      title,
      description,
      status = 'todo',
      priority = 'normal',
      deadline,
      start_date,
      estimated_hours,
      parent_task_id,
      task_group_id,
      tags,
      assigned_user_ids,
    } = body;

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Get the highest position for the status column
    const positionResult = await db`
      SELECT COALESCE(MAX(position), -1) + 1 as next_position
      FROM tasks
      WHERE project_id = ${projectId}
        AND status = ${status}
        AND deleted_at IS NULL
    `;
    const position = positionResult[0].next_position;

    // Create task
    const result = await db`
      INSERT INTO tasks (
        project_id,
        title,
        description,
        status,
        position,
        priority,
        deadline,
        start_date,
        estimated_hours,
        parent_task_id,
        task_group_id,
        tags,
        created_by_user_id
      )
      VALUES (
        ${projectId},
        ${title.trim()},
        ${description || null},
        ${status},
        ${position},
        ${priority},
        ${deadline || null},
        ${start_date || null},
        ${estimated_hours || null},
        ${parent_task_id || null},
        ${task_group_id || null},
        ${tags || []},
        ${session.user.id}
      )
      RETURNING *
    `;

    const newTask = result[0];

    // Assign users if provided
    if (assigned_user_ids && Array.isArray(assigned_user_ids) && assigned_user_ids.length > 0) {
      for (const userId of assigned_user_ids) {
        // Verify user is a member of the project
        const isUserMember = await isProjectMember(projectId, userId);

        if (isUserMember) {
          await db`
            INSERT INTO task_assignments (task_id, user_id, assigned_by_user_id)
            VALUES (${newTask.id}, ${userId}, ${session.user.id})
            ON CONFLICT (task_id, user_id) DO NOTHING
          `;

          // Create notification for assigned user (if not self-assigning)
          if (userId !== session.user.id && deadline) {
            const projectResult = await db`
              SELECT name FROM project_projects WHERE id = ${projectId}
            `;

            if (projectResult.length > 0) {
              const projectName = projectResult[0].name;

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
                  ${'You have been assigned to task "' + title + '" in project "' + projectName + '"'},
                  ${projectId},
                  ${'/nl/ai-assistant?project=' + projectId},
                  'View Task',
                  'normal',
                  ${JSON.stringify({
                    task_id: newTask.id,
                    task_title: title,
                    deadline: deadline,
                  })}
                )
              `;
            }
          }
        }
      }
    }

    // Fetch complete task with assignments
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
      WHERE t.id = ${newTask.id}
      GROUP BY t.id, creator.name
    `;

    return NextResponse.json({
      success: true,
      data: completeTask[0],
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
