/**
 * API routes for individual rapport snapshot
 *
 * GET - Get snapshot by ID
 * PATCH - Update snapshot (name, notes, tags, favorite)
 * DELETE - Delete snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getRapportSnapshotById,
  updateRapportSnapshotName,
  updateRapportSnapshotNotes,
  updateRapportSnapshotTags,
  toggleRapportSnapshotFavorite,
  deleteRapportSnapshot,
} from '@/lib/db/queries/rapportSnapshots';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rapport-snapshots/[id]
 * Get a specific rapport snapshot
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const snapshot = await getRapportSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (snapshot.user_id !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('[API] Error fetching rapport snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rapport snapshot' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rapport-snapshots/[id]
 * Update a rapport snapshot
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const snapshot = await getRapportSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (snapshot.user_id !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, notes, tags, toggleFavorite } = body;

    // Update fields that are provided
    const updates: string[] = [];

    if (name !== undefined) {
      await updateRapportSnapshotName(id, name);
      updates.push('name');
    }

    if (notes !== undefined) {
      await updateRapportSnapshotNotes(id, notes);
      updates.push('notes');
    }

    if (tags !== undefined) {
      await updateRapportSnapshotTags(id, tags);
      updates.push('tags');
    }

    if (toggleFavorite === true) {
      await toggleRapportSnapshotFavorite(id);
      updates.push('favorite');
    }

    // Fetch updated snapshot
    const updatedSnapshot = await getRapportSnapshotById(id);

    return NextResponse.json({
      success: true,
      data: updatedSnapshot,
      updated: updates,
    });
  } catch (error) {
    console.error('[API] Error updating rapport snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to update rapport snapshot' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rapport-snapshots/[id]
 * Delete a rapport snapshot
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const snapshot = await getRapportSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (snapshot.user_id !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await deleteRapportSnapshot(id);

    return NextResponse.json({
      success: true,
      message: 'Snapshot deleted',
    });
  } catch (error) {
    console.error('[API] Error deleting rapport snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to delete rapport snapshot' },
      { status: 500 }
    );
  }
}
