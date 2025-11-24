// src/app/api/location/share/route.ts
/**
 * API routes for sharing locations
 * - POST: Share a location with another user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type {
  ShareLocationRequest,
  ShareLocationResponse,
} from '@/features/location/types/saved-locations';

/**
 * POST /api/location/share
 * Share a location with another user by email
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body: ShareLocationRequest = await request.json();
    const { locationId, shareWithEmail, canEdit = false } = body;

    // Validate required fields
    if (!locationId || !shareWithEmail) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'Missing required fields: locationId, shareWithEmail' },
        { status: 400 }
      );
    }

    console.log(`🔗 [Location Sharing] User ${userId} sharing location ${locationId} with ${shareWithEmail}`);

    // Get database connection
    const sql = getDbConnection();

    // Check if the location belongs to the current user
    const locationCheck = await sql`
      SELECT id FROM saved_locations
      WHERE id = ${locationId} AND user_id = ${userId}
    `;

    if (locationCheck.length === 0) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'Location not found or you do not own this location' },
        { status: 404 }
      );
    }

    // Find the user to share with by email
    const targetUserResult = await sql`
      SELECT id FROM users WHERE email = ${shareWithEmail}
    `;

    if (targetUserResult.length === 0) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'User with this email not found' },
        { status: 404 }
      );
    }

    const targetUserId = targetUserResult[0].id;

    // Don't allow sharing with yourself
    if (targetUserId === userId) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'You cannot share a location with yourself' },
        { status: 400 }
      );
    }

    // Insert the share record (or update if already exists)
    const result = await sql`
      INSERT INTO location_shares (
        saved_location_id,
        shared_by_user_id,
        shared_with_user_id,
        can_edit
      ) VALUES (
        ${locationId},
        ${userId},
        ${targetUserId},
        ${canEdit}
      )
      ON CONFLICT (saved_location_id, shared_with_user_id)
      DO UPDATE SET
        can_edit = EXCLUDED.can_edit,
        shared_at = NOW()
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json<ShareLocationResponse>(
        { success: false, error: 'Failed to share location' },
        { status: 500 }
      );
    }

    const share = result[0];

    console.log(`✅ [Location Sharing] Location shared with ID: ${share.id}`);

    return NextResponse.json<ShareLocationResponse>({
      success: true,
      data: {
        id: share.id,
        savedLocationId: share.saved_location_id,
        sharedByUserId: share.shared_by_user_id,
        sharedWithUserId: share.shared_with_user_id,
        canEdit: share.can_edit,
        sharedAt: share.shared_at,
      },
    });

  } catch (error) {
    console.error('❌ [Location Sharing] Error sharing location:', error);
    return NextResponse.json<ShareLocationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
