/**
 * Chat API Route
 * Handles streaming chat responses using Vercel AI SDK
 *
 * Week 1: Basic streaming chat with multi-model support
 * Week 2: Persistence - Save/load messages from database
 */

import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getModel, type ModelId, MODEL_CAPABILITIES } from '@/lib/ai/models';
import { auth } from '@/lib/auth';
import {
  createChat,
  loadChatMessages,
  saveChatMessage,
  updateChatModel,
  trackLLMUsage
} from '@/lib/ai/chat-store';
import { randomUUID } from 'crypto';

// Request schema validation
const chatRequestSchema = z.object({
  messages: z.any(), // UIMessage[] - complex type, validated by AI SDK
  chatId: z.string().optional(), // Optional - create new chat if not provided
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// Context window configuration
const CONTEXT_CONFIG = {
  maxMessages: 20, // Keep last N messages
  alwaysPreserveRoles: ['system'], // Always preserve system messages
};

/**
 * Truncate message history to fit context window
 * Preserves system messages and keeps recent messages
 */
function truncateMessages(messages: UIMessage[]): UIMessage[] {
  // Separate system messages from conversation messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // Keep only the last N conversation messages
  const recentMessages = conversationMessages.slice(-CONTEXT_CONFIG.maxMessages);

  // Combine system messages (at the start) with recent conversation
  return [...systemMessages, ...recentMessages];
}

/**
 * Get provider name from model ID
 */
function getProviderFromModel(modelId: string): string {
  const modelInfo = MODEL_CAPABILITIES[modelId as ModelId];
  if (modelInfo && modelInfo.providers.length > 0) {
    return modelInfo.providers[0];
  }

  // Fallback: Guess provider from model ID
  if (modelId.startsWith('gpt')) return 'openai';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('mistral')) return 'mistral';
  if (modelId.startsWith('grok')) return 'xai';

  return 'unknown';
}

/**
 * Calculate cost from tokens
 */
function calculateCost(modelId: string, inputTokens: number, outputTokens: number): {
  costInput: number;
  costOutput: number;
} {
  const modelInfo = MODEL_CAPABILITIES[modelId as ModelId];
  if (!modelInfo) {
    return { costInput: 0, costOutput: 0 };
  }

  // Cost is per 1k tokens, so divide by 1000
  const costInput = (inputTokens / 1000) * modelInfo.costPer1kTokens.input;
  const costOutput = (outputTokens / 1000) * modelInfo.costPer1kTokens.output;

  return { costInput, costOutput };
}

/**
 * POST /api/chat
 * Stream chat responses with persistence
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    const {
      messages: clientMessages,
      chatId: requestChatId,
      modelId = 'claude-sonnet-4.5',
      temperature = 0.7
    } = validatedData;

    // Validate model ID
    const model = getModel(modelId as ModelId);

    // Handle chat persistence
    let chatId = requestChatId;
    let existingMessages: UIMessage[] = [];

    if (chatId) {
      // Load existing messages from database
      try {
        existingMessages = await loadChatMessages(chatId);
        console.log(`[Chat API] Loaded ${existingMessages.length} existing messages from chat ${chatId}`);

        // Update chat model if different
        await updateChatModel(chatId, modelId);
      } catch (error) {
        console.error(`[Chat API] Error loading chat ${chatId}:`, error);
        // Continue without existing messages if there's an error
      }
    } else {
      // Create new chat
      const firstUserMessage = (clientMessages as UIMessage[]).find(m => m.role === 'user');
      const firstText = firstUserMessage?.parts.find(p => p.type === 'text')?.text || 'New Chat';
      const title = firstText.substring(0, 100); // Limit title length

      chatId = await createChat({
        userId,
        title,
        modelId,
        metadata: { temperature }
      });

      console.log(`[Chat API] Created new chat ${chatId} for user ${userId}`);
    }

    // Combine existing messages with new client messages
    // Since client uses nanoid IDs and we use UUIDs in DB, we can't match by ID
    // Instead, determine new messages by comparing message counts
    const existingCount = existingMessages.length;
    const allMessages = [...existingMessages, ...clientMessages.slice(existingCount)];

    // Save only the NEW user messages (beyond what we already have in DB)
    const newMessages = (clientMessages as UIMessage[]).slice(existingCount);
    for (const message of newMessages) {
      if (message.role === 'user') {
        console.log(`[Chat API] Saving new user message to chat ${chatId}`);
        await saveChatMessage(chatId, message, { modelId });
      }
    }

    // Truncate messages to fit context window
    const truncatedMessages = truncateMessages(allMessages);

    console.log(`[Chat API] Chat: ${chatId}, Model: ${modelId}, Messages: ${truncatedMessages.length}/${allMessages.length}`);

    // Stream the response
    const result = streamText({
      model,
      messages: convertToModelMessages(truncatedMessages),
      temperature,
      async onFinish({ text, usage }) {
        try {
          const responseTime = Date.now() - startTime;

          console.log(`[Chat API] Completed. Chat: ${chatId}, Tokens: ${usage.totalTokens}, Length: ${text.length}, Time: ${responseTime}ms`);

          // Save assistant message to database
          const assistantMessage: UIMessage = {
            id: randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text }]
          };

          // Get token counts with defaults
          const inputTokens = usage.inputTokens || 0;
          const outputTokens = usage.outputTokens || 0;

          console.log(`[Chat API] Saving assistant message to chat ${chatId}`);
          await saveChatMessage(chatId!, assistantMessage, {
            modelId,
            inputTokens,
            outputTokens
          });

          // Track usage for analytics
          const costs = calculateCost(modelId, inputTokens, outputTokens);

          await trackLLMUsage({
            userId,
            chatId,
            model: modelId,
            provider: getProviderFromModel(modelId),
            inputTokens,
            outputTokens,
            costInput: costs.costInput,
            costOutput: costs.costOutput,
            requestType: 'chat',
            responseTimeMs: responseTime,
            metadata: { temperature }
          });

          console.log(`[Chat API] Successfully saved assistant message and usage stats`);
        } catch (error) {
          console.error(`[Chat API] Error in onFinish callback:`, error);
          // Don't throw - allow stream to complete even if save fails
        }
      },
    });

    // Return streaming response in UIMessage format
    return result.toUIMessageStreamResponse();

  } catch (error) {
    console.error('[Chat API] Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle model errors
    if (error instanceof Error && error.message.includes('Invalid model ID')) {
      return new Response(
        JSON.stringify({
          error: 'Invalid model',
          message: error.message,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle API key errors
    if (error instanceof Error &&
        (error.message.includes('API key') ||
         error.message.includes('authentication') ||
         error.message.includes('401'))) {
      return new Response(
        JSON.stringify({
          error: 'Authentication error',
          message: 'API key is missing or invalid. Please check your environment variables.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle rate limiting
    if (error instanceof Error &&
        (error.message.includes('rate limit') ||
         error.message.includes('429'))) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle network errors
    if (error instanceof Error &&
        (error.message.includes('network') ||
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('ETIMEDOUT'))) {
      return new Response(
        JSON.stringify({
          error: 'Network error',
          message: 'Unable to connect to AI service. Please try again.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET /api/chat
 * Health check endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Chat API is running',
      version: '2.0.0', // Updated for Week 2: Persistence
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
