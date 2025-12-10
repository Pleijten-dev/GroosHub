/**
 * API routes for user notifications
 * GET /api/notifications - List user's notifications
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const db = getDbConnection();

    // Get notifications
    const notifications = await db`
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        project_id,
        chat_id,
        file_id,
        action_url,
        action_label,
        is_read,
        read_at,
        priority,
        expires_at,
        metadata,
        created_at,
        updated_at
      FROM user_notifications
      WHERE user_id = ${session.user.id}
        ${unreadOnly ? db`AND is_read = false` : db``}
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ${limit}
    `;

    // Get unread count
    const unreadCountResult = await db`
      SELECT COUNT(*)::int as count
      FROM user_notifications
      WHERE user_id = ${session.user.id}
        AND is_read = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;

    const unreadCount = unreadCountResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDbConnection();

    // Mark all as read using the database function
    const result = await db`
      SELECT mark_all_notifications_read(${session.user.id}) as updated_count
    `;

    const updatedCount = result[0]?.updated_count || 0;

    return NextResponse.json({
      success: true,
      data: {
        updatedCount,
      },
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
