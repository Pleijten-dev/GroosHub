/**
 * API route for project task statistics
 * GET /api/projects/[id]/tasks/stats - Get statistics for all tasks in a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/tasks/stats
 * Get comprehensive task statistics for a project
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

    // Get overall statistics
    const overallStats = await db`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'todo') as todo_count,
        COUNT(*) FILTER (WHERE status = 'doing') as doing_count,
        COUNT(*) FILTER (WHERE status = 'done') as done_count,
        COUNT(*) FILTER (WHERE deadline IS NOT NULL AND deadline < CURRENT_TIMESTAMP AND status != 'done') as overdue_count,
        COUNT(*) FILTER (WHERE deadline IS NOT NULL) as tasks_with_deadline,
        COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
        COUNT(*) FILTER (WHERE priority = 'high') as high_count,
        COUNT(*) FILTER (WHERE priority = 'normal') as normal_count,
        COUNT(*) FILTER (WHERE priority = 'low') as low_count,
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'done')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
          2
        ) as completion_percentage
      FROM tasks
      WHERE project_id = ${projectId}
        AND deleted_at IS NULL
    `;

    // Get statistics by group
    const groupStats = await db`
      SELECT
        tg.id as group_id,
        tg.name as group_name,
        tg.color as group_color,
        COUNT(t.id) as total_tasks,
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo_count,
        COUNT(*) FILTER (WHERE t.status = 'doing') as doing_count,
        COUNT(*) FILTER (WHERE t.status = 'done') as done_count,
        ROUND(
          (COUNT(*) FILTER (WHERE t.status = 'done')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
          2
        ) as completion_percentage
      FROM task_groups tg
      LEFT JOIN tasks t ON t.task_group_id = tg.id AND t.deleted_at IS NULL
      WHERE tg.project_id = ${projectId}
      GROUP BY tg.id, tg.name, tg.color
      ORDER BY tg.position ASC
    `;

    // Get statistics by user
    const userStats = await db`
      SELECT
        ua.id as user_id,
        ua.name as user_name,
        ua.email as user_email,
        COUNT(t.id) as assigned_tasks,
        COUNT(*) FILTER (WHERE t.status = 'todo') as todo_count,
        COUNT(*) FILTER (WHERE t.status = 'doing') as doing_count,
        COUNT(*) FILTER (WHERE t.status = 'done') as done_count,
        COUNT(*) FILTER (WHERE t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done') as overdue_count,
        ROUND(
          (COUNT(*) FILTER (WHERE t.status = 'done')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
          2
        ) as completion_percentage
      FROM task_assignments ta
      JOIN user_accounts ua ON ua.id = ta.user_id
      JOIN tasks t ON t.id = ta.task_id
      WHERE t.project_id = ${projectId}
        AND t.deleted_at IS NULL
      GROUP BY ua.id, ua.name, ua.email
      ORDER BY ua.name ASC
    `;

    // Get upcoming deadlines
    const upcomingDeadlines = await db`
      SELECT
        t.id,
        t.title,
        t.deadline,
        t.priority,
        t.status,
        EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INTEGER as days_until_deadline,
        ARRAY_AGG(DISTINCT ua.name) FILTER (WHERE ua.name IS NOT NULL) as assigned_users
      FROM tasks t
      LEFT JOIN task_assignments ta ON ta.task_id = t.id
      LEFT JOIN user_accounts ua ON ua.id = ta.user_id
      WHERE t.project_id = ${projectId}
        AND t.deleted_at IS NULL
        AND t.deadline IS NOT NULL
        AND t.status != 'done'
        AND t.deadline BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '14 days'
      GROUP BY t.id, t.title, t.deadline, t.priority, t.status
      ORDER BY t.deadline ASC
      LIMIT 10
    `;

    // Get recent activity
    const recentActivity = await db`
      SELECT
        t.id,
        t.title,
        t.status,
        t.updated_at,
        creator.name as created_by_name,
        CASE
          WHEN t.completed_at IS NOT NULL THEN 'completed'
          WHEN t.created_at = t.updated_at THEN 'created'
          ELSE 'updated'
        END as activity_type
      FROM tasks t
      LEFT JOIN user_accounts creator ON creator.id = t.created_by_user_id
      WHERE t.project_id = ${projectId}
        AND t.deleted_at IS NULL
      ORDER BY t.updated_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      success: true,
      data: {
        overall: overallStats[0],
        byGroup: groupStats,
        byUser: userStats,
        upcomingDeadlines,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
