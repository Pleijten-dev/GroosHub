/**
 * Chat API Route
 * Handles streaming chat responses using Vercel AI SDK
 *
 * Week 1: Basic streaming chat with multi-model support
 * Week 2: Persistence - Save/load messages from database
 * Week 2.5: Location Agent - Tools for location analysis
 * Week 3: Multi-Modal Input - Support for images and PDFs with vision models
 */

import { streamText, convertToModelMessages, stepCountIs, tool, type UIMessage } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getModel, type ModelId, MODEL_CAPABILITIES } from '@/lib/ai/models';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { getPresignedUrl } from '@/lib/storage/r2-client';
import {
  createChat,
  getChat,
  loadChatMessages,
  saveChatMessage,
  updateChatModel,
  trackLLMUsage
} from '@/lib/ai/chat-store';
import { getSystemPrompt } from '@/features/chat/lib/prompts/system-prompt';
import { getUserMemory, formatMemoryForPrompt } from '@/lib/ai/memory-store';
import { enhanceSystemPromptWithMemory } from '@/lib/ai/memory-prompts';
import { queueMemoryAnalysis } from '@/lib/ai/memory-analyzer';
import { getLocationAgentPrompt, getCombinedPrompt } from '@/features/chat/lib/prompts/agent-prompts';
import { getDbConnection } from '@/lib/db/connection';
import type { AccessibleLocation } from '@/features/location/types/saved-locations';
import type { UnifiedLocationData, UnifiedDataRow } from '@/features/location/data/aggregator/multiLevelAggregator';
import type { ResidentialData } from '@/features/location/data/sources/altum-ai/types';
import personasData from '@/features/location/data/sources/housing-personas.json';
import { randomUUID } from 'crypto';

