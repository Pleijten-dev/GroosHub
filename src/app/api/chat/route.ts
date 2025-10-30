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
      console.error('Unauthorized: No session');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('User authenticated:', session.user.id);

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

    console.log('Request:', { model, chatId, messageCount: rawMessages?.length });

    if (!rawMessages || !Array.isArray(rawMessages)) {
      console.error('Invalid request: messages array required');
      return new Response('Invalid request: messages array required', { status: 400 });
    }

    // Get or create chat
    let currentChatId = chatId;
    if (currentChatId) {
      // Verify chat exists and belongs to user
      const existingChat = await getChatById(currentChatId);
      if (!existingChat) {
        // Chat doesn't exist, create a new one
        console.log(`Chat ${currentChatId} not found, creating new chat`);
        currentChatId = undefined;
      } else if (existingChat.userId !== Number(session.user.id)) {
        console.error(`Chat ${currentChatId} belongs to user ${existingChat.userId}, but current user is ${session.user.id}`);
        return new Response('Forbidden', { status: 403 });
      } else {
        console.log(`Using existing chat: ${currentChatId}`);
      }
    }

    if (!currentChatId) {
      // Create new chat with title from first user message
      const firstMessage = rawMessages.find((m) => m.role === 'user');
      const title = firstMessage && 'content' in firstMessage
        ? String(firstMessage.content).substring(0, 100)
        : 'New Chat';

      console.log('Creating new chat for user:', session.user.id, 'with title:', title);
      const chat = await createChat(Number(session.user.id), title);
      currentChatId = chat.id;
      console.log(`Created new chat: ${currentChatId} with title: "${title}"`);
    }

    // Save user message to database
    const userMessage = rawMessages[rawMessages.length - 1];
    console.log('User message structure:', {
      hasMessage: !!userMessage,
      role: userMessage?.role,
      hasContent: 'content' in (userMessage || {}),
      contentType: userMessage && 'content' in userMessage ? typeof userMessage.content : 'undefined',
      messageKeys: Object.keys(userMessage || {})
    });

    if (userMessage && userMessage.role === 'user' && 'content' in userMessage) {
      const content = typeof userMessage.content === 'string'
        ? userMessage.content
        : JSON.stringify(userMessage.content);

      console.log(`Saving user message to chat ${currentChatId}: "${content.substring(0, 50)}..."`);
      await createMessage(currentChatId, 'user', content);
      console.log('User message saved to database');
    } else {
      console.warn('User message not saved - condition not met');
    }

    // Get system prompt
    const systemPrompt = getSystemPrompt(
      session.user.name || 'User',
      session.user.role || 'user',
      locale
    );

    console.log(`Calling AI model: ${model}`);
    console.log('Messages being sent to AI:', JSON.stringify(rawMessages, null, 2));

    // Determine provider for debugging
    const provider = model.startsWith('grok') ? 'xai' :
                    model.startsWith('gpt') ? 'openai' :
                    model.startsWith('claude') ? 'anthropic' :
                    model.startsWith('mistral') ? 'mistral' :
                    model.startsWith('gemini') ? 'google' : 'unknown';

    // Check if API key exists for this provider
    const apiKeyEnvVar = provider === 'xai' ? 'XAI_API_KEY' :
                        provider === 'openai' ? 'OPENAI_API_KEY' :
                        provider === 'anthropic' ? 'ANTHROPIC_API_KEY' :
                        provider === 'mistral' ? 'MISTRAL_API_KEY' :
                        provider === 'google' ? 'GOOGLE_GENERATIVE_AI_API_KEY' : 'UNKNOWN';

    const apiKeyExists = !!process.env[apiKeyEnvVar];
    console.log(`Provider: ${provider}, API Key Env Var: ${apiKeyEnvVar}, API Key Exists: ${apiKeyExists}`);

    if (!apiKeyExists) {
      console.error(`❌ CRITICAL: ${apiKeyEnvVar} is not set!`);
      return Response.json({
        error: `${provider.toUpperCase()} API key not configured`,
        message: `Please set ${apiKeyEnvVar} in your environment variables`,
        provider,
        model,
      }, { status: 500 });
    }

    // Stream AI response
    let result;
    let streamError: Error | null = null;
    try {
      result = streamText({
        model: getLanguageModel(model),
        system: systemPrompt,
        messages: rawMessages,
        async onFinish({ text, finishReason, usage }) {
          console.log('AI response finished:', {
            textLength: text.length,
            finishReason,
            usage,
            preview: text.substring(0, 100)
          });

          // Save assistant message to database
          if (text && text.length > 0) {
            console.log(`Saving assistant message to chat ${currentChatId}`);
            try {
              await createMessage(currentChatId, 'assistant', text);
              console.log('Assistant message saved to database');
            } catch (dbError) {
              console.error('Failed to save assistant message to database:', dbError);
              if (dbError instanceof Error) {
                console.error('DB Error details:', dbError.message, dbError.stack);
              }
            }
          } else {
            console.error('❌ AI returned empty response!');
            console.error(`Possible causes:`);
            console.error(`1. Invalid model ID: "${model}"`);
            console.error(`2. Invalid ${apiKeyEnvVar}`);
            console.error(`3. API rate limit exceeded`);
            console.error(`4. Model does not exist or requires different permissions`);
          }
        },
      });
      console.log('✅ streamText called successfully, starting stream...');
    } catch (error) {
      streamError = error instanceof Error ? error : new Error('Unknown error');
      console.error('❌ CRITICAL: Failed to call streamText:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }

      // Return a JSON error response instead of throwing
      return Response.json({
        error: 'AI API call failed',
        message: streamError.message,
        provider,
        model,
        apiKeyEnvVar,
      }, { status: 500 });
    }

    // Return stream response with chat ID in headers
    const response = result.toTextStreamResponse();
    response.headers.set('X-Chat-Id', currentChatId);
    response.headers.set('X-Model', model);
    response.headers.set('X-Provider', provider);

    console.log(`✅ Returning streaming response with chat ID: ${currentChatId}`);
    return response;
  } catch (error) {
    console.error('Chat API error:', error);

    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return new Response(error instanceof Error ? error.message : 'Internal server error', { status: 500 });
  }
}
