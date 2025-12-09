/**
 * API routes for organization users
 * GET /api/organization/users - List users in authenticated user's organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/organization/users
 * List all active users in the authenticated user's organization
 * Used for adding members to projects
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const excludeProjectId = searchParams.get('exclude_project_id');

    const db = getDbConnection();

    let users;

    if (excludeProjectId) {
      // Get users who are NOT already members of the specified project
      users = await db`
        SELECT
          u.id,
          u.name,
          u.email,
          u.avatar_url,
          u.role
        FROM user_accounts u
        WHERE u.org_id = ${session.user.org_id}
          AND u.is_active = true
          AND u.id NOT IN (
            SELECT pm.user_id
            FROM project_members pm
            WHERE pm.project_id = ${excludeProjectId}
              AND pm.left_at IS NULL
          )
          ${search ? db`AND (u.name ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`})` : db``}
        ORDER BY u.name ASC
      `;
    } else {
      // Get all users in organization
      users = await db`
        SELECT
          id,
          name,
          email,
          avatar_url,
          role
        FROM user_accounts
        WHERE org_id = ${session.user.org_id}
          AND is_active = true
          ${search ? db`AND (name ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`})` : db``}
        ORDER BY name ASC
      `;
    }

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
