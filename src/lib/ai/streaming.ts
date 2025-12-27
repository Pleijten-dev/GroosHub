/**
 * AI Streaming Utilities
 * Helper functions for streaming text with fallbacks and reasoning support
 */

import { streamText, generateText, type CoreMessage } from 'ai';
import { getModel, getFallbackModels, modelSupportsReasoning, type ModelId, MODEL_CAPABILITIES } from './models';

/**
 * Stream text with automatic fallback support
 * If primary model fails, automatically tries fallback models
 */
export async function streamTextWithFallback(
  options: {
    modelId: ModelId;
    messages: CoreMessage[];
    temperature?: number;
    tools?: any;
    stopWhen?: any;
    onStepFinish?: any;
    onFinish?: any;
    reasoningMode?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
    enableTelemetry?: boolean;
    telemetryMetadata?: Record<string, unknown>;
  }
) {
  const {
    modelId,
    messages,
    temperature = 0.7,
    tools,
    stopWhen,
    onStepFinish,
    onFinish,
    reasoningMode = false,
    reasoningEffort = 'medium',
    enableTelemetry = false,
    telemetryMetadata,
  } = options;

  // Get primary model and fallbacks
  const modelsToTry = [modelId, ...getFallbackModels(modelId)];

  // Try each model in order
  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModelId = modelsToTry[i];
    const isLastAttempt = i === modelsToTry.length - 1;

    try {
      console.log(`[Streaming] Attempting model: ${currentModelId} (${i + 1}/${modelsToTry.length})`);

      const model = getModel(currentModelId);
      const modelInfo = MODEL_CAPABILITIES[currentModelId];

      // Build provider options for reasoning models
      const providerOptions: any = {};

      // OpenAI o1 reasoning configuration
      if (currentModelId === 'o1' || currentModelId === 'o1-mini') {
        if (reasoningMode) {
          providerOptions.openai = {
            reasoningEffort: reasoningEffort,
          };
        }
      }

      // Claude extended thinking configuration
      if ((currentModelId === 'claude-sonnet-4.5' || currentModelId === 'claude-sonnet-3.7') && reasoningMode) {
        providerOptions.anthropic = {
          thinking: {
            type: 'enabled',
            budget_tokens: reasoningEffort === 'high' ? 10000 : reasoningEffort === 'medium' ? 5000 : 2000,
          },
        };
      }

      // Telemetry configuration
      const telemetryConfig = enableTelemetry
        ? {
            isEnabled: true,
            functionId: `chat-${currentModelId}`,
            metadata: {
              ...telemetryMetadata,
              modelId: currentModelId,
              reasoningMode,
              fallbackAttempt: i,
            },
          }
        : undefined;

      // Check if model supports streaming
      if (!modelInfo.streamingSupported) {
        console.log(`[Streaming] Model ${currentModelId} doesn't support streaming, using generateText`);

        // Use generateText for non-streaming models (e.g., o1)
        const result = await generateText({
          model,
          messages,
          temperature,
          tools,
          maxSteps: stopWhen ? 10 : undefined,
          ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
          ...(telemetryConfig && { experimental_telemetry: telemetryConfig }),
        });

        // Call onFinish if provided
        if (onFinish) {
          await onFinish({
            text: result.text,
            usage: result.usage,
            reasoning: (result as any).reasoning,
            reasoningText: (result as any).reasoningText,
          });
        }

        // For non-streaming, we need to return a response that mimics streaming
        // This is handled by the caller
        return {
          isNonStreaming: true,
          result,
        };
      }

      // Use streamText for streaming-capable models
      const result = streamText({
        model,
        messages,
        temperature,
        tools,
        stopWhen,
        onStepFinish,
        onFinish,
        ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
        ...(telemetryConfig && { experimental_telemetry: telemetryConfig }),
      });

      console.log(`[Streaming] ✅ Successfully using model: ${currentModelId}`);
      return { isNonStreaming: false, result };
    } catch (error) {
      console.error(`[Streaming] ❌ Model ${currentModelId} failed:`, error);

      // If this is the last attempt, throw the error
      if (isLastAttempt) {
        throw error;
      }

      // Otherwise, log and try next model
      console.log(`[Streaming] 🔄 Trying fallback model...`);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('All models failed');
}

/**
 * Check if reasoning mode should be enabled based on model and user preference
 */
export function shouldEnableReasoning(modelId: ModelId, userPreference: boolean): boolean {
  if (!userPreference) return false;
  return modelSupportsReasoning(modelId);
}

/**
 * Get reasoning effort from user preference
 */
export function getReasoningEffort(effort?: string): 'low' | 'medium' | 'high' {
  if (effort === 'low' || effort === 'high') return effort;
  return 'medium';
}
