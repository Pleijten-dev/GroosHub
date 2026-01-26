import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserChats, createChatConversation } from '@/lib/db/queries/chats';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const personalOnly = searchParams.get('personal_only');

    let conversations = await getUserChats(Number(session.user.id));

    // Filter by project_id if provided
    if (projectId) {
      conversations = conversations.filter(chat => chat.project_id === projectId);
    }

    // Filter to personal chats only (no project_id)
    if (personalOnly === 'true') {
      conversations = conversations.filter(chat => !chat.project_id);
    }

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Chat conversations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, model_id, project_id } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const conversation = await createChatConversation({
      userId: Number(session.user.id),
      title,
      modelId: model_id || 'claude-sonnet-4.5',
      projectId: project_id || null
    });

    return NextResponse.json({ conversation });

  } catch (error) {
    console.error('Create chat conversation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
