/**
 * File Access API Endpoint
 *
 * Generates presigned URLs for accessing private files in R2 storage
 *
 * Security:
 * - Verifies user owns the chat containing the file
 * - Generates time-limited presigned URLs (1 hour default)
 * - No public access to files
 *
 * GET /api/files/[fileId]
 * Returns: Presigned URL for file access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { getPresignedUrl } from '@/lib/storage/r2-client';

interface RouteContext {
  params: Promise<{
    fileId: string;
  }>;
}

/**
 * GET /api/files/[fileId]
 *
 * Generate a presigned URL for file access
 *
 * Query params:
 * - expiresIn: number (optional, seconds, default: 3600 = 1 hour)
 *
 * Response:
 * - url: string (presigned URL)
 * - expiresAt: string (ISO timestamp)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get fileId from route params (Next.js 15: params must be awaited)
    const { fileId } = await context.params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      );
    }

    // 3. Get expiration time from query params
    const searchParams = request.nextUrl.searchParams;
    const expiresInParam = searchParams.get('expiresIn');
    const expiresIn = expiresInParam ? parseInt(expiresInParam) : 3600; // 1 hour default

    // Validate expiration (1 second to 7 days, as per R2 limits)
    if (expiresIn < 1 || expiresIn > 604800) {
      return NextResponse.json(
        { error: 'Invalid expiresIn. Must be between 1 and 604800 seconds (7 days).' },
        { status: 400 }
      );
    }

    // 4. Get file from database and verify ownership
    const sql = neon(process.env.POSTGRES_URL!);

    const files = await sql`
      SELECT
        cf.id,
        cf.storage_key,
        cf.file_name,
        cf.file_type,
        cf.mime_type,
        cf.file_size,
        cf.chat_id,
        c.user_id
      FROM chat_files cf
      JOIN chats c ON c.id = cf.chat_id
      WHERE cf.id = ${fileId};
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 5. Verify user owns the chat containing this file
    // Convert both to numbers for comparison (file.user_id is INTEGER, userId is string from session)
    if (Number(file.user_id) !== Number(userId)) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have access to this file.' },
        { status: 403 }
      );
    }

    // 6. Generate presigned URL
    const presignedUrl = await getPresignedUrl(file.storage_key, expiresIn);

    // 7. Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    console.log(`[Files API] Generated presigned URL for file ${fileId} (user: ${userId})`);

    // 8. Return presigned URL
    return NextResponse.json({
      success: true,
      url: presignedUrl,
      expiresAt,
      expiresIn,
      file: {
        id: file.id,
        name: file.file_name,
        type: file.file_type,
        mimeType: file.mime_type,
        size: file.file_size,
      },
    });

  } catch (error) {
    console.error('[Files API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate file URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[fileId]
 *
 * Delete a file from storage and database
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Get fileId from route params
    const { fileId } = await context.params;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID' },
        { status: 400 }
      );
    }

    // 3. Get file and verify ownership
    const sql = neon(process.env.POSTGRES_URL!);

    const files = await sql`
      SELECT
        cf.id,
        cf.storage_key,
        c.user_id
      FROM chat_files cf
      JOIN chats c ON c.id = cf.chat_id
      WHERE cf.id = ${fileId};
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 4. Verify ownership
    // Convert both to numbers for comparison (file.user_id is INTEGER, userId is string from session)
    if (Number(file.user_id) !== Number(userId)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. Delete from R2 (import dynamically to avoid loading on every request)
    const { deleteFileFromR2 } = await import('@/lib/storage/r2-client');
    await deleteFileFromR2(file.storage_key);

    // 6. Delete from database
    await sql`
      DELETE FROM chat_files
      WHERE id = ${fileId};
    `;

    console.log(`[Files API] Deleted file ${fileId} (user: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('[Files API DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
