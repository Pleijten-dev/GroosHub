/**
 * RAG Retrieval API Endpoint
 * POST /api/projects/[projectId]/rag/retrieve
 *
 * Directly retrieves relevant document chunks for a given query.
 * Useful for:
 * - Testing RAG quality
 * - Debugging retrieval accuracy
 * - Building custom RAG interfaces
 *
 * The chat API uses the same retrieval logic automatically,
 * but this endpoint allows direct access for testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findRelevantContent } from '@/lib/ai/rag/retriever';
import { getChunkCountByProjectId } from '@/lib/db/queries/project-doc-chunks';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Request validation schema
const retrieveSchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(20).optional().default(5),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.7),
  useHybridSearch: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = await context.params;
    const userId = session.user.id;

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = retrieveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { query, topK, similarityThreshold, useHybridSearch } = validation.data;

    console.log(`[RAG Retrieve] Query: "${query}" in project ${projectId}`);

    // Initialize database connection
    const sql = neon(process.env.POSTGRES_URL!);

    // 3. Verify project exists and user has access
    const project = await sql`
      SELECT p.id, p.user_id, pm.user_id as member_id, pm.role
      FROM project_projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ${userId}
      WHERE p.id = ${projectId}
      AND (p.user_id = ${userId} OR pm.user_id = ${userId})
      LIMIT 1
    `;

    if (project.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // 4. Check if project has any embedded documents
    const chunkCount = await getChunkCountByProjectId(projectId);

    if (chunkCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No embedded documents found in this project',
        chunks: [],
        totalChunks: 0
      });
    }

    console.log(`[RAG Retrieve] Project has ${chunkCount} total chunks`);

    // 5. Retrieve relevant chunks
    const startTime = Date.now();

    const chunks = await findRelevantContent({
      projectId,
      query,
      topK,
      similarityThreshold,
      useHybridSearch
    });

    const retrievalTime = Date.now() - startTime;

    console.log(
      `[RAG Retrieve] ✅ Retrieved ${chunks.length} chunks in ${retrievalTime}ms ` +
      (chunks.length > 0
        ? `(avg similarity: ${(chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length).toFixed(3)})`
        : '')
    );

    // 6. Return results
    return NextResponse.json({
      success: true,
      query,
      chunks: chunks.map(chunk => ({
        id: chunk.id,
        sourceFile: chunk.sourceFile,
        pageNumber: chunk.pageNumber,
        chunkText: chunk.chunkText,
        similarity: chunk.similarity,
        fileId: chunk.fileId,
        chunkIndex: chunk.chunkIndex
      })),
      totalChunks: chunks.length,
      retrievalTimeMs: retrievalTime,
      searchParams: {
        topK,
        similarityThreshold,
        useHybridSearch,
        projectTotalChunks: chunkCount
      }
    });

  } catch (error) {
    console.error('[RAG Retrieve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[projectId]/rag/retrieve
 * Get RAG statistics for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = await context.params;
    const userId = session.user.id;

    // Initialize database connection
    const sql = neon(process.env.POSTGRES_URL!);

    // Verify access
    const project = await sql`
      SELECT p.id
      FROM project_projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ${userId}
      WHERE p.id = ${projectId}
      AND (p.user_id = ${userId} OR pm.user_id = ${userId})
      LIMIT 1
    `;

    if (project.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Get statistics
    const chunkCount = await getChunkCountByProjectId(projectId);

    const files = await sql`
      SELECT
        id,
        filename,
        embedding_status,
        chunk_count,
        embedded_at
      FROM file_uploads
      WHERE project_id = ${projectId}
      AND embedding_status = 'completed'
      ORDER BY embedded_at DESC
    `;

    const totalTokens = await sql`
      SELECT SUM(token_count) as total
      FROM project_doc_chunks
      WHERE project_id = ${projectId}
    `;

    return NextResponse.json({
      success: true,
      projectId,
      statistics: {
        totalChunks: chunkCount,
        totalTokens: parseInt(totalTokens[0]?.total || '0'),
        embeddedFiles: files.length,
        files: files.map(f => ({
          id: f.id,
          filename: f.filename,
          chunkCount: f.chunk_count,
          embeddedAt: f.embedded_at
        }))
      }
    });

  } catch (error) {
    console.error('[RAG Stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
