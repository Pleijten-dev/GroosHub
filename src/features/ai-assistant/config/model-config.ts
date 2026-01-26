/**
 * AI Assistant Model Configuration
 *
 * Centralized configuration for the AI assistant tools.
 * Easy to switch between Sonnet (quality) and Haiku (cost).
 */

import type { ModelId } from '@/lib/ai/models';

/**
 * AI Assistant configuration
 */
export const AI_ASSISTANT_CONFIG = {
  /**
   * Default model for AI assistant tools
   * - claude-sonnet-4.5: High quality, creative, handles large context ($3/$15 per 1M tokens)
   * - claude-haiku-3.5: Budget option, faster, good for simple tasks ($1/$5 per 1M tokens)
   */
  defaultModel: 'claude-sonnet-4.5' as ModelId,

  /**
   * Budget model for cost optimization
   * Switch to this for high-volume or less critical tools
   */
  budgetModel: 'claude-haiku-3.5' as ModelId,

  /**
   * Temperature settings by output format
   * - direct: Standard responses (0.7)
   * - table: Structured comparisons (0.3 - more deterministic)
   * - interactive: Conversational, follow-ups (0.8 - more creative)
   */
  temperatureByFormat: {
    direct: 0.7,
    table: 0.3,
    interactive: 0.8,
  },

  /**
   * Max tokens for responses by output format
   */
  maxTokensByFormat: {
    direct: 2000,
    table: 3000,
    interactive: 1500,
  },

  /**
   * Tools that should use the budget model (cost optimization)
   * These are simpler tools that don't require Sonnet's capabilities
   */
  budgetModelTools: [
    'voorzieningen-local-guide', // Simple amenity listing
    'veiligheid-benchmarking',   // Simple table generation
    'demografie-population-profile', // Basic summary
  ],
} as const;

/**
 * Get the model to use for a specific tool
 */
export function getModelForTool(toolId: string): ModelId {
  // Cast to readonly string[] to allow generic string comparison
  const budgetTools = AI_ASSISTANT_CONFIG.budgetModelTools as readonly string[];
  if (budgetTools.includes(toolId)) {
    return AI_ASSISTANT_CONFIG.budgetModel;
  }
  return AI_ASSISTANT_CONFIG.defaultModel;
}

/**
 * Get temperature for a specific output format
 */
export function getTemperatureForFormat(format: 'direct' | 'table' | 'interactive'): number {
  return AI_ASSISTANT_CONFIG.temperatureByFormat[format];
}

/**
 * Get max tokens for a specific output format
 */
export function getMaxTokensForFormat(format: 'direct' | 'table' | 'interactive'): number {
  return AI_ASSISTANT_CONFIG.maxTokensByFormat[format];
}
