/**
 * File Processing API Endpoint
 * POST /api/projects/[id]/files/[fileId]/process
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
  context: { params: Promise<{ id: string; fileId: string }> }
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

    const { id: projectId, fileId } = await context.params;
    const userId = session.user.id;

    console.log(`[Process File] Step 1: Processing file ${fileId} in project ${projectId}`);

    // Initialize database connection
    const sql = neon(process.env.POSTGRES_URL!);
    console.log(`[Process File] Step 2: Database connection initialized`);

    // 2. Verify project exists and user has access
    const project = await sql`
      SELECT p.id, pm.user_id as member_id, pm.role
      FROM project_projects p
      INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ${userId}
      WHERE p.id = ${projectId}
      LIMIT 1
    `;
    console.log(`[Process File] Step 3: Project access verified (found: ${project.length > 0})`);

    if (project.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // 3. Verify file exists and belongs to project
    console.log(`[Process File] Step 4: Fetching file record for ${fileId}`);
    const fileRecord = await sql`
      SELECT id, project_id, file_path, filename, mime_type, embedding_status
      FROM file_uploads
      WHERE id = ${fileId}
      AND project_id = ${projectId}
      LIMIT 1
    `;
    console.log(`[Process File] Step 5: File record fetched (found: ${fileRecord.length > 0})`);

    if (fileRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    const file = fileRecord[0];
    console.log(`[Process File] Step 6: File status = ${file.embedding_status}, type = ${file.mime_type}`);

    // 4. Check if already processing or completed
    if (file.embedding_status === 'processing') {
      console.log(`[Process File] Step 7: File already processing, aborting`);

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
      console.log(`[Process File] Step 8: File already completed, returning existing data`);
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
    console.log(`[Process File] Step 9: Checking file type support for ${file.mime_type}`);
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf'
    ];

    if (!supportedTypes.includes(file.mime_type)) {
      console.log(`[Process File] Step 10: File type ${file.mime_type} not supported`);

      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: ${file.mime_type}. Supported types: TXT, MD, PDF`
        },
        { status: 400 }
      );
    }

    // 6. Process the file
    console.log(`[Process File] Step 11: Starting processing for ${file.filename} (${file.mime_type})`);
    console.log(`[Process File] Step 12: File path = ${file.file_path}`);

    const result = await processFile({
      fileId: file.id,
      projectId: file.project_id,
      filePath: file.file_path,
      filename: file.filename,
      mimeType: file.mime_type,
      onProgress: (step, progress) => {
        console.log(
          `[Process File] ${step}: ${(progress * 100).toFixed(0)}%`
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
 * GET /api/projects/[id]/files/[fileId]/process
 * Get processing status for a file
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, fileId } = await context.params;

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
