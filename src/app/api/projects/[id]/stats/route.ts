import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProjectStats } from '@/lib/db/queries/projects';

export async function GET(
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
    const stats = await getProjectStats(id);

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Project stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
