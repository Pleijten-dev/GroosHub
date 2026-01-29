import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * Get all users (admin sees own org, owner sees all orgs)
 */
export async function GET() {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin or owner
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    let users;

    if (session.user.role === 'owner') {
      // Owners see all users across all organizations
      users = await db`
        SELECT u.id, u.name, u.email, u.role, u.org_id, u.is_active,
               o.name as org_name, o.slug as org_slug,
               u.created_at, u.updated_at
        FROM user_accounts u
        LEFT JOIN org_organizations o ON u.org_id = o.id
        ORDER BY u.created_at DESC
      `;
    } else {
      // Admins see only users in their organization
      users = await db`
        SELECT id, name, email, role, org_id, is_active, created_at, updated_at
        FROM user_accounts
        WHERE org_id = ${session.user.org_id}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin/owner only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin or owner
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'owner')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, org_id } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['user', 'admin', 'owner'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user", "admin", or "owner"' },
        { status: 400 }
      );
    }

    // Determine which organization to add user to
    let targetOrgId = org_id;

    if (session.user.role === 'admin') {
      // Admins can only add users to their own organization
      targetOrgId = session.user.org_id;
    } else if (session.user.role === 'owner') {
      // Owners can specify org_id, or default to their own org
      targetOrgId = org_id || session.user.org_id;
    }

    const db = getDbConnection();

    // Check if email already exists
    const existingUser = await db`
      SELECT id FROM user_accounts WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with must_change_password = true (admin-created users must change password on first login)
    const result = await db`
      INSERT INTO user_accounts (name, email, password, role, org_id, must_change_password)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role}, ${targetOrgId}, true)
      RETURNING id, name, email, role, org_id, created_at, must_change_password
    `;

    return NextResponse.json(
      { user: result[0], message: 'User created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users
 * Update a user (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, email, password, role } = body;

    // Validate required fields
    if (!id || !name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "admin"' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Check if user exists
    const existingUser = await db`
      SELECT id, org_id FROM user_accounts WHERE id = ${id}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins can only update users in their own organization
    if (session.user.role === 'admin' && existingUser[0].org_id !== session.user.org_id) {
      return NextResponse.json(
        { error: 'You can only update users in your organization' },
        { status: 403 }
      );
    }

    // Check if email is already taken by another user
    const emailCheck = await db`
      SELECT id FROM user_accounts WHERE email = ${email} AND id != ${id}
    `;

    if (emailCheck.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Update user with or without password
    // If password is being reset by admin, set must_change_password = true
    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await db`
        UPDATE user_accounts
        SET name = ${name}, email = ${email}, password = ${hashedPassword}, role = ${role},
            must_change_password = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, name, email, role, org_id, updated_at, must_change_password
      `;
    } else {
      result = await db`
        UPDATE user_accounts
        SET name = ${name}, email = ${email}, role = ${role}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, name, email, role, org_id, updated_at
      `;
    }

    return NextResponse.json({
      user: result[0],
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (Number(id) === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Check if user exists
    const existingUser = await db`
      SELECT id, org_id FROM user_accounts WHERE id = ${id}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admins can only delete users in their own organization
    if (session.user.role === 'admin' && existingUser[0].org_id !== session.user.org_id) {
      return NextResponse.json(
        { error: 'You can only delete users in your organization' },
        { status: 403 }
      );
    }

    // Delete user
    await db`DELETE FROM user_accounts WHERE id = ${id}`;

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
