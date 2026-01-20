/**
 * API endpoint to grade WMS layers for an existing location snapshot
 * POST /api/location/snapshots/[id]/grade-wms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getLocationSnapshotById,
  updateLocationSnapshotWmsGrading,
} from '@/lib/db/queries/locations';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * POST /api/location/snapshots/[id]/grade-wms
 * Automatically grade WMS layers for a location snapshot
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get the snapshot
    const snapshot = await getLocationSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Check if user has access to the project
    const isMember = await isProjectMember(snapshot.project_id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Call the WMS grading API
    const gradingResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/location/wms-grading`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          address: snapshot.address,
          // Optional: pass sampling config from request body
          sampling_config: (await request.json().catch(() => ({})))?.sampling_config,
        }),
      }
    );

    if (!gradingResponse.ok) {
      const errorData = await gradingResponse.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || 'Failed to grade WMS layers',
        },
        { status: gradingResponse.status }
      );
    }

    const gradingData = await gradingResponse.json();

    if (!gradingData.success || !gradingData.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'WMS grading failed',
        },
        { status: 500 }
      );
    }

    // Update the snapshot with WMS grading data
    await updateLocationSnapshotWmsGrading(id, gradingData.data);

    // Get the updated snapshot
    const updatedSnapshot = await getLocationSnapshotById(id);

    return NextResponse.json({
      success: true,
      data: {
        snapshot: updatedSnapshot,
        grading_statistics: gradingData.data.statistics,
      },
    });
  } catch (error) {
    console.error('Error grading WMS layers for snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
