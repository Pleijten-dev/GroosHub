// Database queries for chat functionality
import { neon } from '@neondatabase/serverless';
import type { Chat, ChatMessage } from '../../types';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const sql = neon(process.env.POSTGRES_URL);

// Chat queries
export async function createChat(userId: number, title: string): Promise<Chat> {
  const result = await sql`
    INSERT INTO chats (user_id, title)
    VALUES (${userId}, ${title})
    RETURNING id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"
  `;
  return result[0] as Chat;
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  const result = await sql`
    SELECT id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"
    FROM chats
    WHERE id = ${chatId}
  `;
  return result[0] as Chat || null;
}

export async function getChatsByUserId(userId: number): Promise<Chat[]> {
  const result = await sql`
    SELECT id, user_id as "userId", title, created_at as "createdAt", updated_at as "updatedAt"
    FROM chats
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return result as Chat[];
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  await sql`
    UPDATE chats
    SET title = ${title}
    WHERE id = ${chatId}
  `;
}

export async function deleteChat(chatId: string): Promise<void> {
  await sql`
    DELETE FROM chats
    WHERE id = ${chatId}
  `;
}

// Message queries
export async function createMessage(
  chatId: string,
  role: string,
  content: string
): Promise<ChatMessage> {
  const result = await sql`
    INSERT INTO messages (chat_id, role, content)
    VALUES (${chatId}, ${role}, ${content})
    RETURNING id, chat_id as "chatId", role, content, created_at as "createdAt"
  `;

  const message = result[0];
  return {
    id: message.id,
    role: message.role as any,
    content: message.content,
    metadata: {
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function getMessagesByChatId(chatId: string): Promise<ChatMessage[]> {
  const result = await sql`
    SELECT id, role, content, created_at as "createdAt"
    FROM messages
    WHERE chat_id = ${chatId}
    ORDER BY created_at ASC
  `;

  return result.map((message: any) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    metadata: {
      createdAt: message.createdAt.toISOString(),
    },
  }));
}

export async function deleteMessage(messageId: string): Promise<void> {
  await sql`
    DELETE FROM messages
    WHERE id = ${messageId}
  `;
}

// Vote queries
export async function voteMessage(
  messageId: string,
  userId: number,
  isUpvoted: boolean
): Promise<void> {
  await sql`
    INSERT INTO message_votes (message_id, user_id, is_upvoted)
    VALUES (${messageId}, ${userId}, ${isUpvoted})
    ON CONFLICT (message_id)
    DO UPDATE SET is_upvoted = ${isUpvoted}
  `;
}

export async function getVote(messageId: string): Promise<boolean | null> {
  const result = await sql`
    SELECT is_upvoted as "isUpvoted"
    FROM message_votes
    WHERE message_id = ${messageId}
  `;
  return result[0]?.isUpvoted ?? null;
}
