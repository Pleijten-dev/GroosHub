/**
 * AI Model Registry
 * Centralized configuration for all AI models used in the chatbot
 *
 * This is the single source of truth for model configurations.
 * DO NOT modify model configurations outside of this file.
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { xai } from '@ai-sdk/xai';

/**
 * Model capabilities interface
 * Defines what each model can and cannot do
 */
export interface ModelCapabilities {
  supportsVision: boolean;
  supportsTools: boolean;
  supportsImageGeneration: boolean;
  maxTokens: number;
  contextWindow: number;
  streamingSupported: boolean;
  providers: string[];
  costPer1kTokens: {
    input: number;
    output: number;
  };
}

/**
 * All available model IDs
 * Update this type when adding new models
 */
export type ModelId =
  // OpenAI models
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  // Anthropic models
  | 'claude-sonnet-4.5'
  | 'claude-sonnet-3.7'
  | 'claude-haiku-3.5'
  | 'claude-opus-3.5'
  // Google models
  | 'gemini-2.0-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  // Mistral models
  | 'mistral-large'
  | 'mistral-small'
  | 'mistral-nemo'
  // xAI models
  | 'grok-2-latest'
  | 'grok-2-vision'
  | 'grok-beta';

/**
 * Model registry
 * Maps model IDs to their SDK implementations
 */
export const MODELS = {
  // OpenAI models
  'gpt-4o': openai('gpt-4o'),
  'gpt-4o-mini': openai('gpt-4o-mini'),
  'gpt-4-turbo': openai('gpt-4-turbo'),
  'gpt-3.5-turbo': openai('gpt-3.5-turbo'),

  // Anthropic models
  'claude-sonnet-4.5': anthropic('claude-sonnet-4-5-20250929'),
  'claude-sonnet-3.7': anthropic('claude-3-7-sonnet-20250219'),
  'claude-haiku-3.5': anthropic('claude-3-5-haiku-20241022'),
  'claude-opus-3.5': anthropic('claude-3-5-opus-20240229'),

  // Google models
  'gemini-2.0-flash': google('gemini-2.0-flash-exp'),
  'gemini-1.5-pro': google('gemini-1.5-pro-latest'),
  'gemini-1.5-flash': google('gemini-1.5-flash-latest'),

  // Mistral models
  'mistral-large': mistral('mistral-large-latest'),
  'mistral-small': mistral('mistral-small-latest'),
  'mistral-nemo': mistral('open-mistral-nemo'),

  // xAI models
  'grok-2-latest': xai('grok-2-latest'),
  'grok-2-vision': xai('grok-2-vision-1212'),
  'grok-beta': xai('grok-beta'),
} as const;

/**
 * Model capabilities registry
 * Defines what each model can do and pricing information
 * Prices are in USD per 1,000 tokens (as of 2025-11)
 */
export const MODEL_CAPABILITIES: Record<ModelId, ModelCapabilities> = {
  // OpenAI models
  'gpt-4o': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 16384,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['openai'],
    costPer1kTokens: { input: 0.0025, output: 0.01 },
  },
  'gpt-4o-mini': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 16384,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['openai'],
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
  },
  'gpt-4-turbo': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 4096,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['openai'],
    costPer1kTokens: { input: 0.01, output: 0.03 },
  },
  'gpt-3.5-turbo': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 4096,
    contextWindow: 16385,
    streamingSupported: true,
    providers: ['openai'],
    costPer1kTokens: { input: 0.0005, output: 0.0015 },
  },

  // Anthropic models
  'claude-sonnet-4.5': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 200000,
    streamingSupported: true,
    providers: ['anthropic'],
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  'claude-sonnet-3.7': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 200000,
    streamingSupported: true,
    providers: ['anthropic'],
    costPer1kTokens: { input: 0.003, output: 0.015 },
  },
  'claude-haiku-3.5': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 200000,
    streamingSupported: true,
    providers: ['anthropic'],
    costPer1kTokens: { input: 0.001, output: 0.005 },
  },
  'claude-opus-3.5': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 4096,
    contextWindow: 200000,
    streamingSupported: true,
    providers: ['anthropic'],
    costPer1kTokens: { input: 0.015, output: 0.075 },
  },

  // Google models
  'gemini-2.0-flash': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 1000000,
    streamingSupported: true,
    providers: ['google'],
    costPer1kTokens: { input: 0, output: 0 }, // Free tier
  },
  'gemini-1.5-pro': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 2000000,
    streamingSupported: true,
    providers: ['google'],
    costPer1kTokens: { input: 0.00125, output: 0.005 },
  },
  'gemini-1.5-flash': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 1000000,
    streamingSupported: true,
    providers: ['google'],
    costPer1kTokens: { input: 0.000075, output: 0.0003 },
  },

  // Mistral models
  'mistral-large': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['mistral'],
    costPer1kTokens: { input: 0.002, output: 0.006 },
  },
  'mistral-small': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['mistral'],
    costPer1kTokens: { input: 0.0002, output: 0.0006 },
  },
  'mistral-nemo': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['mistral'],
    costPer1kTokens: { input: 0.00015, output: 0.00015 },
  },

  // xAI models
  'grok-2-latest': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['xai'],
    costPer1kTokens: { input: 0.002, output: 0.01 },
  },
  'grok-2-vision': {
    supportsVision: true,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['xai'],
    costPer1kTokens: { input: 0.002, output: 0.01 },
  },
  'grok-beta': {
    supportsVision: false,
    supportsTools: true,
    supportsImageGeneration: false,
    maxTokens: 8192,
    contextWindow: 128000,
    streamingSupported: true,
    providers: ['xai'],
    costPer1kTokens: { input: 0.005, output: 0.015 },
  },
};

