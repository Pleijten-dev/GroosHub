import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/layers/[id]
 *
 * Gets a specific layer with its material
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDbConnection();

    // 2. Load layer with access check
    const layerResult = await sql`
      SELECT
        l.*,
        m.*,
        l.id as layer_id,
        m.id as material_id,
        m.category as material_category,
        m.subcategory as material_subcategory,
        p.user_id,
        p.is_public
      FROM lca_layers l
      JOIN lca_elements e ON e.id = l.element_id
      JOIN lca_projects p ON p.id = e.project_id
      LEFT JOIN lca_materials m ON m.id = l.material_id
      WHERE l.id = ${id}
    `;

    if (layerResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Layer not found' },
        { status: 404 }
      );
    }

    const layer = layerResult[0];

    // 3. Check access
    if (layer.user_id !== session.user.id && !layer.is_public) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 4. Return formatted layer
    return NextResponse.json({
      success: true,
      data: {
        id: layer.layer_id,
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
      }
    });

  } catch (error: unknown) {
    console.error('LCA Layer Get Error:', error);
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
 * PATCH /api/lca/layers/[id]
 *
 * Updates a layer's properties
 *
 * Request body (all fields optional):
 * {
 *   "material_id": "uuid",
 *   "thickness": number,
 *   "coverage": number,
 *   "position": number,
 *   "custom_lifespan": number,
 *   "custom_transport_km": number,
 *   "custom_eol_scenario": "string"
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDbConnection();

    // 2. Verify layer ownership
    const accessCheck = await sql`
      SELECT l.id, p.user_id
      FROM lca_layers l
      JOIN lca_elements e ON e.id = l.element_id
      JOIN lca_projects p ON p.id = e.project_id
      WHERE l.id = ${id}
    `;

    if (accessCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Layer not found' },
        { status: 404 }
      );
    }

    if (accessCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      material_id,
      thickness,
      coverage,
      position,
      custom_lifespan,
      custom_transport_km,
      custom_eol_scenario
    } = body;

    // Check if at least one field is being updated
    const hasUpdates = [
      material_id, thickness, coverage, position,
      custom_lifespan, custom_transport_km, custom_eol_scenario
    ].some(val => val !== undefined);

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 4. Verify new material exists if provided
    if (material_id) {
      const materialCheck = await sql`
        SELECT id FROM lca_materials WHERE id = ${material_id}
      `;

      if (materialCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Material not found' },
          { status: 404 }
        );
      }
    }

    // 5. Update layer
    const result = await sql`
      UPDATE lca_layers
      SET
        material_id = COALESCE(${material_id ?? null}, material_id),
        thickness = COALESCE(${thickness ?? null}, thickness),
        coverage = COALESCE(${coverage ?? null}, coverage),
        position = COALESCE(${position ?? null}, position),
        custom_lifespan = COALESCE(${custom_lifespan ?? null}, custom_lifespan),
        custom_transport_km = COALESCE(${custom_transport_km ?? null}, custom_transport_km),
        custom_eol_scenario = COALESCE(${custom_eol_scenario ?? null}, custom_eol_scenario)
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedLayer = result[0];

    // 6. Load material data for response
    const materialResult = await sql`
      SELECT * FROM lca_materials WHERE id = ${updatedLayer.material_id}
    `;

    const material = materialResult[0];

    // 7. Return updated layer with material
    return NextResponse.json({
      success: true,
      data: {
        ...updatedLayer,
        material: material ? {
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
        } : null
      }
    });

  } catch (error: unknown) {
    console.error('LCA Layer Update Error:', error);
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
 * DELETE /api/lca/layers/[id]
 *
 * Deletes a layer
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDbConnection();

    // 2. Verify layer ownership
    const accessCheck = await sql`
      SELECT l.id, l.element_id, l.position, p.user_id
      FROM lca_layers l
      JOIN lca_elements e ON e.id = l.element_id
      JOIN lca_projects p ON p.id = e.project_id
      WHERE l.id = ${id}
    `;

    if (accessCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Layer not found' },
        { status: 404 }
      );
    }

    if (accessCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { element_id, position } = accessCheck[0];

    // 3. Delete layer
    await sql`
      DELETE FROM lca_layers WHERE id = ${id}
    `;

    // 4. Update positions of remaining layers
    await sql`
      UPDATE lca_layers
      SET position = position - 1
      WHERE element_id = ${element_id} AND position > ${position}
    `;

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: 'Layer deleted successfully'
    });

  } catch (error: unknown) {
    console.error('LCA Layer Delete Error:', error);
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
