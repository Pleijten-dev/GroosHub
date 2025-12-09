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

    // 4. Get file from database and verify ownership/access
    const sql = neon(process.env.POSTGRES_URL!);

    // Handle both project and chat files
    const files = await sql`
      SELECT
        fu.id,
        fu.file_path as storage_key,
        fu.original_filename as file_name,
        fu.file_category as file_type,
        fu.mime_type,
        fu.file_size_bytes as file_size,
        fu.project_id,
        fu.chat_id,
        fu.user_id as file_user_id,
        CASE
          WHEN fu.project_id IS NOT NULL THEN (
            SELECT COUNT(*) FROM project_members pm
            WHERE pm.project_id = fu.project_id
            AND pm.user_id = ${userId}
            AND pm.left_at IS NULL
          )
          WHEN fu.chat_id IS NOT NULL THEN (
            SELECT CASE WHEN cc.user_id = ${userId} THEN 1 ELSE 0 END
            FROM chat_conversations cc
            WHERE cc.id = fu.chat_id
          )
          ELSE CASE WHEN fu.user_id = ${userId} THEN 1 ELSE 0 END
        END as has_access
      FROM file_uploads fu
      WHERE fu.id = ${fileId}
      AND fu.deleted_at IS NULL;
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 5. Verify user has access to this file
    if (Number(file.has_access) === 0) {
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
 * Soft delete a file (30-day recovery window)
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

    // 3. Get file and verify ownership/access
    const sql = neon(process.env.POSTGRES_URL!);

    // For project files, check project membership; for chat files, check chat ownership
    const files = await sql`
      SELECT
        fu.id,
        fu.file_path as storage_key,
        fu.user_id as file_user_id,
        fu.project_id,
        fu.chat_id,
        CASE
          WHEN fu.project_id IS NOT NULL THEN (
            SELECT COUNT(*) FROM project_members pm
            WHERE pm.project_id = fu.project_id
            AND pm.user_id = ${userId}
            AND pm.left_at IS NULL
          )
          WHEN fu.chat_id IS NOT NULL THEN (
            SELECT CASE WHEN cc.user_id = ${userId} THEN 1 ELSE 0 END
            FROM chat_conversations cc
            WHERE cc.id = fu.chat_id
          )
          ELSE CASE WHEN fu.user_id = ${userId} THEN 1 ELSE 0 END
        END as has_access
      FROM file_uploads fu
      WHERE fu.id = ${fileId}
      AND fu.deleted_at IS NULL;
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 4. Verify access
    if (Number(file.has_access) === 0) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have access to this file.' },
        { status: 403 }
      );
    }

    // 5. Soft delete file (set deleted_at timestamp)
    await sql`
      UPDATE file_uploads
      SET deleted_at = CURRENT_TIMESTAMP,
          deleted_by_user_id = ${userId}
      WHERE id = ${fileId};
    `;

    console.log(`[Files API] Soft deleted file ${fileId} (user: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully. Can be restored within 30 days.',
    });

  } catch (error) {
    console.error('[Files API DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[fileId]
 *
 * Update file metadata (rename)
 */
export async function PATCH(
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

    // 3. Parse request body
    const body = await request.json();
    const { original_filename } = body;

    if (!original_filename || !original_filename.trim()) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // 4. Get file and verify ownership/access
    const sql = neon(process.env.POSTGRES_URL!);

    const files = await sql`
      SELECT
        fu.id,
        fu.project_id,
        fu.chat_id,
        fu.user_id as file_user_id,
        CASE
          WHEN fu.project_id IS NOT NULL THEN (
            SELECT COUNT(*) FROM project_members pm
            WHERE pm.project_id = fu.project_id
            AND pm.user_id = ${userId}
            AND pm.left_at IS NULL
          )
          WHEN fu.chat_id IS NOT NULL THEN (
            SELECT CASE WHEN cc.user_id = ${userId} THEN 1 ELSE 0 END
            FROM chat_conversations cc
            WHERE cc.id = fu.chat_id
          )
          ELSE CASE WHEN fu.user_id = ${userId} THEN 1 ELSE 0 END
        END as has_access
      FROM file_uploads fu
      WHERE fu.id = ${fileId}
      AND fu.deleted_at IS NULL;
    `;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // 5. Verify access
    if (Number(file.has_access) === 0) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have access to this file.' },
        { status: 403 }
      );
    }

    // 6. Update file metadata
    await sql`
      UPDATE file_uploads
      SET original_filename = ${original_filename.trim()},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${fileId};
    `;

    console.log(`[Files API] Renamed file ${fileId} (user: ${userId})`);

    return NextResponse.json({
      success: true,
      message: 'File renamed successfully',
    });

  } catch (error) {
    console.error('[Files API PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}
