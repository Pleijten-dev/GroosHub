/**
 * Legal RAG Agent API
 * POST /api/projects/[id]/rag/agent
 *
 * Uses agentic reasoning to answer complex legal questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { LegalRAGAgent } from '@/lib/ai/rag/legal-agent-v5';

export const runtime = 'nodejs';
export const maxDuration = 60; // Agentic queries can take longer

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 2. Parse request
    const body = await request.json();
    const { query, maxSteps, model } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    console.log(`[Agent API] Query for project ${projectId}: "${query}"`);

    // 3. Execute agent
    const agent = new LegalRAGAgent(projectId);
    const result = await agent.query({
      projectId,
      query,
      maxSteps: maxSteps || 5,
      model: model || 'gpt-4o'
    });

    // 4. Return result
    return NextResponse.json({
      success: true,
      answer: result.answer,
      reasoning: result.reasoning,
      sources: result.sources.map(s => ({
        id: s.id,
        sourceFile: s.sourceFile,
        chunkText: s.chunkText,
        similarity: s.similarity,
        chunkIndex: s.chunkIndex,
        pageNumber: s.pageNumber,
        sectionTitle: s.sectionTitle
      })),
      confidence: result.confidence,
      executionTimeMs: result.executionTimeMs
    });

  } catch (error) {
    console.error('[Agent API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Agent execution failed'
      },
      { status: 500 }
    );
  }
}
