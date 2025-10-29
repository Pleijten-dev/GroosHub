// AI provider configuration adapted from Vercel AI Chatbot
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export type AIProvider = 'xai' | 'openai' | 'anthropic';

// Get language model based on model ID
export function getLanguageModel(modelId: string) {
  // xAI models (default)
  if (modelId.startsWith('grok')) {
    return xai(modelId);
  }

  // OpenAI models
  if (modelId.startsWith('gpt')) {
    return openai(modelId);
  }

  // Anthropic models
  if (modelId.startsWith('claude')) {
    return anthropic(modelId);
  }

  // Default to xAI
  return xai(modelId);
}
