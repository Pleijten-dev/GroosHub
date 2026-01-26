/**
 * API routes for rapport snapshots
 *
 * GET - List user's rapport snapshots
 * POST - Create new rapport snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserRapportSnapshots,
  createRapportSnapshot,
  getRapportSnapshotCount,
  ensureRapportSnapshotsTable,
  type CreateRapportSnapshotParams,
} from '@/lib/db/queries/rapportSnapshots';

/**
 * GET /api/rapport-snapshots
 * List user's rapport snapshots
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const favoritesOnly = searchParams.get('favorites') === 'true';

    // Ensure table exists
    await ensureRapportSnapshotsTable();

    const [snapshots, totalCount] = await Promise.all([
      getUserRapportSnapshots(parseInt(session.user.id), {
        limit,
        offset,
        favoritesOnly,
      }),
      getRapportSnapshotCount(parseInt(session.user.id)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        snapshots,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + snapshots.length < totalCount,
        },
      },
    });
  } catch (error) {
    console.error('[API] Error fetching rapport snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rapport snapshots' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rapport-snapshots
 * Create a new rapport snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      locationSnapshotId,
      locationAddress,
      latitude,
      longitude,
      locale,
      stage1Output,
      stage2Output,
      stage3Output,
      combinedProgram,
      inputData,
      inputHash,
      llmModel,
      generationTimeMs,
      tokenUsage,
      notes,
      tags,
    } = body;

    // Validate required fields
    if (!name || !locationAddress || !inputHash) {
      return NextResponse.json(
        { error: 'Missing required fields: name, locationAddress, inputHash' },
        { status: 400 }
      );
    }

    // Ensure table exists
    await ensureRapportSnapshotsTable();

    const params: CreateRapportSnapshotParams = {
      userId: parseInt(session.user.id),
      name,
      locationSnapshotId,
      locationAddress,
      latitude,
      longitude,
      locale: locale || 'nl',
      stage1Output: stage1Output || {},
      stage2Output: stage2Output || {},
      stage3Output: stage3Output || {},
      combinedProgram: combinedProgram || {},
      inputData: inputData || {},
      inputHash,
      llmModel,
      generationTimeMs,
      tokenUsage,
      notes,
      tags,
    };

    const snapshot = await createRapportSnapshot(params);

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('[API] Error creating rapport snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create rapport snapshot' },
      { status: 500 }
    );
  }
}
