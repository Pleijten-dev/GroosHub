/**
 * API routes for project restoration
 * POST /api/projects/[id]/restore - Restore a soft-deleted project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectAdmin } from '@/lib/db/queries/projects';

/**
 * POST /api/projects/[id]/restore
 * Restore a soft-deleted project (within 30-day window)
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

    const { id } = await context.params;
    const db = getDbConnection();

    // Check if project exists and is deleted
    const project = await db`
      SELECT id, org_id, name, deleted_at
      FROM project_projects
      WHERE id = ${id}
    `;

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project[0].deleted_at) {
      return NextResponse.json(
        { error: 'Project is not deleted' },
        { status: 400 }
      );
    }

    // Check if project is in user's organization (org-level access)
    if (project[0].org_id !== session.user.org_id && session.user.role !== 'owner') {
      return NextResponse.json(
        { error: 'You do not have permission to restore this project' },
        { status: 403 }
      );
    }

    // Check if user is admin/creator of the project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin && session.user.role !== 'owner' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to restore this project' },
        { status: 403 }
      );
    }

    // Check if deletion was within 30-day recovery window
    const deletedDate = new Date(project[0].deleted_at);
    const now = new Date();
    const daysSinceDeletion = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceDeletion > 30) {
      return NextResponse.json(
        { error: 'Project recovery window has expired (30 days max)' },
        { status: 400 }
      );
    }

    // Restore project by clearing deleted_at
    const result = await db`
      UPDATE project_projects
      SET deleted_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, org_id, name, description, project_number, settings, metadata, status, is_template, created_at, updated_at, last_accessed_at
    `;

    return NextResponse.json({
      success: true,
      message: 'Project restored successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('Error restoring project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
