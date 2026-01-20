/**
 * API routes for task notes
 * GET /api/projects/[id]/tasks/[taskId]/notes - Get all notes for a task
 * POST /api/projects/[id]/tasks/[taskId]/notes - Add a note to a task
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/tasks/[taskId]/notes
 * Get all notes for a task
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

    // Get all notes for the task
    const notes = await db`
      SELECT
        tn.*,
        ua.name as user_name,
        ua.email as user_email
      FROM task_notes tn
      JOIN user_accounts ua ON ua.id = tn.user_id
      WHERE tn.task_id = ${taskId}
      ORDER BY tn.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: notes,
    });
  } catch (error) {
    console.error('Error fetching task notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/tasks/[taskId]/notes
 * Add a note to a task
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
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Verify task exists and belongs to project
    const taskResult = await db`
      SELECT id, title FROM tasks
      WHERE id = ${taskId}
        AND project_id = ${projectId}
        AND deleted_at IS NULL
    `;

    if (taskResult.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Create note
    const result = await db`
      INSERT INTO task_notes (
        task_id,
        user_id,
        content
      )
      VALUES (
        ${taskId},
        ${session.user.id},
        ${content.trim()}
      )
      RETURNING *
    `;

    const newNote = result[0];

    // Get user info for complete note object
    const completeNote = await db`
      SELECT
        tn.*,
        ua.name as user_name,
        ua.email as user_email
      FROM task_notes tn
      JOIN user_accounts ua ON ua.id = tn.user_id
      WHERE tn.id = ${newNote.id}
    `;

    // Get task assignees to notify them about the new note
    const assignees = await db`
      SELECT DISTINCT ta.user_id
      FROM task_assignments ta
      WHERE ta.task_id = ${taskId}
        AND ta.user_id != ${session.user.id}
    `;

    // Create notifications for assigned users
    if (assignees.length > 0) {
      const projectResult = await db`
        SELECT name FROM project_projects WHERE id = ${projectId}
      `;
      const projectName = projectResult[0]?.name;

      if (projectName) {
        for (const assignee of assignees) {
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
              ${assignee.user_id},
              'task_note_added',
              'New Comment on Task',
              ${session.user.name + ' commented on task "' + taskResult[0].title + '"'},
              ${projectId},
              ${'/nl/ai-assistant?project=' + projectId},
              'View Task',
              'low',
              ${JSON.stringify({
                task_id: taskId,
                task_title: taskResult[0].title,
                note_preview: content.substring(0, 100),
              })}
            )
          `;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: completeNote[0],
    });
  } catch (error) {
    console.error('Error creating task note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
