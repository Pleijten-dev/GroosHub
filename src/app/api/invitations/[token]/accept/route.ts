/**
 * API route for accepting project invitations
 * POST /api/invitations/[token]/accept - Accept invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/invitations/[token]/accept
 * Accept a project invitation
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await context.params;
    const db = getDbConnection();

    // Find invitation by token
    const invitation = await db`
      SELECT
        inv.*,
        p.name as project_name,
        p.org_id as project_org_id
      FROM project_invitations inv
      JOIN project_projects p ON inv.project_id = p.id
      WHERE inv.token_hash = ${token}
      AND inv.status = 'pending'
      AND inv.expires_at > NOW()
    `;

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found or has expired' },
        { status: 404 }
      );
    }

    const inv = invitation[0];

    // Verify user email matches invitation
    if (inv.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation was not sent to your email address' },
        { status: 403 }
      );
    }

    // Verify user is in same organization as project
    if (inv.project_org_id !== session.user.org_id) {
      return NextResponse.json(
        { error: 'You must be in the same organization as the project' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMember = await db`
      SELECT id FROM project_members
      WHERE project_id = ${inv.project_id}
      AND user_id = ${session.user.id}
      AND left_at IS NULL
    `;

    if (existingMember.length > 0) {
      // Already a member - mark invitation as accepted anyway
      await db`
        UPDATE project_invitations
        SET status = 'accepted',
            responded_at = NOW()
        WHERE id = ${inv.id}
      `;

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this project',
      });
    }

    // Default permissions based on role
    const permissions = {
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

    const rolePermissions = permissions[inv.role as keyof typeof permissions] || permissions.member;

    // Add user to project
    const member = await db`
      INSERT INTO project_members (project_id, user_id, role, permissions, invited_by_user_id)
      VALUES (
        ${inv.project_id},
        ${session.user.id},
        ${inv.role},
        ${JSON.stringify(rolePermissions)},
        ${inv.invited_by_user_id}
      )
      RETURNING id, project_id, user_id, role, joined_at
    `;

    // Mark invitation as accepted
    await db`
      UPDATE project_invitations
      SET status = 'accepted',
          responded_at = NOW()
      WHERE id = ${inv.id}
    `;

    return NextResponse.json({
      success: true,
      message: `Successfully joined project: ${inv.project_name}`,
      data: {
        project_id: inv.project_id,
        project_name: inv.project_name,
        member: member[0],
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
