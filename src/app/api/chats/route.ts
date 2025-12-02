/**
 * Chat Management API - List all chats for authenticated user
 * Week 2: Multi-Chat UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listUserChats } from '@/lib/ai/chat-store';

/**
 * GET /api/chats
 * List all chats for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const modelId = searchParams.get('modelId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;

    // Fetch user's chats
    const chats = await listUserChats(userId, {
      projectId: projectId || undefined,
      modelId: modelId || undefined,
      limit
    });

    return NextResponse.json({
      success: true,
      chats,
      count: chats.length
    });

  } catch (error) {
    console.error('[Chats API] Error listing chats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list chats' },
      { status: 500 }
    );
  }
}
