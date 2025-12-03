/**
 * API routes for individual project member operations
 * PATCH /api/projects/[id]/members/[userId] - Update member role/permissions
 * DELETE /api/projects/[id]/members/[userId] - Remove member from project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectAdmin } from '@/lib/db/queries/projects';

/**
 * PATCH /api/projects/[id]/members/[userId]
 * Update member's role or permissions
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await context.params;
    const userIdNum = parseInt(userId);

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to update project members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, permissions } = body;

    const db = getDbConnection();

    // Build update query
    const updates = [];
    const values = [];

    if (role !== undefined) {
      updates.push(`role = $${updates.length + 1}`);
      values.push(role);
    }

    if (permissions !== undefined) {
      updates.push(`permissions = $${updates.length + 1}`);
      values.push(JSON.stringify(permissions));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    values.push(id); // project_id
    values.push(userIdNum); // user_id

    const result = await db(
      `
      UPDATE project_members
      SET ${updates.join(', ')}
      WHERE project_id = $${values.length - 1}
      AND user_id = $${values.length}
      AND left_at IS NULL
      RETURNING id, project_id, user_id, role, permissions, joined_at
    `,
      values
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error updating project member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/members/[userId]
 * Remove member from project
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, userId } = await context.params;
    const userIdNum = parseInt(userId);

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to remove project members' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Check if user is the only creator
    const creators = await db`
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = ${id}
      AND role = 'creator'
      AND left_at IS NULL
    `;

    const memberRole = await db`
      SELECT role
      FROM project_members
      WHERE project_id = ${id}
      AND user_id = ${userIdNum}
      AND left_at IS NULL
    `;

    if (memberRole.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the last creator
    if (memberRole[0].role === 'creator' && parseInt(creators[0].count) === 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last creator. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // Remove member (soft delete by setting left_at)
    await db`
      UPDATE project_members
      SET left_at = CURRENT_TIMESTAMP
      WHERE project_id = ${id}
      AND user_id = ${userIdNum}
    `;

    return NextResponse.json({
      success: true,
      message: 'Member removed from project',
    });
  } catch (error) {
    console.error('Error removing project member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
