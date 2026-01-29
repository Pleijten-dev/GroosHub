/**
 * Project Notes API
 *
 * CRUD operations for project notes stored in the database.
 * Replaces the previous localStorage-based storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { z } from 'zod';

// Validation schemas
const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  is_pinned: z.boolean().optional().default(false),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  is_pinned: z.boolean().optional(),
});

/**
 * GET /api/projects/[projectId]/notes
 * List all notes for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const db = getDbConnection();

    // Verify project access
    const projectAccess = await db`
      SELECT p.id
      FROM project_projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = ${projectId}
        AND pm.user_id = ${userId}
        AND pm.left_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `;

    if (projectAccess.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch notes (pinned first, then by creation date)
    const notes = await db`
      SELECT
        pn.id,
        pn.content,
        pn.is_pinned,
        pn.created_at,
        pn.updated_at,
        ua.id as user_id,
        ua.name as user_name
      FROM project_notes pn
      JOIN user_accounts ua ON ua.id = pn.user_id
      WHERE pn.project_id = ${projectId}
        AND pn.deleted_at IS NULL
      ORDER BY pn.is_pinned DESC, pn.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      success: true,
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        isPinned: n.is_pinned,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        user: {
          id: n.user_id,
          name: n.user_name,
        },
      })),
    });
  } catch (error) {
    console.error('[Project Notes API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[projectId]/notes
 * Create a new note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const db = getDbConnection();

    // Verify project access
    const projectAccess = await db`
      SELECT p.id
      FROM project_projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.id = ${projectId}
        AND pm.user_id = ${userId}
        AND pm.left_at IS NULL
        AND p.deleted_at IS NULL
      LIMIT 1
    `;

    if (projectAccess.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { content, is_pinned } = validation.data;

    // Create the note
    const result = await db`
      INSERT INTO project_notes (project_id, user_id, content, is_pinned)
      VALUES (${projectId}, ${userId}, ${content}, ${is_pinned})
      RETURNING id, content, is_pinned, created_at, updated_at
    `;

    const note = result[0];

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        content: note.content,
        isPinned: note.is_pinned,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        user: {
          id: userId,
          name: session.user.name,
        },
      },
    });
  } catch (error) {
    console.error('[Project Notes API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[projectId]/notes
 * Update a note (expects noteId in body)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const db = getDbConnection();

    // Parse request body
    const body = await request.json();
    const { noteId, ...updateData } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const validation = updateNoteSchema.safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify note ownership and project access
    const noteAccess = await db`
      SELECT pn.id
      FROM project_notes pn
      JOIN project_projects p ON p.id = pn.project_id
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pn.id = ${noteId}
        AND pn.project_id = ${projectId}
        AND pn.user_id = ${userId}
        AND pm.user_id = ${userId}
        AND pm.left_at IS NULL
        AND pn.deleted_at IS NULL
      LIMIT 1
    `;

    if (noteAccess.length === 0) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Build update query
    const { content, is_pinned } = validation.data;
    const updates: string[] = [];
    const values: Record<string, unknown> = {};

    if (content !== undefined) {
      values.content = content;
    }
    if (is_pinned !== undefined) {
      values.is_pinned = is_pinned;
    }

    if (Object.keys(values).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update the note
    const result = await db`
      UPDATE project_notes
      SET
        ${content !== undefined ? db`content = ${content},` : db``}
        ${is_pinned !== undefined ? db`is_pinned = ${is_pinned},` : db``}
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${noteId}
      RETURNING id, content, is_pinned, created_at, updated_at
    `;

    const note = result[0];

    return NextResponse.json({
      success: true,
      note: {
        id: note.id,
        content: note.content,
        isPinned: note.is_pinned,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      },
    });
  } catch (error) {
    console.error('[Project Notes API] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[projectId]/notes
 * Soft delete a note (expects noteId in body)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const db = getDbConnection();

    // Parse request body
    const body = await request.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Verify note ownership and project access
    const noteAccess = await db`
      SELECT pn.id
      FROM project_notes pn
      JOIN project_projects p ON p.id = pn.project_id
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pn.id = ${noteId}
        AND pn.project_id = ${projectId}
        AND pn.user_id = ${userId}
        AND pm.user_id = ${userId}
        AND pm.left_at IS NULL
        AND pn.deleted_at IS NULL
      LIMIT 1
    `;

    if (noteAccess.length === 0) {
      return NextResponse.json(
        { error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete the note
    await db`
      UPDATE project_notes
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${noteId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Note deleted',
    });
  } catch (error) {
    console.error('[Project Notes API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}
