/**
 * API routes for individual project operations
 * GET /api/projects/[id] - Get project details
 * PATCH /api/projects/[id] - Update project
 * DELETE /api/projects/[id] - Delete project (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getProjectById,
  isProjectMember,
  isProjectAdmin,
  updateProjectLastAccessed,
  getProjectStats,
} from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]
 * Get project details with stats
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

    const { id } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Get project details
    const project = await getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get project statistics
    const stats = await getProjectStats(id);

    // Update last accessed timestamp
    await updateProjectLastAccessed(id);

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Update project details
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to update this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, project_number, settings, status, is_pinned } = body;

    const db = getDbConnection();

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(name);
    }

    if (description !== undefined) {
      updates.push(`description = $${updates.length + 1}`);
      values.push(description);
    }

    if (project_number !== undefined) {
      updates.push(`project_number = $${updates.length + 1}`);
      values.push(project_number);
    }

    if (settings !== undefined) {
      updates.push(`settings = $${updates.length + 1}`);
      values.push(JSON.stringify(settings));
    }

    if (status !== undefined) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }

    if (is_pinned !== undefined) {
      updates.push(`is_pinned = $${updates.length + 1}`);
      values.push(is_pinned);
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      // Only updated_at would be updated
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id); // Add ID for WHERE clause

    const result = await db(
      `
      UPDATE project_projects
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, org_id, name, description, project_number, settings, metadata, status, is_template, is_pinned, created_at, updated_at, last_accessed_at
    `,
      values
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Soft delete project
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

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Soft delete the project
    await db`
      UPDATE project_projects
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully. Can be restored within 30 days.',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
