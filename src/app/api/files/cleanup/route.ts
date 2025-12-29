/**
 * API endpoint for automated file cleanup
 * POST /api/files/cleanup - Trigger cleanup of files deleted 30+ days ago
 *
 * This endpoint can be:
 * - Called manually for testing
 * - Triggered by Vercel Cron (vercel.json)
 * - Triggered by external cron job
 *
 * Security:
 * - Requires admin role OR valid cron secret
 * - Logs all cleanup operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { cleanupDeletedFiles } from '../../../../../scripts/cleanup-deleted-files';

/**
 * POST /api/files/cleanup
 * Trigger automated cleanup of expired deleted files
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication: Check for cron secret OR admin session
    const cronSecret = request.headers.get('x-cron-secret');
    const validCronSecret = process.env.CRON_SECRET;

    // Allow if valid cron secret is provided
    if (validCronSecret && cronSecret === validCronSecret) {
      console.log('[Cleanup API] Authenticated via cron secret');
    } else {
      // Otherwise, require admin session
      const session = await auth();

      if (!session?.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
      }

      console.log(`[Cleanup API] Authenticated as admin user: ${session.user.id}`);
    }

    // 2. Run cleanup
    console.log('[Cleanup API] Starting cleanup process...');
    const result = await cleanupDeletedFiles();

    // 3. Return results
    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      result: {
        totalFilesFound: result.totalFilesFound,
        successfulDeletions: result.successfulDeletions,
        failedDeletions: result.failedDeletions,
        deletedFiles: result.deletedFiles.map(f => ({
          id: f.id,
          filename: f.filename,
          deletedAt: f.deletedAt,
        })),
        errors: result.errors,
      },
    });

  } catch (error) {
    console.error('[Cleanup API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run cleanup',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/cleanup
 * Get information about how many files are eligible for cleanup
 * (Does not delete anything, just reports)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    // Get count of files eligible for cleanup
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.POSTGRES_URL!);

    const result = await sql`
      SELECT
        COUNT(*) as eligible_count,
        MIN(deleted_at) as oldest_deletion,
        MAX(deleted_at) as newest_deletion,
        SUM(file_size_bytes) as total_size_bytes
      FROM file_uploads
      WHERE deleted_at IS NOT NULL
      AND deleted_at <= NOW() - INTERVAL '30 days';
    `;

    const stats = result[0];

    return NextResponse.json({
      success: true,
      stats: {
        eligibleFilesCount: Number(stats.eligible_count),
        oldestDeletion: stats.oldest_deletion,
        newestDeletion: stats.newest_deletion,
        totalSizeBytes: Number(stats.total_size_bytes || 0),
        totalSizeMB: Math.round(Number(stats.total_size_bytes || 0) / 1024 / 1024 * 100) / 100,
      },
    });

  } catch (error) {
    console.error('[Cleanup API GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cleanup stats',
      },
      { status: 500 }
    );
  }
}
