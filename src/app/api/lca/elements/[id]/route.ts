import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/elements/[id]
 *
 * Gets a specific element with its layers and materials
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

    // 2. Load element with project verification
    const elementResult = await sql`
      SELECT e.*, p.user_id, p.is_public
      FROM lca_elements e
      JOIN lca_projects p ON p.id = e.project_id
      WHERE e.id = ${id}
    `;

    if (elementResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Element not found' },
        { status: 404 }
      );
    }

    const element = elementResult[0];

    // 3. Check access
    if (element.user_id !== session.user.id && !element.is_public) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 4. Load layers with materials
    const layers = await sql`
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
      WHERE l.element_id = ${id}
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

    // 6. Return element with layers
    return NextResponse.json({
      success: true,
      data: {
        id: element.id,
        project_id: element.project_id,
        name: element.name,
        sfb_code: element.sfb_code,
        category: element.category,
        quantity: element.quantity,
        quantity_unit: element.quantity_unit,
        description: element.description,
        notes: element.notes,
        total_gwp_a1_a3: element.total_gwp_a1_a3,
        total_gwp_a4: element.total_gwp_a4,
        total_gwp_a5: element.total_gwp_a5,
        total_gwp_b4: element.total_gwp_b4,
        total_gwp_c: element.total_gwp_c,
        total_gwp_d: element.total_gwp_d,
        created_at: element.created_at,
        updated_at: element.updated_at,
        layers: formattedLayers
      }
    });

  } catch (error: unknown) {
    console.error('LCA Element Get Error:', error);
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
 * PATCH /api/lca/elements/[id]
 *
 * Updates an element's properties
 *
 * Request body (all fields optional):
 * {
 *   "name": "string",
 *   "category": "string",
 *   "quantity": number,
 *   "quantity_unit": "string",
 *   "sfb_code": "string",
 *   "description": "string"
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

    // 2. Verify element ownership
    const elementCheck = await sql`
      SELECT e.id, p.user_id
      FROM lca_elements e
      JOIN lca_projects p ON p.id = e.project_id
      WHERE e.id = ${id}
    `;

    if (elementCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Element not found' },
        { status: 404 }
      );
    }

    if (elementCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, category, quantity, quantity_unit, sfb_code, description, notes } = body;

    // Check if at least one field is being updated
    const hasUpdates = [name, category, quantity, quantity_unit, sfb_code, description, notes]
      .some(val => val !== undefined);

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 4. Update element
    const result = await sql`
      UPDATE lca_elements
      SET
        name = COALESCE(${name ?? null}, name),
        category = COALESCE(${category ?? null}, category),
        quantity = COALESCE(${quantity ?? null}, quantity),
        quantity_unit = COALESCE(${quantity_unit ?? null}, quantity_unit),
        sfb_code = COALESCE(${sfb_code ?? null}, sfb_code),
        description = COALESCE(${description ?? null}, description),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedElement = result[0];

    // 5. Return updated element
    return NextResponse.json({
      success: true,
      data: updatedElement
    });

  } catch (error: unknown) {
    console.error('LCA Element Update Error:', error);
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
 * DELETE /api/lca/elements/[id]
 *
 * Deletes an element and all its layers
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

    // 2. Verify element ownership
    const elementCheck = await sql`
      SELECT e.id, e.project_id, p.user_id
      FROM lca_elements e
      JOIN lca_projects p ON p.id = e.project_id
      WHERE e.id = ${id}
    `;

    if (elementCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Element not found' },
        { status: 404 }
      );
    }

    if (elementCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 3. Delete element (CASCADE will delete layers)
    await sql`
      DELETE FROM lca_elements WHERE id = ${id}
    `;

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Element deleted successfully'
    });

  } catch (error: unknown) {
    console.error('LCA Element Delete Error:', error);
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
