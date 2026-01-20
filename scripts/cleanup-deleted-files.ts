/**
 * Automated Cleanup Script for Deleted Files
 *
 * This script permanently deletes files that have been in the trash
 * for more than 30 days. It removes files from both:
 * - R2 storage (actual file data)
 * - PostgreSQL database (file metadata)
 *
 * Usage:
 * - Run manually: npx tsx scripts/cleanup-deleted-files.ts
 * - Run via cron: Set up a cron job or Vercel Cron to trigger the API endpoint
 * - Run via API: POST /api/files/cleanup (for scheduled jobs)
 *
 * Safety Features:
 * - Only deletes files where deleted_at > 30 days ago
 * - Logs all deletions for audit trail
 * - Continues on individual file failures
 * - Returns summary of deletions and errors
 */

import { neon } from '@neondatabase/serverless';
import { deleteFileFromR2 } from '../src/lib/storage/r2-client';

interface CleanupResult {
  totalFilesFound: number;
  successfulDeletions: number;
  failedDeletions: number;
  errors: Array<{ fileId: string; error: string }>;
  deletedFiles: Array<{ id: string; filename: string; deletedAt: Date }>;
}

/**
 * Main cleanup function
 * Can be called from CLI or API endpoint
 */
export async function cleanupDeletedFiles(): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalFilesFound: 0,
    successfulDeletions: 0,
    failedDeletions: 0,
    errors: [],
    deletedFiles: [],
  };

  try {
    const sql = neon(process.env.POSTGRES_URL!);

    console.log('[Cleanup] Starting cleanup of files deleted 30+ days ago...');

    // 1. Find all files that have been deleted for 30+ days
    const expiredFiles = await sql`
      SELECT
        id,
        file_path as storage_key,
        original_filename,
        storage_provider,
        deleted_at,
        deleted_by_user_id,
        project_id,
        chat_id
      FROM file_uploads
      WHERE deleted_at IS NOT NULL
      AND deleted_at <= NOW() - INTERVAL '30 days'
      ORDER BY deleted_at ASC;
    `;

    result.totalFilesFound = expiredFiles.length;
    console.log(`[Cleanup] Found ${expiredFiles.length} files to clean up`);

    if (expiredFiles.length === 0) {
      console.log('[Cleanup] No files to clean up. Exiting.');
      return result;
    }

    // 2. Process each file
    for (const file of expiredFiles) {
      try {
        console.log(`[Cleanup] Processing file ${file.id} (${file.original_filename})`);

        // 3. Delete from R2 storage
        if (file.storage_provider === 'r2' && file.storage_key) {
          try {
            await deleteFileFromR2(file.storage_key);
            console.log(`[Cleanup] ✓ Deleted from R2: ${file.storage_key}`);
          } catch (r2Error) {
            // Log R2 error but continue - file might already be deleted
            console.warn(`[Cleanup] ! R2 deletion failed (file may not exist): ${file.storage_key}`, r2Error);
          }
        }

        // 4. Delete from database
        await sql`
          DELETE FROM file_uploads
          WHERE id = ${file.id};
        `;

        console.log(`[Cleanup] ✓ Deleted from database: ${file.id}`);

        // 5. Track success
        result.successfulDeletions++;
        result.deletedFiles.push({
          id: file.id,
          filename: file.original_filename,
          deletedAt: file.deleted_at,
        });

      } catch (error) {
        // 6. Track failure
        result.failedDeletions++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          fileId: file.id,
          error: errorMessage,
        });

        console.error(`[Cleanup] ✗ Failed to delete file ${file.id}:`, error);
      }
    }

    // 7. Log summary
    console.log('\n[Cleanup] Summary:');
    console.log(`  Total files found: ${result.totalFilesFound}`);
    console.log(`  Successfully deleted: ${result.successfulDeletions}`);
    console.log(`  Failed deletions: ${result.failedDeletions}`);

    if (result.errors.length > 0) {
      console.log('\n[Cleanup] Errors:');
      result.errors.forEach(({ fileId, error }) => {
        console.log(`  - File ${fileId}: ${error}`);
      });
    }

    return result;

  } catch (error) {
    console.error('[Cleanup] Fatal error during cleanup:', error);
    throw error;
  }
}

/**
 * Run cleanup when script is executed directly
 */
if (require.main === module) {
  cleanupDeletedFiles()
    .then((result) => {
      console.log('\n[Cleanup] Cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n[Cleanup] Cleanup failed:', error);
      process.exit(1);
    });
}
