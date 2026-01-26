/**
 * Memory Injector
 *
 * Combines all three memory tiers (personal, project, domain) into
 * a formatted prompt section for injection into the AI system prompt.
 *
 * Usage:
 * ```typescript
 * const memoryPrompt = await getMemoryPromptSection({
 *   userId: 123,
 *   projectId: 'project-uuid',
 *   orgId: 'org-uuid',
 *   locale: 'nl'
 * });
 *
 * const systemPrompt = `${basePrompt}\n\n${memoryPrompt.text}`;
 * ```
 */

import {
  getPersonalMemory,
  formatPersonalMemoryForPrompt,
} from './personal-memory-store';
import {
  getProjectMemory,
  formatProjectMemoryForPrompt,
} from './project-memory-store';
import {
  getDomainMemory,
  formatDomainMemoryForPrompt,
} from './domain-memory-store';
import type {
  PersonalMemory,
  ProjectMemory,
  DomainMemory,
  CombinedMemoryContext,
  FormattedMemoryPrompt,
} from '../types/memory';

// ============================================
// Types
// ============================================

export interface MemoryInjectionParams {
  /** User ID for personal memory */
  userId: number;
  /** Project ID for project memory (optional) */
  projectId?: string;
  /** Organization ID for domain memory (optional) */
  orgId?: string;
  /** Locale for prompt formatting */
  locale?: 'nl' | 'en';
  /** Maximum tokens to include (will prioritize if exceeded) */
  maxTokens?: number;
}

export interface MemoryInjectionResult {
  /** Formatted prompt text */
  promptSection: string;
  /** Token estimate */
  tokenEstimate: number;
  /** Which memories were included */
  included: {
    personal: boolean;
    project: boolean;
    domain: boolean;
  };
  /** Raw memory objects (for debugging/UI) */
  memories: CombinedMemoryContext;
}

// ============================================
// Constants
// ============================================

/** Default maximum tokens for memory injection */
const DEFAULT_MAX_TOKENS = 1500;

/** Token budget allocation when exceeding limit */
const TOKEN_BUDGET = {
  personal: 0.3,  // 30% for personal
  project: 0.5,   // 50% for project (most important in context)
  domain: 0.2,    // 20% for domain
};

// ============================================
// Main Functions
// ============================================

/**
 * Get combined memory context for all three tiers
 */
export async function getCombinedMemoryContext(
  params: MemoryInjectionParams
): Promise<CombinedMemoryContext> {
  const { userId, projectId, orgId } = params;

  // Fetch all memories in parallel
  const [personal, project, domain] = await Promise.all([
    getPersonalMemory(userId),
    projectId ? getProjectMemory(projectId) : Promise.resolve(null),
    orgId ? getDomainMemory(orgId) : Promise.resolve(null),
  ]);

  // Calculate total tokens
  const totalTokenEstimate =
    (personal?.tokenEstimate || 0) +
    (project?.tokenEstimate || 0) +
    (domain?.tokenEstimate || 0);

  return {
    personal,
    project,
    domain,
    totalTokenEstimate,
  };
}

/**
 * Get formatted memory prompt section for injection
 */
