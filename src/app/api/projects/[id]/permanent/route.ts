/**
 * API routes for permanent project deletion
 * DELETE /api/projects/[id]/permanent - Permanently delete a project (cannot be undone)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { r2Client } from '@/lib/storage/r2-client';

/**
 * DELETE /api/projects/[id]/permanent
 * Permanently delete a project and all associated data
 * Only the project creator can permanently delete
 */
export async function DELETE(
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
      SELECT pp.id, pp.org_id, pp.name, pp.deleted_at, pm.role
      FROM project_projects pp
      JOIN project_members pm ON pm.project_id = pp.id
      WHERE pp.id = ${id}
        AND pm.user_id = ${session.user.id}
    `;

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only creator can permanently delete
    if (project[0].role !== 'creator') {
      return NextResponse.json(
        { error: 'Only the project creator can permanently delete this project' },
        { status: 403 }
      );
    }

    // Must be in deleted state
    if (!project[0].deleted_at) {
      return NextResponse.json(
        { error: 'Project must be deleted first (moved to archive) before permanent deletion' },
        { status: 400 }
      );
    }

    // Get all files associated with this project for R2 cleanup
    const files = await db`
      SELECT file_path, storage_provider
      FROM file_uploads
      WHERE project_id = ${id}
    `;

    // Delete files from R2
    for (const file of files) {
      if (file.storage_provider === 'r2' && file.file_path) {
        try {
          await r2Client.delete(file.file_path);
        } catch (error) {
          console.error(`Failed to delete file from R2: ${file.file_path}`, error);
          // Continue with deletion even if R2 cleanup fails
        }
      }
    }

    // Hard delete project (CASCADE will handle related records)
    await db`
      DELETE FROM project_projects
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Project permanently deleted',
    });
  } catch (error) {
    console.error('Error permanently deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
