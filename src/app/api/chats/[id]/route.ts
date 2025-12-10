/**
 * Chat Management API - Individual chat operations
 * Week 2: Multi-Chat UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getChat,
  updateChatTitle,
  updateChatMetadata,
  deleteChat,
  loadChatMessages
} from '@/lib/ai/chat-store';

/**
 * GET /api/chats/[id]
 * Get a specific chat with its messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: chatId } = await params;

    // Fetch chat
    const chat = await getChat(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Verify ownership (convert to numbers for comparison)
    const sessionUserId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    if (chat.user_id !== sessionUserId) {
      console.log(`[Chats API] Ownership check failed: chat.user_id=${chat.user_id}, session.user.id=${sessionUserId}`);
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Load messages
    const messages = await loadChatMessages(chatId);

    return NextResponse.json({
      success: true,
      chat,
      messages,
      messageCount: messages.length
    });

  } catch (error) {
    console.error('[Chat API] Error fetching chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/[id]
 * Update chat title or metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: chatId } = await params;

    // Fetch chat to verify ownership
    const chat = await getChat(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Verify ownership (convert to numbers for comparison)
    const sessionUserId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    if (chat.user_id !== sessionUserId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, metadata } = body;

    // Update title if provided
    if (title !== undefined) {
      await updateChatTitle(chatId, title);
    }

    // Update metadata if provided
    if (metadata !== undefined) {
      await updateChatMetadata(chatId, metadata);
    }

    // Fetch updated chat
    const updatedChat = await getChat(chatId);

    return NextResponse.json({
      success: true,
      chat: updatedChat
    });

  } catch (error) {
    console.error('[Chat API] Error updating chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[id]
 * Delete a chat and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: chatId } = await params;

    // Fetch chat to verify ownership
    const chat = await getChat(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Verify ownership (convert to numbers for comparison)
    const sessionUserId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    if (chat.user_id !== sessionUserId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Soft delete chat (30-day recovery window)
    await deleteChat(chatId, sessionUserId);

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully. Can be restored within 30 days.'
    });

  } catch (error) {
    console.error('[Chat API] Error deleting chat:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
