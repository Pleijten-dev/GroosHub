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

    if (role === undefined && permissions === undefined) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    let result;

    // Handle different update combinations
    if (role !== undefined && permissions !== undefined) {
      result = await db`
        UPDATE project_members
        SET role = ${role},
            permissions = ${JSON.stringify(permissions)}
        WHERE project_id = ${id}
        AND user_id = ${userIdNum}
        AND left_at IS NULL
        RETURNING id, project_id, user_id, role, permissions, joined_at
      `;
    } else if (role !== undefined) {
      result = await db`
        UPDATE project_members
        SET role = ${role}
        WHERE project_id = ${id}
        AND user_id = ${userIdNum}
        AND left_at IS NULL
        RETURNING id, project_id, user_id, role, permissions, joined_at
      `;
    } else {
      result = await db`
        UPDATE project_members
        SET permissions = ${JSON.stringify(permissions)}
        WHERE project_id = ${id}
        AND user_id = ${userIdNum}
        AND left_at IS NULL
        RETURNING id, project_id, user_id, role, permissions, joined_at
      `;
    }

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
