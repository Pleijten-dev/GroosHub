/**
 * Domain Memory API
 *
 * Endpoints for managing organization-wide AI memory
 * Admin-only access
 *
 * - GET: Retrieve domain memory
 * - PUT: Add/update explicit knowledge
 * - DELETE: Remove knowledge or patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getDomainMemory,
  getOrCreateDomainMemory,
  addExplicitKnowledge,
  updateExplicitKnowledge,
  removeExplicitKnowledge,
  removeLearnedPattern,
  formatDomainMemoryForPrompt,
} from '@/features/ai-assistant/lib/domain-memory-store';

/**
 * Check if user is admin and get their organization ID
 */
async function checkAdminAccess(userId: number): Promise<{ isAdmin: boolean; orgId: string | null }> {
  const db = getDbConnection();

  // Check if user is admin
  const userResult = await db`
    SELECT role, org_id FROM user_accounts WHERE id = ${userId}
  `;

  if (userResult.length === 0) {
    return { isAdmin: false, orgId: null };
  }

  const isAdmin = userResult[0].role === 'admin';
  const orgId = userResult[0].org_id as string | null;

  return { isAdmin, orgId };
}

/**
 * GET /api/memory/domain
 * Retrieve domain memory (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { isAdmin, orgId } = await checkAdminAccess(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get org ID from query param or use user's default org
    const { searchParams } = new URL(request.url);
    const requestedOrgId = searchParams.get('orgId') || orgId;

    if (!requestedOrgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const memory = await getDomainMemory(requestedOrgId);

    if (!memory) {
      return NextResponse.json({
        success: true,
        data: {
          orgId: requestedOrgId,
          explicitKnowledge: [],
          learnedPatterns: [],
          tokenEstimate: 0,
          formattedText: '',
        },
      });
    }

    const formattedText = formatDomainMemoryForPrompt(memory);

    return NextResponse.json({
      success: true,
      data: {
        orgId: memory.orgId,
        explicitKnowledge: memory.explicitKnowledge,
        learnedPatterns: memory.learnedPatterns,
        tokenEstimate: memory.tokenEstimate,
        lastSynthesizedAt: memory.lastSynthesizedAt,
        formattedText,
      },
    });
  } catch (error) {
    console.error('[Domain Memory API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve domain memory' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/memory/domain
 * Add or update domain knowledge (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { isAdmin, orgId: userOrgId } = await checkAdminAccess(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const orgId = body.orgId || userOrgId;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Ensure domain memory exists
    await getOrCreateDomainMemory(orgId);

    // Handle add explicit knowledge
    if (body.addKnowledge) {
      const { category, title, content } = body.addKnowledge;
      if (category && title && content) {
        await addExplicitKnowledge(
          orgId,
          { category, title, content },
          userId
        );
      }
    }

    // Handle update explicit knowledge
    if (body.updateKnowledge) {
      const { knowledgeId, updates } = body.updateKnowledge;
      if (knowledgeId && updates) {
        await updateExplicitKnowledge(orgId, knowledgeId, updates, userId);
      }
    }

    // Return updated memory
    const memory = await getDomainMemory(orgId);

    return NextResponse.json({
      success: true,
      data: memory ? {
        orgId: memory.orgId,
        explicitKnowledge: memory.explicitKnowledge,
        learnedPatterns: memory.learnedPatterns,
        tokenEstimate: memory.tokenEstimate,
      } : null,
    });
  } catch (error) {
    console.error('[Domain Memory API] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update domain memory' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory/domain
 * Remove knowledge or patterns (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { isAdmin, orgId: userOrgId } = await checkAdminAccess(userId);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || userOrgId;
    const knowledgeId = searchParams.get('knowledgeId');
    const patternId = searchParams.get('patternId');

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    if (knowledgeId) {
      await removeExplicitKnowledge(orgId, knowledgeId, userId);
      return NextResponse.json({
        success: true,
        message: 'Knowledge removed',
      });
    }

    if (patternId) {
      await removeLearnedPattern(orgId, patternId, userId);
      return NextResponse.json({
        success: true,
        message: 'Pattern removed',
      });
    }

    return NextResponse.json(
      { error: 'Specify knowledgeId or patternId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Domain Memory API] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain memory' },
      { status: 500 }
    );
  }
}
