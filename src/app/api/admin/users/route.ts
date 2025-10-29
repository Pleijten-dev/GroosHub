import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * Get all users (admin only)
 */
export async function GET() {
  try {
    const session = await auth();

    // Check if user is authenticated and is an admin
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Get all users (excluding passwords)
    const users = await db`
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

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
 * Create a new user (admin only)
 */
export async function POST(request: NextRequest) {
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
    const { name, email, password, role } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
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

    // Check if email already exists
    const existingUser = await db`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db`
      INSERT INTO users (name, email, password, role)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role})
      RETURNING id, name, email, role, created_at
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
      SELECT id FROM users WHERE id = ${id}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is already taken by another user
    const emailCheck = await db`
      SELECT id FROM users WHERE email = ${email} AND id != ${id}
    `;

    if (emailCheck.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Update user with or without password
    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await db`
        UPDATE users
        SET name = ${name}, email = ${email}, password = ${hashedPassword}, role = ${role}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, name, email, role, updated_at
      `;
    } else {
      result = await db`
        UPDATE users
        SET name = ${name}, email = ${email}, role = ${role}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING id, name, email, role, updated_at
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
      SELECT id FROM users WHERE id = ${id}
    `;

    if (existingUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user
    await db`DELETE FROM users WHERE id = ${id}`;

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
