/**
 * Project Memory API
 *
 * Endpoints for managing project-specific AI memory
 * - GET: Retrieve project memory
 * - PUT: Update hard values or soft context
 * - DELETE: Remove specific context
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getProjectMemory,
  getOrCreateProjectMemory,
  updateHardValues,
  addSoftContext,
  updateSoftContext,
  removeSoftContext,
  removeHardValue,
  updateProjectSummary,
  formatProjectMemoryForPrompt,
  clearProjectMemory,
} from '@/features/ai-assistant/lib/project-memory-store';
import type { MemorySource } from '@/features/ai-assistant/types/memory';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * Check if user has access to project
 */
async function checkProjectAccess(userId: number, projectId: string): Promise<{ hasAccess: boolean; canEdit: boolean }> {
  const db = getDbConnection();
  const result = await db`
    SELECT pm.role
    FROM project_members pm
    WHERE pm.project_id = ${projectId}
      AND pm.user_id = ${userId}
      AND pm.left_at IS NULL
  `;

  if (result.length === 0) {
    return { hasAccess: false, canEdit: false };
  }

  const role = result[0].role as string;
  const canEdit = ['owner', 'admin', 'editor'].includes(role);

  return { hasAccess: true, canEdit };
}

/**
 * GET /api/memory/project/[projectId]
 * Retrieve project memory
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;
    const userId = session.user.id;

    // Check access
    const { hasAccess } = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const memory = await getProjectMemory(projectId);

    if (!memory) {
      // Return empty structure for projects without memory yet
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          hardValues: {},
          softContext: [],
          summary: null,
          tokenEstimate: 0,
          formattedText: '',
        },
      });
    }

    const formattedText = formatProjectMemoryForPrompt(memory);

    return NextResponse.json({
      success: true,
      data: {
        projectId: memory.projectId,
        hardValues: memory.hardValues,
        softContext: memory.softContext,
        summary: memory.summary,
        tokenEstimate: memory.tokenEstimate,
        lastSynthesizedAt: memory.lastSynthesizedAt,
        formattedText,
      },
    });
  } catch (error) {
    console.error('[Project Memory API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve project memory' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/memory/project/[projectId]
 * Update project memory (hard values or soft context)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;
    const userId = session.user.id;

    // Check access and edit permission
    const { hasAccess, canEdit } = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (!canEdit) {
      return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
    }

    const body = await request.json();

    // Ensure project memory exists
    await getOrCreateProjectMemory(projectId);

    // Handle hard values update
    if (body.hardValues) {
      await updateHardValues(projectId, body.hardValues, 'manual' as MemorySource, userId);
    }

    // Handle add soft context
    if (body.addContext) {
      const { category, content } = body.addContext;
      if (category && content) {
        await addSoftContext(projectId, category, content, 'manual' as MemorySource);
      }
    }

    // Handle update soft context
    if (body.updateContext) {
      const { contextId, content } = body.updateContext;
      if (contextId && content) {
        await updateSoftContext(projectId, contextId, content);
      }
    }

    // Handle summary update
    if (body.summary !== undefined) {
      await updateProjectSummary(projectId, body.summary);
    }

    // Return updated memory
    const memory = await getProjectMemory(projectId);

    return NextResponse.json({
      success: true,
      data: memory ? {
        projectId: memory.projectId,
        hardValues: memory.hardValues,
        softContext: memory.softContext,
        summary: memory.summary,
        tokenEstimate: memory.tokenEstimate,
      } : null,
    });
  } catch (error) {
    console.error('[Project Memory API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update project memory' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory/project/[projectId]
 * Delete soft context or hard value, or clear all
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await context.params;
    const userId = session.user.id;

    // Check access and edit permission
    const { hasAccess, canEdit } = await checkProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    if (!canEdit) {
      return NextResponse.json({ error: 'Edit permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');
    const hardValueKey = searchParams.get('hardValueKey');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await clearProjectMemory(projectId);
      return NextResponse.json({
        success: true,
        message: 'Project memory cleared',
      });
    }

    if (contextId) {
      await removeSoftContext(projectId, contextId);
      return NextResponse.json({
        success: true,
        message: 'Context removed',
      });
    }

    if (hardValueKey) {
      await removeHardValue(projectId, hardValueKey);
      return NextResponse.json({
        success: true,
        message: 'Hard value removed',
      });
    }

    return NextResponse.json(
      { error: 'Specify contextId, hardValueKey, or clearAll=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Project Memory API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project memory' },
      { status: 500 }
    );
  }
}
