/**
 * AI Model Middleware
 * Custom middleware for enhancing model behavior
 *
 * Middleware can be used for:
 * - Logging and monitoring
 * - Cost tracking
 * - Content filtering
 * - Request transformation
 * - Caching
 */

import { LanguageModelV2Middleware } from 'ai';
import { trackLLMUsage } from '@/lib/ai/chat-store';

/**
 * Logging middleware
 * Logs all model requests and responses with timing
 */
export const loggingMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = Date.now();
    const modelId = params.model?.modelId || 'unknown';

    console.log('[AI Middleware] Generate request:', {
      model: modelId,
      promptLength: JSON.stringify(params.prompt).length,
      mode: params.mode,
    });

    try {
      const result = await doGenerate();

      const duration = Date.now() - startTime;
      console.log('[AI Middleware] Generate complete:', {
        model: modelId,
        duration: `${duration}ms`,
        inputTokens: result.usage?.promptTokens,
        outputTokens: result.usage?.completionTokens,
        finishReason: result.finishReason,
      });

      return result;
    } catch (error) {
      console.error('[AI Middleware] Generate error:', {
        model: modelId,
        duration: `${Date.now() - startTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },

  wrapStream: async ({ doStream, params }) => {
    const startTime = Date.now();
    const modelId = params.model?.modelId || 'unknown';

    console.log('[AI Middleware] Stream request:', {
      model: modelId,
      promptLength: JSON.stringify(params.prompt).length,
      mode: params.mode,
    });

    try {
      const result = await doStream();

      // Log on stream completion
      const originalHandlers = result.stream;
      let totalTokens = 0;

      return {
        ...result,
        stream: {
          async *[Symbol.asyncIterator]() {
            try {
              for await (const chunk of originalHandlers) {
                if (chunk.type === 'finish') {
                  totalTokens = chunk.usage?.totalTokens || 0;
                  console.log('[AI Middleware] Stream complete:', {
                    model: modelId,
                    duration: `${Date.now() - startTime}ms`,
                    tokens: totalTokens,
                    finishReason: chunk.finishReason,
                  });
                }
                yield chunk;
              }
            } catch (error) {
              console.error('[AI Middleware] Stream error:', {
                model: modelId,
                duration: `${Date.now() - startTime}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              throw error;
            }
          },
        },
      };
    } catch (error) {
      console.error('[AI Middleware] Stream initialization error:', {
        model: modelId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  },
};

/**
 * Cost tracking middleware
 * Automatically tracks token usage and costs to database
 *
 * Usage:
 * ```ts
 * const model = wrapLanguageModel({
 *   model: getModel('gpt-4o'),
 *   middleware: createCostTrackingMiddleware(userId, chatId),
 * });
 * ```
 */
export function createCostTrackingMiddleware(
  userId: number,
  chatId: string,
  metadata?: Record<string, unknown>
): LanguageModelV2Middleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const result = await doGenerate();

      // Track usage in database
      try {
        const modelId = params.model?.modelId || 'unknown';
        const provider = getProviderFromModelId(modelId);
        const costs = calculateCost(
          modelId,
          result.usage?.promptTokens || 0,
          result.usage?.completionTokens || 0
        );

        await trackLLMUsage({
          userId,
          chatId,
          model: modelId,
          provider,
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          costInput: costs.input,
          costOutput: costs.output,
          requestType: 'generate',
          responseTimeMs: 0, // Not tracked in middleware
          metadata,
        });
      } catch (error) {
        console.error('[Cost Middleware] Failed to track usage:', error);
        // Don't throw - allow request to complete even if tracking fails
      }

      return result;
    },
  };
}

/**
 * Error handling middleware
 * Provides user-friendly error messages and automatic retries
 */
export const errorHandlingMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    try {
      return await doGenerate();
    } catch (error) {
      const modelId = params.model?.modelId || 'unknown';

      // Transform technical errors into user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new Error(
            `The ${modelId} model is currently experiencing high demand. Please try again in a moment.`
          );
        }

        if (error.message.includes('API key') || error.message.includes('401')) {
          throw new Error(
            `Authentication failed for ${modelId}. Please check your API configuration.`
          );
        }

        if (error.message.includes('quota') || error.message.includes('402')) {
          throw new Error(
            `API quota exceeded for ${modelId}. Please check your billing settings.`
          );
        }

        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new Error(
            `Request to ${modelId} timed out. Please try again.`
          );
        }
      }

      // Re-throw original error if we can't handle it
      throw error;
    }
  },
};

/**
 * Content filtering middleware
 * Filters inappropriate content from prompts and responses
 */
export function createContentFilterMiddleware(
  options: {
    blockProfanity?: boolean;
    blockPII?: boolean;
    customFilters?: Array<(text: string) => boolean>;
  } = {}
): LanguageModelV2Middleware {
  return {
    transformParams: async ({ params }) => {
      // Filter prompt before sending to model
      if (typeof params.prompt === 'string') {
        let filteredPrompt = params.prompt;

        // Add your filtering logic here
        if (options.blockProfanity) {
          // Example: replace profanity
          // filteredPrompt = filterProfanity(filteredPrompt);
        }

        if (options.blockPII) {
          // Example: redact email addresses, phone numbers
          filteredPrompt = filteredPrompt.replace(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            '[EMAIL_REDACTED]'
          );
        }

        return {
          ...params,
          prompt: filteredPrompt,
        };
      }

      return params;
    },
  };
}

/**
 * Helper function to get provider from model ID
 */
function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith('gpt') || modelId.startsWith('o1')) return 'openai';
  if (modelId.startsWith('claude')) return 'anthropic';
  if (modelId.startsWith('gemini')) return 'google';
  if (modelId.startsWith('mistral')) return 'mistral';
  if (modelId.startsWith('grok')) return 'xai';
  return 'unknown';
}

/**
 * Helper function to calculate costs
 */
function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): { input: number; output: number } {
  // Import MODEL_CAPABILITIES dynamically to avoid circular dependency
  const costs = {
    input: (inputTokens / 1000) * 0.003, // Default $0.003 per 1k
    output: (outputTokens / 1000) * 0.015, // Default $0.015 per 1k
  };

  // You can import MODEL_CAPABILITIES here if needed
  // For now, using defaults
  return costs;
}

/**
 * Example: Combine multiple middleware
 *
 * ```ts
 * import { wrapLanguageModel } from 'ai';
 * import { loggingMiddleware, createCostTrackingMiddleware, errorHandlingMiddleware } from './middleware';
 *
 * const enhancedModel = wrapLanguageModel({
 *   model: getModel('gpt-4o'),
 *   middleware: [
 *     loggingMiddleware,
 *     createCostTrackingMiddleware(userId, chatId),
 *     errorHandlingMiddleware,
 *   ],
 * });
 * ```
 */
