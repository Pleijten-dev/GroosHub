/**
 * Chat API Route
 * Handles streaming chat responses using Vercel AI SDK
 *
 * Week 1: Basic streaming chat with multi-model support
 * Week 2: Persistence - Save/load messages from database
 * Week 2.5: Location Agent - Tools for location analysis
 */

import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getModel, type ModelId, MODEL_CAPABILITIES } from '@/lib/ai/models';
import { auth } from '@/lib/auth';
import {
  createChat,
  getChat,
  loadChatMessages,
  saveChatMessage,
  updateChatModel,
  trackLLMUsage
} from '@/lib/ai/chat-store';
import { getSystemPrompt } from '@/features/chat/lib/prompts/system-prompt';
import { getLocationAgentPrompt, getCombinedPrompt } from '@/features/chat/lib/prompts/agent-prompts';
import { getDbConnection } from '@/lib/db/connection';
import type { AccessibleLocation } from '@/features/location/types/saved-locations';
import type { UnifiedLocationData } from '@/features/location/data/aggregator/multiLevelAggregator';
import type { ResidentialData } from '@/features/location/data/sources/altum-ai/types';
import personasData from '@/features/location/data/sources/housing-personas.json';
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

    // Extract metadata from sendMessage options (AI SDK v5)
    // Metadata can be in body.metadata or in the last message's metadata
    const rootMetadata = body.metadata || {};
    const lastMessage = Array.isArray(body.messages) && body.messages.length > 0
      ? body.messages[body.messages.length - 1]
      : {};
    const messageMetadata = lastMessage.metadata || {};

    const validatedData = chatRequestSchema.parse(body);

    // Read chatId and modelId from headers (for AI SDK v5 compatibility) or fallback to body
    const headerChatId = request.headers.get('X-Chat-Id');
    const headerModelId = request.headers.get('X-Model-Id');

    const {
      messages: clientMessages,
      chatId: bodyChatId,
      modelId: bodyModelId,
      temperature = 0.7
    } = validatedData;

    // Priority: message metadata > root metadata > headers > body
    const requestChatId = messageMetadata.chatId || rootMetadata.chatId || headerChatId || bodyChatId;
    const modelId = messageMetadata.modelId || rootMetadata.modelId || headerModelId || bodyModelId || 'claude-sonnet-4.5';
    const locale = (messageMetadata.locale || rootMetadata.locale || body.locale || 'nl') as 'nl' | 'en';

    // Validate model ID
    const model = getModel(modelId as ModelId);

    // Handle chat persistence
    let chatId = requestChatId;
    let existingMessages: UIMessage[] = [];

    console.log(`[Chat API] 🔍 Received ${clientMessages.length} messages from client`);
    console.log(`[Chat API] 📝 Client message roles:`, (clientMessages as UIMessage[]).map(m => m.role).join(', '));

    if (chatId) {
      // Check if chat exists in database
      const existingChat = await getChat(chatId);

      if (existingChat) {
        // Chat exists - load existing messages
        try {
          existingMessages = await loadChatMessages(chatId);
          console.log(`[Chat API] 💾 Loaded ${existingMessages.length} existing messages from DB for chat ${chatId}`);
          console.log(`[Chat API] 💾 DB message roles:`, existingMessages.map(m => m.role).join(', '));

          // Update chat model if different
          await updateChatModel(chatId, modelId);
        } catch (error) {
          console.error(`[Chat API] ❌ Error loading chat ${chatId}:`, error);
          // Continue without existing messages if there's an error
        }
      } else {
        // Chat doesn't exist - create it with the provided chatId
        const firstUserMessage = (clientMessages as UIMessage[]).find(m => m.role === 'user');
        const firstText = firstUserMessage?.parts.find(p => p.type === 'text')?.text || 'New Chat';
        const title = firstText.substring(0, 100); // Limit title length

        chatId = await createChat({
          userId,
          title,
          modelId,
          metadata: { temperature },
          chatId // Use the client-provided chatId
        });

        console.log(`[Chat API] ✅ Created new chat ${chatId} for user ${userId}`);
      }
    } else {
      // No chatId provided - create new chat with auto-generated ID
      const firstUserMessage = (clientMessages as UIMessage[]).find(m => m.role === 'user');
      const firstText = firstUserMessage?.parts.find(p => p.type === 'text')?.text || 'New Chat';
      const title = firstText.substring(0, 100); // Limit title length

      chatId = await createChat({
        userId,
        title,
        modelId,
        metadata: { temperature }
      });

      console.log(`[Chat API] ✅ Created new chat ${chatId} for user ${userId}`);
    }

    // Combine existing messages with new client messages
    // Since client uses nanoid IDs and we use UUIDs in DB, we can't match by ID
    // Instead, determine new messages by comparing message counts
    const existingCount = existingMessages.length;
    const clientCount = clientMessages.length;

    console.log(`[Chat API] 🔢 Message count - Existing: ${existingCount}, Client: ${clientCount}, New: ${clientCount - existingCount}`);

    const allMessages = [...existingMessages, ...clientMessages.slice(existingCount)];

    // Save only the NEW user messages (beyond what we already have in DB)
    const newMessages = (clientMessages as UIMessage[]).slice(existingCount);
    console.log(`[Chat API] 💬 Processing ${newMessages.length} new messages`);

    for (let i = 0; i < newMessages.length; i++) {
      const message = newMessages[i];
      console.log(`[Chat API] 📨 Message ${i + 1}/${newMessages.length}: role=${message.role}, id=${message.id}`);

      if (message.role === 'user') {
        const text = message.parts.find(p => p.type === 'text' && 'text' in p)?.text || '';
        console.log(`[Chat API] 💾 Saving user message: "${text.substring(0, 50)}..."`);
        try {
          await saveChatMessage(chatId, message, { modelId });
          console.log(`[Chat API] ✅ User message saved successfully`);
        } catch (error) {
          console.error(`[Chat API] ❌ Failed to save user message:`, error);
        }
      } else {
        console.log(`[Chat API] ⏭️  Skipping ${message.role} message (not from user)`);
      }
    }

    // Truncate messages to fit context window
    const truncatedMessages = truncateMessages(allMessages);

    // Prepend system prompt with context about GroosHub and GROOSMAN
    // Add location agent prompt for location analysis capabilities
    const baseSystemPrompt = getSystemPrompt(locale);
    const locationAgentPrompt = getLocationAgentPrompt(locale);
    const systemPrompt = getCombinedPrompt(baseSystemPrompt, locationAgentPrompt);

    const messagesWithSystem: UIMessage[] = [
      {
        id: randomUUID(),
        role: 'system',
        parts: [{ type: 'text', text: systemPrompt }]
      },
      ...truncatedMessages
    ];

    console.log(`[Chat API] Chat: ${chatId}, Model: ${modelId}, Locale: ${locale}, Messages: ${truncatedMessages.length}/${allMessages.length}`);
    console.log(`[Chat API] 🔧 Location agent tools enabled for user ${userId}`);

    // Create location agent tools with userId injected from session
    // These tools are defined inline so we can inject userId without exposing it to the LLM
    const locationTools = {
      listUserSavedLocations: tool({
        description: `Get all saved locations for the current user. This includes locations they own and locations shared with them.

        Use this tool when:
        - User asks about "my locations" or "saved locations"
        - User references a location without specifying which one
        - You need to clarify which location the user is asking about
        - User asks to compare multiple locations

        The tool returns: name, address, completion status, owner info, and timestamps`,
        inputSchema: z.object({}),
        async execute() {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT
                sl.id,
                sl.name,
                sl.address,
                sl.coordinates,
                sl.completion_status as "completionStatus",
                sl.created_at as "createdAt",
                sl.updated_at as "updatedAt",
                sl.user_id as "ownerId",
                u.name as "ownerName",
                FALSE as "isShared",
                TRUE as "canEdit"
              FROM saved_locations sl
              JOIN users u ON sl.user_id = u.id
              WHERE sl.user_id = ${userId}

              UNION ALL

              SELECT
                sl.id,
                sl.name,
                sl.address,
                sl.coordinates,
                sl.completion_status as "completionStatus",
                sl.created_at as "createdAt",
                sl.updated_at as "updatedAt",
                sl.user_id as "ownerId",
                u.name as "ownerName",
                TRUE as "isShared",
                ls.can_edit as "canEdit"
              FROM saved_locations sl
              JOIN location_shares ls ON sl.id = ls.saved_location_id
              JOIN users u ON sl.user_id = u.id
              WHERE ls.shared_with_user_id = ${userId}

              ORDER BY "createdAt" DESC
            `;

            const locations = results as unknown as AccessibleLocation[];

            return {
              success: true,
              count: locations.length,
              locations: locations.map(loc => ({
                id: loc.id,
                name: loc.name || 'Unnamed Location',
                address: loc.address,
                completionStatus: loc.completionStatus,
                isShared: loc.isShared,
                canEdit: loc.canEdit,
                createdAt: loc.createdAt,
                updatedAt: loc.updatedAt,
              })),
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to fetch locations',
            };
          }
        },
      }),

      getLocationData: tool({
        description: `Get specific data category for a saved location.

        Available categories:
        - demographics: Age, income, household types, population statistics
        - health: Air quality, life expectancy, healthcare metrics
        - safety: Crime rates, traffic safety, security data
        - livability: Playgrounds, youth facilities, public amenities
        - residential: Housing market prices, typologies, ownership data
        - amenities: Nearby restaurants, shops, schools, services
        - all: Returns summary of all categories`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
          category: z.enum(['demographics', 'health', 'safety', 'livability', 'residential', 'amenities', 'all']),
        }),
        async execute({ locationId, category }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT location_data as "locationData"
              FROM saved_locations
              WHERE id = ${locationId}
                AND (user_id = ${userId} OR EXISTS (
                  SELECT 1 FROM location_shares
                  WHERE saved_location_id = ${locationId}
                    AND shared_with_user_id = ${userId}
                ))
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const locationData = results[0].locationData as UnifiedLocationData;

            // Return simplified data based on category
            if (category === 'demographics' && locationData.demographics) {
              const primary = locationData.demographics.neighborhood || locationData.demographics.municipality || [];
              return {
                success: true,
                category: 'demographics',
                data: primary.slice(0, 10),
              };
            }

            return { success: true, category, data: locationData };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to fetch location data',
            };
          }
        },
      }),

      getPersonaInfo: tool({
        description: `Get information about housing personas used in GroosHub location analysis.

        GroosHub uses 30+ housing personas categorized by:
        - Income level: "Laag inkomen" (Low), "Midden inkomen" (Middle), "Hoog inkomen" (High)
        - Household type: Single, couples, families
        - Age group: 20-35, 35-55, 55+`,
        inputSchema: z.object({
          mode: z.enum(['search', 'list']),
          personaIdOrName: z.string().optional(),
        }),
        async execute({ mode, personaIdOrName }) {
          try {
            const personas = personasData.nl.housing_personas;

            if (mode === 'search' && personaIdOrName) {
              const searchTerm = personaIdOrName.toLowerCase();
              const found = personas.find(
                p => p.id.toLowerCase().includes(searchTerm) || p.name.toLowerCase().includes(searchTerm)
              );

              if (found) {
                return { success: true, persona: found };
              }
              return { success: false, error: 'Persona not found' };
            }

            // List mode
            return {
              success: true,
              count: personas.length,
              personas: personas.slice(0, 10).map(p => ({
                id: p.id,
                name: p.name,
                income_level: p.income_level,
                household_type: p.household_type,
                age_group: p.age_group,
              })),
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to get persona info',
            };
          }
        },
      }),
    };

    // Stream the response with location agent tools
    const result = streamText({
      model,
      messages: convertToModelMessages(messagesWithSystem),
      temperature,
      // Location agent tools with userId injected
      tools: locationTools,
      // Allow multi-step tool calling (up to 10 steps)
      stopWhen: stepCountIs(10),
      async onFinish({ text, usage }) {
        try {
          const responseTime = Date.now() - startTime;

          console.log(`[Chat API] 🎯 onFinish callback triggered`);
          console.log(`[Chat API] 📊 Response - Chat: ${chatId}, Tokens: ${usage.totalTokens}, Length: ${text.length}, Time: ${responseTime}ms`);

          // Save assistant message to database
          const assistantMessage: UIMessage = {
            id: randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text }]
          };

          // Get token counts with defaults
          const inputTokens = usage.inputTokens || 0;
          const outputTokens = usage.outputTokens || 0;

          console.log(`[Chat API] 💾 Saving assistant message to chat ${chatId}`);
          console.log(`[Chat API] 💾 Assistant text preview: "${text.substring(0, 50)}..."`);
          console.log(`[Chat API] 💾 Tokens - Input: ${inputTokens}, Output: ${outputTokens}`);

          await saveChatMessage(chatId!, assistantMessage, {
            modelId,
            inputTokens,
            outputTokens
          });

          console.log(`[Chat API] ✅ Assistant message saved successfully!`);

          // Track usage for analytics
          const costs = calculateCost(modelId, inputTokens, outputTokens);

          console.log(`[Chat API] 📈 Tracking LLM usage...`);
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

          console.log(`[Chat API] ✅ Usage stats saved successfully!`);
        } catch (error) {
          console.error(`[Chat API] ❌ Error in onFinish callback:`, error);
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
