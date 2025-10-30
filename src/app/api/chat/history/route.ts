// Get user's chat history
import { auth } from '@/lib/auth';
import { getChatsByUserId } from '@/features/chat/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await getChatsByUserId(session.user.id);

    return Response.json({ chats });
  } catch (error) {
    console.error('Get chat history error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
