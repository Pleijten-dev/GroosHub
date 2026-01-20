/**
 * API endpoint for inactivity-based chat summarization
 * POST /api/summaries/inactivity - Summarize chats inactive for 1+ hours
 *
 * This endpoint is triggered by cron job every hour to:
 * 1. Find chats inactive for 1+ hours
 * 2. Check if they have unsummarized messages
 * 3. Generate summaries to compress context
 *
 * Security:
 * - Requires admin role OR valid cron secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { loadChatMessages } from '@/lib/ai/chat-store';
import {
  createChatSummary,
  calculateCompressionRatio,
  getLatestChatSummary
} from '@/lib/ai/summary-store';
import { generateText, type UIMessage } from 'ai';
import { getModel } from '@/lib/ai/models';

interface InactivitySummaryResult {
  chatId: string;
  userId: number;
  messageCount: number;
  success: boolean;
  error?: string;
}

/**
 * POST /api/summaries/inactivity
 * Process inactive chats and generate summaries
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication: Check for cron secret OR admin session
    const cronSecret = request.headers.get('x-cron-secret');
    const validCronSecret = process.env.CRON_SECRET;

    if (validCronSecret && cronSecret === validCronSecret) {
      console.log('[Inactivity Summarization] Authenticated via cron secret');
    } else {
      // Otherwise, require admin session
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
      }

      console.log(`[Inactivity Summarization] Authenticated as admin user: ${session.user.id}`);
    }

    // 2. Find chats inactive for 1+ hours with unsummarized messages
    const db = getDbConnection();

    console.log('[Inactivity Summarization] Finding inactive chats...');

    const inactiveChats = await db`
      SELECT
        cc.id as chat_id,
        cc.user_id,
        cc.last_activity_at,
        cc.last_summary_at,
        COUNT(cm.id) as message_count
      FROM chat_conversations cc
      LEFT JOIN chat_messages cm ON cm.chat_id = cc.id
      WHERE cc.deleted_at IS NULL
        AND cc.last_activity_at < NOW() - INTERVAL '1 hour'
        AND (
          cc.last_summary_at IS NULL
          OR cc.last_activity_at > cc.last_summary_at
        )
        AND EXISTS (
          SELECT 1 FROM chat_messages
          WHERE chat_id = cc.id
          AND (cc.last_summary_at IS NULL OR created_at > cc.last_summary_at)
        )
      GROUP BY cc.id, cc.user_id, cc.last_activity_at, cc.last_summary_at
      HAVING COUNT(cm.id) >= 3
      ORDER BY cc.last_activity_at ASC
      LIMIT 50;
    `;

    console.log(`[Inactivity Summarization] Found ${inactiveChats.length} inactive chats to process`);

    if (inactiveChats.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No inactive chats to summarize',
        processed: 0,
        results: []
      });
    }

    // 3. Process each chat
    const results: InactivitySummaryResult[] = [];

    for (const chat of inactiveChats) {
      try {
        console.log(`[Inactivity Summarization] Processing chat ${chat.chat_id} (user: ${chat.user_id})`);

        // Load all messages
        const allMessages = await loadChatMessages(chat.chat_id);

        // Get messages since last summary
        let messagesToSummarize: UIMessage[];
        if (chat.last_summary_at) {
          // Get latest summary to know which messages are already summarized
          const latestSummary = await getLatestChatSummary(chat.chat_id);
          const lastSummarizedIndex = latestSummary?.message_range_end || 0;
          messagesToSummarize = allMessages.slice(lastSummarizedIndex);
        } else {
          // No previous summary, summarize all but keep last 10
          messagesToSummarize = allMessages.slice(0, -10);
        }

        // Skip if too few messages to summarize
        if (messagesToSummarize.length < 3) {
          console.log(`[Inactivity Summarization] Skipping chat ${chat.chat_id} - too few messages (${messagesToSummarize.length})`);
          results.push({
            chatId: chat.chat_id,
            userId: chat.user_id,
            messageCount: messagesToSummarize.length,
            success: false,
            error: 'Too few messages to summarize'
          });
          continue;
        }

        // Generate summary
        const summary = await generateChatSummary(messagesToSummarize);

        // Save summary to database
        const summaryTokens = Math.ceil(summary.text.length / 4);
        const originalTokens = messagesToSummarize.length * 100; // Estimate
        const compressionRatio = calculateCompressionRatio(originalTokens, summaryTokens);

        await createChatSummary({
          chatId: chat.chat_id,
          summaryText: summary.text,
          keyPoints: summary.keyPoints,
          messageRangeStart: chat.last_summary_at ? allMessages.length - messagesToSummarize.length : 0,
          messageRangeEnd: allMessages.length - 10,
          tokenCount: summaryTokens,
          compressionRatio,
          modelUsed: 'claude-haiku-3.5'
        });

        // Update last_summary_at
        await db`
          UPDATE chat_conversations
          SET last_summary_at = NOW()
          WHERE id = ${chat.chat_id};
        `;

        console.log(`[Inactivity Summarization] ✓ Summarized chat ${chat.chat_id} - ${messagesToSummarize.length} messages → ${summaryTokens} tokens`);

        results.push({
          chatId: chat.chat_id,
          userId: chat.user_id,
          messageCount: messagesToSummarize.length,
          success: true
        });

      } catch (error) {
        console.error(`[Inactivity Summarization] ✗ Failed to summarize chat ${chat.chat_id}:`, error);
        results.push({
          chatId: chat.chat_id,
          userId: chat.user_id,
          messageCount: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 4. Return results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Inactivity Summarization] Complete - ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${inactiveChats.length} inactive chats`,
      processed: inactiveChats.length,
      successful: successCount,
      failed: failureCount,
      results: results.map(r => ({
        chatId: r.chatId,
        userId: r.userId,
        messageCount: r.messageCount,
        success: r.success,
        error: r.error
      }))
    });

  } catch (error) {
    console.error('[Inactivity Summarization] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process inactive chats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate summary from messages using LLM
 */
