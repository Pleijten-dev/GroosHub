/**
 * API routes for LCA snapshots
 * GET /api/lca/snapshots - Get snapshots for a project
 * POST /api/lca/snapshots - Create new snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectLCASnapshots,
  getUserLCASnapshots,
  createLCASnapshot,
} from '@/lib/db/queries/lca';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/lca/snapshots
 * Get LCA snapshots (filtered by project_id or user_id)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const userId = searchParams.get('user_id');

    if (projectId) {
      // Check if user is member of project
      const isMember = await isProjectMember(projectId, session.user.id);

      if (!isMember) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }

      const snapshots = await getProjectLCASnapshots(projectId);

      return NextResponse.json({
        success: true,
        data: snapshots,
      });
    } else if (userId) {
      // Only allow users to get their own snapshots
      if (parseInt(userId) !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const snapshots = await getUserLCASnapshots(session.user.id);

      return NextResponse.json({
        success: true,
        data: snapshots,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'project_id or user_id parameter required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching LCA snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lca/snapshots
 * Create a new LCA snapshot
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      project_name,
      project_description,
      functional_unit,
      system_boundary,
      allocation_method,
      processes,
      flows,
      impact_categories,
      results,
      parameters,
      comparisons,
      database_source,
      database_version,
      notes,
      tags,
    } = body;

    // Validate required fields
    if (!project_id || !project_name) {
      return NextResponse.json(
        { success: false, error: 'project_id and project_name are required' },
        { status: 400 }
      );
    }

    // Check if user is member of project
    const isMember = await isProjectMember(project_id, session.user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Create snapshot
    const snapshot = await createLCASnapshot({
      projectId: project_id,
      userId: session.user.id,
      projectName: project_name,
      projectDescription: project_description,
      functionalUnit: functional_unit,
      systemBoundary: system_boundary,
      allocationMethod: allocation_method,
      processes,
      flows,
      impactCategories: impact_categories,
      results,
      parameters,
      comparisons,
      databaseSource: database_source,
      databaseVersion: database_version,
      notes,
      tags,
    });

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Error creating LCA snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
