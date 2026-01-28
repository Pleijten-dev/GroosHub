/**
 * Chat Persistence Layer
 * Handles database operations for chats and messages
 *
 * Week 2: Persistence & Multiple Chats
 * Week 4: Message Encryption (AES-256-GCM)
 */

import { getDbConnection } from '@/lib/db/connection';
import type { UIMessage } from 'ai';
import { randomUUID } from 'crypto';
import {
  encryptForStorage,
  decryptFromStorage,
  encryptJSONForStorage,
  decryptJSONFromStorage,
  isEncryptionEnabled
} from '@/lib/encryption';

// ============================================
// Types
// ============================================

export interface Chat {
  id: string;
  user_id: number;
  title: string;
  project_id?: string | null;
  model_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content_json: unknown; // UIMessage format (complex structure)
  model_id?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
  created_at: Date;
}

export interface CreateChatParams {
  userId: number;
  title?: string;
  projectId?: string;
  modelId?: string;
  metadata?: Record<string, unknown>;
  chatId?: string; // Optional: use client-provided chatId instead of generating
}

export interface ListChatsFilters {
  projectId?: string;
  modelId?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Chat Operations
// ============================================

/**
 * Create a new chat
 * Uses ON CONFLICT to handle cases where the chat was already created (e.g., by file upload)
 */
export async function createChat(params: CreateChatParams): Promise<string> {
  const db = getDbConnection();

  // Use provided chatId or generate a new one
  const chatId = params.chatId || randomUUID();
  const title = params.title || 'New Chat';

  await db`
    INSERT INTO chat_conversations (
      id, user_id, title, project_id, model_id, metadata, created_at, updated_at, last_message_at
    ) VALUES (
      ${chatId},
      ${params.userId},
      ${title},
      ${params.projectId || null},
      ${params.modelId || null},
      ${JSON.stringify(params.metadata || {})},
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      title = CASE
        WHEN chat_conversations.title = 'New Chat' THEN EXCLUDED.title
        ELSE chat_conversations.title
      END,
      project_id = COALESCE(EXCLUDED.project_id, chat_conversations.project_id),
      model_id = COALESCE(EXCLUDED.model_id, chat_conversations.model_id),
      metadata = COALESCE(EXCLUDED.metadata, chat_conversations.metadata),
      updated_at = NOW()
  `;

  console.log(`[ChatStore] Created/updated chat ${chatId} for user ${params.userId}`);

  return chatId;
}

/**
 * List all chats for a user
 */
export async function listUserChats(
  userId: number,
  filters?: ListChatsFilters
): Promise<Chat[]> {
  const db = getDbConnection();

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  let query = db`
    SELECT
      id, user_id, title, project_id, model_id, metadata, created_at, updated_at
    FROM chat_conversations
    WHERE user_id = ${userId}
  `;

  // Add filters
  if (filters?.projectId) {
    query = db`${query} AND project_id = ${filters.projectId}`;
  }

  if (filters?.modelId) {
    query = db`${query} AND model_id = ${filters.modelId}`;
  }

  query = db`
    ${query}
    ORDER BY last_message_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const chats = await query;

  return chats as Chat[];
}

/**
 * Get a single chat by ID
 */
export async function getChat(chatId: string): Promise<Chat | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      id, user_id, title, project_id, model_id, metadata, created_at, updated_at
    FROM chat_conversations
    WHERE id = ${chatId}
    AND deleted_at IS NULL
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0] as Chat;
}

/**
 * Update chat title
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE chat_conversations
    SET title = ${title}, updated_at = NOW()
    WHERE id = ${chatId}
  `;

  console.log(`[ChatStore] Updated chat ${chatId} title to "${title}"`);
}

/**
 * Update chat metadata
 */
export async function updateChatMetadata(
  chatId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE chat_conversations
    SET metadata = ${JSON.stringify(metadata)}, updated_at = NOW()
    WHERE id = ${chatId}
  `;

  console.log(`[ChatStore] Updated chat ${chatId} metadata`);
}

/**
 * Update chat model
 */
export async function updateChatModel(chatId: string, modelId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE chat_conversations
    SET model_id = ${modelId}, updated_at = NOW()
    WHERE id = ${chatId}
  `;

  console.log(`[ChatStore] Updated chat ${chatId} model to ${modelId}`);
}

/**
 * Delete a chat (soft delete with 30-day recovery window)
 */
export async function deleteChat(chatId: string, userId: number): Promise<void> {
  const db = getDbConnection();

  // Soft delete: set deleted_at and deleted_by_user_id for 30-day recovery window
  await db`
    UPDATE chat_conversations
    SET deleted_at = CURRENT_TIMESTAMP,
        deleted_by_user_id = ${userId}
    WHERE id = ${chatId}
  `;

  console.log(`[ChatStore] Soft deleted chat ${chatId} by user ${userId}`);
}

// ============================================
// Message Operations
// ============================================

/**
 * Database message row type
 */
interface DbMessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string | null; // Legacy text content field
  content_json: unknown;
  content_encrypted: boolean; // Encryption flag
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  metadata: unknown;
  created_at: Date;
}

