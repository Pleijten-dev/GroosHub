import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProjectLocationSnapshots,
  createLocationSnapshot
} from '@/lib/db/queries/locations';

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
    const snapshots = await getProjectLocationSnapshots(id);

    return NextResponse.json({ snapshots });

  } catch (error) {
    console.error('Location snapshots API error:', error);
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

    const snapshot = await createLocationSnapshot({
      projectId,
      userId: Number(session.user.id),
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      neighborhoodCode: body.neighborhood_code || null,
      districtCode: body.district_code || null,
      municipalityCode: body.municipality_code || null,
      demographicsData: body.demographics_data || {},
      healthData: body.health_data || {},
      safetyData: body.safety_data || {},
      livabilityData: body.livability_data || {},
      amenitiesData: body.amenities_data || {},
      housingData: body.housing_data || {}
    });

    return NextResponse.json({ snapshot });

  } catch (error) {
    console.error('Create location snapshot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
