/**
 * Database queries for chat_conversations and chat_messages tables
 */

import { getDbConnection } from '../connection';

export interface ChatConversation {
  id: string; // UUID
  user_id: number;
  project_id: string | null;
  title: string | null;
  model_id: string | null;
  model_settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date;
}

export interface ChatMessage {
  id: string; // UUID
  chat_id: string;
  role: string;
  content: string | null;
  content_json: Record<string, unknown> | null;
  content_encrypted: boolean;
  model_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

/**
 * Get chat conversation by ID
 */
export async function getChatById(chatId: string): Promise<ChatConversation | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, user_id, project_id, title, model_id, model_settings, metadata,
           created_at, updated_at, last_message_at
    FROM chat_conversations
    WHERE id = ${chatId}
  `;

  return result.length > 0 ? (result[0] as ChatConversation) : null;
}

/**
 * Get all chats for a user
 */
export async function getUserChats(userId: number): Promise<ChatConversation[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, user_id, project_id, title, model_id, model_settings, metadata,
           created_at, updated_at, last_message_at
    FROM chat_conversations
    WHERE user_id = ${userId}
    ORDER BY last_message_at DESC
  `;

  return result as ChatConversation[];
}

/**
 * Get private chats for a user (not linked to projects)
 */
export async function getUserPrivateChats(userId: number): Promise<ChatConversation[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, user_id, project_id, title, model_id, model_settings, metadata,
           created_at, updated_at, last_message_at
    FROM chat_conversations
    WHERE user_id = ${userId}
    AND project_id IS NULL
    ORDER BY last_message_at DESC
  `;

  return result as ChatConversation[];
}

/**
 * Get project chats for a user
 */
export async function getUserProjectChats(userId: number, projectId: string): Promise<ChatConversation[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, user_id, project_id, title, model_id, model_settings, metadata,
           created_at, updated_at, last_message_at
    FROM chat_conversations
    WHERE user_id = ${userId}
    AND project_id = ${projectId}
    ORDER BY last_message_at DESC
  `;

  return result as ChatConversation[];
}

/**
 * Get all chats for a project (from all members)
 */
export async function getProjectChats(projectId: string): Promise<ChatConversation[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, user_id, project_id, title, model_id, model_settings, metadata,
           created_at, updated_at, last_message_at
    FROM chat_conversations
    WHERE project_id = ${projectId}
    ORDER BY last_message_at DESC
  `;

  return result as ChatConversation[];
}

/**
 * Get messages for a chat
 */
export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, chat_id, role, content, content_json, content_encrypted,
           model_id, input_tokens, output_tokens, metadata, created_at
    FROM chat_messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;

  return result as ChatMessage[];
}

/**
 * Get message count for a chat
 */
export async function getChatMessageCount(chatId: string): Promise<number> {
  const db = getDbConnection();

  const result = await db`
    SELECT COUNT(*) as count
    FROM chat_messages
    WHERE chat_id = ${chatId}
  `;

  return parseInt(result[0].count);
}

/**
 * Update chat's last message timestamp
 */
export async function updateChatLastMessage(chatId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE chat_conversations
    SET last_message_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${chatId}
  `;
}

/**
 * Update chat title
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE chat_conversations
    SET title = ${title},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${chatId}
  `;
}

/**
 * Delete chat conversation and all messages
 */
export async function deleteChat(chatId: string): Promise<void> {
  const db = getDbConnection();

  // Delete messages first (cascade will handle this, but being explicit)
  await db`
    DELETE FROM chat_messages
    WHERE chat_id = ${chatId}
  `;

  // Delete conversation
  await db`
    DELETE FROM chat_conversations
    WHERE id = ${chatId}
  `;
}

/**
 * Check if user owns chat
 */
export async function isChatOwner(chatId: string, userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT user_id
    FROM chat_conversations
    WHERE id = ${chatId}
  `;

  if (result.length === 0) return false;

  return result[0].user_id === userId;
}

/**
 * Check if user can access chat (owns it or is member of its project)
 */
export async function canAccessChat(chatId: string, userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      c.user_id,
      c.project_id,
      (SELECT COUNT(*) FROM project_members pm
       WHERE pm.project_id = c.project_id
       AND pm.user_id = ${userId}
       AND pm.left_at IS NULL) as is_project_member
    FROM chat_conversations c
    WHERE c.id = ${chatId}
  `;

  if (result.length === 0) return false;

  const chat = result[0];

  // User owns the chat
  if (chat.user_id === userId) return true;

  // Chat is linked to project and user is member
  if (chat.project_id && parseInt(chat.is_project_member) > 0) return true;

  return false;
}

/**
 * Get total tokens used in a chat
 */
export async function getChatTokenUsage(chatId: string) {
  const db = getDbConnection();

  const result = await db`
    SELECT
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens
    FROM chat_messages
    WHERE chat_id = ${chatId}
  `;

  return {
    input_tokens: parseInt(result[0].total_input_tokens),
    output_tokens: parseInt(result[0].total_output_tokens),
    total_tokens:
      parseInt(result[0].total_input_tokens) + parseInt(result[0].total_output_tokens),
  };
}

/**
 * Create a new chat conversation
 */
export async function createChatConversation(params: {
  userId: number;
  title: string;
  modelId: string;
  projectId?: string | null;
  modelSettings?: Record<string, unknown>;
}): Promise<ChatConversation> {
  const db = getDbConnection();

  const result = await db`
    INSERT INTO chat_conversations (
      user_id,
      project_id,
      title,
      model_id,
      model_settings,
      metadata,
      created_at,
      updated_at,
      last_message_at
    )
    VALUES (
      ${params.userId},
      ${params.projectId || null},
      ${params.title},
      ${params.modelId},
      ${JSON.stringify(params.modelSettings || {})},
      ${JSON.stringify({})},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    RETURNING id, user_id, project_id, title, model_id, model_settings, metadata,
              created_at, updated_at, last_message_at
  `;

  return result[0] as ChatConversation;
}
