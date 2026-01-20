/**
 * Conversation Analyzer Service
 * Unified service that extracts BOTH conversation summaries AND user memory
 * in a single analysis pass for maximum efficiency
 *
 * Features:
 * - Summarization: Compress old messages to save context window
 * - Memory extraction: Learn user preferences and patterns
 * - Single LLM call for both (cost efficient)
 * - Background processing (non-blocking)
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
import {
  createChatSummary,
  calculateCompressionRatio
} from '@/lib/ai/summary-store';

// ============================================
// Types
// ============================================

export interface ConversationAnalysisResult {
  summary: ConversationSummary | null;
  memoryUpdate: MemoryUpdateResult | null;
}

export interface ConversationSummary {
  chatId: string;
  summary: string;
  keyPoints: string[];
  messageRange: {
    start: number;
    end: number;
  };
  createdAt: Date;
}

export interface MemoryUpdateResult {
  updated: boolean;
  reason: string;
  newMemoryContent?: string;
}

// ============================================
// Configuration
// ============================================

const ANALYZER_CONFIG = {
  // Model for analysis - ALWAYS use Claude Haiku 3.5 (via Vercel AI SDK)
  // This is separate from the user's chosen model and optimized for cost
  analysisModel: 'claude-haiku-3.5' as const,

  // Summarization config
  summarization: {
    enabled: true,
    summarizeAfterMessages: 10, // Summarize when >10 messages
    keepRecentMessages: 10, // Keep last 10 unsummarized
    summaryChunkSize: 15, // Summarize in chunks of 15 messages
  },

  // Memory config
  memory: {
    enabled: true,
    recentMessageCount: 10,
    triggerEveryNMessages: 10,
    minMessagesBeforeFirstUpdate: 3,
    useSmartDecision: true,
  },
};

// ============================================
// Unified Analysis
// ============================================

/**
 * Analyze conversation and extract BOTH summary AND memory
 * This is more efficient than running two separate analyses
 *
 * @param userId - User ID
 * @param chatId - Chat ID
 * @param allMessages - All messages in conversation
 * @param locale - User locale
 * @returns Results for both summary and memory
 */
export async function analyzeConversation(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en' = 'nl'
): Promise<ConversationAnalysisResult> {
  console.log(`[ConversationAnalyzer] 🔍 Starting unified analysis for chat ${chatId}`);

  const result: ConversationAnalysisResult = {
    summary: null,
    memoryUpdate: null,
  };

  try {
    // Run both analyses in parallel
    const [summaryResult, memoryResult] = await Promise.all([
      ANALYZER_CONFIG.summarization.enabled
        ? analyzeSummary(chatId, allMessages, locale)
        : Promise.resolve(null),

      ANALYZER_CONFIG.memory.enabled
        ? analyzeMemory(userId, chatId, allMessages, locale)
        : Promise.resolve(null),
    ]);

    result.summary = summaryResult;
    result.memoryUpdate = memoryResult;

    console.log(
      `[ConversationAnalyzer] ✅ Analysis complete - ` +
      `Summary: ${summaryResult ? 'created' : 'skipped'}, ` +
      `Memory: ${memoryResult?.updated ? 'updated' : 'unchanged'}`
    );

  } catch (error) {
    console.error('[ConversationAnalyzer] ❌ Error in unified analysis:', error);
  }

  return result;
}

// ============================================
// Summarization Logic
// ============================================

/**
 * Create conversation summary if needed
 */
async function analyzeSummary(
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en'
): Promise<ConversationSummary | null> {
  const messageCount = allMessages.length;

  // Check if summarization is needed
  if (messageCount < ANALYZER_CONFIG.summarization.summarizeAfterMessages) {
    console.log(`[ConversationAnalyzer] ⏭️  Skipping summary - only ${messageCount} messages`);
    return null;
  }

  console.log(`[ConversationAnalyzer] 📝 Creating conversation summary`);

  // Get messages to summarize (exclude most recent ones)
  const messagesToSummarize = allMessages.slice(
    0,
    -ANALYZER_CONFIG.summarization.keepRecentMessages
  );

  // Extract summary using LLM
  const summary = await extractConversationSummary(messagesToSummarize, locale);

  // Save to database
  try {
    // Estimate token counts
    const summaryTokens = Math.ceil(summary.text.length / 4);
    const originalTokens = messagesToSummarize.length * 100; // Estimate
    const compressionRatio = calculateCompressionRatio(originalTokens, summaryTokens);

    await createChatSummary({
      chatId,
      summaryText: summary.text,
      keyPoints: summary.keyPoints,
      messageRangeStart: 0,
      messageRangeEnd: messagesToSummarize.length - 1,
      tokenCount: summaryTokens,
      compressionRatio,
      modelUsed: ANALYZER_CONFIG.analysisModel
    });

    console.log(
      `[ConversationAnalyzer] 📊 Summary saved - ` +
      `${messagesToSummarize.length} messages → ${summaryTokens} tokens ` +
      `(${(compressionRatio * 100).toFixed(1)}% of original)`
    );
  } catch (error) {
    console.error('[ConversationAnalyzer] ⚠️  Failed to save summary:', error);
  }

  return {
    chatId,
    summary: summary.text,
    keyPoints: summary.keyPoints,
    messageRange: {
      start: 0,
      end: messagesToSummarize.length,
    },
    createdAt: new Date(),
  };
}

/**
 * Extract conversation summary from messages
 */
