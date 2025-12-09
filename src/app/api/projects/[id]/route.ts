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

    // Get user's role and permissions for this project
    const db = getDbConnection();
    const memberInfo = await db`
      SELECT role, permissions
      FROM project_members
      WHERE project_id = ${id}
      AND user_id = ${session.user.id}
      AND left_at IS NULL
    `;

    if (memberInfo.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const { role, permissions } = memberInfo[0];

    // Get project statistics
    const stats = await getProjectStats(id);

    // Update last accessed timestamp
    await updateProjectLastAccessed(id);

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        is_pinned: Boolean(project.settings?.is_pinned),
        user_role: role,
        permissions: permissions,
        member_count: stats.member_count,
        file_count: stats.file_count,
        chat_count: stats.chat_count,
        location_count: stats.location_snapshot_count,
        lca_count: stats.lca_snapshot_count,
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

    // Check if at least one field is provided
    if (
      name === undefined &&
      description === undefined &&
      project_number === undefined &&
      settings === undefined &&
      status === undefined &&
      is_pinned === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Get current project to preserve non-updated fields
    const currentProject = await getProjectById(id);

    if (!currentProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Handle is_pinned - update it in the member record
    if (is_pinned !== undefined) {
      await db`
        UPDATE project_members
        SET is_pinned = ${is_pinned}
        WHERE project_id = ${id}
          AND user_id = ${session.user.id}
      `;
    }

    // Use provided values or keep current values
    const updatedName = name !== undefined ? name : currentProject.name;
    const updatedDescription =
      description !== undefined ? description : currentProject.description;
    const updatedProjectNumber =
      project_number !== undefined ? project_number : currentProject.project_number;
    const updatedSettings =
      settings !== undefined ? JSON.stringify(settings) : JSON.stringify(currentProject.settings);
    const updatedStatus = status !== undefined ? status : currentProject.status;

    const result = await db`
      UPDATE project_projects
      SET name = ${updatedName},
          description = ${updatedDescription},
          project_number = ${updatedProjectNumber},
          settings = ${updatedSettings},
          status = ${updatedStatus},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, org_id, name, description, project_number, settings, metadata, status, is_template, created_at, updated_at, last_accessed_at
    `;

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
          deleted_by_user_id = ${session.user.id},
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
