/**
 * User Memory API
 * Manages user-specific LLM memory for personalized responses
 *
 * Endpoints:
 * - GET /api/memory - Get current user memory
 * - POST /api/memory/analyze - Analyze conversation and update memory
 * - PUT /api/memory - Manually update memory
 * - DELETE /api/memory - Delete memory (GDPR compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserMemory,
  updateUserMemory,
  createUserMemory,
  deleteUserMemory,
  getMemoryHistory,
  formatMemoryForPrompt
} from '@/lib/ai/memory-store';
import { getMemoryExtractionPrompt } from '@/lib/ai/memory-prompts';
import { getModel, type ModelId } from '@/lib/ai/models';
import { generateText, type UIMessage } from 'ai';
import { z } from 'zod';

// ============================================
// GET - Retrieve user memory
// ============================================

export async function GET(request: NextRequest) {
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

    // Get memory
    const memory = await getUserMemory(userId);

    return NextResponse.json({
      success: true,
      data: {
        memory_content: memory.memory_content,
        user_name: memory.user_name,
        user_role: memory.user_role,
        preferences: memory.preferences,
        interests: memory.interests,
        patterns: memory.patterns,
        context: memory.context,
        token_count: memory.token_count,
        total_updates: memory.total_updates,
        last_analysis_at: memory.last_analysis_at,
        formatted: formatMemoryForPrompt(memory)
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
    const modelId = (validated.modelId || 'claude-haiku-3.5') as ModelId;

    console.log(`[Memory API] 🧠 Analyzing ${messages.length} messages for user ${userId}`);

    // Get current memory
    const currentMemory = await getUserMemory(userId);
    const currentMemoryText = formatMemoryForPrompt(currentMemory);

    // Generate memory extraction prompt
    const extractionPrompt = getMemoryExtractionPrompt(
      messages,
      currentMemoryText,
      locale
    );

    // Use LLM to analyze conversation and extract memory
    const model = getModel(modelId);
    const result = await generateText({
      model,
      prompt: extractionPrompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    const updatedMemoryContent = result.text.trim();

    console.log(`[Memory API] 📝 Extracted memory (${updatedMemoryContent.length} chars)`);

    // Check if memory actually changed
    if (updatedMemoryContent === currentMemoryText) {
      console.log('[Memory API] ℹ️  No changes detected in memory');
      return NextResponse.json({
        success: true,
        updated: false,
        message: 'No new information to add to memory',
        data: {
          memory_content: currentMemoryText,
          token_count: currentMemory.token_count
        }
      });
    }

    // Update memory in database
    if (currentMemory.memory_content === '') {
      // Create initial memory
      await createUserMemory({
        userId,
        memoryContent: updatedMemoryContent
      });
      console.log('[Memory API] ✅ Created initial memory');
    } else {
      // Update existing memory
      await updateUserMemory({
        userId,
        memoryContent: updatedMemoryContent,
        changeSummary: 'Updated from conversation analysis',
        changeType: 'modification',
        triggerSource: 'chat',
        triggerId: validated.chatId,
        metadata: {
          modelId,
          messageCount: messages.length
        }
      });
      console.log('[Memory API] ✅ Updated memory');
    }

    // Get updated memory
    const newMemory = await getUserMemory(userId);

    return NextResponse.json({
      success: true,
      updated: true,
      data: {
        memory_content: newMemory.memory_content,
        token_count: newMemory.token_count,
        total_updates: newMemory.total_updates,
        last_analysis_at: newMemory.last_analysis_at
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
// PUT - Manually update memory
// ============================================

const updateRequestSchema = z.object({
  memory_content: z.string().min(0).max(2000), // Max ~500 tokens
  user_name: z.string().optional(),
  user_role: z.string().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  interests: z.array(z.string()).optional(),
  patterns: z.array(z.object({
    type: z.string(),
    description: z.string(),
    frequency: z.number().optional(),
    examples: z.array(z.string()).optional()
  })).optional(),
  context: z.array(z.object({
    key: z.string(),
    value: z.string(),
    expires_at: z.string().optional()
  })).optional()
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

    console.log(`[Memory API] 📝 Manually updating memory for user ${userId}`);

    // Get current memory
    const currentMemory = await getUserMemory(userId);

    // Update memory
    if (currentMemory.memory_content === '' && validated.memory_content === '') {
      // No memory exists and no content provided - do nothing
      return NextResponse.json({
        success: true,
        message: 'No memory to update',
        data: { memory_content: '', token_count: 0 }
      });
    }

    if (currentMemory.memory_content === '') {
      // Create initial memory
      await createUserMemory({
        userId,
        memoryContent: validated.memory_content,
        userName: validated.user_name,
        userRole: validated.user_role,
        preferences: validated.preferences,
        interests: validated.interests,
        patterns: validated.patterns,
        context: validated.context
      });
    } else {
      // Update existing memory
      await updateUserMemory({
        userId,
        memoryContent: validated.memory_content,
        changeSummary: 'Manual update via API',
        changeType: 'manual',
        triggerSource: 'api',
        userName: validated.user_name,
        userRole: validated.user_role,
        preferences: validated.preferences,
        interests: validated.interests,
        patterns: validated.patterns,
        context: validated.context
      });
    }

    console.log('[Memory API] ✅ Memory updated manually');

    // Get updated memory
    const newMemory = await getUserMemory(userId);

    return NextResponse.json({
      success: true,
      data: {
        memory_content: newMemory.memory_content,
        token_count: newMemory.token_count,
        total_updates: newMemory.total_updates,
        last_analysis_at: newMemory.last_analysis_at
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

export async function DELETE(request: NextRequest) {
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

    console.log(`[Memory API] 🗑️  Deleting memory for user ${userId}`);

    await deleteUserMemory(userId);

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
