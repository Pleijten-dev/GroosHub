import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/lca/layers/reorder
 *
 * Reorders layers within an element
 *
 * Request body:
 * {
 *   "element_id": "uuid",
 *   "layer_ids": ["uuid1", "uuid2", "uuid3"] (new order)
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
    const { element_id, layer_ids } = body;

    // 3. Validate required fields
    if (!element_id || !layer_ids || !Array.isArray(layer_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'element_id and layer_ids array are required'
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

    // 5. Verify all layer_ids belong to this element
    const existingLayers = await sql`
      SELECT id FROM lca_layers WHERE element_id = ${element_id}
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIds = new Set(existingLayers.map((l: Record<string, any>) => l.id));
    const providedIds = new Set(layer_ids);

    // Check all provided IDs exist in the element
    for (const layerId of layer_ids) {
      if (!existingIds.has(layerId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid layer_id',
            details: `Layer ${layerId} does not belong to element ${element_id}`
          },
          { status: 400 }
        );
      }
    }

    // Check all existing layers are included
    if (providedIds.size !== existingIds.size) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing layers',
          details: 'All layers must be included in the reorder request'
        },
        { status: 400 }
      );
    }

    // 6. Update positions using a transaction
    // Update each layer with its new position
    for (let i = 0; i < layer_ids.length; i++) {
      await sql`
        UPDATE lca_layers
        SET position = ${i + 1}
        WHERE id = ${layer_ids[i]}
      `;
    }

    // 7. Return success with updated layers
    const updatedLayers = await sql`
      SELECT
        l.*,
        m.id as mat_id,
        m.name_de,
        m.name_en,
        m.name_nl,
        m.category as material_category,
        m.gwp_a1_a3,
        m.density,
        m.quality_rating,
        m.is_generic
      FROM lca_layers l
      LEFT JOIN lca_materials m ON m.id = l.material_id
      WHERE l.element_id = ${element_id}
      ORDER BY l.position
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedLayers = updatedLayers.map((layer: Record<string, any>) => ({
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
        name_de: layer.name_de,
        name_en: layer.name_en,
        name_nl: layer.name_nl,
        category: layer.material_category,
        gwp_a1_a3: layer.gwp_a1_a3,
        density: layer.density,
        quality_rating: layer.quality_rating,
        is_generic: layer.is_generic
      }
    }));

    return NextResponse.json({
      success: true,
      data: formattedLayers
    });

  } catch (error: unknown) {
    console.error('LCA Layers Reorder Error:', error);
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
