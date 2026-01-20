/**
 * API routes for individual task note operations
 * PATCH /api/projects/[id]/tasks/[taskId]/notes/[noteId] - Update a note
 * DELETE /api/projects/[id]/tasks/[taskId]/notes/[noteId] - Delete a note
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * PATCH /api/projects/[id]/tasks/[taskId]/notes/[noteId]
 * Update a note (only by the note's author)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string; noteId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId, noteId } = await context.params;

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

    // Update note (only if user is the author)
    const result = await db`
      UPDATE task_notes
      SET content = ${content.trim()}
      WHERE id = ${noteId}
        AND task_id = ${taskId}
        AND user_id = ${session.user.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Note not found or you do not have permission to edit it' },
        { status: 404 }
      );
    }

    // Get complete note with user info
    const completeNote = await db`
      SELECT
        tn.*,
        ua.name as user_name,
        ua.email as user_email
      FROM task_notes tn
      JOIN user_accounts ua ON ua.id = tn.user_id
      WHERE tn.id = ${noteId}
    `;

    return NextResponse.json({
      success: true,
      data: completeNote[0],
    });
  } catch (error) {
    console.error('Error updating task note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/tasks/[taskId]/notes/[noteId]
 * Delete a note (only by the note's author)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string; noteId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, taskId, noteId } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(projectId, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Delete note (only if user is the author)
    const result = await db`
      DELETE FROM task_notes
      WHERE id = ${noteId}
        AND task_id = ${taskId}
        AND user_id = ${session.user.id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Note not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
