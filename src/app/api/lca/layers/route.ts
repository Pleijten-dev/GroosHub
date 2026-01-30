import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/layers
 *
 * Lists all layers for an element
 *
 * Query params:
 * - element_id: string (required)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "position": number,
 *       "thickness": number,
 *       "coverage": number,
 *       "material": { ...material data }
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
    const elementId = searchParams.get('element_id');

    if (!elementId) {
      return NextResponse.json(
        { success: false, error: 'element_id is required' },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 3. Verify element access (through project)
    const accessCheck = await sql`
      SELECT e.id, p.user_id, p.is_public
      FROM lca_elements e
      JOIN lca_projects p ON p.id = e.project_id
      WHERE e.id = ${elementId}
    `;

    if (accessCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Element not found' },
        { status: 404 }
      );
    }

    if (accessCheck[0].user_id !== session.user.id && !accessCheck[0].is_public) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 4. Load layers with materials
    const layers = await sql`
      SELECT
        l.*,
        m.id as mat_id,
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
      WHERE l.element_id = ${elementId}
      ORDER BY l.position
    `;

    // 5. Format layers with nested material
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedLayers = layers.map((layer: Record<string, any>) => ({
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
        id: layer.mat_id,
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

    // 6. Return layers
    return NextResponse.json({
      success: true,
      data: formattedLayers
    });

  } catch (error: unknown) {
    console.error('LCA Layers List Error:', error);
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
 * POST /api/lca/layers
 *
 * Creates a new layer in an element
 *
 * Request body:
 * {
 *   "element_id": "uuid",
 *   "position": number,
 *   "material_id": "uuid",
 *   "thickness": number (meters),
 *   "coverage": number (0-1),
 *   "custom_lifespan": number (optional),
 *   "custom_transport_km": number (optional),
 *   "custom_eol_scenario": "string" (optional)
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
      element_id,
      position,
      material_id,
      thickness,
      coverage = 1.0,
      custom_lifespan,
      custom_transport_km,
      custom_eol_scenario
    } = body;

    // 3. Validate required fields
    if (!element_id || !material_id || thickness === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'element_id, material_id, and thickness are required'
        },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 4. Verify element ownership
    const accessCheck = await sql`
      SELECT e.id, p.user_id
      FROM lca_elements e
      JOIN lca_projects p ON p.id = e.project_id
      WHERE e.id = ${element_id}
    `;

    if (accessCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Element not found' },
        { status: 404 }
      );
    }

    if (accessCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 5. Verify material exists
    const materialCheck = await sql`
      SELECT id FROM lca_materials WHERE id = ${material_id}
    `;

    if (materialCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    // 6. Calculate position if not provided
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPositionResult = await sql`
        SELECT COALESCE(MAX(position), 0) as max_pos
        FROM lca_layers
        WHERE element_id = ${element_id}
      `;
      finalPosition = maxPositionResult[0].max_pos + 1;
    }

    // 7. Create layer
    const result = await sql`
      INSERT INTO lca_layers (
        element_id,
        position,
        material_id,
        thickness,
        coverage,
        custom_lifespan,
        custom_transport_km,
        custom_eol_scenario
      ) VALUES (
        ${element_id},
        ${finalPosition},
        ${material_id},
        ${thickness},
        ${coverage},
        ${custom_lifespan || null},
        ${custom_transport_km || null},
        ${custom_eol_scenario || null}
      )
      RETURNING *
    `;

    const newLayer = result[0];

    // 8. Load material data for response
    const materialResult = await sql`
      SELECT * FROM lca_materials WHERE id = ${material_id}
    `;

    const material = materialResult[0];

    // 9. Return created layer with material
    return NextResponse.json({
      success: true,
      data: {
        ...newLayer,
        material: {
          id: material.id,
          oekobaudat_uuid: material.oekobaudat_uuid,
          name_de: material.name_de,
          name_en: material.name_en,
          name_nl: material.name_nl,
          category: material.category,
          subcategory: material.subcategory,
          density: material.density,
          declared_unit: material.declared_unit,
          conversion_to_kg: material.conversion_to_kg,
          gwp_a1_a3: material.gwp_a1_a3,
          gwp_a4: material.gwp_a4,
          gwp_a5: material.gwp_a5,
          gwp_c1: material.gwp_c1,
          gwp_c2: material.gwp_c2,
          gwp_c3: material.gwp_c3,
          gwp_c4: material.gwp_c4,
          gwp_d: material.gwp_d,
          biogenic_carbon: material.biogenic_carbon,
          reference_service_life: material.reference_service_life,
          quality_rating: material.quality_rating,
          is_generic: material.is_generic
        }
      }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('LCA Layer Create Error:', error);
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
