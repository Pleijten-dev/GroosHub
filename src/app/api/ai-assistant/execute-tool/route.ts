/**
 * AI Assistant Tool Execution API
 *
 * Executes AI tools with proper context data using Vercel AI SDK v5.
 * Uses Claude Sonnet 4.5 by default (configurable to Haiku for cost optimization).
 */

import { streamText, type CoreMessage } from 'ai';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getModel, type ModelId } from '@/lib/ai/models';
import {
  AI_TOOLS,
  buildToolPayload,
  type AITool,
} from '@/features/ai-assistant/utils/aiToolsPayloadBuilder';
import {
  AI_ASSISTANT_CONFIG,
  getModelForTool,
  getTemperatureForFormat,
  getMaxTokensForFormat,
} from '@/features/ai-assistant/config/model-config';
import type { CompactLocationExport } from '@/features/location/utils/jsonExportCompact';

// Request schema
const executeToolSchema = z.object({
  toolId: z.string(),
  locationData: z.any().optional(), // CompactLocationExport
  locale: z.enum(['nl', 'en']).optional().default('nl'),
  // Optional: override the default model
  modelId: z.string().optional(),
  // Optional: custom user message (for agentic follow-ups)
  customMessage: z.string().optional(),
  // Optional: previous messages for multi-turn conversation
  previousMessages: z.array(z.any()).optional(),
});

/**
 * POST /api/ai-assistant/execute-tool
 *
 * Execute an AI assistant tool with streaming response.
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const {
      toolId,
      locationData,
      locale,
      modelId: requestedModelId,
      customMessage,
      previousMessages,
    } = executeToolSchema.parse(body);

    // Find the tool
    const tool = AI_TOOLS.find(t => t.id === toolId);
    if (!tool) {
      return new Response(
        JSON.stringify({ error: 'Tool not found', toolId }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if tool is disabled
    if (tool.isDisabled) {
      return new Response(
        JSON.stringify({
          error: 'Tool is disabled',
          reason: tool.disabledReason || 'This tool is not yet available',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the payload
    const payload = buildToolPayload(
      tool,
      locationData as CompactLocationExport | null,
      locale
    );

    // Determine which model to use
    const modelId = (requestedModelId as ModelId) || getModelForTool(toolId);
    const model = getModel(modelId);

    // Get settings based on output format
    const temperature = getTemperatureForFormat(tool.outputFormat);
    const maxTokens = getMaxTokensForFormat(tool.outputFormat);

    console.log(`[AI Assistant] Executing tool: ${toolId}`);
    console.log(`[AI Assistant] Model: ${modelId}, Temperature: ${temperature}`);
    console.log(`[AI Assistant] Output format: ${tool.outputFormat}`);

    // Build messages for the LLM using CoreMessage format
    const messages: CoreMessage[] = [];

    // System message with tool-specific system prompt
    messages.push({
      role: 'system',
      content: payload.systemPrompt,
    });

    // Add previous messages for multi-turn conversation (agentic tools)
    if (previousMessages && previousMessages.length > 0) {
      // Convert previous messages to CoreMessage format
      previousMessages.forEach((msg: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }) => {
        const content = msg.content ||
          (msg.parts?.filter(p => p.type === 'text' && p.text).map(p => p.text).join('')) ||
          '';
        if (content && (msg.role === 'user' || msg.role === 'assistant')) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content,
          });
        }
      });
    }

    // Build user message with context data
    const contextJson = JSON.stringify(payload.contextData, null, 2);
    const userMessageText = customMessage
      ? `${customMessage}\n\n---\nCONTEXT DATA:\n${contextJson}`
      : `${payload.userPrompt}\n\n---\nCONTEXT DATA:\n${contextJson}`;

    messages.push({
      role: 'user',
      content: userMessageText,
    });

    // Stream the response
    const result = streamText({
      model,
      messages,
      temperature,
      maxTokens,
      onFinish({ text, usage }) {
        console.log(`[AI Assistant] Tool ${toolId} completed`);
        console.log(`[AI Assistant] Tokens: ${usage.totalTokens} (in: ${usage.inputTokens}, out: ${usage.outputTokens})`);
      },
    });

    // Return streaming response with metadata headers
    const response = result.toUIMessageStreamResponse();

    // Add custom headers with tool metadata
    response.headers.set('X-Tool-Id', toolId);
    response.headers.set('X-Model-Id', modelId);
    response.headers.set('X-Is-Agentic', tool.isAgentic ? 'true' : 'false');

    return response;

  } catch (error) {
    console.error('[AI Assistant] Error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET /api/ai-assistant/execute-tool
 *
 * Return available tools and current configuration.
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      config: {
        defaultModel: AI_ASSISTANT_CONFIG.defaultModel,
        budgetModel: AI_ASSISTANT_CONFIG.budgetModel,
      },
      toolCount: AI_TOOLS.length,
      availableTools: AI_TOOLS.filter(t => !t.isDisabled).length,
      agenticTools: AI_TOOLS.filter(t => t.isAgentic).length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
