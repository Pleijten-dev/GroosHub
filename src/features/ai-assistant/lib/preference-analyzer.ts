/**
 * Preference Analyzer
 *
 * Analyzes chat conversations to extract user preferences with confidence scoring.
 * Uses a cheap model (Claude Haiku) for efficient background processing.
 *
 * Features:
 * - Extracts personal preferences (writing style, language, etc.)
 * - Detects project-specific learnings
 * - Identifies cross-project patterns for domain memory
 * - Uses confidence scoring to prevent quick overwrites
 */

import { generateText } from 'ai';
import { getModel } from '@/lib/ai/models';
import { updatePreference, updateIdentity } from './personal-memory-store';
import { addSoftContext, updateHardValues, getProjectMemory } from './project-memory-store';
import { addLearnedPattern, getDomainMemory } from './domain-memory-store';
import { shouldSynthesizeMemory } from './memory-injector';
import type { UIMessage } from 'ai';
import type { MemorySource } from '../types/memory';

// ============================================
// Configuration
// ============================================

const ANALYZER_CONFIG = {
  /** Model to use for analysis (cheap, fast) */
  model: 'claude-haiku',
  /** Number of recent messages to analyze */
  recentMessageCount: 10,
  /** Minimum messages before first analysis */
  minMessagesForAnalysis: 3,
  /** Analyze every N messages */
  analyzeEveryNMessages: 5,
};

// ============================================
// Types
// ============================================

interface AnalysisParams {
  userId: number;
  chatId: string;
  projectId?: string;
  orgId?: string;
  messages: UIMessage[];
  locale: 'nl' | 'en';
}

interface ExtractedPreference {
  key: string;
  value: string;
  isExplicit: boolean;
  sourceText?: string;
}

interface ExtractedProjectFact {
  category: string;
  content: string;
  sourceText?: string;
}

interface ExtractionResult {
  personalPreferences: ExtractedPreference[];
  identity: {
    name?: string;
    position?: string;
  } | null;
  projectFacts: ExtractedProjectFact[];
  domainPatterns: string[];
}

// ============================================
// Analysis Queue (Fire-and-forget)
// ============================================

/**
 * Queue preference analysis as a background task
 * Non-blocking - fires and forgets
 */
