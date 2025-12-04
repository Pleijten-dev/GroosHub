/**
 * API routes for project memories
 * GET /api/projects/[id]/memories - Get project memory
 * POST /api/projects/[id]/memories - Update project memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/projects/[id]/memories
 * Get the current memory context for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const db = getDbConnection();

    // Get project memory
    const memory = await db`
      SELECT
        project_id,
        memory_content,
        project_summary,
        key_decisions,
        preferences,
        patterns,
        context,
        total_updates,
        last_analysis_at,
        token_count,
        created_at,
        updated_at
      FROM project_memories
      WHERE project_id = ${id}
    `;

    if (memory.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No memory found for this project',
      });
    }

    return NextResponse.json({
      success: true,
      data: memory[0],
    });
  } catch (error) {
    console.error('Error fetching project memory:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/memories
 * Update project memory (usually triggered by AI assistant)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is member of project
    const isMember = await isProjectMember(id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memory_content,
      project_summary,
      key_decisions,
      preferences,
      patterns,
      context: additionalContext,
      change_summary,
      change_type = 'modification',
      trigger_source = 'manual',
      trigger_id,
    } = body;

    if (!memory_content) {
      return NextResponse.json(
        { success: false, error: 'memory_content is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Get existing memory to track changes
    const existingMemory = await db`
      SELECT memory_content, total_updates FROM project_memories WHERE project_id = ${id}
    `;

    const previousContent = existingMemory.length > 0 ? existingMemory[0].memory_content : null;
    const currentUpdates = existingMemory.length > 0 ? existingMemory[0].total_updates : 0;

    // Estimate token count (rough estimate: ~4 chars per token)
    const tokenCount = Math.ceil(memory_content.length / 4);

    // Upsert project memory
    const result = await db`
      INSERT INTO project_memories (
        project_id,
        memory_content,
        project_summary,
        key_decisions,
        preferences,
        patterns,
        context,
        total_updates,
        last_analysis_at,
        token_count,
        updated_at
      )
      VALUES (
        ${id},
        ${memory_content},
        ${project_summary || null},
        ${key_decisions ? JSON.stringify(key_decisions) : '[]'},
        ${preferences ? JSON.stringify(preferences) : '{}'},
        ${patterns ? JSON.stringify(patterns) : '{}'},
        ${additionalContext ? JSON.stringify(additionalContext) : '{}'},
        1,
        NOW(),
        ${tokenCount},
        NOW()
      )
      ON CONFLICT (project_id) DO UPDATE
      SET memory_content = EXCLUDED.memory_content,
          project_summary = COALESCE(EXCLUDED.project_summary, project_memories.project_summary),
          key_decisions = COALESCE(EXCLUDED.key_decisions, project_memories.key_decisions),
          preferences = COALESCE(EXCLUDED.preferences, project_memories.preferences),
          patterns = COALESCE(EXCLUDED.patterns, project_memories.patterns),
          context = COALESCE(EXCLUDED.context, project_memories.context),
          total_updates = project_memories.total_updates + 1,
          last_analysis_at = NOW(),
          token_count = EXCLUDED.token_count,
          updated_at = NOW()
      RETURNING *
    `;

    // Create memory update audit record
    await db`
      INSERT INTO project_memory_updates (
        project_id,
        previous_content,
        new_content,
        change_summary,
        change_type,
        trigger_source,
        trigger_id,
        triggered_by_user_id
      )
      VALUES (
        ${id},
        ${previousContent},
        ${memory_content},
        ${change_summary || null},
        ${change_type},
        ${trigger_source},
        ${trigger_id || null},
        ${session.user.id}
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Project memory updated successfully',
      data: result[0],
    });
  } catch (error) {
    console.error('Error updating project memory:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
