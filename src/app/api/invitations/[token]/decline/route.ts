/**
 * API route for declining project invitations
 * POST /api/invitations/[token]/decline - Decline invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/invitations/[token]/decline
 * Decline a project invitation
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
        p.name as project_name
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

    // Mark invitation as declined
    await db`
      UPDATE project_invitations
      SET status = 'declined',
          responded_at = NOW()
      WHERE id = ${inv.id}
    `;

    return NextResponse.json({
      success: true,
      message: `Invitation to join "${inv.project_name}" has been declined`,
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
