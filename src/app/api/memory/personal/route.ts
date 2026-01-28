/**
 * Personal Memory API
 *
 * Endpoints for managing user's personal AI memory
 * - GET: Retrieve personal memory
 * - PUT: Update preferences manually
 * - DELETE: Clear all memory (GDPR compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getPersonalMemory,
  updateIdentity,
  addPreferenceManually,
  editPreference,
  deletePreference,
  clearPersonalMemory,
  formatPersonalMemoryForPrompt,
} from '@/features/ai-assistant/lib/personal-memory-store';

/**
 * GET /api/memory/personal
 * Retrieve user's personal memory
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const memory = await getPersonalMemory(userId);
    const formattedText = formatPersonalMemoryForPrompt(memory);

    return NextResponse.json({
      success: true,
      data: {
        identity: memory.identity,
        preferences: memory.preferences,
        memoryContent: memory.memoryContent,
        tokenEstimate: memory.tokenEstimate,
        lastSynthesizedAt: memory.lastSynthesizedAt,
        formattedText,
      },
    });
  } catch (error) {
    console.error('[Personal Memory API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve personal memory' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/memory/personal
 * Update personal memory (identity or preferences)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Handle identity update
    if (body.identity) {
      await updateIdentity(userId, body.identity);
    }

    // Handle preference add/edit
    if (body.preference) {
      const { id, key, value } = body.preference;

      if (id) {
        // Edit existing preference
        const updated = await editPreference(userId, id, value);
        if (!updated) {
          return NextResponse.json(
            { error: 'Preference not found' },
            { status: 404 }
          );
        }
      } else if (key && value) {
        // Add new preference
        await addPreferenceManually(userId, key, value);
      }
    }

    // Return updated memory
    const memory = await getPersonalMemory(userId);

    return NextResponse.json({
      success: true,
      data: {
        identity: memory.identity,
        preferences: memory.preferences,
        tokenEstimate: memory.tokenEstimate,
      },
    });
  } catch (error) {
    console.error('[Personal Memory API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update personal memory' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory/personal
 * Delete personal memory or specific preference
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const preferenceId = searchParams.get('preferenceId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      // Clear all memory (GDPR compliance)
      await clearPersonalMemory(userId);
      return NextResponse.json({
        success: true,
        message: 'All personal memory cleared',
      });
    }

    if (preferenceId) {
      // Delete specific preference
      const deleted = await deletePreference(userId, preferenceId);
      if (!deleted) {
        return NextResponse.json(
          { error: 'Preference not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Preference deleted',
      });
    }

    return NextResponse.json(
      { error: 'Specify preferenceId or clearAll=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Personal Memory API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete personal memory' },
      { status: 500 }
    );
  }
}
