/**
 * API endpoint for end-of-day memory consolidation
 * POST /api/memory/consolidate - Consolidate daily chat summaries into user memory
 *
 * This endpoint is triggered by cron job daily at 11:30 PM to:
 * 1. Find all users with chat activity today
 * 2. Gather all summaries created today for each user
 * 3. Send to LLM to extract patterns/preferences
 * 4. Update user memory with consolidated insights
 *
 * This provides a holistic daily view of user interactions,
 * improving memory quality vs. per-conversation updates.
 *
 * Security:
 * - Requires admin role OR valid cron secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getUserMemory,
  updateUserMemory,
  createUserMemory,
  formatMemoryForPrompt
} from '@/lib/ai/memory-store';
import { generateText } from 'ai';
import { getModel } from '@/lib/ai/models';

interface ConsolidationResult {
  userId: number;
  summariesProcessed: number;
  memoryUpdated: boolean;
  error?: string;
}

/**
 * POST /api/memory/consolidate
 * Process daily summaries and update user memories
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication: Check for cron secret OR admin session
    const cronSecret = request.headers.get('x-cron-secret');
    const validCronSecret = process.env.CRON_SECRET;

    if (validCronSecret && cronSecret === validCronSecret) {
      console.log('[Memory Consolidation] Authenticated via cron secret');
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

      console.log(`[Memory Consolidation] Authenticated as admin user: ${session.user.id}`);
    }

    // 2. Find all users with summaries created today
    const db = getDbConnection();

    console.log('[Memory Consolidation] Finding users with activity today...');

    const usersWithActivity = await db`
      SELECT DISTINCT
        cc.user_id,
        COUNT(cs.id) as summary_count
      FROM chat_conversations cc
      INNER JOIN chat_summaries cs ON cs.chat_id = cc.id
      WHERE cs.created_at >= CURRENT_DATE
        AND cs.created_at < CURRENT_DATE + INTERVAL '1 day'
        AND cc.deleted_at IS NULL
      GROUP BY cc.user_id
      HAVING COUNT(cs.id) >= 1
      ORDER BY COUNT(cs.id) DESC;
    `;

    console.log(`[Memory Consolidation] Found ${usersWithActivity.length} users with activity today`);

    if (usersWithActivity.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with summaries to consolidate',
        processed: 0,
        results: []
      });
    }

    // 3. Process each user
    const results: ConsolidationResult[] = [];

    for (const user of usersWithActivity) {
      try {
        console.log(`[Memory Consolidation] Processing user ${user.user_id} (${user.summary_count} summaries)`);

        // Get all summaries created today for this user
        const todaySummaries = await db`
          SELECT
            cs.summary_text,
            cs.key_points,
            cs.created_at,
            cc.title as chat_title
          FROM chat_summaries cs
          INNER JOIN chat_conversations cc ON cc.id = cs.chat_id
          WHERE cc.user_id = ${user.user_id}
            AND cs.created_at >= CURRENT_DATE
            AND cs.created_at < CURRENT_DATE + INTERVAL '1 day'
            AND cc.deleted_at IS NULL
          ORDER BY cs.created_at ASC;
        `;

        if (todaySummaries.length === 0) {
          results.push({
            userId: user.user_id,
            summariesProcessed: 0,
            memoryUpdated: false,
            error: 'No summaries found'
          });
          continue;
        }

        // Get current user memory
        const currentMemory = await getUserMemory(user.user_id);
        const currentMemoryText = formatMemoryForPrompt(currentMemory);

        // Generate consolidated memory update
        const updatedMemoryContent = await consolidateSummariesIntoMemory(
          todaySummaries,
          currentMemoryText
        );

        // Check if memory actually changed
        if (updatedMemoryContent === currentMemoryText || updatedMemoryContent.trim() === '') {
          console.log(`[Memory Consolidation] No changes for user ${user.user_id}`);
          results.push({
            userId: user.user_id,
            summariesProcessed: todaySummaries.length,
            memoryUpdated: false,
            error: 'No new information to add'
          });
          continue;
        }

        // Update memory in database
        if (currentMemory.memory_content === '') {
          await createUserMemory({
            userId: user.user_id,
            memoryContent: updatedMemoryContent
          });
        } else {
          await updateUserMemory({
            userId: user.user_id,
            memoryContent: updatedMemoryContent,
            changeSummary: `Daily consolidation: ${todaySummaries.length} summaries analyzed`,
            changeType: 'modification',
            triggerSource: 'system',
            metadata: {
              summariesCount: todaySummaries.length,
              date: new Date().toISOString().split('T')[0]
            }
          });
        }

        console.log(`[Memory Consolidation] ✓ Updated memory for user ${user.user_id}`);

        results.push({
          userId: user.user_id,
          summariesProcessed: todaySummaries.length,
          memoryUpdated: true
        });

      } catch (error) {
        console.error(`[Memory Consolidation] ✗ Failed for user ${user.user_id}:`, error);
        results.push({
          userId: user.user_id,
          summariesProcessed: 0,
          memoryUpdated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 4. Return results
    const successCount = results.filter(r => r.memoryUpdated).length;
    const failureCount = results.filter(r => !r.memoryUpdated).length;

    console.log(`[Memory Consolidation] Complete - ${successCount} updated, ${failureCount} failed/skipped`);

    return NextResponse.json({
      success: true,
      message: `Processed ${usersWithActivity.length} users`,
      processed: usersWithActivity.length,
      memoryUpdates: successCount,
      skipped: failureCount,
      results: results.map(r => ({
        userId: r.userId,
        summariesProcessed: r.summariesProcessed,
        memoryUpdated: r.memoryUpdated,
        error: r.error
      }))
    });

  } catch (error) {
    console.error('[Memory Consolidation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to consolidate memories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Consolidate daily summaries into updated memory
 */
