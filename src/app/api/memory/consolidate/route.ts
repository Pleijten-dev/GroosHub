/**
 * API endpoint for end-of-day AI assistant automation
 * POST /api/memory/consolidate - Runs inactivity summarization AND memory consolidation
 *
 * This endpoint is triggered by cron job daily at 11:00 PM to:
 * 1. FIRST: Summarize all inactive chats (1+ hours inactive)
 * 2. THEN: Consolidate daily summaries into user memory with confidence scoring
 *
 * Combined into one endpoint due to Vercel Hobby plan limitation (daily crons only).
 * Pro plan users can run /api/summaries/inactivity separately for hourly execution.
 *
 * Updated to use the 3-tier memory system with confidence-based preferences.
 *
 * Security:
 * - Requires admin role OR valid cron secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getPersonalMemory,
  updatePreference,
  updateIdentity,
} from '@/features/ai-assistant/lib/personal-memory-store';
import { generateText } from 'ai';
import { getModel } from '@/lib/ai/models';

interface ConsolidationResult {
  userId: number;
  summariesProcessed: number;
  preferencesExtracted: number;
  memoryUpdated: boolean;
  error?: string;
}

interface ExtractedPreference {
  key: string;
  value: string;
  isExplicit: boolean;
}

interface ExtractedData {
  preferences: ExtractedPreference[];
  identity: {
    name?: string;
    position?: string;
  } | null;
}

/**
 * POST /api/memory/consolidate
 * Process daily summaries and update user memories with confidence scoring
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

    // 2. FIRST: Run inactivity summarization (Hobby plan workaround)
    console.log('[Memory Consolidation] Step 1: Running inactivity summarization...');
    try {
      const inactivityResponse = await fetch(
        `${request.nextUrl.origin}/api/summaries/inactivity`,
        {
          method: 'POST',
          headers: {
            'x-cron-secret': cronSecret || '',
            'Cookie': request.headers.get('Cookie') || ''
          }
        }
      );

      if (inactivityResponse.ok) {
        const inactivityResult = await inactivityResponse.json();
        console.log(`[Memory Consolidation] ✓ Inactivity summarization complete: ${inactivityResult.successful || 0} chats summarized`);
      } else {
        console.warn('[Memory Consolidation] ⚠️ Inactivity summarization failed, continuing with memory consolidation');
      }
    } catch (error) {
      console.error('[Memory Consolidation] ⚠️ Inactivity summarization error:', error);
      // Continue with memory consolidation even if inactivity fails
    }

    // 3. THEN: Find all users with summaries created today
    const db = getDbConnection();

    console.log('[Memory Consolidation] Step 2: Finding users with activity today...');

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

    // 4. Process each user
    const results: ConsolidationResult[] = [];

    for (const user of usersWithActivity) {
      try {
        console.log(`[Memory Consolidation] Processing user ${user.user_id} (${user.summary_count} summaries)`);

        // Get all summaries created today for this user
        const todaySummariesRaw = await db`
          SELECT
            cs.summary_text,
            cs.key_points,
            cs.created_at,
            cc.title as chat_title,
            cc.id as chat_id
          FROM chat_summaries cs
          INNER JOIN chat_conversations cc ON cc.id = cs.chat_id
          WHERE cc.user_id = ${user.user_id}
            AND cs.created_at >= CURRENT_DATE
            AND cs.created_at < CURRENT_DATE + INTERVAL '1 day'
            AND cc.deleted_at IS NULL
          ORDER BY cs.created_at ASC;
        `;

        // Cast to proper type
        const todaySummaries = todaySummariesRaw as Array<{
          summary_text: string;
          key_points: unknown;
          chat_title: string | null;
          chat_id: string;
        }>;

        if (todaySummaries.length === 0) {
          results.push({
            userId: user.user_id,
            summariesProcessed: 0,
            preferencesExtracted: 0,
            memoryUpdated: false,
            error: 'No summaries found'
          });
          continue;
        }

        // Get current user memory for context
        const currentMemory = await getPersonalMemory(user.user_id);

        // Extract preferences with confidence using LLM
        const extractedData = await extractPreferencesFromSummaries(
          todaySummaries,
          currentMemory
        );

        if (!extractedData || (extractedData.preferences.length === 0 && !extractedData.identity)) {
          console.log(`[Memory Consolidation] No extractable data for user ${user.user_id}`);
          results.push({
            userId: user.user_id,
            summariesProcessed: todaySummaries.length,
            preferencesExtracted: 0,
            memoryUpdated: false,
            error: 'No new preferences found'
          });
          continue;
        }

        // Update identity if found
        if (extractedData.identity) {
          await updateIdentity(user.user_id, extractedData.identity);
          console.log(`[Memory Consolidation] Updated identity for user ${user.user_id}`);
        }

        // Update preferences with confidence scoring
        let preferencesUpdated = 0;
        for (const pref of extractedData.preferences) {
          try {
            await updatePreference({
              userId: user.user_id,
              key: pref.key,
              value: pref.value,
              source: 'system',
              sourceRef: `daily-consolidation-${new Date().toISOString().split('T')[0]}`,
              isExplicit: pref.isExplicit,
            });
            preferencesUpdated++;
          } catch (error) {
            console.warn(`[Memory Consolidation] Failed to update preference ${pref.key}:`, error);
          }
        }

        console.log(`[Memory Consolidation] ✓ Updated ${preferencesUpdated} preferences for user ${user.user_id}`);

        results.push({
          userId: user.user_id,
          summariesProcessed: todaySummaries.length,
          preferencesExtracted: preferencesUpdated,
          memoryUpdated: preferencesUpdated > 0 || !!extractedData.identity
        });

      } catch (error) {
        console.error(`[Memory Consolidation] ✗ Failed for user ${user.user_id}:`, error);
        results.push({
          userId: user.user_id,
          summariesProcessed: 0,
          preferencesExtracted: 0,
          memoryUpdated: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 5. Return results
    const successCount = results.filter(r => r.memoryUpdated).length;
    const failureCount = results.filter(r => !r.memoryUpdated).length;
    const totalPreferences = results.reduce((sum, r) => sum + r.preferencesExtracted, 0);

    console.log(`[Memory Consolidation] Complete - ${successCount} users updated, ${totalPreferences} preferences extracted, ${failureCount} skipped`);

    return NextResponse.json({
      success: true,
      message: `Processed ${usersWithActivity.length} users`,
      processed: usersWithActivity.length,
      memoryUpdates: successCount,
      preferencesExtracted: totalPreferences,
      skipped: failureCount,
      results: results.map(r => ({
        userId: r.userId,
        summariesProcessed: r.summariesProcessed,
        preferencesExtracted: r.preferencesExtracted,
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
 * Extract preferences from daily summaries using LLM
 * Returns preferences with explicit/implicit classification
 */