/**
 * Load chat messages
 * Converts database format back to UIMessage[] format
 * Automatically decrypts content if it was encrypted
 */
export async function loadChatMessages(chatId: string): Promise<UIMessage[]> {
  const db = getDbConnection();

  const messages = await db`
    SELECT
      id, chat_id, role, content, content_json, content_encrypted, model_id, input_tokens, output_tokens, metadata, created_at
    FROM chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;

  console.log(`[ChatStore] 🔍 Loaded ${messages.length} messages from database for chat ${chatId}`);
  console.log(`[ChatStore] 📋 Message IDs:`, (messages as unknown as DbMessageRow[]).map(m => m.id));
  console.log(`[ChatStore] 👥 Message roles:`, (messages as unknown as DbMessageRow[]).map(m => m.role));

  // Count encrypted messages
  const encryptedCount = (messages as unknown as DbMessageRow[]).filter(m => m.content_encrypted).length;
  if (encryptedCount > 0) {
    console.log(`[ChatStore] 🔐 ${encryptedCount}/${messages.length} messages are encrypted`);
  }

  // Convert database format to UIMessage format
  const result = (messages as unknown as DbMessageRow[]).map((msg) => {
    const uiMessage: UIMessage = {
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      parts: [],
      metadata: msg.metadata || undefined // Include metadata if present
    };

    // Decrypt content_json if encrypted
    let contentJson: unknown = msg.content_json;
    let content: string | null = msg.content;

    if (msg.content_encrypted) {
      try {
        // Decrypt content_json (stored as encrypted string)
        if (msg.content_json && typeof msg.content_json === 'string') {
          contentJson = decryptJSONFromStorage(msg.content_json, true);
        }
        // Decrypt content (stored as encrypted string)
        if (msg.content) {
          content = decryptFromStorage(msg.content, true);
        }
      } catch (error) {
        console.error(`[ChatStore] ❌ Failed to decrypt message ${msg.id}:`, error);
        // Return empty parts if decryption fails
        uiMessage.parts = [{
          type: 'text',
          text: '[Message encrypted - decryption failed]'
        }];
        return uiMessage;
      }
    }

    // Parse content_json to get parts
    if (contentJson) {
      if (Array.isArray(contentJson)) {
        // Already in parts array format
        uiMessage.parts = contentJson;
      } else if (
        typeof contentJson === 'object' &&
        contentJson !== null &&
        'type' in contentJson &&
        (contentJson as Record<string, unknown>).type === 'text'
      ) {
        // Old format: {type: 'text', text: '...'}
        uiMessage.parts = [contentJson as { type: 'text'; text: string }];
      } else {
        // Fallback: treat as text
        uiMessage.parts = [{
          type: 'text',
          text: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson)
        }];
      }
    } else if (content) {
      // Fallback: use legacy content field (for migrated messages)
      uiMessage.parts = [{
        type: 'text',
        text: content
      }];
    }

    return uiMessage;
  });

  console.log(`[ChatStore] ✅ Converted to ${result.length} UIMessages`);
  console.log(`[ChatStore] 📤 Returning message IDs:`, result.map(m => m.id));

  // Log which messages have RAG sources
  const messagesWithRag = result.filter(m => m.metadata && (m.metadata as any).ragSources);
  if (messagesWithRag.length > 0) {
    console.log(`[ChatStore] 📚 ${messagesWithRag.length} messages have RAG sources`);
    messagesWithRag.forEach(m => {
      const ragSourcesCount = ((m.metadata as any).ragSources as any[])?.length || 0;
      console.log(`[ChatStore] 📚 Message ${m.id} has ${ragSourcesCount} RAG sources`);
    });
  }

  return result;
}

/**
 * Save a single message
 * Automatically encrypts content if ENCRYPTION_MASTER_KEY is configured
 */
export async function saveChatMessage(
  chatId: string,
  message: UIMessage,
  options?: {
    modelId?: string;
    inputTokens?: number;
    outputTokens?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const db = getDbConnection();

  // Always generate a new UUID for database storage
  // Client-side message IDs may be in nanoid format which is incompatible with PostgreSQL UUID type
  const messageId = randomUUID();

  // Extract text content for legacy 'content' column (still NOT NULL in database)
  const contentText = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => ('text' in part ? part.text : ''))
    .join('\n');

  // Encrypt content and content_json for storage
  const { encrypted: encryptedContent, isEncrypted: contentEncrypted } = encryptForStorage(contentText);
  const { encrypted: encryptedContentJson, isEncrypted: jsonEncrypted } = encryptJSONForStorage(message.parts);

  // Both should have same encryption status (they use same key availability check)
  const isEncrypted = contentEncrypted && jsonEncrypted;

  const textPreview = contentText.substring(0, 50).replace(/\n/g, ' ');
  console.log(`[ChatStore] 💾 Saving message to chat ${chatId}:`);
  console.log(`[ChatStore]    - Role: ${message.role}`);
  console.log(`[ChatStore]    - Client ID: ${message.id}`);
  console.log(`[ChatStore]    - DB ID (new): ${messageId}`);
  console.log(`[ChatStore]    - Text preview: "${textPreview}..."`);
  console.log(`[ChatStore]    - Encrypted: ${isEncrypted ? '🔐 Yes' : '⚠️ No (ENCRYPTION_MASTER_KEY not set)'}`);

  await db`
    INSERT INTO chat_messages (
      id, chat_id, role, content, content_json, content_encrypted, model_id, input_tokens, output_tokens, metadata, created_at
    ) VALUES (
      ${messageId},
      ${chatId},
      ${message.role},
      ${encryptedContent},
      ${encryptedContentJson},
      ${isEncrypted},
      ${options?.modelId || null},
      ${options?.inputTokens || 0},
      ${options?.outputTokens || 0},
      ${JSON.stringify(options?.metadata || {})},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      content = EXCLUDED.content,
      content_json = EXCLUDED.content_json,
      content_encrypted = EXCLUDED.content_encrypted,
      model_id = EXCLUDED.model_id,
      input_tokens = EXCLUDED.input_tokens,
      output_tokens = EXCLUDED.output_tokens,
      metadata = EXCLUDED.metadata
  `;

  console.log(`[ChatStore] ✅ Message saved successfully with DB ID: ${messageId}`);

  // Update chat's updated_at and last_message_at timestamps
  await db`
    UPDATE chat_conversations
    SET updated_at = NOW(),
        last_message_at = NOW()
    WHERE id = ${chatId}
  `;
}

/**
 * Save multiple messages (batch operation)
 */
export async function saveChatMessages(
  chatId: string,
  messages: UIMessage[],
  options?: {
    modelId?: string;
  }
): Promise<void> {
  if (messages.length === 0) return;

  // Use transaction for batch insert
  for (const message of messages) {
    await saveChatMessage(chatId, message, options);
  }

  console.log(`[ChatStore] Saved ${messages.length} messages to chat ${chatId}`);
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Track LLM usage for analytics and billing
 */
export async function trackLLMUsage(params: {
  userId: number;
  chatId?: string;
  messageId?: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costInput: number;
  costOutput: number;
  requestType: 'chat' | 'embedding' | 'image_generation' | 'tool_call';
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getDbConnection();

  await db`
    INSERT INTO llm_usage (
      user_id, chat_id, message_id, model, provider,
      input_tokens, output_tokens,
      cost_input, cost_output,
      request_type, response_time_ms, metadata,
      created_at
    ) VALUES (
      ${params.userId},
      ${params.chatId || null},
      ${params.messageId || null},
      ${params.model},
      ${params.provider},
      ${params.inputTokens},
      ${params.outputTokens},
      ${params.costInput},
      ${params.costOutput},
      ${params.requestType},
      ${params.responseTimeMs || null},
      ${JSON.stringify(params.metadata || {})},
      NOW()
    )
  `;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Chat statistics type
 */
export interface ChatStatistics {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

/**
 * Get chat statistics
 */
export async function getChatStatistics(chatId: string): Promise<ChatStatistics> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      COUNT(*) as message_count,
      COUNT(*) FILTER (WHERE role = 'user') as user_message_count,
      COUNT(*) FILTER (WHERE role = 'assistant') as assistant_message_count,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens
    FROM chat_messages
    WHERE chat_id = ${chatId}
  `;

  if (result.length === 0) {
    return {
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0
    };
  }

  return {
    messageCount: Number(result[0].message_count),
    userMessageCount: Number(result[0].user_message_count),
    assistantMessageCount: Number(result[0].assistant_message_count),
    totalInputTokens: Number(result[0].total_input_tokens),
    totalOutputTokens: Number(result[0].total_output_tokens)
  };
}

/**
 * Export chat to JSON
 */
export async function exportChatToJSON(chatId: string): Promise<{
  chat: Chat;
  messages: UIMessage[];
  statistics: ChatStatistics;
}> {
  const chat = await getChat(chatId);
  if (!chat) {
    throw new Error(`Chat ${chatId} not found`);
  }

  const messages = await loadChatMessages(chatId);
  const statistics = await getChatStatistics(chatId);

  return {
    chat,
    messages,
    statistics
  };
}
