/**
 * Location Agent Tool: List User's Saved Locations
 *
 * Returns all locations accessible to a user (owned + shared with them)
 * Formatted for LLM consumption with key metadata for decision making
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDbConnection } from '@/lib/db/connection';
import type { AccessibleLocation } from '@/features/location/types/saved-locations';

/**
 * Tool: listUserSavedLocations
 *
 * Gets all saved locations for a user (owned and shared)
 * Returns simplified data optimized for LLM understanding
 */
export const listUserSavedLocations = tool({
  description: `Get all saved locations for the current user. This includes locations they own and locations shared with them.

  Use this tool when:
  - User asks about "my locations" or "saved locations"
  - User references a location without specifying which one
  - You need to clarify which location the user is asking about
  - User asks to compare multiple locations

  The tool returns: name, address, completion status, owner info, and timestamps`,

  inputSchema: z.object({
    userId: z.number().describe('The ID of the user whose locations to retrieve'),
  }),

  async execute({ userId }) {
    try {
      console.log(`[Location Agent] Fetching saved locations for user ${userId}`);

      // Get database connection
      const sql = getDbConnection();

      // Query for all accessible locations (owned + shared)
      const results = await sql`
        SELECT
          sl.id,
          sl.user_id as "userId",
          sl.name,
          sl.address,
          sl.coordinates,
          sl.completion_status as "completionStatus",
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
          sl.completion_status as "completionStatus",
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

      console.log(`[Location Agent] Found ${locations.length} locations for user ${userId}`);

      // Format for LLM consumption - simplified structure
      const formattedLocations = locations.map((loc) => ({
        id: loc.id,
        name: loc.name || 'Unnamed Location',
        address: loc.address,
        coordinates: loc.coordinates,
        completionStatus: loc.completionStatus,
        isShared: loc.isShared,
        canEdit: loc.canEdit,
        ownerName: loc.ownerName,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
        // Human-readable status
        statusDescription: getStatusDescription(loc.completionStatus),
        // Days since last update
        daysSinceUpdate: Math.floor(
          (Date.now() - new Date(loc.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

      // Return formatted response
      return {
        success: true,
        count: formattedLocations.length,
        locations: formattedLocations,
        message:
          formattedLocations.length === 0
            ? 'User has no saved locations yet.'
            : `Found ${formattedLocations.length} location${formattedLocations.length > 1 ? 's' : ''}.`,
      };
    } catch (error) {
      console.error('[Location Agent] Error fetching locations:', error);

      return {
        success: false,
        count: 0,
        locations: [],
        error: error instanceof Error ? error.message : 'Failed to fetch locations',
        message: 'Unable to retrieve saved locations. Please try again.',
      };
    }
  },
});

/**
 * Helper: Convert completion status to human-readable description
 */
function getStatusDescription(status: string): string {
  const descriptions: Record<string, string> = {
    location_only: 'Basic location data only',
    with_personas: 'Has persona selections',
    with_pve: 'Has PVE (Program of Requirements) configuration',
    with_personas_pve: 'Has both personas and PVE',
    complete: 'Complete with building program report',
  };

  return descriptions[status] || 'Unknown status';
}