async function consolidateSummariesIntoMemory(
  summaries: Array<{
    summary_text: string;
    key_points: unknown;
    chat_title: string | null;
  }>,
  currentMemory: string
): Promise<string> {
  // Format summaries for LLM
  const formattedSummaries = summaries
    .map((s, index) => {
      const keyPoints = Array.isArray(s.key_points)
        ? s.key_points.map((p: string) => `- ${p}`).join('\n')
        : '';
      const title = s.chat_title || `Conversation ${index + 1}`;
      return `## ${title}\n\n${s.summary_text}${keyPoints ? '\n\nKey Points:\n' + keyPoints : ''}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are analyzing a user's conversations from today to update their personalized memory profile.

## Current Memory
${currentMemory || 'No existing memory yet.'}

## Today's Conversation Summaries
${formattedSummaries}

## Task

Analyze these summaries and update the user memory. Focus on:

1. **User Preferences**: What does the user like/dislike? What are their goals?
2. **Patterns**: How does the user interact? What topics interest them?
3. **Context**: Current projects, focus areas, or ongoing work
4. **Learning**: What have you learned about the user's needs?

**Important Guidelines**:
- Keep the memory concise (~500 tokens / 2000 characters max)
- Only include information that will help personalize future conversations
- Merge new insights with existing memory (don't lose important old information)
- Remove outdated or irrelevant information
- Be specific and actionable
- Use bullet points or short paragraphs

Return ONLY the updated memory text (no JSON, no markdown headers):`;

  const model = getModel('claude-haiku-3.5');
  const result = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  return result.text.trim();
}

/**
 * GET /api/memory/consolidate
 * Get information about today's consolidation candidates
 * (Does not consolidate, just reports)
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
        COUNT(DISTINCT cc.user_id) as users_with_activity,
        COUNT(cs.id) as total_summaries_today,
        AVG(LENGTH(cs.summary_text)) as avg_summary_length
      FROM chat_conversations cc
      INNER JOIN chat_summaries cs ON cs.chat_id = cc.id
      WHERE cs.created_at >= CURRENT_DATE
        AND cs.created_at < CURRENT_DATE + INTERVAL '1 day'
        AND cc.deleted_at IS NULL;
    `;

    const result = stats[0];

    return NextResponse.json({
      success: true,
      stats: {
        usersWithActivity: Number(result.users_with_activity),
        totalSummariesToday: Number(result.total_summaries_today),
        avgSummaryLength: Math.round(Number(result.avg_summary_length))
      }
    });

  } catch (error) {
    console.error('[Memory Consolidation GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get consolidation stats'
      },
      { status: 500 }
    );
  }
}
