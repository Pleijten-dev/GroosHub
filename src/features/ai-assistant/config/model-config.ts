/**
 * AI Assistant Model Configuration
 *
 * Centralized configuration for the AI assistant tools.
 * Easy to switch between Sonnet (quality) and Haiku (cost).
 *
 * Environment variables:
 * - AI_ASSISTANT_USE_BUDGET_MODEL=true  Force all tools to use Haiku
 * - AI_ASSISTANT_DEFAULT_MODEL=claude-haiku-3.5  Override default model
 */

import type { ModelId } from '@/lib/ai/models';

// Check for environment variable overrides
const ENV_USE_BUDGET = process.env.AI_ASSISTANT_USE_BUDGET_MODEL === 'true';
const ENV_DEFAULT_MODEL = process.env.AI_ASSISTANT_DEFAULT_MODEL as ModelId | undefined;

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
 *
 * Priority:
 * 1. ENV_USE_BUDGET=true → Force budget model for all tools
 * 2. ENV_DEFAULT_MODEL → Override default model globally
 * 3. Tool in budgetModelTools list → Use budget model
 * 4. Default → Use default model (Sonnet)
 */
export function getModelForTool(toolId: string): ModelId {
  // Environment override: force all tools to use budget model
  if (ENV_USE_BUDGET) {
    return AI_ASSISTANT_CONFIG.budgetModel;
  }

  // Check if tool is in budget tools list
  const budgetTools = AI_ASSISTANT_CONFIG.budgetModelTools as readonly string[];
  if (budgetTools.includes(toolId)) {
    return AI_ASSISTANT_CONFIG.budgetModel;
  }

  // Environment override: custom default model
  if (ENV_DEFAULT_MODEL) {
    return ENV_DEFAULT_MODEL;
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

/**
 * Get the current effective configuration (for admin/debugging)
 * Note: This is server-side only, not exposed to users
 */
export function getEffectiveConfig(): {
  effectiveDefaultModel: ModelId;
  budgetModeEnabled: boolean;
  envOverrideActive: boolean;
} {
  return {
    effectiveDefaultModel: ENV_DEFAULT_MODEL || AI_ASSISTANT_CONFIG.defaultModel,
    budgetModeEnabled: ENV_USE_BUDGET,
    envOverrideActive: ENV_USE_BUDGET || !!ENV_DEFAULT_MODEL,
  };
}
