import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/projects
 *
 * Lists all LCA projects for the authenticated user
 *
 * Query params (optional):
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - building_type: string (filter)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name": "string",
 *       "building_type": "string",
 *       "gross_floor_area": number,
 *       "total_gwp_per_m2_year": number,
 *       "is_compliant": boolean,
 *       "created_at": "timestamp",
 *       "updated_at": "timestamp"
 *     }
 *   ],
 *   "pagination": {
 *     "limit": number,
 *     "offset": number,
 *     "total": number
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const buildingType = searchParams.get('building_type');

    // 3. Build query
    const sql = getDbConnection();

    // Count total projects
    const countQuery = buildingType
      ? sql`
          SELECT COUNT(*) as total
          FROM lca_projects
          WHERE user_id = ${session.user.id}
            AND building_type = ${buildingType}
        `
      : sql`
          SELECT COUNT(*) as total
          FROM lca_projects
          WHERE user_id = ${session.user.id}
        `;

    const countResult = await countQuery;
    const total = parseInt(countResult[0].total);

    // Fetch projects
    const projectsQuery = buildingType
      ? sql`
          SELECT
            id,
            name,
            description,
            project_number,
            building_type,
            construction_system,
            gross_floor_area,
            study_period,
            floors,
            total_gwp_per_m2_year,
            mpg_reference_value,
            is_compliant,
            is_template,
            created_at,
            updated_at
          FROM lca_projects
          WHERE user_id = ${session.user.id}
            AND building_type = ${buildingType}
          ORDER BY updated_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      : sql`
          SELECT
            id,
            name,
            description,
            project_number,
            building_type,
            construction_system,
            gross_floor_area,
            study_period,
            floors,
            total_gwp_per_m2_year,
            mpg_reference_value,
            is_compliant,
            is_template,
            created_at,
            updated_at
          FROM lca_projects
          WHERE user_id = ${session.user.id}
          ORDER BY updated_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

    const projects = await projectsQuery;

    // 4. Return response
    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        limit,
        offset,
        total
      }
    });

  } catch (error: unknown) {
    console.error('LCA Projects List Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lca/projects
 *
 * Creates a new LCA project
 *
 * Request body:
 * {
 *   "name": "string",
 *   "description": "string" (optional),
 *   "project_number": "string" (optional),
 *   "gross_floor_area": number,
 *   "building_type": "vrijstaand" | "rijwoning" | "appartement" | "tussenwoning" | "hoekwoning",
 *   "construction_system": "houtskelet" | "metselwerk" | "beton" | "clt" | "hybrid",
 *   "floors": number,
 *   "study_period": number (default: 75),
 *   "location": "string" (optional),
 *   "energy_label": "string" (optional)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     ...project fields
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      name,
      description,
      project_number,
      gross_floor_area,
      building_type,
      construction_system,
      floors,
      study_period = 75,
      location,
      energy_label,
      heating_system,
      annual_gas_use,
      annual_electricity
    } = body;

    // 3. Validate required fields
    if (!name || !gross_floor_area || !building_type || !construction_system || !floors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['name', 'gross_floor_area', 'building_type', 'construction_system', 'floors']
        },
        { status: 400 }
      );
    }

    // 4. Validate building type
    const validBuildingTypes = ['vrijstaand', 'rijwoning', 'appartement', 'tussenwoning', 'hoekwoning'];
    if (!validBuildingTypes.includes(building_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid building_type',
          allowed: validBuildingTypes
        },
        { status: 400 }
      );
    }

    // 5. Create project
    const sql = getDbConnection();

    const result = await sql`
      INSERT INTO lca_projects (
        name,
        description,
        project_number,
        gross_floor_area,
        building_type,
        construction_system,
        floors,
        study_period,
        location,
        energy_label,
        heating_system,
        annual_gas_use,
        annual_electricity,
        user_id,
        is_template,
        is_public
      ) VALUES (
        ${name},
        ${description || null},
        ${project_number || null},
        ${gross_floor_area},
        ${building_type},
        ${construction_system},
        ${floors},
        ${study_period},
        ${location || null},
        ${energy_label || null},
        ${heating_system || null},
        ${annual_gas_use || null},
        ${annual_electricity || null},
        ${session.user.id},
        false,
        false
      )
      RETURNING *
    `;

    const newProject = result[0];

    // 6. Return created project
    return NextResponse.json(
      {
        success: true,
        data: newProject
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('LCA Project Creation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
