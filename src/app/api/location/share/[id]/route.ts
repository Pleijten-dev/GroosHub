// src/app/api/location/share/[id]/route.ts
/**
 * API route for unsharing locations
 * - DELETE: Remove a location share
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type { UnshareLocationResponse } from '@/features/location/types/saved-locations';

/**
 * DELETE /api/location/share/[id]
 * Remove a location share (only owner can unshare)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<UnshareLocationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await params;

    console.log(`🔓 [Location Sharing] Removing share ${id} by user ${userId}`);

    // Get database connection
    const sql = getDbConnection();

    // Delete the share (only if user is the one who shared it)
    const result = await sql`
      DELETE FROM location_shares
      WHERE id = ${id} AND shared_by_user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json<UnshareLocationResponse>(
        { success: false, error: 'Share not found or you do not have permission to remove it' },
        { status: 404 }
      );
    }

    console.log(`✅ [Location Sharing] Share removed: ${id}`);

    return NextResponse.json<UnshareLocationResponse>({
      success: true,
    });

  } catch (error) {
    console.error('❌ [Location Sharing] Error removing share:', error);
    return NextResponse.json<UnshareLocationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
