// Chat API endpoint with streaming support
import { auth } from '@/lib/auth';
import { streamText, type CoreMessage } from 'ai';
import { getLanguageModel } from '@/features/chat/lib/ai/providers';
import { getSystemPrompt } from '@/features/chat/lib/ai/prompts';
import { DEFAULT_CHAT_MODEL } from '@/features/chat/lib/ai/models';
import { createChat, createMessage, getChatById } from '@/features/chat/lib/db/queries';

// Type for UIMessage format (from AI SDK client)
interface UIMessagePart {
  type: string;
  text?: string;
}

interface UIMessage {
  role: string;
  parts?: UIMessagePart[];
  content?: string;
}

// Helper to extract text from UIMessage parts
function extractTextFromMessage(message: UIMessage): string {
  // If it has parts array (UIMessage format)
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter((part): part is UIMessagePart & { text: string } =>
        'text' in part && typeof part.text === 'string'
      )
      .map(part => part.text);
    return textParts.join('');
  }

  // If it has content string (CoreMessage format)
  if (message.content && typeof message.content === 'string') {
    return message.content;
  }

  // Fallback
  return '';
}

// Convert UIMessage to CoreMessage format
function convertUIMessageToCoreMessage(message: UIMessage): CoreMessage {
  const content = extractTextFromMessage(message);
  const role = message.role as 'user' | 'assistant' | 'system';

  return {
    role,
    content,
  };
}

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
      messages: unknown[]; // Can be UIMessage[] or CoreMessage[], will convert later
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
      const firstMessage = rawMessages.find((m) => {
        const msg = m as UIMessage;
        return msg.role === 'user';
      }) as UIMessage | undefined;
      const title = firstMessage
        ? extractTextFromMessage(firstMessage).substring(0, 100) || 'New Chat'
        : 'New Chat';

      console.log('Creating new chat for user:', session.user.id, 'with title:', title);
      const chat = await createChat(Number(session.user.id), title);
      currentChatId = chat.id;
      console.log(`Created new chat: ${currentChatId} with title: "${title}"`);
    }

    // Save user message to database
    const userMessage = rawMessages[rawMessages.length - 1] as UIMessage | undefined;
    if (userMessage && userMessage.role === 'user') {
      const content = extractTextFromMessage(userMessage);

      if (content) {
        console.log(`Saving user message to chat ${currentChatId}: "${content.substring(0, 50)}..."`);
        await createMessage(currentChatId, 'user', content);
        console.log('✅ User message saved to database');
      } else {
        console.warn('⚠️ User message has no text content');
      }
    } else {
      console.warn('⚠️ No user message found to save');
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

    console.log(`🚀 Attempting to call ${provider} API with model: ${model}`);

    // Convert UIMessages to CoreMessages
    console.log('🔄 Converting messages from UIMessage format to CoreMessage format...');
    const convertedMessages: CoreMessage[] = rawMessages.map((msg) => {
      const message = msg as UIMessage;
      // If already in CoreMessage format with content string, use as-is
      if ('content' in message && typeof message.content === 'string' && !('parts' in message)) {
        return message as unknown as CoreMessage;
      }
      // Otherwise convert from UIMessage format
      return convertUIMessageToCoreMessage(message);
    });
    console.log('✅ Messages converted successfully:', JSON.stringify(convertedMessages, null, 2));

    // Track diagnostics to send in headers
    const diagnostics = {
      streamInitialized: false,
      streamError: '',
      finishReason: '',
      textLength: 0,
      providerError: '',
    };

    // Stream AI response with comprehensive error handling
    let result;
    try {
      result = streamText({
        model: getLanguageModel(model),
        system: systemPrompt,
        messages: convertedMessages,
        async onFinish({ text, finishReason, usage }) {
          diagnostics.finishReason = finishReason || 'unknown';
          diagnostics.textLength = text?.length || 0;

          console.log('🏁 AI stream finished:', {
            textLength: text?.length || 0,
            finishReason,
            usage,
            preview: text ? text.substring(0, 100) : '(empty)',
          });

          // Save assistant message to database
          if (text && text.length > 0) {
            console.log(`💾 Saving assistant message to chat ${currentChatId}`);
            try {
              await createMessage(currentChatId, 'assistant', text);
              console.log('✅ Assistant message saved to database');
            } catch (dbError) {
              console.error('❌ Failed to save assistant message:', dbError);
              if (dbError instanceof Error) {
                console.error('DB Error:', dbError.message);
              }
            }
          } else {
            console.error('❌ EMPTY AI RESPONSE!');
            console.error('Finish reason:', finishReason);
            console.error('Usage:', usage);
            diagnostics.streamError = `Empty response. FinishReason: ${finishReason}`;
          }
        },
        onError(error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          diagnostics.streamError = errorMsg;
          diagnostics.providerError = errorMsg;

          console.error('❌ Stream error callback triggered:', error);
          if (error instanceof Error) {
            console.error('Stream error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack,
            });
          }
        },
      });

      diagnostics.streamInitialized = true;
      console.log('✅ streamText() initialized successfully');
      console.log('📊 Result type:', typeof result);
      console.log('📊 Result methods:', Object.keys(result));

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      diagnostics.streamError = `Init failed: ${errorMsg}`;

      console.error('❌ FATAL: streamText() threw an error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }

      return Response.json({
        error: 'Failed to initialize AI stream',
        message: errorMsg,
        provider,
        model,
        diagnostics,
      }, { status: 500 });
    }

    // Create streaming response with additional logging
    // Using toDataStreamResponse() to return messages in UIMessage format for useChat
    try {
      const response = result.toDataStreamResponse();

      // Add diagnostic headers so client can see server-side info
      response.headers.set('X-Chat-Id', currentChatId);
      response.headers.set('X-Model', model);
      response.headers.set('X-Provider', provider);
      response.headers.set('X-Debug-Stream-Type', 'data-stream');
      response.headers.set('X-Debug-Stream-Init', String(diagnostics.streamInitialized));
      response.headers.set('X-Debug-API-Key-Exists', String(apiKeyExists));
      response.headers.set('X-Debug-Model-ID', model);
      response.headers.set('X-Debug-Provider', provider);

      console.log(`✅ Returning streaming response:`, {
        chatId: currentChatId,
        model,
        provider,
        contentType: response.headers.get('Content-Type'),
        diagnostics,
      });

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      diagnostics.streamError = `Response creation failed: ${errorMsg}`;

      console.error('❌ FATAL: Failed to create stream response:', error);
      if (error instanceof Error) {
        console.error('Response error:', {
          name: error.name,
          message: error.message,
        });
      }

      return Response.json({
        error: 'Failed to create stream response',
        message: errorMsg,
        provider,
        model,
        diagnostics,
      }, { status: 500 });
    }
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
