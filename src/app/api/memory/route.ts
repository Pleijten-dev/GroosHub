/**
 * User Memory API (Legacy Compatibility Layer)
 *
 * DEPRECATED: This endpoint provides backwards compatibility.
 * New code should use /api/memory/personal for personal memory.
 *
 * Endpoints:
 * - GET /api/memory - Get current user memory (redirects to new system)
 * - POST /api/memory - Analyze conversation and update memory
 * - PUT /api/memory - Manually update memory
 * - DELETE /api/memory - Delete memory (GDPR compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getPersonalMemory,
  updateIdentity,
  addPreferenceManually,
  clearPersonalMemory,
  formatPersonalMemoryForPrompt,
} from '@/features/ai-assistant/lib/personal-memory-store';
import { queuePreferenceAnalysis } from '@/features/ai-assistant/lib/preference-analyzer';
import type { UIMessage } from 'ai';
import { z } from 'zod';

// ============================================
// GET - Retrieve user memory (DEPRECATED)
// ============================================

export async function GET() {
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

    console.log('[Memory API] ⚠️ DEPRECATED: Use /api/memory/personal instead');

    // Get memory using new system
    const memory = await getPersonalMemory(userId);
    const formatted = formatPersonalMemoryForPrompt(memory);

    // Map to legacy response format for backwards compatibility
    return NextResponse.json({
      success: true,
      data: {
        // Legacy format fields
        memory_content: formatted,
        user_name: memory.identity?.name || null,
        user_role: memory.identity?.position || null,
        preferences: memory.preferences.reduce((acc, p) => {
          acc[p.key] = p.value;
          return acc;
        }, {} as Record<string, string>),
        interests: [],
        patterns: [],
        context: [],
        token_count: memory.tokenEstimate,
        total_updates: memory.preferences.reduce((sum, p) => sum + p.reinforcements, 0),
        last_analysis_at: memory.lastSynthesizedAt,
        formatted,
        // New system fields for reference
        _newSystem: {
          identity: memory.identity,
          preferences: memory.preferences,
          memoryContent: memory.memoryContent,
          tokenEstimate: memory.tokenEstimate,
        }
      }
    });

  } catch (error) {
    console.error('[Memory API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Analyze conversation and update memory
// ============================================

const analyzeRequestSchema = z.object({
  messages: z.array(z.any()), // UIMessage[]
  chatId: z.string().optional(),
  locale: z.enum(['nl', 'en']).optional(),
  modelId: z.string().optional()
});

export async function POST(request: NextRequest) {
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

    // Parse request
    const body = await request.json();
    const validated = analyzeRequestSchema.parse(body);

    const messages = validated.messages as UIMessage[];
    const locale = validated.locale || 'nl';
    const chatId = validated.chatId;

    console.log(`[Memory API] ⚠️ DEPRECATED: Using new preference analyzer for ${messages.length} messages`);

    // Queue preference analysis using new system
    // This uses the confidence-based 3-tier memory system
    if (chatId) {
      queuePreferenceAnalysis({
        messages,
        userId,
        chatId,
        locale,
      });
    }

    // Get current memory
    const memory = await getPersonalMemory(userId);
    const formatted = formatPersonalMemoryForPrompt(memory);

    return NextResponse.json({
      success: true,
      updated: true,
      message: 'Analysis queued using new confidence-based system',
      data: {
        memory_content: formatted,
        token_count: memory.tokenEstimate,
        total_updates: memory.preferences.reduce((sum, p) => sum + p.reinforcements, 0),
        last_analysis_at: memory.lastSynthesizedAt
      }
    });

  } catch (error) {
    console.error('[Memory API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze and update memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT - Manually update memory (DEPRECATED)
// ============================================

const updateRequestSchema = z.object({
  memory_content: z.string().min(0).max(2000).optional(),
  user_name: z.string().optional(),
  user_role: z.string().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export async function PUT(request: NextRequest) {
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

    // Parse request
    const body = await request.json();
    const validated = updateRequestSchema.parse(body);

    console.log(`[Memory API] ⚠️ DEPRECATED: Manually updating memory for user ${userId}`);

    // Update identity if provided
    if (validated.user_name || validated.user_role) {
      await updateIdentity(userId, {
        name: validated.user_name,
        position: validated.user_role
      });
    }

    // Update preferences if provided
    if (validated.preferences) {
      for (const [key, value] of Object.entries(validated.preferences)) {
        if (typeof value === 'string') {
          await addPreferenceManually(userId, key, value);
        }
      }
    }

    console.log('[Memory API] ✅ Memory updated via legacy endpoint');

    // Get updated memory
    const memory = await getPersonalMemory(userId);
    const formatted = formatPersonalMemoryForPrompt(memory);

    return NextResponse.json({
      success: true,
      data: {
        memory_content: formatted,
        token_count: memory.tokenEstimate,
        total_updates: memory.preferences.reduce((sum, p) => sum + p.reinforcements, 0),
        last_analysis_at: memory.lastSynthesizedAt
      }
    });

  } catch (error) {
    console.error('[Memory API] PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete memory (GDPR compliance)
// ============================================

export async function DELETE() {
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

    console.log(`[Memory API] 🗑️ Deleting memory for user ${userId}`);

    // Use new system to clear memory
    await clearPersonalMemory(userId);

    console.log('[Memory API] ✅ Memory deleted');

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully'
    });

  } catch (error) {
    console.error('[Memory API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete memory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
