import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/elements
 *
 * Lists all elements for a project
 *
 * Query params:
 * - project_id: string (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name": "string",
 *       "category": "string",
 *       ...element fields,
 *       "layers": [...layer data with materials]
 *     }
 *   ]
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
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'project_id is required' },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 3. Verify project access
    const projectCheck = await sql`
      SELECT user_id, is_public FROM lca_projects WHERE id = ${projectId}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (projectCheck[0].user_id !== session.user.id && !projectCheck[0].is_public) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 4. Load elements
    const elements = await sql`
      SELECT * FROM lca_elements
      WHERE project_id = ${projectId}
      ORDER BY category, created_at
    `;

    // 5. Load layers with materials for all elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementIds = elements.map((e: Record<string, any>) => e.id as string);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let layers: Record<string, any>[] = [];
    if (elementIds.length > 0) {
      layers = await sql`
        SELECT
          l.*,
          m.id as material_id,
          m.oekobaudat_uuid,
          m.name_de,
          m.name_en,
          m.name_nl,
          m.category as material_category,
          m.subcategory as material_subcategory,
          m.density,
          m.declared_unit,
          m.conversion_to_kg,
          m.gwp_a1_a3,
          m.gwp_a4,
          m.gwp_a5,
          m.gwp_c1,
          m.gwp_c2,
          m.gwp_c3,
          m.gwp_c4,
          m.gwp_d,
          m.biogenic_carbon,
          m.reference_service_life,
          m.quality_rating,
          m.is_generic
        FROM lca_layers l
        LEFT JOIN lca_materials m ON m.id = l.material_id
        WHERE l.element_id = ANY(${elementIds})
        ORDER BY l.element_id, l.position
      `;
    }

    // 6. Group layers by element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementsWithLayers = elements.map((element: Record<string, any>) => {
      const elementLayers = layers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((layer: Record<string, any>) => layer.element_id === element.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((layer: Record<string, any>) => ({
          id: layer.id,
          element_id: layer.element_id,
          position: layer.position,
          material_id: layer.material_id,
          thickness: layer.thickness,
          coverage: layer.coverage,
          custom_lifespan: layer.custom_lifespan,
          custom_transport_km: layer.custom_transport_km,
          custom_eol_scenario: layer.custom_eol_scenario,
          material: {
            id: layer.material_id,
            oekobaudat_uuid: layer.oekobaudat_uuid,
            name_de: layer.name_de,
            name_en: layer.name_en,
            name_nl: layer.name_nl,
            category: layer.material_category,
            subcategory: layer.material_subcategory,
            density: layer.density,
            declared_unit: layer.declared_unit,
            conversion_to_kg: layer.conversion_to_kg,
            gwp_a1_a3: layer.gwp_a1_a3,
            gwp_a4: layer.gwp_a4,
            gwp_a5: layer.gwp_a5,
            gwp_c1: layer.gwp_c1,
            gwp_c2: layer.gwp_c2,
            gwp_c3: layer.gwp_c3,
            gwp_c4: layer.gwp_c4,
            gwp_d: layer.gwp_d,
            biogenic_carbon: layer.biogenic_carbon,
            reference_service_life: layer.reference_service_life,
            quality_rating: layer.quality_rating,
            is_generic: layer.is_generic
          }
        }));

      return {
        ...element,
        layers: elementLayers
      };
    });

    // 7. Return elements with layers
    return NextResponse.json({
      success: true,
      data: elementsWithLayers
    });

  } catch (error: unknown) {
    console.error('LCA Elements List Error:', error);
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
 * POST /api/lca/elements
 *
 * Creates a new element in a project
 *
 * Request body:
 * {
 *   "project_id": "uuid",
 *   "name": "string",
 *   "category": "string",
 *   "quantity": number,
 *   "quantity_unit": "string",
 *   "sfb_code": "string" (optional),
 *   "description": "string" (optional)
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
      project_id,
      name,
      category,
      quantity,
      quantity_unit = 'm²',
      sfb_code,
      description
    } = body;

    // 3. Validate required fields
    if (!project_id || !name || !category || quantity === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'project_id, name, category, and quantity are required'
        },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 4. Verify project ownership
    const projectCheck = await sql`
      SELECT user_id FROM lca_projects WHERE id = ${project_id}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (projectCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. Create element
    const result = await sql`
      INSERT INTO lca_elements (
        project_id,
        name,
        category,
        quantity,
        quantity_unit,
        sfb_code,
        description,
        created_at,
        updated_at
      ) VALUES (
        ${project_id},
        ${name},
        ${category},
        ${quantity},
        ${quantity_unit},
        ${sfb_code || null},
        ${description || null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const newElement = result[0];

    // 6. Return created element with empty layers array
    return NextResponse.json({
      success: true,
      data: {
        ...newElement,
        layers: []
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('LCA Element Create Error:', error);
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