/**
 * Get a model by ID
 * @param modelId - The ID of the model to retrieve
 * @returns The model instance from the AI SDK
 * @throws Error if model ID is invalid
 */
export function getModel(modelId: ModelId) {
  const model = MODELS[modelId];

  if (!model) {
    throw new Error(`Invalid model ID: ${modelId}`);
  }

  return model;
}

/**
 * Get model capabilities
 * @param modelId - The ID of the model
 * @returns Model capabilities object
 * @throws Error if model ID is invalid
 */
export function getModelCapabilities(modelId: ModelId): ModelCapabilities {
  const capabilities = MODEL_CAPABILITIES[modelId];

  if (!capabilities) {
    throw new Error(`No capabilities found for model: ${modelId}`);
  }

  return capabilities;
}

/**
 * Check if a model supports a specific feature
 * @param modelId - The ID of the model
 * @param feature - The feature to check (vision, tools, imageGeneration)
 * @returns True if the model supports the feature
 */
export function modelSupportsFeature(
  modelId: ModelId,
  feature: 'vision' | 'tools' | 'imageGeneration'
): boolean {
  const capabilities = getModelCapabilities(modelId);

  switch (feature) {
    case 'vision':
      return capabilities.supportsVision;
    case 'tools':
      return capabilities.supportsTools;
    case 'imageGeneration':
      return capabilities.supportsImageGeneration;
    default:
      return false;
  }
}

/**
 * Get all available model IDs
 * @returns Array of all model IDs
 */
export function getAllModelIds(): ModelId[] {
  return Object.keys(MODELS) as ModelId[];
}

/**
 * Get models by provider
 * @param provider - The provider name (openai, anthropic, google, mistral, xai)
 * @returns Array of model IDs from that provider
 */
export function getModelsByProvider(provider: string): ModelId[] {
  return getAllModelIds().filter(modelId => {
    const capabilities = MODEL_CAPABILITIES[modelId];
    return capabilities.providers.includes(provider.toLowerCase());
  });
}

/**
 * Get models that support a specific feature
 * @param feature - The feature to filter by
 * @returns Array of model IDs that support the feature
 */
export function getModelsByFeature(
  feature: 'vision' | 'tools' | 'imageGeneration'
): ModelId[] {
  return getAllModelIds().filter(modelId =>
    modelSupportsFeature(modelId, feature)
  );
}

/**
 * Default model for general chat (good balance of cost and performance)
 */
export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4.5';

/**
 * Default model for vision tasks
 */
export const DEFAULT_VISION_MODEL: ModelId = 'gpt-4o';

/**
 * Cheapest models for simple tasks (cost optimization)
 */
export const CHEAP_MODELS: ModelId[] = [
  'gpt-4o-mini',
  'claude-haiku-3.5',
  'gemini-1.5-flash',
  'mistral-nemo'
];

/**
 * Most capable models for complex tasks
 */
export const PREMIUM_MODELS: ModelId[] = [
  'claude-sonnet-4.5',
  'gpt-4o',
  'gemini-1.5-pro',
  'mistral-large'
];
