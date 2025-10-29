// Get, update, or delete individual chat
import { auth } from '@/lib/auth';
import {
  getChatById,
  getMessagesByChatId,
  updateChatTitle,
  deleteChat,
} from '@/features/chat/lib/db/queries';

// GET /api/chat/[id] - Get chat with messages
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chat = await getChatById(params.id);

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await getMessagesByChatId(params.id);

    return Response.json({ chat, messages });
  } catch (error: any) {
    console.error('Get chat error:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

// PATCH /api/chat/[id] - Update chat title
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chat = await getChatById(params.id);

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title } = await req.json();

    if (!title || typeof title !== 'string') {
      return Response.json({ error: 'Invalid title' }, { status: 400 });
    }

    await updateChatTitle(params.id, title);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Update chat error:', error);
    return Response.json(
      { error: error.message || 'Failed to update chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/[id] - Delete chat
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chat = await getChatById(params.id);

    if (!chat) {
      return Response.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteChat(params.id);

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return Response.json(
      { error: error.message || 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
