import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setActiveLocationSnapshot, getLocationSnapshotById } from '@/lib/db/queries/locations';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get snapshot to find project ID
    const snapshot = await getLocationSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Set as active snapshot
    await setActiveLocationSnapshot(snapshot.project_id, id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Activate snapshot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