async function extractConversationSummary(
  messages: UIMessage[],
  locale: 'nl' | 'en'
): Promise<{ text: string; keyPoints: string[] }> {
  const prompt = getSummarizationPrompt(messages, locale);

  const model = getModel(ANALYZER_CONFIG.analysisModel);
  const result = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  // Parse response (expecting JSON with text and keyPoints)
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
 * Summarization prompt
 */
function getSummarizationPrompt(messages: UIMessage[], locale: 'nl' | 'en'): string {
  const formattedMessages = messages
    .map(msg => {
      const text = msg.parts
        .filter(p => p.type === 'text')
        .map(p => ('text' in p ? p.text : ''))
        .join('\n');
      const role = msg.role === 'user' ? 'Gebruiker' : 'Assistent';
      return `${role}: ${text}`;
    })
    .join('\n\n');

  const prompts = {
    nl: `Vat het volgende gesprek samen in een beknopt overzicht.

## Gesprek

${formattedMessages}

## Taak

Maak een beknopte samenvatting (max 300 woorden) van dit gesprek. Focus op:
1. Hoofdonderwerpen die besproken zijn
2. Belangrijke vragen en antwoorden
3. Conclusies of beslissingen

Retourneer JSON in dit format:
\`\`\`json
{
  "text": "Beknopte samenvatting van het gesprek...",
  "keyPoints": [
    "Kernpunt 1",
    "Kernpunt 2",
    "Kernpunt 3"
  ]
}
\`\`\``,

    en: `Summarize the following conversation in a concise overview.

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
\`\`\``,
  };

  return prompts[locale];
}

// ============================================
// Memory Logic (Reuse from memory-analyzer.ts)
// ============================================

/**
 * Update user memory if needed
 */
async function analyzeMemory(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en'
): Promise<MemoryUpdateResult | null> {
  try {
    // Get current memory
    const currentMemory = await getUserMemory(userId);

    // Check if we should update
    const conversationMessageCount = allMessages.filter(m => m.role === 'user').length;

    if (!shouldUpdateMemory(currentMemory, conversationMessageCount)) {
      console.log('[ConversationAnalyzer] ⏭️  Skipping memory - not triggered yet');
      return { updated: false, reason: 'Not triggered yet' };
    }

    // Get recent messages for analysis
    const recentMessages = allMessages.slice(-ANALYZER_CONFIG.memory.recentMessageCount);
    const currentMemoryText = formatMemoryForPrompt(currentMemory);

    // Quick decision check
    if (ANALYZER_CONFIG.memory.useSmartDecision && currentMemory.memory_content !== '') {
      const shouldUpdate = await checkMemoryUpdateNeeded(
        recentMessages,
        currentMemoryText,
        locale
      );

      if (!shouldUpdate) {
        console.log('[ConversationAnalyzer] ⏭️  No new memory information detected');
        return { updated: false, reason: 'No new information' };
      }
    }

    // Extract memory
    const updatedMemoryContent = await extractMemory(
      recentMessages,
      currentMemoryText,
      locale
    );

    // Check if changed
    if (updatedMemoryContent === currentMemoryText || updatedMemoryContent.trim() === '') {
      return { updated: false, reason: 'Content unchanged' };
    }

    // Save to database
    if (currentMemory.memory_content === '') {
      await createUserMemory({ userId, memoryContent: updatedMemoryContent });
    } else {
      await updateUserMemory({
        userId,
        memoryContent: updatedMemoryContent,
        changeSummary: 'Auto-updated from conversation',
        changeType: 'modification',
        triggerSource: 'chat',
        triggerId: chatId,
        metadata: { messageCount: recentMessages.length },
      });
    }

    console.log(`[ConversationAnalyzer] 🧠 Memory updated (${updatedMemoryContent.length} chars)`);

    return {
      updated: true,
      reason: 'Successfully updated',
      newMemoryContent: updatedMemoryContent,
    };

  } catch (error) {
    console.error('[ConversationAnalyzer] ❌ Error in memory analysis:', error);
    return {
      updated: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick check if memory update is needed
 */
async function checkMemoryUpdateNeeded(
  messages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en'
): Promise<boolean> {
  const prompt = getMemoryUpdateDecisionPrompt(messages, currentMemory, locale);
  const model = getModel(ANALYZER_CONFIG.analysisModel);

  const result = await generateText({
    model,
    prompt,
    temperature: 0.2,
  });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return true;

    const decision = JSON.parse(jsonMatch[0]) as { shouldUpdate: boolean };
    return decision.shouldUpdate;
  } catch {
    return true;
  }
}

/**
 * Extract memory from conversation
 */
async function extractMemory(
  messages: UIMessage[],
  currentMemory: string,
  locale: 'nl' | 'en'
): Promise<string> {
  const prompt = getMemoryExtractionPrompt(messages, currentMemory, locale);
  const model = getModel(ANALYZER_CONFIG.analysisModel);

  const result = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  return result.text.trim();
}

// ============================================
// Background Processing
// ============================================

/**
 * Queue unified analysis for background processing
 */
export function queueConversationAnalysis(
  userId: number,
  chatId: string,
  allMessages: UIMessage[],
  locale: 'nl' | 'en' = 'nl'
): void {
  // Fire and forget
  analyzeConversation(userId, chatId, allMessages, locale)
    .then(result => {
      console.log(
        `[ConversationAnalyzer] ✅ Background analysis completed - ` +
        `Summary: ${result.summary ? '✓' : '✗'}, ` +
        `Memory: ${result.memoryUpdate?.updated ? '✓' : '✗'}`
      );
    })
    .catch(error => {
      console.error(`[ConversationAnalyzer] ❌ Background analysis failed:`, error);
    });

  console.log(`[ConversationAnalyzer] 🚀 Queued unified analysis for chat ${chatId}`);
}
