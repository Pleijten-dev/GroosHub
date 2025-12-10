/**
 * File Processing API Endpoint
 * POST /api/projects/[projectId]/files/[fileId]/process
 *
 * Processes an uploaded file for RAG:
 * 1. Extract text from file (TXT, MD, PDF)
 * 2. Chunk text into semantic segments
 * 3. Generate embeddings using OpenAI
 * 4. Store chunks and embeddings in database
 *
 * This endpoint is called after a file is uploaded to trigger
 * the embedding process so it can be used in RAG retrieval.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { processFile } from '@/lib/ai/rag/processing-pipeline';
import { neon } from '@neondatabase/serverless';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; fileId: string }> }
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

    const { projectId, fileId } = await context.params;
    const userId = session.user.id;

    console.log(`[Process File] Processing file ${fileId} in project ${projectId}`);

    // Initialize database connection
    const sql = neon(process.env.POSTGRES_URL!);

    // 2. Verify project exists and user has access
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

    // 3. Verify file exists and belongs to project
    const fileRecord = await sql`
      SELECT id, project_id, file_path, filename, mime_type, embedding_status
      FROM file_uploads
      WHERE id = ${fileId}
      AND project_id = ${projectId}
      LIMIT 1
    `;

    if (fileRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const file = fileRecord[0];

    // 4. Check if already processing or completed
    if (file.embedding_status === 'processing') {
      return NextResponse.json(
        {
          success: false,
          error: 'File is already being processed',
          status: 'processing'
        },
        { status: 409 }
      );
    }

    if (file.embedding_status === 'completed') {
      // Get existing chunk count
      const chunks = await sql`
        SELECT COUNT(*) as count
        FROM project_doc_chunks
        WHERE file_id = ${fileId}
      `;

      return NextResponse.json({
        success: true,
        message: 'File already processed',
        status: 'completed',
        chunkCount: parseInt(chunks[0].count),
        alreadyProcessed: true
      });
    }

    // 5. Check if file type is supported
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.mime_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.mime_type}. Supported types: TXT, MD, PDF`
        },
        { status: 400 }
      );
    }

    // 6. Process the file
    console.log(`[Process File] Starting processing for ${file.filename} (${file.mime_type})`);

    const result = await processFile({
      fileId: file.id,
      projectId: file.project_id,
      filePath: file.file_path,
      filename: file.filename,
      mimeType: file.mime_type,
      onProgress: (progress) => {
        console.log(
          `[Process File] Progress: ${progress.processedChunks}/${progress.totalChunks} chunks ` +
          `(${progress.percentage}%)`
        );
      }
    });

    if (!result.success) {
      console.error(`[Process File] Failed to process ${file.filename}:`, result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Processing failed'
        },
        { status: 500 }
      );
    }

    console.log(
      `[Process File] ✅ Successfully processed ${file.filename}: ` +
      `${result.chunkCount} chunks, ${result.totalTokens} tokens`
    );

    // 7. Return success with details
    return NextResponse.json({
      success: true,
      message: 'File processed successfully',
      chunkCount: result.chunkCount,
      totalTokens: result.totalTokens,
      warnings: result.warnings || [],
      metadata: {
        filename: file.filename,
        mimeType: file.mime_type,
        embeddingModel: 'text-embedding-3-small',
        dimensions: 1536
      }
    });

  } catch (error) {
    console.error('[Process File] Unexpected error:', error);
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
 * GET /api/projects/[projectId]/files/[fileId]/process
 * Get processing status for a file
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId, fileId } = await context.params;

    // Initialize database connection
    const sql = neon(process.env.POSTGRES_URL!);

    // Get file status
    const fileRecord = await sql`
      SELECT
        id,
        filename,
        embedding_status,
        chunk_count,
        embedded_at,
        embedding_error
      FROM file_uploads
      WHERE id = ${fileId}
      AND project_id = ${projectId}
      LIMIT 1
    `;

    if (fileRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const file = fileRecord[0];

    return NextResponse.json({
      success: true,
      status: file.embedding_status,
      chunkCount: file.chunk_count,
      embeddedAt: file.embedded_at,
      error: file.embedding_error
    });

  } catch (error) {
    console.error('[Get Process Status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
