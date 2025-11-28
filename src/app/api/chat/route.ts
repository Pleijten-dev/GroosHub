/**
 * Chat API Route
 * Handles streaming chat responses using Vercel AI SDK
 *
 * Week 1: Basic streaming chat with multi-model support
 */

import { streamText, type CoreMessage } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getModel, getModelCapabilities, type ModelId } from '@/lib/ai/models';

// Request schema validation
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
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
function truncateMessages(messages: CoreMessage[]): CoreMessage[] {
  // Separate system messages from conversation messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  // Keep only the last N conversation messages
  const recentMessages = conversationMessages.slice(-CONTEXT_CONFIG.maxMessages);

  // Combine system messages (at the start) with recent conversation
  return [...systemMessages, ...recentMessages];
}

/**
 * POST /api/chat
 * Stream chat responses
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);

    const { messages, modelId = 'claude-sonnet-4.5', temperature = 0.7 } = validatedData;

    // Validate model ID
    const model = getModel(modelId as ModelId);

    // Truncate messages to fit context window (messages are already in correct format)
    const truncatedMessages = truncateMessages(messages as CoreMessage[]);

    // Log context info (for debugging)
    console.log(`[Chat API] Model: ${modelId}, Messages: ${truncatedMessages.length}/${messages.length}`);

    // Stream the response
    const result = streamText({
      model,
      messages: truncatedMessages,
      temperature,
      async onFinish({ text, usage }) {
        // Log completion (can be used for analytics/tracking)
        console.log(`[Chat API] Completed. Tokens: ${usage.totalTokens}, Length: ${text.length}`);
      },
    });

    // Return streaming response
    return result.toDataStreamResponse();

  } catch (error) {
    console.error('[Chat API] Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: error.errors,
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
      version: '1.0.0',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