// Request schema validation
const chatRequestSchema = z.object({
  messages: z.any(), // UIMessage[] - complex type, validated by AI SDK
  chatId: z.string().optional(), // Optional - create new chat if not provided
  modelId: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  fileIds: z.array(z.string()).optional(), // Week 3: File attachments (file_uploads.id)
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
 * Process file attachments for multimodal input
 * Fetches file metadata and generates presigned URLs
 */
async function processFileAttachments(
  fileIds: string[],
  userId: number,
  chatId: string,
  messageId: string
): Promise<Array<{ type: 'image'; image: URL }>> {
  if (!fileIds || fileIds.length === 0) {
    return [];
  }

  const sql = neon(process.env.POSTGRES_URL!);
  const imageParts: Array<{ type: 'image'; image: URL; mediaType: string }> = [];

  console.log(`[Chat API] 📎 Processing ${fileIds.length} file attachments`);

  for (const fileId of fileIds) {
    try {
      // Fetch file metadata and verify ownership
      // Map new column names to what code expects
      const files = await sql`
        SELECT
          fu.id,
          fu.chat_id,
          fu.user_id,
          fu.file_category as file_type,
          fu.original_filename as file_name,
          fu.file_path as storage_key,
          fu.file_size_bytes as file_size,
          fu.mime_type,
          cc.user_id as chat_user_id
        FROM file_uploads fu
        JOIN chat_conversations cc ON cc.id = fu.chat_id
        WHERE fu.id = ${fileId}
          AND cc.user_id = ${userId};
      `;

      if (files.length === 0) {
        console.error(`[Chat API] ❌ File ${fileId} not found or access denied for user ${userId}`);
        continue;
      }

      const file = files[0];

      // Only process images for vision models (PDFs will be handled separately)
      if (file.file_type !== 'image') {
        console.log(`[Chat API] ⏭️  Skipping non-image file: ${file.file_name} (${file.file_type})`);
        continue;
      }

      // Note: file_uploads table doesn't track message_id in restructured schema
      // Files are linked to chats, not individual messages

      // Generate presigned URL (1 hour expiration)
      const presignedUrl = await getPresignedUrl(file.storage_key, 3600);

      console.log(`[Chat API] 🔗 Presigned URL generated: ${presignedUrl.substring(0, 100)}...`);

      imageParts.push({
        type: 'image',
        image: new URL(presignedUrl),
        mediaType: file.mime_type || 'image/png', // Required by Vercel AI SDK v5
      });

      console.log(`[Chat API] ✅ Added image: ${file.file_name} (${file.file_size} bytes)`);

    } catch (error) {
      console.error(`[Chat API] ❌ Error processing file ${fileId}:`, error);
      // Continue with other files
    }
  }

  console.log(`[Chat API] 📎 Successfully processed ${imageParts.length}/${fileIds.length} file attachments`);

  return imageParts;
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
      temperature = 0.7,
      fileIds
    } = validatedData;

    // Priority: message metadata > root metadata > headers > body
    const requestChatId = messageMetadata.chatId || rootMetadata.chatId || headerChatId || bodyChatId;
    const modelId = messageMetadata.modelId || rootMetadata.modelId || headerModelId || bodyModelId || 'claude-sonnet-4.5';
    const locale = (messageMetadata.locale || rootMetadata.locale || body.locale || 'nl') as 'nl' | 'en';
    const requestFileIds = messageMetadata.fileIds || rootMetadata.fileIds || fileIds;

    // Validate model ID
    const model = getModel(modelId as ModelId);

    // Check if model supports vision when files are attached
    const modelInfo = MODEL_CAPABILITIES[modelId as ModelId];
    if (requestFileIds && requestFileIds.length > 0 && !modelInfo?.supportsVision) {
      return new Response(
        JSON.stringify({
          error: 'Model does not support vision',
          message: `The selected model "${modelId}" does not support image input. Please select a vision-capable model like GPT-4o, Claude Sonnet 4.5, or Gemini 2.0 Flash.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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

    // Process file attachments for multimodal input (Week 3)
    if (requestFileIds && requestFileIds.length > 0) {
      // Get the last user message ID (the one we're about to save)
      const lastUserMessage = (clientMessages as UIMessage[]).slice().reverse().find(m => m.role === 'user');
      const messageId = lastUserMessage?.id || randomUUID();

      const imageParts = await processFileAttachments(requestFileIds, userId, chatId!, messageId);

      // Add image parts to the last user message
      // Type assertion needed because AI SDK's UIMessagePart type doesn't properly recognize image parts
      if (imageParts.length > 0 && lastUserMessage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lastUserMessage.parts.push(...(imageParts as any));
        console.log(`[Chat API] 📎 Added ${imageParts.length} images to user message`);
      }
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

    // Build system prompt: base + location agent + user memory
    const baseSystemPrompt = getSystemPrompt(locale);
    const locationAgentPrompt = getLocationAgentPrompt(locale);
    let systemPrompt = getCombinedPrompt(baseSystemPrompt, locationAgentPrompt);

    // Get user memory and enhance system prompt
    try {
      const userMemory = await getUserMemory(userId);
      const memoryText = formatMemoryForPrompt(userMemory);
      if (memoryText) {
        systemPrompt = enhanceSystemPromptWithMemory(systemPrompt, memoryText, locale);
        console.log(`[Chat API] 🧠 User memory loaded (${userMemory.token_count} tokens)`);
      }
    } catch (error) {
      console.error('[Chat API] ⚠️  Failed to load user memory:', error);
      // Continue without memory if there's an error
    }

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
                ua.name as "ownerName",
                FALSE as "isShared",
                TRUE as "canEdit"
              FROM saved_locations sl
              JOIN user_accounts ua ON sl.user_id = ua.id
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
                ua.name as "ownerName",
                TRUE as "isShared",
                ls.can_edit as "canEdit"
              FROM saved_locations sl
              JOIN location_shares ls ON sl.id = ls.saved_location_id
              JOIN user_accounts ua ON sl.user_id = ua.id
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

      compareLocations: tool({
        description: `Compare multiple saved locations across different data categories.

        Use this tool when user wants to:
        - Compare multiple locations side-by-side
        - Find the best location for a specific purpose (families, safety, etc.)
        - Understand differences between saved locations

        The tool returns comparative data for: demographics, safety, health, amenities, and residential data.`,
        inputSchema: z.object({
          locationIds: z.array(z.string().uuid()).min(2).max(4),
          categories: z.array(z.enum(['demographics', 'health', 'safety', 'livability', 'residential', 'amenities'])).optional(),
        }),
        async execute({ locationIds, categories }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT
                sl.id,
                sl.name,
                sl.address,
                sl.location_data as "locationData",
                sl.amenities_data as "amenitiesData"
              FROM saved_locations sl
              WHERE sl.id = ANY(${locationIds})
                AND (sl.user_id = ${userId} OR EXISTS (
                  SELECT 1 FROM location_shares
                  WHERE saved_location_id = sl.id
                    AND shared_with_user_id = ${userId}
                ))
            `;

            if (results.length === 0) {
              return { success: false, error: 'No accessible locations found with provided IDs' };
            }

            if (results.length < locationIds.length) {
              return {
                success: false,
                error: `Only ${results.length} of ${locationIds.length} locations are accessible. Some locations may not exist or you don't have access.`
              };
            }

            const comparisons = results.map(loc => ({
              id: loc.id,
              name: loc.name || 'Unnamed Location',
              address: loc.address,
              summary: {
                demographics: loc.locationData?.demographics?.neighborhood?.slice(0, 5) || [],
                safety: loc.locationData?.safety?.neighborhood?.slice(0, 3) || [],
                health: loc.locationData?.health?.municipality?.slice(0, 3) || [],
                amenitiesCount: loc.amenitiesData?.length || 0,
              }
            }));

            return {
              success: true,
              locations: comparisons,
              comparisonCount: results.length,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to compare locations',
            };
          }
        },
      }),

      searchAmenities: tool({
        description: `Search and filter amenities for a specific location by category and distance.

        Use this tool when user asks about:
        - "How many restaurants are nearby?"
        - "Show me schools within 1km"
        - "What shops are close to this location?"

        Available categories: restaurants, cafes, supermarkets, schools, healthcare, sports, parks, shopping, services
        Distance filter: Specify maximum distance in meters (default: 500m)`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
          category: z.enum(['restaurant', 'cafe', 'supermarket', 'school', 'healthcare', 'sports', 'park', 'shopping', 'service', 'all']).optional(),
          maxDistance: z.number().min(100).max(2000).optional(),
        }),
        async execute({ locationId, category, maxDistance = 500 }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT amenities_data as "amenitiesData"
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

            const amenitiesData = results[0].amenitiesData as UnifiedDataRow[] || [];

            // Filter by category and distance
            let filteredAmenities = amenitiesData;

            if (category && category !== 'all') {
              filteredAmenities = amenitiesData.filter(amenity =>
                amenity.key?.toLowerCase().includes(category.toLowerCase()) ||
                amenity.title?.toLowerCase().includes(category.toLowerCase())
              );
            }

            // Distance filtering would require distance data in amenities
            // For now, return filtered results
            const summary = {
              total: filteredAmenities.length,
              category: category || 'all',
              maxDistance,
              topResults: filteredAmenities.slice(0, 10).map(a => ({
                name: a.title || a.key,
                type: a.key,
                value: a.displayValue || a.value,
              }))
            };

            return {
              success: true,
              ...summary,
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to search amenities',
            };
          }
        },
      }),

      explainDataSource: tool({
        description: `Provide educational information about the data sources used in GroosHub location analysis.

        Use this tool when user asks:
        - "Where does this data come from?"
        - "What is CBS/RIVM/Politie?"
        - "How reliable is the health data?"
        - "How often is data updated?"

        Available sources: CBS, RIVM, Politie, GooglePlaces, AltumAI`,
        inputSchema: z.object({
          source: z.enum(['CBS', 'RIVM', 'Politie', 'GooglePlaces', 'AltumAI', 'all']),
        }),
        async execute({ source }) {
          const sources = {
            CBS: {
              fullName: 'Centraal Bureau voor de Statistiek (Statistics Netherlands)',
              description: 'The Dutch national statistics office, providing official demographic, economic, and social data.',
              dataProvided: ['Demographics (age, income, household types)', 'Livability indices', 'Housing statistics'],
              updateFrequency: 'Annually for most datasets, some quarterly updates',
              geographicLevels: ['National', 'Municipality', 'District', 'Neighborhood'],
              reliability: 'Very High - Official government statistics',
              website: 'https://www.cbs.nl',
            },
            RIVM: {
              fullName: 'Rijksinstituut voor Volksgezondheid en Milieu (National Institute for Public Health)',
              description: 'Dutch national public health institute providing health and environmental data.',
              dataProvided: ['Air quality', 'Noise pollution', 'Life expectancy', 'Health metrics'],
              updateFrequency: 'Varies by dataset - monthly to annually',
              geographicLevels: ['National', 'Municipality', 'Some postal code areas'],
              reliability: 'Very High - Official health authority',
              website: 'https://www.rivm.nl',
            },
            Politie: {
              fullName: 'Nederlandse Politie (Dutch National Police)',
              description: 'Official police organization providing crime and safety statistics.',
              dataProvided: ['Crime rates', 'Incident reports', 'Safety indices'],
              updateFrequency: 'Quarterly updates',
              geographicLevels: ['National', 'Municipality', 'District', 'Neighborhood'],
              reliability: 'High - Official police data, subject to reporting variations',
              website: 'https://www.politie.nl',
            },
            GooglePlaces: {
              fullName: 'Google Places API',
              description: 'Commercial service providing real-time information about nearby amenities and points of interest.',
              dataProvided: ['Restaurants', 'Shops', 'Schools', 'Healthcare facilities', 'Services', 'Parks'],
              updateFrequency: 'Real-time / continuously updated',
              geographicLevels: ['Radius-based (not administrative boundaries)'],
              reliability: 'High for amenity presence, varies for details (user-generated content)',
              website: 'https://developers.google.com/maps',
            },
            AltumAI: {
              fullName: 'Altum AI - Interactive Reference API',
              description: 'AI-powered housing market analysis platform providing residential property valuations and market data.',
              dataProvided: ['Housing prices', 'Property types', 'Market trends', 'Reference properties'],
              updateFrequency: 'Monthly updates from Kadaster (Land Registry) and Funda',
              geographicLevels: ['Postal code', 'Street level'],
              reliability: 'High - Based on official transaction data and MLS listings',
              website: 'https://altum.ai',
            },
          };

          if (source === 'all') {
            return {
              success: true,
              sources: Object.entries(sources).map(([key, value]) => ({
                abbreviation: key,
                ...value,
              })),
            };
          }

          const sourceInfo = sources[source];
          if (!sourceInfo) {
            return { success: false, error: 'Unknown data source' };
          }

          return {
            success: true,
            source: source,
            ...sourceInfo,
          };
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

          // Queue memory analysis (background, non-blocking)
          // Analyzes last 10 messages using cheap model (Claude Haiku)
          // Only triggers every 10 messages or when significant new info detected
          try {
            queueMemoryAnalysis(userId, chatId!, allMessages, locale);
            console.log(`[Chat API] 🧠 Memory analysis queued for user ${userId}`);
          } catch (error) {
            console.error(`[Chat API] ⚠️  Failed to queue memory analysis:`, error);
            // Non-critical - continue even if memory analysis fails
          }
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
      version: '3.0.0', // Updated for Week 3: Multi-Modal Input
      features: {
        streaming: true,
        persistence: true,
        multimodal: true,
        visionModels: 11, // 11 out of 17 models support vision
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
