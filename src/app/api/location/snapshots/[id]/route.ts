/**
 * API routes for individual location snapshot operations
 * GET /api/location/snapshots/[id] - Get snapshot by ID
 * PATCH /api/location/snapshots/[id] - Update snapshot
 * DELETE /api/location/snapshots/[id] - Delete snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getLocationSnapshotById,
  updateLocationSnapshotNotes,
  updateLocationSnapshotTags,
  setActiveLocationSnapshot,
  deleteLocationSnapshot,
} from '@/lib/db/queries/locations';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/location/snapshots/[id]
 * Get snapshot details
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const snapshot = await getLocationSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Check if user is member of project
    const isMember = await isProjectMember(snapshot.project_id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this snapshot' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Error fetching location snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/location/snapshots/[id]
 * Update snapshot (notes, tags, or set as active)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const snapshot = await getLocationSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Check if user is member of project
    const isMember = await isProjectMember(snapshot.project_id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this snapshot' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notes, tags, set_active } = body;

    if (notes !== undefined) {
      await updateLocationSnapshotNotes(id, notes);
    }

    if (tags !== undefined) {
      await updateLocationSnapshotTags(id, tags);
    }

    if (set_active === true) {
      await setActiveLocationSnapshot(snapshot.project_id, id);
    }

    // Fetch updated snapshot
    const updatedSnapshot = await getLocationSnapshotById(id);

    return NextResponse.json({
      success: true,
      data: updatedSnapshot,
    });
  } catch (error) {
    console.error('Error updating location snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/location/snapshots/[id]
 * Delete snapshot
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const snapshot = await getLocationSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Check if user is member of project
    const isMember = await isProjectMember(snapshot.project_id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this snapshot' },
        { status: 403 }
      );
    }

    // Don't allow deleting the active snapshot if it's the only one
    if (snapshot.is_active) {
      return NextResponse.json(
        {
          error:
            'Cannot delete active snapshot. Set another snapshot as active first or create a new one.',
        },
        { status: 400 }
      );
    }

    await deleteLocationSnapshot(id);

    return NextResponse.json({
      success: true,
      message: 'Snapshot deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
