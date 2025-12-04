import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getChatMessages } from '@/lib/db/queries/chats';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const messages = await getChatMessages(id);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Chat messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
