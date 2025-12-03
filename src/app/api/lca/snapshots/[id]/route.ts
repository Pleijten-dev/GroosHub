/**
 * API routes for individual LCA snapshot operations
 * GET /api/lca/snapshots/[id] - Get snapshot by ID
 * PATCH /api/lca/snapshots/[id] - Update snapshot
 * DELETE /api/lca/snapshots/[id] - Delete snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getLCASnapshotById,
  updateLCASnapshotData,
  updateLCASnapshotNotes,
  updateLCASnapshotTags,
  updateLCACalculationStatus,
  setActiveLCASnapshot,
  deleteLCASnapshot,
} from '@/lib/db/queries/lca';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/lca/snapshots/[id]
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

    const snapshot = await getLCASnapshotById(id);

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
    console.error('Error fetching LCA snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lca/snapshots/[id]
 * Update snapshot (data, notes, tags, calculation status, or set as active)
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

    const snapshot = await getLCASnapshotById(id);

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
    const {
      processes,
      flows,
      impact_categories,
      parameters,
      notes,
      tags,
      calculation_status,
      calculation_error,
      results,
      set_active,
    } = body;

    // Update data fields if provided
    if (processes !== undefined || flows !== undefined || impact_categories !== undefined || parameters !== undefined) {
      await updateLCASnapshotData(id, {
        processes,
        flows,
        impactCategories: impact_categories,
        parameters,
      });
    }

    // Update notes if provided
    if (notes !== undefined) {
      await updateLCASnapshotNotes(id, notes);
    }

    // Update tags if provided
    if (tags !== undefined) {
      await updateLCASnapshotTags(id, tags);
    }

    // Update calculation status if provided
    if (calculation_status !== undefined) {
      await updateLCACalculationStatus(id, calculation_status, calculation_error, results);
    }

    // Set as active if requested
    if (set_active === true) {
      await setActiveLCASnapshot(snapshot.project_id, id);
    }

    // Fetch updated snapshot
    const updatedSnapshot = await getLCASnapshotById(id);

    return NextResponse.json({
      success: true,
      data: updatedSnapshot,
    });
  } catch (error) {
    console.error('Error updating LCA snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lca/snapshots/[id]
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

    const snapshot = await getLCASnapshotById(id);

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

    await deleteLCASnapshot(id);

    return NextResponse.json({
      success: true,
      message: 'Snapshot deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting LCA snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
