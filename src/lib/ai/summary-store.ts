/**
 * Conversation Summary Store
 * Database operations for conversation summaries
 *
 * Purpose: Compress old messages to save context window space
 * Complements: User memory system (learns user preferences)
 *
 * Security: Summary content is encrypted at rest using AES-256-GCM
 */

import { getDbConnection } from '@/lib/db/connection';
import {
  encryptForStorage,
  decryptFromStorage,
  encryptJSONForStorage,
  decryptJSONFromStorage
} from '@/lib/encryption';

// ============================================
// Types
// ============================================

export interface ChatSummary {
  id: string;
  chat_id: string;
  summary_text: string;
  key_points: string[];
  message_range_start: number;
  message_range_end: number;
  message_count: number;
  token_count: number;
  compression_ratio: number | null;
  model_used: string;
  generation_timestamp: Date;
  created_at: Date;
}

export interface CreateSummaryParams {
  chatId: string;
  summaryText: string;
  keyPoints: string[];
  messageRangeStart: number;
  messageRangeEnd: number;
  tokenCount?: number;
  compressionRatio?: number;
  modelUsed?: string;
}

// ============================================
// Summary Operations
// ============================================

/**
 * Create a new conversation summary
 * Automatically encrypts content if ENCRYPTION_MASTER_KEY is configured
 */
export async function createChatSummary(params: CreateSummaryParams): Promise<string> {
  const db = getDbConnection();

  // Encrypt summary text and key points for storage
  const { encrypted: encryptedSummary, isEncrypted: summaryEncrypted } = encryptForStorage(params.summaryText);
  const { encrypted: encryptedKeyPoints, isEncrypted: keyPointsEncrypted } = encryptJSONForStorage(params.keyPoints);

  // Both should have same encryption status
  const isEncrypted = summaryEncrypted && keyPointsEncrypted;

  console.log(
    `[SummaryStore] Creating summary for chat ${params.chatId} ` +
    `(messages ${params.messageRangeStart}-${params.messageRangeEnd}, encrypted: ${isEncrypted ? '🔐 Yes' : '⚠️ No'})`
  );

  const result = await db`
    INSERT INTO chat_summaries (
      chat_id,
      summary_text,
      key_points,
      content_encrypted,
      message_range_start,
      message_range_end,
      token_count,
      compression_ratio,
      model_used,
      generation_timestamp,
      created_at
    ) VALUES (
      ${params.chatId},
      ${encryptedSummary},
      ${encryptedKeyPoints},
      ${isEncrypted},
      ${params.messageRangeStart},
      ${params.messageRangeEnd},
      ${params.tokenCount || 0},
      ${params.compressionRatio || null},
      ${params.modelUsed || 'claude-haiku'},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const summaryId = result[0].id as string;

  console.log(`[SummaryStore] ✅ Created summary ${summaryId}`);

  return summaryId;
}

/**
 * Get all summaries for a chat in chronological order
 * Automatically decrypts content if it was encrypted
 */
export async function getChatSummaries(chatId: string): Promise<ChatSummary[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM get_chat_summaries(${chatId})
  `;

  return result.map(row => {
    const isEncrypted = row.content_encrypted as boolean;
    let summaryText = row.summary_text as string;
    let keyPoints = row.key_points as string[];

    // Decrypt if encrypted
    if (isEncrypted) {
      try {
        summaryText = decryptFromStorage(summaryText, true);
        keyPoints = decryptJSONFromStorage<string[]>(row.key_points as string, true);
      } catch (error) {
        console.error(`[SummaryStore] ❌ Failed to decrypt summary ${row.id}:`, error);
        summaryText = '[Summary encrypted - decryption failed]';
        keyPoints = [];
      }
    }

    return {
      id: row.id as string,
      chat_id: chatId,
      summary_text: summaryText,
      key_points: keyPoints,
      message_range_start: row.message_range_start as number,
      message_range_end: row.message_range_end as number,
      message_count: row.message_count as number,
      token_count: 0, // Not in view return
      compression_ratio: null,
      model_used: 'claude-haiku',
      generation_timestamp: new Date(),
      created_at: row.created_at as Date
    };
  });
}

