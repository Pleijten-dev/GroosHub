/**
 * Database Migration API Endpoint
 *
 * Makes file_url column nullable in chat_files table for R2 support
 *
 * Usage:
 *   GET /api/migrate/file-url-nullable
 *
 * IMPORTANT: This should only be run once. After running successfully,
 * you can delete this endpoint or protect it with admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db/connection';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Login required' },
        { status: 401 }
      );
    }

    console.log('[Migration] Starting file_url nullable migration...');
    console.log('[Migration] User:', session.user.email);

    // Check if migration is needed
    const checkResult = await sql`
      SELECT
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
        AND column_name = 'file_url';
    `;

    if (checkResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'chat_files table or file_url column not found'
      });
    }

    const currentNullable = checkResult[0].is_nullable;
    console.log('[Migration] Current file_url is_nullable:', currentNullable);

    if (currentNullable === 'YES') {
      console.log('[Migration] Already applied - file_url is already nullable');
      return NextResponse.json({
        success: true,
        alreadyApplied: true,
        message: 'Migration already applied - file_url is already nullable',
        currentState: checkResult
      });
    }

    // Run migration
    console.log('[Migration] Executing ALTER TABLE statements...');

    // Make file_url nullable
    await sql`
      ALTER TABLE chat_files ALTER COLUMN file_url DROP NOT NULL;
    `;
    console.log('[Migration] ✅ file_url is now nullable');

    // Make status nullable (if not already)
    try {
      await sql`
        ALTER TABLE chat_files ALTER COLUMN status DROP NOT NULL;
      `;
      console.log('[Migration] ✅ status is now nullable');
    } catch (error) {
      console.log('[Migration] ⚠️  status already nullable or does not exist');
    }

    // Make error_message nullable (if not already)
    try {
      await sql`
        ALTER TABLE chat_files ALTER COLUMN error_message DROP NOT NULL;
      `;
      console.log('[Migration] ✅ error_message is now nullable');
    } catch (error) {
      console.log('[Migration] ⚠️  error_message already nullable or does not exist');
    }

    // Add comments
    await sql`
      COMMENT ON COLUMN chat_files.file_url IS 'DEPRECATED: Use storage_key instead. Kept for backwards compatibility.';
    `;
    await sql`
      COMMENT ON COLUMN chat_files.storage_key IS 'R2 storage path (PRIMARY). Format: {env}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}';
    `;
    console.log('[Migration] ✅ Added column comments');

    // Verify changes
    const verifyResult = await sql`
      SELECT
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
        AND column_name IN ('file_url', 'status', 'error_message')
      ORDER BY column_name;
    `;

    console.log('[Migration] ✅ Migration completed successfully');
    console.log('[Migration] Final state:', verifyResult);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      changes: {
        file_url: 'Now nullable',
        status: 'Now nullable',
        error_message: 'Now nullable'
      },
      currentState: verifyResult
    });

  } catch (error) {
    console.error('[Migration] ❌ Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
