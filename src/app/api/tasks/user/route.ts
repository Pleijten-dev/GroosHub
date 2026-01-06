/**
 * API route for user tasks across all projects
 * GET /api/tasks/user - Get all tasks assigned to the current user across all projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/tasks/user
 * Get all tasks assigned to the current user across all projects
 * Query params:
 * - status: 'todo' | 'doing' | 'done' (filter by status)
 * - withDeadline: 'true' | 'false' (only tasks with deadlines)
 * - upcoming: number (tasks due in next N days)
 * - overdue: 'true' | 'false' (only overdue tasks)
 * - sortBy: 'deadline' | 'created' | 'priority'
 * - sortOrder: 'asc' | 'desc'
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbConnection();
    const { searchParams } = new URL(request.url);

    const statusFilter = searchParams.get('status') as 'todo' | 'doing' | 'done' | null;
    const withDeadline = searchParams.get('withDeadline') === 'true';
    const upcoming = searchParams.get('upcoming');
    const overdue = searchParams.get('overdue') === 'true';
    const sortBy = searchParams.get('sortBy') || 'deadline';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Validate sortOrder to prevent SQL injection
    const validSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Build query based on filters using conditional logic
    let tasksQuery;

    if (overdue) {
      // Overdue tasks only
      tasksQuery = db`
        SELECT
          t.*,
          pp.id as project_id,
          pp.name as project_name,
          tg.name as group_name,
          tg.color as group_color,
          creator.name as created_by_name,
          ARRAY_AGG(DISTINCT jsonb_build_object(
            'id', ua.id,
            'name', ua.name,
            'email', ua.email
          )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
          COUNT(DISTINCT tn.id) as note_count,
          true as is_overdue,
          EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER as days_until_deadline
        FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN project_projects pp ON pp.id = t.project_id
        LEFT JOIN task_groups tg ON tg.id = t.task_group_id
        LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
        LEFT JOIN task_assignments ta2 ON ta2.task_id = t.id
        LEFT JOIN user_accounts ua ON ua.id = ta2.user_id
        LEFT JOIN task_notes tn ON tn.task_id = t.id
        WHERE ta.user_id = ${session.user.id}
          AND t.deleted_at IS NULL
          AND pp.deleted_at IS NULL
          AND t.deadline < CURRENT_TIMESTAMP
          AND t.status != 'done'
          ${statusFilter ? db`AND t.status = ${statusFilter}` : db``}
        GROUP BY t.id, pp.id, pp.name, tg.name, tg.color, creator.name
        ORDER BY t.deadline ASC
      `;
    } else if (upcoming) {
      // Upcoming tasks (due in next N days)
      const days = parseInt(upcoming);
      tasksQuery = db`
        SELECT
          t.*,
          pp.id as project_id,
          pp.name as project_name,
          tg.name as group_name,
          tg.color as group_color,
          creator.name as created_by_name,
          ARRAY_AGG(DISTINCT jsonb_build_object(
            'id', ua.id,
            'name', ua.name,
            'email', ua.email
          )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
          COUNT(DISTINCT tn.id) as note_count,
          CASE
            WHEN t.deadline < CURRENT_TIMESTAMP THEN true
            ELSE false
          END as is_overdue,
          EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER as days_until_deadline
        FROM tasks t
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN project_projects pp ON pp.id = t.project_id
        LEFT JOIN task_groups tg ON tg.id = t.task_group_id
        LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
        LEFT JOIN task_assignments ta2 ON ta2.task_id = t.id
        LEFT JOIN user_accounts ua ON ua.id = ta2.user_id
        LEFT JOIN task_notes tn ON tn.task_id = t.id
        WHERE ta.user_id = ${session.user.id}
          AND t.deleted_at IS NULL
          AND pp.deleted_at IS NULL
          AND t.deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + (${days} || ' days')::INTERVAL
          AND t.status != 'done'
          ${statusFilter ? db`AND t.status = ${statusFilter}` : db``}
        GROUP BY t.id, pp.id, pp.name, tg.name, tg.color, creator.name
        ORDER BY t.deadline ASC
      `;
    } else {
      // All tasks (with optional filters)
      tasksQuery = db`
        SELECT
          t.*,
          pp.id as project_id,
          pp.name as project_name,
          tg.name as group_name,
          tg.color as group_color,
          creator.name as created_by_name,
          ARRAY_AGG(DISTINCT jsonb_build_object(
            'id', ua.id,
            'name', ua.name,
            'email', ua.email
          )) FILTER (WHERE ua.id IS NOT NULL) as assigned_users,
          COUNT(DISTINCT tn.id) as note_count,
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
        JOIN task_assignments ta ON ta.task_id = t.id
        JOIN project_projects pp ON pp.id = t.project_id
        LEFT JOIN task_groups tg ON tg.id = t.task_group_id
        LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
        LEFT JOIN task_assignments ta2 ON ta2.task_id = t.id
        LEFT JOIN user_accounts ua ON ua.id = ta2.user_id
        LEFT JOIN task_notes tn ON tn.task_id = t.id
        WHERE ta.user_id = ${session.user.id}
          AND t.deleted_at IS NULL
          AND pp.deleted_at IS NULL
          ${statusFilter ? db`AND t.status = ${statusFilter}` : db``}
          ${withDeadline ? db`AND t.deadline IS NOT NULL` : db``}
        GROUP BY t.id, pp.id, pp.name, tg.name, tg.color, creator.name
        ORDER BY
          ${sortBy === 'deadline' ? db`t.deadline ${db.unsafe(validSortOrder)} NULLS LAST` :
            sortBy === 'priority' ? db`
              CASE t.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
              END ${db.unsafe(validSortOrder)}
            ` :
            db`t.created_at ${db.unsafe(validSortOrder)}`}
      `;
    }

    const tasks = await tasksQuery;

    // Get summary statistics
    const stats = await db`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo_count,
        COUNT(*) FILTER (WHERE t.status = 'doing') as doing_count,
        COUNT(*) FILTER (WHERE t.status = 'done') as done_count,
        COUNT(*) FILTER (WHERE t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done') as overdue_count,
        COUNT(*) FILTER (WHERE t.deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '7 days' AND t.status != 'done') as due_this_week,
        COUNT(*) FILTER (WHERE t.priority = 'urgent') as urgent_count
      FROM tasks t
      JOIN task_assignments ta ON ta.task_id = t.id
      JOIN project_projects pp ON pp.id = t.project_id
      WHERE ta.user_id = ${session.user.id}
        AND t.deleted_at IS NULL
        AND pp.deleted_at IS NULL
    `;

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        stats: stats[0],
      },
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