async function generateChatSummary(
  messages: UIMessage[]
): Promise<{ text: string; keyPoints: string[] }> {
  // Format messages for summarization
  const formattedMessages = messages
    .map(msg => {
      const text = msg.parts
        .filter(p => p.type === 'text')
        .map(p => ('text' in p ? p.text : ''))
        .join('\n');
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${text}`;
    })
    .join('\n\n');

  const prompt = `Summarize the following conversation in a concise overview.

## Conversation

${formattedMessages}

## Task

Create a concise summary (max 300 words) of this conversation. Focus on:
1. Main topics discussed
2. Important questions and answers
3. Conclusions or decisions

Return JSON in this format:
\`\`\`json
{
  "text": "Concise summary of the conversation...",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ]
}
\`\`\``;

  const model = getModel('claude-haiku-3.5');
  const result = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  // Parse response
  try {
    const parsed = JSON.parse(result.text) as { text: string; keyPoints: string[] };
    return parsed;
  } catch {
    // Fallback if JSON parsing fails
    return {
      text: result.text.trim(),
      keyPoints: [],
    };
  }
}

/**
 * GET /api/summaries/inactivity
 * Get information about chats eligible for inactivity summarization
 * (Does not summarize, just reports)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    const stats = await db`
      SELECT
        COUNT(*) as eligible_count,
        MIN(last_activity_at) as oldest_activity,
        MAX(last_activity_at) as newest_activity
      FROM chat_conversations
      WHERE deleted_at IS NULL
        AND last_activity_at < NOW() - INTERVAL '1 hour'
        AND (
          last_summary_at IS NULL
          OR last_activity_at > last_summary_at
        )
        AND EXISTS (
          SELECT 1 FROM chat_messages
          WHERE chat_id = chat_conversations.id
          AND (last_summary_at IS NULL OR created_at > last_summary_at)
        );
    `;

    const result = stats[0];

    return NextResponse.json({
      success: true,
      stats: {
        eligibleChatsCount: Number(result.eligible_count),
        oldestActivity: result.oldest_activity,
        newestActivity: result.newest_activity
      }
    });

  } catch (error) {
    console.error('[Inactivity Summarization GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get inactivity stats'
      },
      { status: 500 }
    );
  }
}
