/**
 * API routes for location snapshots
 * GET /api/location/snapshots - Get snapshots for a project
 * POST /api/location/snapshots - Create new snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectLocationSnapshots,
  getProjectLocationSnapshotsSummary,
  getUserLocationSnapshots,
  getUserLocationSnapshotsSummary,
  createLocationSnapshot,
} from '@/lib/db/queries/locations';
import { isProjectMember } from '@/lib/db/queries/projects';

/**
 * GET /api/location/snapshots
 * Get location snapshots (filtered by project_id or user_id)
 *
 * Query params:
 * - project_id: Filter by project
 * - user_id: Filter by user
 * - full: If "true", returns full data including JSON blobs. Default returns summary only.
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
    const fullData = searchParams.get('full') === 'true';

    if (projectId) {
      // Check if user is member of project
      const isMember = await isProjectMember(projectId, session.user.id);

      if (!isMember) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }

      // Use summary by default for better performance, full data only when requested
      const snapshots = fullData
        ? await getProjectLocationSnapshots(projectId)
        : await getProjectLocationSnapshotsSummary(projectId);

      return NextResponse.json({
        success: true,
        data: snapshots,
      });
    } else if (userId) {
      // Only allow users to get their own snapshots
      if (parseInt(userId) !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Use summary by default for better performance, full data only when requested
      const snapshots = fullData
        ? await getUserLocationSnapshots(session.user.id)
        : await getUserLocationSnapshotsSummary(session.user.id);

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
    console.error('Error fetching location snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/location/snapshots
 * Create a new location snapshot
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
      address,
      latitude,
      longitude,
      neighborhood_code,
      district_code,
      municipality_code,
      demographics_data,
      health_data,
      safety_data,
      livability_data,
      amenities_data,
      housing_data,
      wms_grading_data,
      pve_data,
      rapport_data,
      scoring_algorithm_version,
      overall_score,
      category_scores,
      data_sources,
      api_versions,
      notes,
      tags,
    } = body;

    // Validate required fields
    if (!project_id || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'project_id, address, latitude, and longitude are required',
        },
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
    const snapshot = await createLocationSnapshot({
      projectId: project_id,
      userId: session.user.id,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      neighborhoodCode: neighborhood_code,
      districtCode: district_code,
      municipalityCode: municipality_code,
      demographicsData: demographics_data,
      healthData: health_data,
      safetyData: safety_data,
      livabilityData: livability_data,
      amenitiesData: amenities_data,
      housingData: housing_data,
      wmsGradingData: wms_grading_data,
      pveData: pve_data,
      rapportData: rapport_data,
      scoringAlgorithmVersion: scoring_algorithm_version,
      overallScore: overall_score ? parseFloat(overall_score) : undefined,
      categoryScores: category_scores,
      dataSources: data_sources,
      apiVersions: api_versions,
      notes,
      tags,
    });

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error('Error creating location snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
