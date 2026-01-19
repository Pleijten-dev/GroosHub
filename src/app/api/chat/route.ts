/**
 * Chat API Route
 * Handles streaming chat responses using Vercel AI SDK
 *
 * Week 1: Basic streaming chat with multi-model support
 * Week 2: Persistence - Save/load messages from database
 * Week 2.5: Location Agent - Tools for location analysis
 * Week 3: Multi-Modal Input - Support for images and PDFs with vision models
 */

import { streamText, stepCountIs, tool, convertToModelMessages, type UIMessage, type FileUIPart } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getModel, type ModelId, MODEL_CAPABILITIES } from '@/lib/ai/models';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { getPresignedUrl } from '@/lib/storage/r2-client';
import sharp from 'sharp';
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
import { getLocationAgentPrompt, getTaskAgentPrompt, getCombinedPrompt } from '@/features/chat/lib/prompts/agent-prompts';
import { getDbConnection } from '@/lib/db/connection';
import type { AccessibleLocation } from '@/features/location/types/saved-locations';
import type { UnifiedLocationData, UnifiedDataRow } from '@/features/location/data/aggregator/multiLevelAggregator';
import type { ResidentialData } from '@/features/location/data/sources/altum-ai/types';
import personasData from '@/features/location/data/sources/housing-personas.json';
import { randomUUID } from 'crypto';
// RAG System imports
import { findRelevantContent, type RetrievedChunk } from '@/lib/ai/rag/retriever';
import { getChunkCountByProjectId } from '@/lib/db/queries/project-doc-chunks';
import { createTaskTools } from '@/features/chat/tools/taskTools';

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
): Promise<FileUIPart[]> {
  if (!fileIds || fileIds.length === 0) {
    return [];
  }

  const sql = neon(process.env.POSTGRES_URL!);
  const fileParts: FileUIPart[] = [];

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

      console.log(`[Chat API] 🔗 Presigned URL generated for: ${file.file_name}`);

      // Anthropic requires base64 data URLs (they don't fetch external URLs)
      // Download the image and convert to base64
      const imageResponse = await fetch(presignedUrl);

      if (!imageResponse.ok) {
        console.error(`[Chat API] ❌ Failed to fetch image from presigned URL: ${imageResponse.status} ${imageResponse.statusText}`);
        continue;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const originalSize = imageBuffer.byteLength;

      // Resize image to reduce token usage and API costs
      // Max 1024px dimension, JPEG quality 80 = 85-90% size reduction
      console.log(`[Chat API] 📐 Resizing image from ${Math.round(originalSize / 1024)}KB...`);

      const resizedBuffer = await sharp(Buffer.from(imageBuffer))
        .resize(1024, 1024, {
          fit: 'inside',           // Maintain aspect ratio, fit within 1024x1024
          withoutEnlargement: true // Don't upscale small images
        })
        .jpeg({ quality: 80 })     // Convert to JPEG with 80% quality
        .toBuffer();

      const resizedSize = resizedBuffer.byteLength;
      const reductionPercent = Math.round((1 - resizedSize / originalSize) * 100);

      console.log(`[Chat API] ✨ Resized: ${Math.round(originalSize / 1024)}KB → ${Math.round(resizedSize / 1024)}KB (${reductionPercent}% reduction)`);

      const base64 = resizedBuffer.toString('base64');

      // Use JPEG format for resized images (better compression than PNG)
      const imageFormat = 'jpeg';
      const dataUrl = `data:image/${imageFormat};base64,${base64}`;

      // Verify data URL format
      console.log(`[Chat API] 📸 Image format: ${imageFormat}, Data URL length: ${dataUrl.length}, Base64 length: ${base64.length}`);
      console.log(`[Chat API] 📸 Data URL prefix: ${dataUrl.substring(0, 100)}...`);

      // Create FileUIPart following official Vercel AI SDK v5 pattern
      // FileUIPart is the correct format for multimodal UIMessages
      // convertToModelMessages() will convert FileUIPart → FilePart for the model
      fileParts.push({
        type: 'file',
        mediaType: 'image/jpeg', // Always JPEG after resizing
        url: dataUrl, // Base64 data URL
      });

      console.log(`[Chat API] ✅ Added image: ${file.file_name} (original: ${Math.round(originalSize / 1024)}KB, resized: ${Math.round(resizedSize / 1024)}KB)`);

    } catch (error) {
      console.error(`[Chat API] ❌ Error processing file ${fileId}:`, error);
      // Continue with other files
    }
  }

  console.log(`[Chat API] 📎 Successfully processed ${fileParts.length}/${fileIds.length} file attachments`);

  return fileParts;
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
    const projectId = messageMetadata.projectId || rootMetadata.projectId || undefined;

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
    let existingChat: any = null; // Will store chat object for RAG lookup

    console.log(`[Chat API] 🔍 Received ${clientMessages.length} messages from client`);
    console.log(`[Chat API] 📝 Client message roles:`, (clientMessages as UIMessage[]).map(m => m.role).join(', '));

    if (chatId) {
      // Check if chat exists in database
      existingChat = await getChat(chatId);

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
          projectId, // Link chat to project if provided
          metadata: { temperature },
          chatId // Use the client-provided chatId
        });

        console.log(`[Chat API] ✅ Created new chat ${chatId} for user ${userId}${projectId ? ` (project: ${projectId})` : ''}`);
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
        projectId, // Link chat to project if provided
        metadata: { temperature }
      });

      console.log(`[Chat API] ✅ Created new chat ${chatId} for user ${userId}${projectId ? ` (project: ${projectId})` : ''}`);
    }

    // Process file attachments for multimodal input (Week 3)
    if (requestFileIds && requestFileIds.length > 0) {
      // Get the last user message ID (the one we're about to save)
      const lastUserMessage = (clientMessages as UIMessage[]).slice().reverse().find(m => m.role === 'user');
      const messageId = lastUserMessage?.id || randomUUID();

      const fileParts = await processFileAttachments(requestFileIds, userId, chatId!, messageId);

      // Add FileUIParts to the last user message
      // FileUIPart is the correct UIMessage format for file attachments
      // convertToModelMessages() will convert FileUIPart → FilePart for the model
      if (fileParts.length > 0 && lastUserMessage) {
        lastUserMessage.parts.push(...fileParts);
        console.log(`[Chat API] 📎 Added ${fileParts.length} file attachments to user message`);
        console.log(`[Chat API] 🔍 Last user message parts:`, JSON.stringify(lastUserMessage.parts, null, 2));
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

    // Build system prompt: base + location agent + task agent + user memory
    const baseSystemPrompt = getSystemPrompt(locale);
    const locationAgentPrompt = getLocationAgentPrompt(locale);
    const taskAgentPrompt = getTaskAgentPrompt(locale);
    let systemPrompt = getCombinedPrompt(baseSystemPrompt, locationAgentPrompt, taskAgentPrompt);

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

    // RAG System: Two modes
    // 1. Phase 4 Agent RAG (from metadata.ragContext) - Priority
    // 2. Legacy project-based RAG (from existingChat.project_id) - Fallback
    let retrievedChunks: RetrievedChunk[] = [];

    // Check for Phase 4 Agent RAG context in metadata
    const agentRagContext = messageMetadata.ragContext || rootMetadata.ragContext;

    if (agentRagContext && agentRagContext.answer && agentRagContext.sources) {
      // Phase 4 Agent RAG: Use pre-processed agent results
      console.log(`[Chat API] 🤖 Using Phase 4 Agent RAG (confidence: ${agentRagContext.confidence})`);
      console.log(`[Chat API] 📚 Agent found ${agentRagContext.sources.length} sources`);

      // Build RAG context from agent results
      let ragContext = '\n\n---\n\nRELEVANT CONTEXT FROM PROJECT DOCUMENTS (Agent RAG):\n\n';
      ragContext += `Agent Analysis (${agentRagContext.confidence} confidence):\n${agentRagContext.answer}\n\n`;
      ragContext += 'Supporting Sources:\n';

      agentRagContext.sources.forEach((source: any, i: number) => {
        ragContext += `[Source ${i + 1}: ${source.file}]\n`;
        ragContext += `${source.text}\n\n`;
      });

      ragContext += '---\n\n';
      ragContext += 'CRITICAL INSTRUCTIONS FOR USING PROJECT DOCUMENTS - YOU MUST FOLLOW THESE:\n';
      ragContext += '1. MANDATORY: When using information from the sources above, you MUST cite them using [Source N] notation\n';
      ragContext += '2. MANDATORY: Cite sources INLINE within your answer text, immediately after each fact or claim\n';
      ragContext += '   Example: "According to the building code [Source 1], the minimum height is 2.6 meters [Source 2]."\n';
      ragContext += '3. MANDATORY: Every fact, number, or requirement from the sources MUST have a citation\n';
      ragContext += '4. The agent has analyzed the documents and provided an answer - use it to inform your response\n';
      ragContext += '5. You can elaborate on the agent\'s answer or provide additional context from the sources\n';
      ragContext += '6. If the sources don\'t contain relevant information, you can answer from general knowledge but clearly state this\n';
      ragContext += '7. NEVER invent citations - only cite sources that actually contain the information\n\n';

      // Inject Agent RAG context into system prompt
      systemPrompt = systemPrompt + ragContext;

      console.log(`[Chat API] 📝 Enhanced system prompt with Agent RAG context`);

      // Store sources for metadata (use ragSources from metadata if available)
      if (messageMetadata.ragSources || rootMetadata.ragSources) {
        retrievedChunks = (messageMetadata.ragSources || rootMetadata.ragSources) as RetrievedChunk[];
        console.log(`[Chat API] 💾 Stored ${retrievedChunks.length} full RAG sources for message metadata`);
      }

    } else if (existingChat && existingChat.project_id) {
      // Legacy project-based RAG: Fall back to old system
      try {
        // Check if project has any embedded documents
        const chunkCount = await getChunkCountByProjectId(existingChat.project_id);

        if (chunkCount > 0) {
          // Get the last user message for RAG query
          const lastUserMessage = truncatedMessages
            .filter(m => m.role === 'user')
            .slice(-1)[0];

          if (lastUserMessage) {
            const queryText = lastUserMessage.parts
              .filter(p => p.type === 'text')
              .map(p => ('text' in p ? p.text : ''))
              .join(' ');

            if (queryText) {
              console.log(`[Chat API] 📚 Retrieving RAG context for project ${existingChat.project_id}`);

              retrievedChunks = await findRelevantContent({
                projectId: existingChat.project_id,
                query: queryText,
                topK: 5,
                similarityThreshold: 0.7,
                useHybridSearch: true
              });

              if (retrievedChunks.length > 0) {
                console.log(
                  `[Chat API] ✅ Retrieved ${retrievedChunks.length} relevant chunks ` +
                  `(avg similarity: ${(retrievedChunks.reduce((sum, c) => sum + c.similarity, 0) / retrievedChunks.length).toFixed(3)})`
                );

                // Build RAG context to inject into system prompt
                let ragContext = '\n\n---\n\nRELEVANT CONTEXT FROM PROJECT DOCUMENTS:\n\n';

                retrievedChunks.forEach((chunk, i) => {
                  ragContext += `[Source ${i + 1}: ${chunk.sourceFile}`;
                  if (chunk.pageNumber) ragContext += `, Page ${chunk.pageNumber}`;
                  ragContext += ` - Relevance: ${(chunk.similarity * 100).toFixed(0)}%]\n`;
                  ragContext += `${chunk.chunkText}\n\n`;
                });

                ragContext += '---\n\n';
                ragContext += 'CRITICAL INSTRUCTIONS FOR USING PROJECT DOCUMENTS - YOU MUST FOLLOW THESE:\n';
                ragContext += '1. MANDATORY: When using information from the sources above, you MUST cite them using [Source N] notation\n';
                ragContext += '2. MANDATORY: Cite sources INLINE within your answer text, immediately after each fact or claim\n';
                ragContext += '   Example: "According to the building code [Source 1], the minimum height is 2.6 meters [Source 2]."\n';
                ragContext += '3. MANDATORY: Every fact, number, or requirement from the sources MUST have a citation\n';
                ragContext += '4. If the context contains relevant information, use it in your answer with citations\n';
                ragContext += '5. If the context does not contain relevant information, you can answer from general knowledge but clearly state this\n';
                ragContext += '6. NEVER invent citations - only cite sources that actually contain the information\n\n';

                // Inject RAG context into system prompt
                systemPrompt = systemPrompt + ragContext;

                console.log(`[Chat API] 📝 Enhanced system prompt with RAG context (${retrievedChunks.length} sources)`);
              } else {
                console.log(`[Chat API] ℹ️  No relevant chunks found (similarity threshold: 0.7)`);
              }
            }
          }
        } else {
          console.log(`[Chat API] ℹ️  Project ${existingChat.project_id} has no embedded documents`);
        }
      } catch (error) {
        console.error('[Chat API] ⚠️  RAG retrieval failed:', error);
        // Continue without RAG if there's an error
      }
    } else {
      console.log(`[Chat API] ℹ️  No RAG context available (neither Agent RAG nor project-based RAG)`);
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
    console.log(`[Chat API] 🔧 Location and task management tools enabled for user ${userId}`);

    // Debug: Log the last user message to see if files/images are included
    const lastUserMsg = messagesWithSystem.filter(m => m.role === 'user').slice(-1)[0];
    if (lastUserMsg) {
      // Type-safe part inspection using official FileUIPart type
      type MessagePart = typeof lastUserMsg.parts[number] | FileUIPart;

      console.log(`[Chat API] 🔍 Last user message before sending to model:`, JSON.stringify({
        role: lastUserMsg.role,
        id: lastUserMsg.id,
        partsCount: lastUserMsg.parts?.length,
        partTypes: lastUserMsg.parts?.map(p => p.type),
        partSummary: lastUserMsg.parts?.map((p: MessagePart) => {
          if (p.type === 'text') return { type: 'text', preview: ('text' in p ? p.text?.substring(0, 50) : '') || '' };
          if (p.type === 'file' && 'url' in p) return {
            type: 'file',
            mediaType: 'mediaType' in p ? p.mediaType : 'unknown',
            urlType: (typeof p.url === 'string') ?
              (p.url.startsWith('data:') ? 'data-url' : 'http-url') :
              'unknown',
            urlPrefix: (typeof p.url === 'string') ? p.url.substring(0, 50) : 'N/A'
          };
          return { type: p.type };
        })
      }, null, 2));
    }

    // Create location agent tools with userId injected from session
    // These tools are defined inline so we can inject userId without exposing it to the LLM
    const locationTools = {
      listUserSavedLocations: tool({
        description: `Get all saved locations accessible to the current user through their project memberships.

        Use this tool when:
        - User asks about "my locations" or "saved locations"
        - User references a location without specifying which one
        - You need to clarify which location the user is asking about
        - User asks to compare multiple locations

        The tool returns: project name, address, owner info, and timestamps`,
        inputSchema: z.object({}),
        async execute() {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT
                ls.id,
                p.name as name,
                ls.address,
                JSONB_BUILD_OBJECT('lat', ls.latitude, 'lng', ls.longitude) as coordinates,
                'completed' as "completionStatus",
                ls.created_at as "createdAt",
                ls.updated_at as "updatedAt",
                ls.user_id as "ownerId",
                ua.name as "ownerName",
                CASE WHEN ls.user_id = ${userId} THEN FALSE ELSE TRUE END as "isShared",
                CASE WHEN pm.role IN ('owner', 'admin') OR ls.user_id = ${userId} THEN TRUE ELSE FALSE END as "canEdit"
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              JOIN user_accounts ua ON ls.user_id = ua.id
              WHERE pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true

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
              SELECT
                ls.demographics_data,
                ls.health_data,
                ls.safety_data,
                ls.livability_data,
                ls.amenities_data,
                ls.housing_data
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const row = results[0];

            // Build location data structure from separate database fields
            const locationData = {
              demographics: row.demographics_data || {},
              health: row.health_data || {},
              safety: row.safety_data || {},
              livability: row.livability_data || {},
              residential: row.housing_data || {},
              amenities: row.amenities_data || []
            };

            // Return simplified data based on category
            if (category === 'demographics' && locationData.demographics) {
              const primary = locationData.demographics.neighborhood || locationData.demographics.municipality || [];
              return {
                success: true,
                category: 'demographics',
                data: primary.slice(0, 10),
              };
            }

            if (category === 'all') {
              return { success: true, category, data: locationData };
            }

            // Return specific category
            const categoryData = locationData[category as keyof typeof locationData];
            return {
              success: true,
              category,
              data: categoryData
            };
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
                ls.id,
                p.name,
                ls.address,
                ls.demographics_data,
                ls.health_data,
                ls.safety_data,
                ls.livability_data,
                ls.amenities_data,
                ls.housing_data
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ANY(${locationIds})
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
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

            const comparisons = results.map(loc => {
              // Build unified location data from separate fields
              const locationData = {
                demographics: loc.demographics_data || {},
                health: loc.health_data || {},
                safety: loc.safety_data || {},
                livability: loc.livability_data || {},
              };

              return {
                id: loc.id,
                name: loc.name || 'Unnamed Location',
                address: loc.address,
                summary: {
                  demographics: locationData.demographics?.neighborhood?.slice(0, 5) || [],
                  safety: locationData.safety?.neighborhood?.slice(0, 3) || [],
                  health: locationData.health?.municipality?.slice(0, 3) || [],
                  amenitiesCount: Array.isArray(loc.amenities_data) ? loc.amenities_data.length : 0,
                }
              };
            });

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
              SELECT ls.amenities_data
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const amenitiesData = results[0].amenities_data as UnifiedDataRow[] || [];

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

      visualizeDemographics: tool({
        description: `Generate demographic data visualizations (charts) for a saved location.

        Use this tool when user asks to:
        - "Show me demographics charts"
        - "Visualize the age distribution"
        - "Display demographic data as graphs"
        - "Show me population statistics visually"

        Returns structured chart data for age distribution, marital status, migration background, and family composition.`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
          sections: z.array(z.enum(['age', 'status', 'immigration', 'family'])).optional().describe('Specific sections to visualize. If not provided, shows all sections.'),
        }),
        async execute({ locationId, sections }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT ls.demographics_data, ls.address, p.name as project_name
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const data = results[0].demographics_data as any;
            const address = results[0].address;

            if (!data || !data.neighborhood) {
              return { success: false, error: 'Demographics data not available for this location' };
            }

            const neighborhood = data.neighborhood;

            // Helper function to find field value (use relative/percentage data like location page)
            const findField = (fieldKey: string) => {
              const field = neighborhood.find((f: any) => f.key === fieldKey);
              // Use relative (percentage) value, fallback to absolute value
              return field ? (parseFloat(field.relative) || parseFloat(field.value) || 0) : 0;
            };

            const charts: any = {};
            const requestedSections = sections || ['age', 'status', 'immigration', 'family'];

            if (requestedSections.includes('age')) {
              charts.age = {
                title: 'Age Distribution',
                type: 'density',
                data: [
                  { name: '0-15', value: findField('k_0Tot15Jaar_8'), color: '#477638' },
                  { name: '15-25', value: findField('k_15Tot25Jaar_9'), color: '#5a8a4d' },
                  { name: '25-45', value: findField('k_25Tot45Jaar_10'), color: '#6d9e62' },
                  { name: '45-65', value: findField('k_45Tot65Jaar_11'), color: '#80b277' },
                  { name: '65+', value: findField('k_65JaarOfOuder_12'), color: '#93c68c' }
                ]
              };
            }

            if (requestedSections.includes('status')) {
              charts.maritalStatus = {
                title: 'Marital Status',
                type: 'bar',
                data: [
                  { name: 'Unmarried', value: findField('Ongehuwd_13'), color: '#477638' },
                  { name: 'Married', value: findField('Gehuwd_14'), color: '#5a8a4d' },
                  { name: 'Divorced', value: findField('Gescheiden_15'), color: '#6d9e62' },
                  { name: 'Widowed', value: findField('Verweduwd_16'), color: '#80b277' }
                ]
              };
            }

            if (requestedSections.includes('immigration')) {
              charts.migration = {
                title: 'Migration Background',
                type: 'bar',
                data: [
                  { name: 'Native', value: findField('Autochtoon'), color: '#477638' },
                  { name: 'Western', value: findField('WestersTotaal_17'), color: '#5a8a4d' },
                  { name: 'Non-Western', value: findField('NietWestersTotaal_18'), color: '#6d9e62' },
                  { name: 'Morocco', value: findField('Marokko_19'), color: '#80b277' },
                  { name: 'Antilles', value: findField('NederlandseAntillenEnAruba_20'), color: '#93c68c' },
                  { name: 'Suriname', value: findField('Suriname_21'), color: '#a6da9e' },
                  { name: 'Turkey', value: findField('Turkije_22'), color: '#b9edb0' },
                  { name: 'Other', value: findField('OverigNietWesters_23'), color: '#ccffc2' }
                ]
              };
            }

            if (requestedSections.includes('family')) {
              charts.familyType = {
                title: 'Family Composition',
                type: 'bar',
                data: [
                  { name: 'Single', value: findField('Eenpersoonshuishoudens_29'), color: '#477638' },
                  { name: 'No children', value: findField('HuishoudensZonderKinderen_30'), color: '#5a8a4d' },
                  { name: 'With children', value: findField('HuishoudensMetKinderen_31'), color: '#6d9e62' }
                ]
              };
            }

            return {
              success: true,
              address,
              charts,
              visualizationType: 'demographics'
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate demographics visualization'
            };
          }
        },
      }),

      visualizeSafety: tool({
        description: `Generate safety data visualizations for a saved location.

        Use this tool when user asks to:
        - "Show me safety charts"
        - "Visualize crime statistics"
        - "Display safety data graphically"

        Returns structured chart data for different crime categories.`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
        }),
        async execute({ locationId }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT ls.safety_data, ls.address
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const data = results[0].safety_data as any;
            const address = results[0].address;

            if (!data || !data.neighborhood) {
              return { success: false, error: 'Safety data not available for this location' };
            }

            const neighborhood = data.neighborhood;

            const findField = (fieldKey: string) => {
              const field = neighborhood.find((f: any) => f.key === fieldKey);
              return field ? (parseFloat(field.relative) || parseFloat(field.value) || 0) : 0;
            };

            return {
              success: true,
              address,
              charts: {
                crimeTypes: {
                  title: 'Crime Statistics',
                  type: 'bar',
                  data: [
                    { name: 'Total Crime', value: findField('TotaalGeregistreerdeMisdrijven_2'), color: '#ef4444' },
                    { name: 'Violent', value: findField('Geweldsmisdrijven_3'), color: '#dc2626' },
                    { name: 'Property', value: findField('VermogensmisdrijvenTotaal_4'), color: '#f59e0b' },
                    { name: 'Vandalism', value: findField('Vernieling_5'), color: '#f97316' }
                  ]
                }
              },
              visualizationType: 'safety'
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate safety visualization'
            };
          }
        },
      }),

      visualizeHealth: tool({
        description: `Generate health data visualizations for a saved location.

        Use this tool when user asks to:
        - "Show me health charts"
        - "Visualize health indicators"
        - "Display health data as graphs"

        Returns structured chart data for health metrics.`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
        }),
        async execute({ locationId }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT ls.health_data, ls.address
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const data = results[0].health_data as any;
            const address = results[0].address;

            if (!data || !data.municipality) {
              return { success: false, error: 'Health data not available for this location' };
            }

            const municipality = data.municipality;

            const findField = (fieldKey: string) => {
              const field = municipality.find((f: any) => f.key === fieldKey);
              return field ? (parseFloat(field.relative) || parseFloat(field.value) || 0) : 0;
            };

            return {
              success: true,
              address,
              charts: {
                healthMetrics: {
                  title: 'Health Indicators',
                  type: 'bar',
                  data: [
                    { name: 'Life Expectancy', value: findField('Levensverwachting_2'), color: '#10b981' },
                    { name: 'Healthy Life Years', value: findField('GezondLevensverwachting_3'), color: '#059669' }
                  ]
                }
              },
              visualizationType: 'health'
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate health visualization'
            };
          }
        },
      }),

      visualizeLivability: tool({
        description: `Generate livability data visualizations for a saved location.

        Use this tool when user asks to:
        - "Show me livability charts"
        - "Visualize livability scores"
        - "Display quality of life metrics"

        Returns structured chart data for livability indicators.`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
        }),
        async execute({ locationId }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT ls.livability_data, ls.address
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const data = results[0].livability_data as any;
            const address = results[0].address;

            if (!data || !data.neighborhood) {
              return { success: false, error: 'Livability data not available for this location' };
            }

            const neighborhood = data.neighborhood;

            const findField = (fieldKey: string) => {
              const field = neighborhood.find((f: any) => f.key === fieldKey);
              return field ? (parseFloat(field.relative) || parseFloat(field.value) || 0) : 0;
            };

            return {
              success: true,
              address,
              charts: {
                livabilityScores: {
                  title: 'Livability Indicators',
                  type: 'radial',
                  data: [
                    { name: 'Physical Environment', value: findField('FysiekeBevolking_2') * 10, color: '#477638' },
                    { name: 'Social Cohesion', value: findField('SocialeCohesie_4') * 10, color: '#5a8a4d' },
                    { name: 'Safety', value: findField('VeiligheidsIndex_5') * 10, color: '#6d9e62' },
                    { name: 'Services', value: findField('VoorzieningenIndex_6') * 10, color: '#80b277' },
                    { name: 'Housing', value: findField('WoningIndex_3') * 10, color: '#93c68c' }
                  ]
                }
              },
              visualizationType: 'livability'
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate livability visualization'
            };
          }
        },
      }),

      visualizeHousing: tool({
        description: `Generate housing market data visualizations for a saved location.

        Use this tool when user asks to:
        - "Show me housing charts"
        - "Visualize property prices"
        - "Display housing market data"

        Returns structured chart data for housing metrics.`,
        inputSchema: z.object({
          locationId: z.string().uuid(),
        }),
        async execute({ locationId }) {
          try {
            const sql = getDbConnection();
            const results = await sql`
              SELECT ls.housing_data, ls.address
              FROM location_snapshots ls
              JOIN project_projects p ON ls.project_id = p.id
              JOIN project_members pm ON p.id = pm.project_id
              WHERE ls.id = ${locationId}
                AND pm.user_id = ${userId}
                AND pm.left_at IS NULL
                AND ls.is_active = true
            `;

            if (results.length === 0) {
              return { success: false, error: 'Location not found or access denied' };
            }

            const data = results[0].housing_data as any;
            const address = results[0].address;

            if (!data || !data.neighborhood) {
              return { success: false, error: 'Housing data not available for this location' };
            }

            const neighborhood = data.neighborhood;

            const findField = (fieldKey: string) => {
              const field = neighborhood.find((f: any) => f.key === fieldKey);
              return field ? (parseFloat(field.relative) || parseFloat(field.value) || 0) : 0;
            };

            return {
              success: true,
              address,
              charts: {
                housingTypes: {
                  title: 'Housing Ownership',
                  type: 'radial',
                  data: [
                    { name: 'Owner-Occupied', value: findField('EigendomWoning_37'), color: '#3b82f6' },
                    { name: 'Rental', value: findField('HuurwoningTotaal_38'), color: '#60a5fa' }
                  ]
                },
                propertyTypes: {
                  title: 'Property Types',
                  type: 'bar',
                  data: [
                    { name: 'Single Family', value: findField('Eengezinswoning_34'), color: '#3b82f6' },
                    { name: 'Apartment', value: findField('Meergezinswoning_35'), color: '#60a5fa' }
                  ]
                }
              },
              visualizationType: 'housing'
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate housing visualization'
            };
          }
        },
      }),
    };

    // Create task management tools with userId and locale injected
    const taskTools = createTaskTools(userId, locale);

    // Combine location and task tools for the AI agent
    const allTools = {
      ...locationTools,
      ...taskTools,
    };

    // Stream the response with location agent tools
    // Two-step conversion for proper Anthropic image handling:
    // 1. Use convertToModelMessages() to get correct message structure
    // 2. Post-process to convert FilePart → ImagePart for images
    const modelMessages = convertToModelMessages(messagesWithSystem);

    // Fix image parts: Anthropic needs type 'image' for visual analysis, not 'file'
    const convertedMessages = modelMessages.map(msg => {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map((part: any) => {
            // Convert FilePart with image data → ImagePart for visual analysis
            if (part.type === 'file' && part.mimeType?.startsWith('image/')) {
              return {
                type: 'image',
                image: part.data, // Base64 data URL
              };
            }
            return part;
          })
        };
      }
      return msg;
    });

    // Track visualization tool results to inject into database-saved message
    const visualizationResults: any[] = [];

    const result = streamText({
      model,
      messages: convertedMessages,
      temperature,
      // Location and task management tools with userId injected
      tools: allTools,
      // Allow multi-step tool calling (up to 10 steps)
      stopWhen: stepCountIs(10),
      // Log each step and capture visualization results
      onStepFinish({ text, toolCalls, toolResults, usage, finishReason }) {
        console.log(`[Chat API] 🔧 Step finished`);
        console.log(`[Chat API] 📝 Text length: ${text.length}`);
        console.log(`[Chat API] 🛠️  Tool calls: ${toolCalls.length}`);

        if (toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            console.log(`[Chat API] 🔨 Tool ${index + 1}: ${call.toolName}`);
            console.log(`[Chat API] 📋 Tool call ID: ${call.toolCallId}`);

            // Capture visualization tool results
            const vizTools = ['visualizeDemographics', 'visualizeSafety', 'visualizeHealth', 'visualizeLivability', 'visualizeHousing'];
            if (vizTools.includes(call.toolName)) {
              const result = toolResults.find(r => 'toolCallId' in r && r.toolCallId === call.toolCallId);
              if (result && 'output' in result) {
                console.log(`[Chat API] 📊 Captured ${call.toolName} result for database injection`);
                visualizationResults.push(result.output);
              }
            }
          });
        }

        if (toolResults.length > 0) {
          toolResults.forEach((result, index) => {
            console.log(`[Chat API] ✅ Tool result ${index + 1}: ${JSON.stringify(result).substring(0, 200)}`);
          });
        }
      },
      async onFinish({ text, usage }) {
        try {
          const responseTime = Date.now() - startTime;

          console.log(`[Chat API] 🎯 onFinish callback triggered`);
          console.log(`[Chat API] 📊 Response - Chat: ${chatId}, Tokens: ${usage.totalTokens}, Length: ${text.length}, Time: ${responseTime}ms`);

          // Inject visualization JSON into message for database (frontend will reload to see it)
          let finalText = text;
          if (visualizationResults.length > 0) {
            console.log(`[Chat API] 💉 Injecting ${visualizationResults.length} visualization(s) into database message`);
            visualizationResults.forEach((vizData) => {
              finalText += `\n\n\`\`\`json\n${JSON.stringify(vizData, null, 2)}\n\`\`\``;
            });
            console.log(`[Chat API] ✅ Message size: ${text.length} → ${finalText.length} (+${finalText.length - text.length} chars)`);
          }

          // Save assistant message to database (with injected visualization JSON)
          const assistantMessage: UIMessage = {
            id: randomUUID(),
            role: 'assistant',
            parts: [{ type: 'text', text: finalText }]
          };

          // Get token counts with defaults
          const inputTokens = usage.inputTokens || 0;
          const outputTokens = usage.outputTokens || 0;

          console.log(`[Chat API] 💾 Saving assistant message to chat ${chatId}`);
          console.log(`[Chat API] 💾 Assistant text preview: "${text.substring(0, 50)}..."`);
          console.log(`[Chat API] 💾 Tokens - Input: ${inputTokens}, Output: ${outputTokens}`);

          // Add RAG sources to metadata if chunks were retrieved
          const messageMetadata: Record<string, any> = {
            modelId,
            inputTokens,
            outputTokens
          };

          if (retrievedChunks.length > 0) {
            messageMetadata.metadata = {
              ragSources: retrievedChunks.map(chunk => ({
                id: chunk.id,
                sourceFile: chunk.sourceFile,
                pageNumber: chunk.pageNumber,
                chunkText: chunk.chunkText,
                similarity: chunk.similarity,
                fileId: chunk.fileId
              }))
            };
            console.log(`[Chat API] 📚 Saving ${retrievedChunks.length} RAG sources with assistant message`);
          }

          await saveChatMessage(chatId!, assistantMessage, messageMetadata);

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
