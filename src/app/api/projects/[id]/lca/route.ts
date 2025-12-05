import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectLCASnapshots,
  createLCASnapshot
} from '@/lib/db/queries/lca';

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
    const snapshots = await getProjectLCASnapshots(id);

    return NextResponse.json({ snapshots });

  } catch (error) {
    console.error('LCA snapshots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id: projectId } = await params;
    const body = await request.json();

    const snapshot = await createLCASnapshot({
      projectId,
      userId: Number(session.user.id),
      projectName: body.project_name,
      projectDescription: body.project_description || null,
      functionalUnit: body.functional_unit || null,
      systemBoundary: body.system_boundary || null,
      allocationMethod: body.allocation_method || null,
      processes: body.processes || [],
      flows: body.flows || [],
      impactCategories: body.impact_categories || [],
      results: body.results || {},
      parameters: body.parameters || {}
    });

    return NextResponse.json({ snapshot });

  } catch (error) {
    console.error('Create LCA snapshot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