/**
 * Get latest summary for a chat
 * Automatically decrypts content if it was encrypted
 */
export async function getLatestChatSummary(chatId: string): Promise<ChatSummary | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT * FROM get_latest_chat_summary(${chatId})
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  const isEncrypted = row.content_encrypted as boolean;
  let summaryText = row.summary_text as string;
  let keyPoints = row.key_points as string[];

  // Decrypt if encrypted
  if (isEncrypted) {
    try {
      summaryText = decryptFromStorage(summaryText, true);
      keyPoints = decryptJSONFromStorage<string[]>(row.key_points as string, true);
    } catch (error) {
      console.error(`[SummaryStore] ❌ Failed to decrypt latest summary ${row.id}:`, error);
      summaryText = '[Summary encrypted - decryption failed]';
      keyPoints = [];
    }
  }

  return {
    id: row.id as string,
    chat_id: chatId,
    summary_text: summaryText,
    key_points: keyPoints,
    message_range_start: 0,
    message_range_end: row.message_range_end as number,
    message_count: row.message_range_end as number,
    token_count: 0,
    compression_ratio: null,
    model_used: 'claude-haiku',
    generation_timestamp: new Date(),
    created_at: new Date()
  };
}

/**
 * Delete all summaries for a chat
 */
export async function deleteChatSummaries(chatId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    DELETE FROM chat_summaries
    WHERE chat_id = ${chatId}
  `;

  console.log(`[SummaryStore] Deleted all summaries for chat ${chatId}`);
}

/**
 * Get compression statistics for a chat
 */
export async function getChatCompressionStats(chatId: string): Promise<{
  summaryCount: number;
  totalSummarizedMessages: number;
  avgCompressionRatio: number;
  totalSummaryTokens: number;
} | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      summary_count,
      total_summarized_messages,
      avg_compression_ratio,
      total_summary_tokens
    FROM chat_compression_stats
    WHERE chat_id = ${chatId}
  `;

  if (result.length === 0) {
    return null;
  }

  const row = result[0];
  return {
    summaryCount: Number(row.summary_count),
    totalSummarizedMessages: Number(row.total_summarized_messages),
    avgCompressionRatio: Number(row.avg_compression_ratio),
    totalSummaryTokens: Number(row.total_summary_tokens)
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format summaries for context window
 * Combines all summaries into a single text block
 */
export function formatSummariesForContext(summaries: ChatSummary[]): string {
  if (summaries.length === 0) {
    return '';
  }

  const parts = summaries.map((summary, index) => {
    const keyPointsText = summary.key_points.length > 0
      ? '\nKey points:\n' + summary.key_points.map(p => `- ${p}`).join('\n')
      : '';

    return `[Earlier conversation ${index + 1}]\n${summary.summary_text}${keyPointsText}`;
  });

  return parts.join('\n\n---\n\n');
}

/**
 * Calculate compression ratio
 * @param originalTokens - Token count of original messages
 * @param summaryTokens - Token count of summary
 * @returns Compression ratio (0.0-1.0, lower is better compression)
 */
export function calculateCompressionRatio(
  originalTokens: number,
  summaryTokens: number
): number {
  if (originalTokens === 0) return 1;
  return Math.min(1, summaryTokens / originalTokens);
}

/**
 * Estimate if summarization would be beneficial
 * @param messageCount - Number of messages
 * @param avgTokensPerMessage - Average tokens per message
 * @returns Whether summarization would save tokens
 */
export function shouldSummarize(
  messageCount: number,
  avgTokensPerMessage: number = 100
): boolean {
  const MIN_MESSAGES = 20; // Minimum messages to summarize
  const SUMMARY_TOKEN_TARGET = 500; // Target summary size

  if (messageCount < MIN_MESSAGES) {
    return false;
  }

  const estimatedOriginalTokens = messageCount * avgTokensPerMessage;
  const estimatedCompression = SUMMARY_TOKEN_TARGET / estimatedOriginalTokens;

  // Summarize if we can save at least 50% of tokens
  return estimatedCompression < 0.5;
}
