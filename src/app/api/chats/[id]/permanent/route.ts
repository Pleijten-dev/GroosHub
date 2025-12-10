/**
 * API routes for permanent chat deletion
 * DELETE /api/chats/[id]/permanent - Permanently delete a chat (cannot be undone)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { deleteFileFromR2 } from '@/lib/storage/r2-client';

/**
 * DELETE /api/chats/[id]/permanent
 * Permanently delete a chat and all associated data
 */
export async function DELETE(
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

    // Must be in deleted state
    if (!chat[0].deleted_at) {
      return NextResponse.json(
        { error: 'Chat must be deleted first (moved to archive) before permanent deletion' },
        { status: 400 }
      );
    }

    // Get all files associated with this chat for R2 cleanup
    const files = await db`
      SELECT file_path, storage_provider
      FROM file_uploads
      WHERE chat_id = ${id}
    `;

    // Delete files from R2
    for (const file of files) {
      if (file.storage_provider === 'r2' && file.file_path) {
        try {
          await deleteFileFromR2(file.file_path);
        } catch (error) {
          console.error(`Failed to delete file from R2: ${file.file_path}`, error);
          // Continue with deletion even if R2 cleanup fails
        }
      }
    }

    // Hard delete chat (CASCADE will handle messages and other related records)
    await db`
      DELETE FROM chat_conversations
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Chat permanently deleted',
    });
  } catch (error) {
    console.error('Error permanently deleting chat:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
