// Chat API endpoint with streaming support
import { auth } from '@/lib/auth';
import { streamText } from 'ai';
import { getLanguageModel } from '@/features/chat/lib/ai/providers';
import { getSystemPrompt } from '@/features/chat/lib/ai/prompts';
import { DEFAULT_CHAT_MODEL } from '@/features/chat/lib/ai/models';
import { createChat, createMessage, getChatById } from '@/features/chat/lib/db/queries';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, model = DEFAULT_CHAT_MODEL, chatId, locale = 'en' } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request: messages array required', { status: 400 });
    }

    // Get or create chat
    let currentChatId = chatId;
    if (!currentChatId) {
      // Create new chat with title from first user message
      const firstMessage = messages.find((m: any) => m.role === 'user');
      const title = firstMessage?.content?.substring(0, 100) || 'New Chat';
      const chat = await createChat(session.user.id, title);
      currentChatId = chat.id;
    } else {
      // Verify chat belongs to user
      const chat = await getChatById(currentChatId);
      if (!chat || chat.userId !== session.user.id) {
        return new Response('Chat not found', { status: 404 });
      }
    }

    // Save user message to database
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === 'user') {
      await createMessage(
        currentChatId,
        'user',
        typeof userMessage.content === 'string'
          ? userMessage.content
          : JSON.stringify(userMessage.content)
      );
    }

    // Get system prompt
    const systemPrompt = getSystemPrompt(
      session.user.name || 'User',
      session.user.role || 'user',
      locale
    );

    // Stream AI response
    const result = streamText({
      model: getLanguageModel(model),
      system: systemPrompt,
      messages,
      async onFinish({ text }) {
        // Save assistant message to database
        await createMessage(currentChatId, 'assistant', text);
      },
    });

    // Return stream response with chat ID in headers
    const response = result.toDataStreamResponse();
    response.headers.set('X-Chat-Id', currentChatId);

    return response;
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(error.message || 'Internal server error', { status: 500 });
  }
}