export function queuePreferenceAnalysis(params: AnalysisParams): void {
  // Check if we should analyze based on message count
  const messageCount = params.messages.filter(m => m.role !== 'system').length;

  // Skip if not enough messages
  if (messageCount < ANALYZER_CONFIG.minMessagesForAnalysis) {
    console.log(`[PreferenceAnalyzer] Skipping - only ${messageCount} messages (need ${ANALYZER_CONFIG.minMessagesForAnalysis})`);
    return;
  }

  // Only analyze every N messages
  if (messageCount % ANALYZER_CONFIG.analyzeEveryNMessages !== 0) {
    console.log(`[PreferenceAnalyzer] Skipping - message count ${messageCount} not divisible by ${ANALYZER_CONFIG.analyzeEveryNMessages}`);
    return;
  }

  // Fire and forget - don't await
  analyzeConversation(params).catch(error => {
    console.error('[PreferenceAnalyzer] Background analysis failed:', error);
  });
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * Analyze conversation and update memories
 */
async function analyzeConversation(params: AnalysisParams): Promise<void> {
  const { userId, chatId, projectId, orgId, messages, locale } = params;

  console.log(`[PreferenceAnalyzer] Starting analysis for user ${userId}, chat ${chatId}`);

  // Get recent messages for analysis
  const recentMessages = messages
    .filter(m => m.role !== 'system')
    .slice(-ANALYZER_CONFIG.recentMessageCount);

  if (recentMessages.length === 0) {
    console.log('[PreferenceAnalyzer] No messages to analyze');
    return;
  }

  try {
    // Extract preferences and facts from conversation
    const extracted = await extractFromConversation(recentMessages, locale);

    if (!extracted) {
      console.log('[PreferenceAnalyzer] No extractable content found');
      return;
    }

    // Update personal memory with preferences
    if (extracted.personalPreferences.length > 0) {
      console.log(`[PreferenceAnalyzer] Updating ${extracted.personalPreferences.length} personal preferences`);

      for (const pref of extracted.personalPreferences) {
        await updatePreference({
          userId,
          key: pref.key,
          value: pref.value,
          source: 'chat' as MemorySource,
          sourceRef: chatId,
          sourceText: pref.sourceText,
          isExplicit: pref.isExplicit,
        });
      }
    }

    // Update identity if found
    if (extracted.identity) {
      console.log('[PreferenceAnalyzer] Updating user identity');
      await updateIdentity(userId, extracted.identity);
    }

    // Update project memory with facts
    if (projectId && extracted.projectFacts.length > 0) {
      console.log(`[PreferenceAnalyzer] Updating ${extracted.projectFacts.length} project facts`);

      for (const fact of extracted.projectFacts) {
        await addSoftContext(
          projectId,
          fact.category,
          fact.content,
          'chat' as MemorySource,
          chatId
        );
      }
    }

    // Update domain memory with patterns (if org exists and patterns found)
    if (orgId && extracted.domainPatterns.length > 0 && projectId) {
      console.log(`[PreferenceAnalyzer] Checking ${extracted.domainPatterns.length} potential domain patterns`);

      for (const pattern of extracted.domainPatterns) {
        await addLearnedPattern(
          orgId,
          pattern,
          `Observed in project conversation: ${chatId}`,
          projectId
        );
      }
    }

    console.log('[PreferenceAnalyzer] Analysis complete');

  } catch (error) {
    console.error('[PreferenceAnalyzer] Analysis failed:', error);
    throw error;
  }
}

// ============================================
// Extraction Logic
// ============================================

/**
 * Extract preferences, identity, and facts from conversation
 */
async function extractFromConversation(
  messages: UIMessage[],
  locale: 'nl' | 'en'
): Promise<ExtractionResult | null> {
  // Format messages for analysis
  const conversationText = formatMessagesForAnalysis(messages);

  if (!conversationText.trim()) {
    return null;
  }

  const prompt = getExtractionPrompt(conversationText, locale);

  try {
    const model = getModel(ANALYZER_CONFIG.model as any);

    const result = await generateText({
      model,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    // Parse the JSON response
    const parsed = parseExtractionResponse(result.text);
    return parsed;

  } catch (error) {
    console.error('[PreferenceAnalyzer] Extraction failed:', error);
    return null;
  }
}

/**
 * Format messages for analysis prompt
 */
function formatMessagesForAnalysis(messages: UIMessage[]): string {
  return messages
    .map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      const text = m.parts
        .filter(p => p.type === 'text')
        .map(p => ('text' in p ? p.text : ''))
        .join('\n');
      return `${role}: ${text}`;
    })
    .join('\n\n');
}

/**
 * Get extraction prompt
 */
function getExtractionPrompt(conversationText: string, locale: 'nl' | 'en'): string {
  const instructions = locale === 'nl'
    ? `Analyseer dit gesprek en extract de volgende informatie in JSON formaat:`
    : `Analyze this conversation and extract the following information in JSON format:`;

  return `${instructions}

1. **Personal Preferences**: Any preferences the user expresses about:
   - Writing/response style (formal, casual, concise, detailed)
   - Language preferences (technical terms, Dutch/English)
   - Data presentation preferences
   - Working patterns or habits

   For each preference, determine if it's EXPLICIT (user directly stated it) or IMPLICIT (inferred from behavior).

2. **Identity**: User's name or position if mentioned.

3. **Project Facts** (if discussing a specific project):
   - Client preferences
   - Design decisions and rationale
   - Constraints or requirements
   - Goals or objectives

4. **Domain Patterns**: General best practices or learnings that could apply to other projects.

CONVERSATION:
${conversationText}

Respond ONLY with valid JSON in this exact format:
{
  "personalPreferences": [
    {
      "key": "preference_category",
      "value": "preference_value",
      "isExplicit": true/false,
      "sourceText": "relevant quote from conversation"
    }
  ],
  "identity": {
    "name": "user's name if mentioned",
    "position": "user's role/position if mentioned"
  },
  "projectFacts": [
    {
      "category": "client_preference|design_decision|constraint|goal",
      "content": "the fact",
      "sourceText": "relevant quote"
    }
  ],
  "domainPatterns": [
    "general pattern or best practice"
  ]
}

If nothing is found for a category, use empty arrays/null. Only include HIGH-CONFIDENCE extractions.`;
}

/**
 * Parse the LLM response into structured data
 */
function parseExtractionResponse(responseText: string): ExtractionResult | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[PreferenceAnalyzer] No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize the structure
    return {
      personalPreferences: Array.isArray(parsed.personalPreferences)
        ? parsed.personalPreferences.filter(
            (p: any) => p.key && p.value && typeof p.isExplicit === 'boolean'
          )
        : [],
      identity: parsed.identity && (parsed.identity.name || parsed.identity.position)
        ? {
            name: parsed.identity.name || undefined,
            position: parsed.identity.position || undefined,
          }
        : null,
      projectFacts: Array.isArray(parsed.projectFacts)
        ? parsed.projectFacts.filter((f: any) => f.category && f.content)
        : [],
      domainPatterns: Array.isArray(parsed.domainPatterns)
        ? parsed.domainPatterns.filter((p: any) => typeof p === 'string' && p.trim())
        : [],
    };

  } catch (error) {
    console.error('[PreferenceAnalyzer] Failed to parse extraction response:', error);
    return null;
  }
}

// ============================================
// Manual Analysis Trigger
// ============================================

/**
 * Manually trigger preference analysis (for testing/admin)
 */
export async function manualPreferenceAnalysis(params: AnalysisParams): Promise<ExtractionResult | null> {
  const recentMessages = params.messages
    .filter(m => m.role !== 'system')
    .slice(-ANALYZER_CONFIG.recentMessageCount);

  if (recentMessages.length === 0) {
    return null;
  }

  return extractFromConversation(recentMessages, params.locale);
}