async function extractPreferencesFromSummaries(
  summaries: Array<{
    summary_text: string;
    key_points: unknown;
    chat_title: string | null;
    chat_id: string;
  }>,
  currentMemory: { preferences: Array<{ key: string; value: string }> }
): Promise<ExtractedData | null> {
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

  // Format existing preferences for context
  const existingPrefs = currentMemory.preferences
    .map(p => `- ${p.key}: ${p.value}`)
    .join('\n') || 'None yet';

  const prompt = `Analyze these conversation summaries to extract user preferences.

## Existing Preferences
${existingPrefs}

## Today's Conversation Summaries
${formattedSummaries}

## Task
Extract NEW preferences from these summaries. For each preference, determine:
1. The category (key): writing_style, language, format, topic_interest, workflow, technical_preference, etc.
2. The value: What the preference actually is
3. Whether it's EXPLICIT (user directly stated it) or IMPLICIT (inferred from behavior)

Also extract any identity information if the user mentioned their name or role/position.

**Important**:
- Only extract HIGH-CONFIDENCE preferences
- Don't repeat preferences that already exist unless they've changed
- Focus on actionable preferences that will help personalize future conversations

Return ONLY valid JSON in this exact format:
{
  "preferences": [
    {"key": "category", "value": "the preference", "isExplicit": true/false}
  ],
  "identity": {"name": "user's name if mentioned", "position": "user's role if mentioned"} or null
}`;

  try {
    const model = getModel('claude-haiku-3.5');
    const result = await generateText({
      model,
      prompt,
      temperature: 0.3,
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Memory Consolidation] No JSON found in LLM response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      preferences: Array.isArray(parsed.preferences)
        ? parsed.preferences.filter(
            (p: ExtractedPreference) => p.key && p.value && typeof p.isExplicit === 'boolean'
          )
        : [],
      identity: parsed.identity && (parsed.identity.name || parsed.identity.position)
        ? {
            name: parsed.identity.name || undefined,
            position: parsed.identity.position || undefined,
          }
        : null,
    };

  } catch (error) {
    console.error('[Memory Consolidation] Failed to extract preferences:', error);
    return null;
  }
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
