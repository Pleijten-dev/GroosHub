/**
 * API routes for chat restoration
 * POST /api/chats/[id]/restore - Restore a soft-deleted chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/chats/[id]/restore
 * Restore a soft-deleted chat (within 30-day window)
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
    const db = getDbConnection();

    // Check if chat exists and belongs to user
    const chat = await db`
      SELECT id, user_id, title, deleted_at, project_id
      FROM chat_conversations
      WHERE id = ${id}
        AND user_id = ${session.user.id}
    `;

    if (chat.length === 0) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (!chat[0].deleted_at) {
      return NextResponse.json(
        { error: 'Chat is not deleted' },
        { status: 400 }
      );
    }

    // Check if deletion was within 30-day recovery window
    const deletedDate = new Date(chat[0].deleted_at);
    const now = new Date();
    const daysSinceDeletion = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceDeletion > 30) {
      return NextResponse.json(
        { error: 'Chat recovery window has expired (30 days max)' },
        { status: 400 }
      );
    }

    // Restore chat by clearing deleted_at
    const result = await db`
      UPDATE chat_conversations
      SET deleted_at = NULL,
          deleted_by_user_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, user_id, project_id, title, created_at, updated_at
    `;

    return NextResponse.json({
      success: true,
      message: 'Chat restored successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('Error restoring chat:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
