// src/app/api/location/saved/[id]/route.ts
/**
 * API routes for individual saved locations
 * - GET: Get a specific saved location
 * - DELETE: Delete a saved location
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type {
  LoadLocationResponse,
  DeleteLocationResponse,
  AccessibleLocation,
} from '@/features/location/types/saved-locations';

/**
 * GET /api/location/saved/[id]
 * Get a specific saved location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<LoadLocationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await params;

    console.log(`📄 [Saved Locations] Loading location ${id} for user ${userId}`);

    // Get database connection
    const sql = getDbConnection();

    // Get the location if user owns it or has access via sharing
    const results = await sql`
      SELECT
        sl.id,
        sl.user_id as "userId",
        sl.name,
        sl.address,
        sl.coordinates,
        sl.location_data as "locationData",
        sl.selected_pve as "selectedPVE",
        sl.selected_personas as "selectedPersonas",
        sl.llm_rapport as "llmRapport",
        sl.data_version as "dataVersion",
        sl.completion_status as "completionStatus",
        sl.metadata,
        sl.created_at as "createdAt",
        sl.updated_at as "updatedAt",
        sl.user_id as "ownerId",
        u.name as "ownerName",
        u.email as "ownerEmail",
        CASE WHEN sl.user_id = ${userId} THEN FALSE ELSE TRUE END as "isShared",
        CASE WHEN sl.user_id = ${userId} THEN TRUE ELSE COALESCE(ls.can_edit, FALSE) END as "canEdit"
      FROM saved_locations sl
      JOIN users u ON sl.user_id = u.id
      LEFT JOIN location_shares ls ON sl.id = ls.saved_location_id AND ls.shared_with_user_id = ${userId}
      WHERE sl.id = ${id}
        AND (sl.user_id = ${userId} OR ls.shared_with_user_id = ${userId})
    `;

    if (results.length === 0) {
      return NextResponse.json<LoadLocationResponse>(
        { success: false, error: 'Location not found or access denied' },
        { status: 404 }
      );
    }

    const location = results[0] as unknown as AccessibleLocation;

    console.log(`✅ [Saved Locations] Location loaded: ${location.address}`);

    return NextResponse.json<LoadLocationResponse>({
      success: true,
      data: location,
    });

  } catch (error) {
    console.error('❌ [Saved Locations] Error loading location:', error);
    return NextResponse.json<LoadLocationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/location/saved/[id]
 * Delete a saved location (only owner can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<DeleteLocationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { id } = await params;

    console.log(`🗑️ [Saved Locations] Deleting location ${id} for user ${userId}`);

    // Get database connection
    const sql = getDbConnection();

    // Delete the location (only if user owns it)
    const result = await sql`
      DELETE FROM saved_locations
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json<DeleteLocationResponse>(
        { success: false, error: 'Location not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    console.log(`✅ [Saved Locations] Location deleted: ${id}`);

    return NextResponse.json<DeleteLocationResponse>({
      success: true,
    });

  } catch (error) {
    console.error('❌ [Saved Locations] Error deleting location:', error);
    return NextResponse.json<DeleteLocationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
