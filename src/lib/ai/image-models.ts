/**
 * Image Generation Models
 * Configuration for AI models that generate images
 */

import { openai } from '@ai-sdk/openai';

/**
 * Available image model IDs
 */
export type ImageModelId =
  | 'dall-e-3'
  | 'dall-e-2';

/**
 * Image model capabilities
 */
export interface ImageModelCapabilities {
  maxImagesPerRequest: number;
  supportedSizes: string[];
  supportedQualities?: string[];
  supportedStyles?: string[];
  costPerImage: number;
  provider: string;
}

/**
 * Image model registry
 */
export const IMAGE_MODELS = {
  'dall-e-3': openai.image('dall-e-3'),
  'dall-e-2': openai.image('dall-e-2'),
} as const;

/**
 * Image model capabilities registry
 */
export const IMAGE_MODEL_CAPABILITIES: Record<ImageModelId, ImageModelCapabilities> = {
  'dall-e-3': {
    maxImagesPerRequest: 1,
    supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
    supportedQualities: ['standard', 'hd'],
    supportedStyles: ['natural', 'vivid'],
    costPerImage: 0.04, // $0.04 per image at 1024x1024 standard
    provider: 'openai',
  },
  'dall-e-2': {
    maxImagesPerRequest: 10,
    supportedSizes: ['256x256', '512x512', '1024x1024'],
    costPerImage: 0.02, // $0.02 per image at 1024x1024
    provider: 'openai',
  },
};

/**
 * Get an image model by ID
 */
export function getImageModel(modelId: ImageModelId) {
  const model = IMAGE_MODELS[modelId];
  if (!model) {
    throw new Error(`Invalid image model ID: ${modelId}`);
  }
  return model;
}

/**
 * Get image model capabilities
 */
export function getImageModelCapabilities(modelId: ImageModelId): ImageModelCapabilities {
  const capabilities = IMAGE_MODEL_CAPABILITIES[modelId];
  if (!capabilities) {
    throw new Error(`No capabilities found for image model: ${modelId}`);
  }
  return capabilities;
}

/**
 * Validate image generation parameters
 */
export function validateImageParams(
  modelId: ImageModelId,
  size?: string,
  n?: number
): { isValid: boolean; error?: string } {
  const capabilities = getImageModelCapabilities(modelId);

  // Validate size
  if (size && !capabilities.supportedSizes.includes(size)) {
    return {
      isValid: false,
      error: `Size ${size} not supported for ${modelId}. Supported sizes: ${capabilities.supportedSizes.join(', ')}`,
    };
  }

  // Validate number of images
  if (n && n > capabilities.maxImagesPerRequest) {
    return {
      isValid: false,
      error: `Cannot generate ${n} images with ${modelId}. Maximum: ${capabilities.maxImagesPerRequest}`,
    };
  }

  return { isValid: true };
}
