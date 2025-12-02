/**
 * Memory Analyzer Service
 * Efficiently analyzes conversations to update user memory
 *
 * Design principles:
 * 1. Async processing - runs AFTER chat response is sent
 * 2. Smart triggering - only updates when needed
 * 3. Cost efficient - uses cheap models, analyzes minimal messages
 * 4. No double LLM calls - separate from main chat flow
 */

import { generateText, type UIMessage } from 'ai';
import { getModel } from '@/lib/ai/models';
import {
  getUserMemory,
  updateUserMemory,
  createUserMemory,
  formatMemoryForPrompt,
  shouldUpdateMemory
} from '@/lib/ai/memory-store';
import {
  getMemoryExtractionPrompt,
  getMemoryUpdateDecisionPrompt
} from '@/lib/ai/memory-prompts';

// ============================================
// Configuration
// ============================================

const MEMORY_CONFIG = {
  // Model for memory analysis (use cheaper model)
  analysisModel: 'claude-haiku' as const, // or 'gpt-4o-mini'

  // How many recent messages to analyze
  recentMessageCount: 10,

  // Trigger conditions
  triggerEveryNMessages: 10, // Update every 10 messages
  minMessagesBeforeFirstUpdate: 3, // Wait for at least 3 messages

  // Smart decision making
  useSmartDecision: true, // First check IF update is needed
};

// ============================================
// Smart Memory Analysis
// ============================================

/**
 * Analyze conversation and update memory if needed
 * This runs asynchronously AFTER the chat response
 *
 * @param userId - User ID
 * @param chatId - Chat ID (for tracking)
 * @param allMessages - All messages in conversation
 * @param locale - User locale
 * @returns Promise that resolves when analysis is complete
 */
export async function analyzeAndUpdateMemory(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en' = 'nl'
): Promise<{ updated: boolean; reason: string }> {
  try {
    console.log(`[MemoryAnalyzer] 🧠 Starting analysis for user ${userId}, chat ${chatId}`);

    // Get current memory
    const currentMemory = await getUserMemory(userId);

    // Check if we should update based on time/message count
    const conversationMessageCount = allMessages.filter(m => m.role === 'user').length;

    if (!shouldUpdateMemory(currentMemory, conversationMessageCount)) {
      console.log('[MemoryAnalyzer] ⏭️  Skipping - not enough messages or too recent');
      return { updated: false, reason: 'Not triggered yet' };
    }

    // Get recent messages for analysis (not full conversation!)
    const recentMessages = allMessages.slice(-MEMORY_CONFIG.recentMessageCount);
    const currentMemoryText = formatMemoryForPrompt(currentMemory);

    console.log(`[MemoryAnalyzer] 📊 Analyzing ${recentMessages.length} recent messages`);

    // Step 1: Quick decision check - should we update? (saves tokens!)
    if (MEMORY_CONFIG.useSmartDecision && currentMemory.memory_content !== '') {
      const shouldUpdate = await shouldUpdateMemoryDecision(
        recentMessages,
        currentMemoryText,
        locale
      );

      if (!shouldUpdate) {
        console.log('[MemoryAnalyzer] ⏭️  No significant new information detected');
        return { updated: false, reason: 'No new information' };
      }

      console.log('[MemoryAnalyzer] ✅ New information detected, proceeding with full analysis');
    }

    // Step 2: Full memory extraction
    const updatedMemoryContent = await extractMemoryFromConversation(
      recentMessages,
      currentMemoryText,
      locale
    );

    // Check if memory actually changed
    if (updatedMemoryContent === currentMemoryText || updatedMemoryContent.trim() === '') {
      console.log('[MemoryAnalyzer] ℹ️  No changes in memory content');
      return { updated: false, reason: 'Content unchanged' };
    }

    console.log(`[MemoryAnalyzer] 📝 Memory updated (${updatedMemoryContent.length} chars)`);

    // Step 3: Save to database
    if (currentMemory.memory_content === '') {
      await createUserMemory({
        userId,
        memoryContent: updatedMemoryContent
      });
      console.log('[MemoryAnalyzer] ✅ Created initial memory');
    } else {
      await updateUserMemory({
        userId,
        memoryContent: updatedMemoryContent,
        changeSummary: 'Auto-updated from conversation',
        changeType: 'modification',
        triggerSource: 'chat',
        triggerId: chatId,
        metadata: {
          messageCount: recentMessages.length,
          analysisModel: MEMORY_CONFIG.analysisModel
        }
      });
      console.log('[MemoryAnalyzer] ✅ Updated memory');
    }

    return { updated: true, reason: 'Successfully updated' };

  } catch (error) {
    console.error('[MemoryAnalyzer] ❌ Error analyzing memory:', error);
    return {
      updated: false,
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Quick decision: Should we update memory?
 * Uses minimal tokens to check if new information exists
 */
async function shouldUpdateMemoryDecision(
  recentMessages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en'
): Promise<boolean> {
  try {
    const prompt = getMemoryUpdateDecisionPrompt(recentMessages, currentMemory, locale);

    const model = getModel(MEMORY_CONFIG.analysisModel);
    const result = await generateText({
      model,
      prompt,
      temperature: 0.2,
      maxTokens: 200 // Very small response
    });

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[MemoryAnalyzer] Failed to parse decision response');
      return true; // Default to yes if parsing fails
    }

    const decision = JSON.parse(jsonMatch[0]) as {
      shouldUpdate: boolean;
      reason: string;
      newInformation?: string[];
    };

    console.log(`[MemoryAnalyzer] Decision: ${decision.shouldUpdate} - ${decision.reason}`);

    return decision.shouldUpdate;

  } catch (error) {
    console.error('[MemoryAnalyzer] Error in decision check:', error);
    return true; // Default to yes on error
  }
}

/**
 * Extract memory from conversation
 * Uses LLM to analyze and generate updated memory
 */
async function extractMemoryFromConversation(
  recentMessages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en'
): Promise<string> {
  const prompt = getMemoryExtractionPrompt(recentMessages, currentMemory, locale);

  const model = getModel(MEMORY_CONFIG.analysisModel);
  const result = await generateText({
    model,
    prompt,
    temperature: 0.3, // Slightly creative but consistent
    maxTokens: 800 // Enough for ~500 token memory
  });

  return result.text.trim();
}

// ============================================
// Background Processing Helpers
// ============================================

/**
 * Queue memory analysis for background processing
 * Use this to avoid blocking the main chat response
 *
 * In production, this could use a job queue (Bull, BullMQ, etc.)
 * For now, we use async/await with .catch() to not block
 */
export function queueMemoryAnalysis(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en' = 'nl'
): void {
  // Fire and forget - don't await
  analyzeAndUpdateMemory(userId, chatId, allMessages, locale)
    .then(result => {
      if (result.updated) {
        console.log(`[MemoryAnalyzer] ✅ Background analysis completed for user ${userId}`);
      } else {
        console.log(`[MemoryAnalyzer] ℹ️  No update needed for user ${userId}: ${result.reason}`);
      }
    })
    .catch(error => {
      console.error(`[MemoryAnalyzer] ❌ Background analysis failed for user ${userId}:`, error);
    });

  console.log(`[MemoryAnalyzer] 🚀 Queued memory analysis for user ${userId}`);
}

/**
 * Manual trigger for memory analysis
 * Can be called from API endpoint or admin panel
 */
export async function manualMemoryAnalysis(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en' = 'nl'
): Promise<{ success: boolean; updated: boolean; reason: string }> {
  try {
    const result = await analyzeAndUpdateMemory(userId, chatId, allMessages, locale);
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      updated: false,
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
