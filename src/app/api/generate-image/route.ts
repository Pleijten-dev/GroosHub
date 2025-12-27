/**
 * Image Generation API
 * Generates images from text descriptions using DALL-E models
 */

import { experimental_generateImage as generateImage } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getImageModel, validateImageParams, type ImageModelId } from '@/lib/ai/image-models';

// Request schema validation
const generateImageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000, 'Prompt too long'),
  model: z.enum(['dall-e-3', 'dall-e-2']).default('dall-e-3'),
  size: z.string().optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['natural', 'vivid']).optional(),
  n: z.number().min(1).max(10).optional().default(1),
});

/**
 * POST /api/generate-image
 * Generate images from text descriptions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validated = generateImageSchema.parse(body);

    const {
      prompt,
      model: modelId,
      size = modelId === 'dall-e-3' ? '1024x1024' : '1024x1024',
      quality = 'standard',
      style = 'vivid',
      n = 1,
    } = validated;

    console.log(`[Image Generation] User ${userId} requesting ${n} image(s) with ${modelId}`);
    console.log(`[Image Generation] Prompt: "${prompt.substring(0, 100)}..."`);

    // Validate parameters for the model
    const validation = validateImageParams(modelId, size, n);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Get the image model
    const model = getImageModel(modelId);

    // Build provider options
    const providerOptions: any = {};

    if (modelId === 'dall-e-3') {
      providerOptions.openai = {
        quality,
        style,
      };
    }

    // Generate image(s)
    const result = await generateImage({
      model,
      prompt,
      size: size as any,
      n,
      ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
      // Enable telemetry
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'generate-image',
        metadata: {
          userId,
          modelId,
          imageCount: n,
        },
      },
    });

    const duration = Date.now() - startTime;

    // Handle single image response
    if ('image' in result) {
      console.log(`[Image Generation] ✅ Generated 1 image in ${duration}ms`);

      return NextResponse.json({
        success: true,
        image: {
          url: result.image.url,
          base64: result.image.base64,
        },
        metadata: {
          model: modelId,
          size,
          quality: modelId === 'dall-e-3' ? quality : undefined,
          style: modelId === 'dall-e-3' ? style : undefined,
          duration,
        },
      });
    }

    // Handle multiple images response
    if ('images' in result) {
      console.log(`[Image Generation] ✅ Generated ${result.images.length} images in ${duration}ms`);

      return NextResponse.json({
        success: true,
        images: result.images.map(img => ({
          url: img.url,
          base64: img.base64,
        })),
        metadata: {
          model: modelId,
          size,
          count: result.images.length,
          duration,
        },
      });
    }

    // Unexpected response format
    return NextResponse.json(
      { error: 'Unexpected response format from image generation' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[Image Generation] Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    // Handle API errors
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('401')) {
        return NextResponse.json(
          { error: 'API authentication failed. Please check configuration.' },
          { status: 401 }
        );
      }

      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('quota') || error.message.includes('402')) {
        return NextResponse.json(
          { error: 'API quota exceeded. Please check billing settings.' },
          { status: 402 }
        );
      }

      if (error.message.includes('content policy')) {
        return NextResponse.json(
          { error: 'Content policy violation. Please revise your prompt.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-image
 * Health check and capabilities endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Image Generation API is running',
    models: [
      {
        id: 'dall-e-3',
        maxImages: 1,
        sizes: ['1024x1024', '1792x1024', '1024x1792'],
        qualities: ['standard', 'hd'],
        styles: ['natural', 'vivid'],
      },
      {
        id: 'dall-e-2',
        maxImages: 10,
        sizes: ['256x256', '512x512', '1024x1024'],
      },
    ],
  });
}
