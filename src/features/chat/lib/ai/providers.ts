// AI provider configuration adapted from Vercel AI Chatbot
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { mistral } from '@ai-sdk/mistral';
import { google } from '@ai-sdk/google';

export type AIProvider = 'xai' | 'openai' | 'anthropic' | 'mistral' | 'google';

// Get language model based on model ID
export function getLanguageModel(modelId: string) {
  // xAI models (Grok)
  if (modelId.startsWith('grok')) {
    return xai(modelId);
  }

  // OpenAI models
  if (modelId.startsWith('gpt')) {
    return openai(modelId);
  }

  // Anthropic models (Claude)
  if (modelId.startsWith('claude')) {
    return anthropic(modelId);
  }

  // Mistral models
  if (modelId.startsWith('mistral')) {
    return mistral(modelId);
  }

  // Google models (Gemini)
  if (modelId.startsWith('gemini')) {
    return google(modelId);
  }

  // Default to xAI if no match
  return xai(modelId);
}