export async function getMemoryPromptSection(
  params: MemoryInjectionParams
): Promise<MemoryInjectionResult> {
  const { locale = 'en', maxTokens = DEFAULT_MAX_TOKENS } = params;

  // Get combined context
  const memories = await getCombinedMemoryContext(params);

  // Format each memory tier
  const sections: Array<{ type: 'personal' | 'project' | 'domain'; text: string; tokens: number }> = [];

  if (memories.personal && memories.personal.preferences.length > 0) {
    const text = formatPersonalMemoryForPrompt(memories.personal);
    if (text.trim()) {
      sections.push({
        type: 'personal',
        text,
        tokens: Math.ceil(text.length / 4),
      });
    }
  }

  if (memories.project) {
    const text = formatProjectMemoryForPrompt(memories.project);
    if (text.trim()) {
      sections.push({
        type: 'project',
        text,
        tokens: Math.ceil(text.length / 4),
      });
    }
  }

  if (memories.domain) {
    const text = formatDomainMemoryForPrompt(memories.domain);
    if (text.trim()) {
      sections.push({
        type: 'domain',
        text,
        tokens: Math.ceil(text.length / 4),
      });
    }
  }

  // Check if we need to trim
  const totalTokens = sections.reduce((sum, s) => sum + s.tokens, 0);

  if (totalTokens > maxTokens) {
    console.warn(`[MemoryInjector] Total memory tokens (${totalTokens}) exceeds limit (${maxTokens}), will prioritize`);
    // In a production system, we'd implement smart trimming here
    // For now, just warn and include everything
  }

  // Build the final prompt section
  const promptParts: string[] = [];

  const header = locale === 'nl'
    ? '## Context over deze gebruiker en dit project'
    : '## Context about this user and project';

  promptParts.push(header);

  // Add personal memory
  const personalSection = sections.find(s => s.type === 'personal');
  if (personalSection) {
    const personalHeader = locale === 'nl' ? '### Over de gebruiker' : '### About the user';
    promptParts.push(`${personalHeader}\n${personalSection.text}`);
  }

  // Add project memory
  const projectSection = sections.find(s => s.type === 'project');
  if (projectSection) {
    const projectHeader = locale === 'nl' ? '### Over dit project' : '### About this project';
    promptParts.push(`${projectHeader}\n${projectSection.text}`);
  }

  // Add domain memory
  const domainSection = sections.find(s => s.type === 'domain');
  if (domainSection) {
    const domainHeader = locale === 'nl' ? '### Organisatiekennis' : '### Organization knowledge';
    promptParts.push(`${domainHeader}\n${domainSection.text}`);
  }

  // Add usage instructions
  const instructions = locale === 'nl'
    ? `
BELANGRIJK over bovenstaande context:
- Gebruik deze informatie natuurlijk, noem niet expliciet dat je dit "onthoudt"
- Pas voorkeuren toe zonder er aandacht op te vestigen
- Verwijs naar projectfeiten wanneer relevant
- Nooit verzonnen informatie toevoegen`
    : `
IMPORTANT about the above context:
- Use this information naturally, don't explicitly mention that you "remember" these things
- Apply preferences without calling attention to them
- Reference project facts when relevant
- Never add made-up information`;

  promptParts.push(instructions);

  // Combine
  const promptSection = promptParts.join('\n\n');
  const tokenEstimate = Math.ceil(promptSection.length / 4);

  return {
    promptSection,
    tokenEstimate,
    included: {
      personal: !!personalSection,
      project: !!projectSection,
      domain: !!domainSection,
    },
    memories,
  };
}

/**
 * Enhance an existing system prompt with memory context
 */
export async function enhancePromptWithMemory(
  basePrompt: string,
  params: MemoryInjectionParams
): Promise<{ enhancedPrompt: string; memoryResult: MemoryInjectionResult }> {
  const memoryResult = await getMemoryPromptSection(params);

  // Only add memory section if there's actual content
  if (!memoryResult.included.personal && !memoryResult.included.project && !memoryResult.included.domain) {
    return {
      enhancedPrompt: basePrompt,
      memoryResult,
    };
  }

  // Inject memory section after the base prompt
  const enhancedPrompt = `${basePrompt}\n\n${memoryResult.promptSection}`;

  return {
    enhancedPrompt,
    memoryResult,
  };
}

/**
 * Check if memory should be updated based on interaction
 * This is a helper for deciding when to trigger background memory synthesis
 */
export function shouldSynthesizeMemory(params: {
  messageCount: number;
  lastSynthesizedAt: Date | null;
  isSignificantEvent?: boolean;
}): boolean {
  const { messageCount, lastSynthesizedAt, isSignificantEvent } = params;

  // Always synthesize on significant events (document upload, analysis complete, etc.)
  if (isSignificantEvent) {
    return true;
  }

  // Synthesize every 5 messages
  if (messageCount > 0 && messageCount % 5 === 0) {
    return true;
  }

  // Synthesize if never done before and have enough messages
  if (!lastSynthesizedAt && messageCount >= 3) {
    return true;
  }

  // Synthesize if it's been more than 24 hours
  if (lastSynthesizedAt) {
    const hoursSince = (Date.now() - lastSynthesizedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24 && messageCount >= 3) {
      return true;
    }
  }

  return false;
}

// ============================================
// Re-exports for convenience
// ============================================

export {
  getPersonalMemory,
  updatePreference,
  updateIdentity,
  deletePreference,
  editPreference,
  addPreferenceManually,
  clearPersonalMemory,
  formatPersonalMemoryForPrompt,
} from './personal-memory-store';

export {
  getProjectMemory,
  getOrCreateProjectMemory,
  updateHardValues,
  getHardValue,
  removeHardValue,
  addSoftContext,
  removeSoftContext,
  updateSoftContext,
  updateProjectSummary,
  formatProjectMemoryForPrompt,
  clearProjectMemory,
} from './project-memory-store';

export {
  getDomainMemory,
  getOrCreateDomainMemory,
  addExplicitKnowledge,
  updateExplicitKnowledge,
  removeExplicitKnowledge,
  addLearnedPattern,
  removeLearnedPattern,
  formatDomainMemoryForPrompt,
} from './domain-memory-store';
