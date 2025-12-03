/**
 * API routes for project members
 * GET /api/projects/[id]/members - List project members
 * POST /api/projects/[id]/members - Add member to project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember, isProjectAdmin, getProjectMembers } from '@/lib/db/queries/projects';
import { getUserById } from '@/lib/db/queries/users';

/**
 * GET /api/projects/[id]/members
 * List all members of a project with their user details
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

    const db = getDbConnection();

    // Get members with user details
    const members = await db`
      SELECT
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.role,
        pm.permissions,
        pm.invited_by_user_id,
        pm.joined_at,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar
      FROM project_members pm
      INNER JOIN user_accounts u ON pm.user_id = u.id
      WHERE pm.project_id = ${id}
      AND pm.left_at IS NULL
      ORDER BY pm.joined_at ASC
    `;

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/members
 * Add a member to the project
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

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to add members to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, role = 'member', permissions } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Validate user exists and is in same organization
    const user = await getUserById(user_id);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.org_id !== session.user.org_id) {
      return NextResponse.json(
        { success: false, error: 'User is not in your organization' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const alreadyMember = await isProjectMember(id, user_id);

    if (alreadyMember) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this project' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Default permissions based on role
    const defaultPermissions = {
      creator: {
        can_edit: true,
        can_delete: true,
        can_manage_members: true,
        can_manage_files: true,
        can_view_analytics: true,
      },
      admin: {
        can_edit: true,
        can_delete: false,
        can_manage_members: true,
        can_manage_files: true,
        can_view_analytics: true,
      },
      member: {
        can_edit: true,
        can_delete: false,
        can_manage_members: false,
        can_manage_files: true,
        can_view_analytics: true,
      },
      viewer: {
        can_edit: false,
        can_delete: false,
        can_manage_members: false,
        can_manage_files: false,
        can_view_analytics: true,
      },
    };

    const finalPermissions = permissions || defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions.member;

    // Add member to project
    const result = await db`
      INSERT INTO project_members (project_id, user_id, role, permissions, invited_by_user_id)
      VALUES (${id}, ${user_id}, ${role}, ${JSON.stringify(finalPermissions)}, ${session.user.id})
      RETURNING id, project_id, user_id, role, permissions, invited_by_user_id, joined_at
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Error adding project member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
