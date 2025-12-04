/**
 * API routes for project invitations
 * GET /api/projects/[id]/invitations - List project invitations
 * POST /api/projects/[id]/invitations - Create invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectAdmin } from '@/lib/db/queries/projects';
import { randomBytes } from 'crypto';

/**
 * GET /api/projects/[id]/invitations
 * List all pending invitations for a project
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

    // Check if user is admin of project
    const isAdmin = await isProjectAdmin(id, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to view invitations' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Get pending invitations
    const invitations = await db`
      SELECT
        inv.id,
        inv.project_id,
        inv.invited_by_user_id,
        inv.invited_user_id,
        inv.email,
        inv.role,
        inv.message,
        inv.status,
        inv.expires_at,
        inv.created_at,
        inv.responded_at,
        u_inviter.name as inviter_name,
        u_invited.name as invited_user_name
      FROM project_invitations inv
      LEFT JOIN user_accounts u_inviter ON inv.invited_by_user_id = u_inviter.id
      LEFT JOIN user_accounts u_invited ON inv.invited_user_id = u_invited.id
      WHERE inv.project_id = ${id}
      AND inv.status = 'pending'
      AND inv.expires_at > NOW()
      ORDER BY inv.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/invitations
 * Create a new project invitation
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
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = 'member', message } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['member', 'admin', 'viewer'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "member", "admin", or "viewer"' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Check if user with this email exists
    const existingUser = await db`
      SELECT id, org_id FROM user_accounts WHERE LOWER(email) = LOWER(${email})
    `;

    let invitedUserId = null;

    if (existingUser.length > 0) {
      invitedUserId = existingUser[0].id;

      // Check if user is in same organization
      if (existingUser[0].org_id !== session.user.org_id) {
        return NextResponse.json(
          { success: false, error: 'User is not in your organization' },
          { status: 400 }
        );
      }

      // Check if user is already a member
      const existingMember = await db`
        SELECT id FROM project_members
        WHERE project_id = ${id}
        AND user_id = ${invitedUserId}
        AND left_at IS NULL
      `;

      if (existingMember.length > 0) {
        return NextResponse.json(
          { success: false, error: 'User is already a member of this project' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db`
      SELECT id FROM project_invitations
      WHERE project_id = ${id}
      AND LOWER(email) = LOWER(${email})
      AND status = 'pending'
      AND expires_at > NOW()
    `;

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invitation already sent to this email' },
        { status: 400 }
      );
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const tokenHash = randomBytes(32).toString('hex'); // In production, use proper hashing

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await db`
      INSERT INTO project_invitations (
        project_id,
        invited_by_user_id,
        invited_user_id,
        email,
        role,
        message,
        token_hash,
        expires_at
      )
      VALUES (
        ${id},
        ${session.user.id},
        ${invitedUserId},
        ${email.toLowerCase()},
        ${role},
        ${message || null},
        ${tokenHash},
        ${expiresAt}
      )
      RETURNING id, project_id, invited_by_user_id, email, role, status, expires_at, created_at
    `;

    // TODO: Send invitation email with token link
    // Example URL: https://grooshub.com/invitations/${token}

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        ...result[0],
        invitation_token: token, // Include token for email/testing (remove in production)
      },
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
