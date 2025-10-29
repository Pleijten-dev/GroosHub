// Chat API endpoint with streaming support
import { auth } from '@/lib/auth';
import { streamText, type CoreMessage } from 'ai';
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

    const body = await req.json();
    const {
      messages: rawMessages,
      model = DEFAULT_CHAT_MODEL,
      chatId,
      locale = 'en'
    } = body as {
      messages: CoreMessage[];
      model?: string;
      chatId?: string;
      locale?: string
    };

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return new Response('Invalid request: messages array required', { status: 400 });
    }

    // Get or create chat
    let currentChatId = chatId;
    if (!currentChatId) {
      // Create new chat with title from first user message
      const firstMessage = rawMessages.find((m) => m.role === 'user');
      const title = firstMessage && 'content' in firstMessage
        ? String(firstMessage.content).substring(0, 100)
        : 'New Chat';
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
    const userMessage = rawMessages[rawMessages.length - 1];
    if (userMessage && userMessage.role === 'user' && 'content' in userMessage) {
      const content = typeof userMessage.content === 'string'
        ? userMessage.content
        : JSON.stringify(userMessage.content);
      await createMessage(currentChatId, 'user', content);
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
      messages: rawMessages,
      async onFinish({ text }) {
        // Save assistant message to database
        await createMessage(currentChatId, 'assistant', text);
      },
    });

    // Return stream response with chat ID in headers
    const response = result.toTextStreamResponse();
    response.headers.set('X-Chat-Id', currentChatId);

    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(error instanceof Error ? error.message : 'Internal server error', { status: 500 });
  }
}
