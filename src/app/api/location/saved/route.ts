// src/app/api/location/saved/route.ts
/**
 * API routes for saved locations
 * - POST: Save a new location
 * - GET: Get all saved locations for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type {
  SaveLocationRequest,
  SaveLocationResponse,
  LoadLocationsResponse,
  AccessibleLocation,
} from '@/features/location/types/saved-locations';

/**
 * POST /api/location/saved
 * Save a new location to the database
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<SaveLocationResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse request body
    const body: SaveLocationRequest = await request.json();
    const {
      name,
      address,
      coordinates,
      locationData,
      amenitiesData,
      selectedPVE,
      selectedPersonas,
      llmRapport,
    } = body;

    // Validate required fields
    if (!address || !coordinates || !locationData) {
      return NextResponse.json<SaveLocationResponse>(
        { success: false, error: 'Missing required fields: address, coordinates, locationData' },
        { status: 400 }
      );
    }

    console.log(`💾 [Saved Locations] Saving location for user ${userId}: ${address}`);

    // Get database connection
    const sql = getDbConnection();

    // Insert or update the saved location
    const result = await sql`
      INSERT INTO saved_locations (
        user_id,
        name,
        address,
        coordinates,
        location_data,
        selected_pve,
        selected_personas,
        llm_rapport
      ) VALUES (
        ${userId},
        ${name || null},
        ${address},
        ${JSON.stringify(coordinates)},
        ${JSON.stringify(locationData)},
        ${selectedPVE ? JSON.stringify(selectedPVE) : null},
        ${selectedPersonas ? JSON.stringify(selectedPersonas) : null},
        ${llmRapport ? JSON.stringify(llmRapport) : null}
      )
      ON CONFLICT (user_id, address)
      DO UPDATE SET
        name = EXCLUDED.name,
        coordinates = EXCLUDED.coordinates,
        location_data = EXCLUDED.location_data,
        selected_pve = EXCLUDED.selected_pve,
        selected_personas = EXCLUDED.selected_personas,
        llm_rapport = EXCLUDED.llm_rapport,
        updated_at = NOW()
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json<SaveLocationResponse>(
        { success: false, error: 'Failed to save location' },
        { status: 500 }
      );
    }

    const savedLocation = result[0];

    console.log(`✅ [Saved Locations] Location saved with ID: ${savedLocation.id}`);

    return NextResponse.json<SaveLocationResponse>({
      success: true,
      data: {
        id: savedLocation.id,
        userId: savedLocation.user_id,
        name: savedLocation.name,
        address: savedLocation.address,
        coordinates: savedLocation.coordinates,
        locationData: savedLocation.location_data,
        amenitiesData: amenitiesData,
        selectedPVE: savedLocation.selected_pve,
        selectedPersonas: savedLocation.selected_personas,
        llmRapport: savedLocation.llm_rapport,
        createdAt: savedLocation.created_at,
        updatedAt: savedLocation.updated_at,
      },
    });

  } catch (error) {
    console.error('❌ [Saved Locations] Error saving location:', error);
    return NextResponse.json<SaveLocationResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/location/saved
 * Get all saved locations for the current user (owned + shared with them)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<LoadLocationsResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    console.log(`📂 [Saved Locations] Loading locations for user ${userId}`);

    // Get database connection
    const sql = getDbConnection();

    // Get all locations accessible by the user (owned + shared)
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
        sl.created_at as "createdAt",
        sl.updated_at as "updatedAt",
        sl.user_id as "ownerId",
        u.name as "ownerName",
        u.email as "ownerEmail",
        FALSE as "isShared",
        TRUE as "canEdit"
      FROM saved_locations sl
      JOIN users u ON sl.user_id = u.id
      WHERE sl.user_id = ${userId}

      UNION ALL

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
        sl.created_at as "createdAt",
        sl.updated_at as "updatedAt",
        sl.user_id as "ownerId",
        u.name as "ownerName",
        u.email as "ownerEmail",
        TRUE as "isShared",
        ls.can_edit as "canEdit"
      FROM saved_locations sl
      JOIN location_shares ls ON sl.id = ls.saved_location_id
      JOIN users u ON sl.user_id = u.id
      WHERE ls.shared_with_user_id = ${userId}

      ORDER BY "createdAt" DESC
    `;

    const locations = results as unknown as AccessibleLocation[];

    console.log(`✅ [Saved Locations] Found ${locations.length} locations`);

    return NextResponse.json<LoadLocationsResponse>({
      success: true,
      data: locations,
    });

  } catch (error) {
    console.error('❌ [Saved Locations] Error loading locations:', error);
    return NextResponse.json<LoadLocationsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
