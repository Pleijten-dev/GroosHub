import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/projects/[id]
 *
 * Gets a specific LCA project with all elements and layers
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     ...project fields,
 *     "elements": [
 *       {
 *         ...element fields,
 *         "layers": [
 *           {
 *             ...layer fields,
 *             "material": { ...material fields }
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
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

    // 2. Load project with elements and layers
    const sql = getDbConnection();

    // Load project
    const projectResult = await sql`
      SELECT * FROM lca_projects WHERE id = ${id}
    `;

    if (projectResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectResult[0];

    // Check ownership
    if (project.user_id !== session.user.id && !project.is_public) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Load elements
    const elements = await sql`
      SELECT * FROM lca_elements
      WHERE project_id = ${id}
      ORDER BY created_at
    `;

    // Load layers with materials for all elements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementIds = elements.map((e: Record<string, any>) => e.id as string);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let layers: Record<string, any>[] = [];
    if (elementIds.length > 0) {
      layers = await sql`
        SELECT
          l.*,
          m.*,
          l.id as layer_id,
          l.custom_lifespan as layer_custom_lifespan,
          l.custom_transport_km as layer_custom_transport_km,
          l.custom_eol_scenario as layer_custom_eol_scenario
        FROM lca_layers l
        LEFT JOIN lca_materials m ON m.id = l.material_id
        WHERE l.element_id = ANY(${elementIds})
        ORDER BY l.element_id, l.position
      `;
    }

    // Group layers by element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementsWithLayers = elements.map((element: Record<string, any>) => {
      const elementLayers = layers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((layer: Record<string, any>) => layer.element_id === element.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((layer: Record<string, any>) => ({
          id: layer.layer_id,
          element_id: layer.element_id,
          position: layer.position,
          material_id: layer.material_id,
          thickness: layer.thickness,
          coverage: layer.coverage,
          custom_lifespan: layer.layer_custom_lifespan,
          custom_transport_km: layer.layer_custom_transport_km,
          custom_eol_scenario: layer.layer_custom_eol_scenario,
          material: {
            id: layer.id,
            oekobaudat_uuid: layer.oekobaudat_uuid,
            name_de: layer.name_de,
            name_en: layer.name_en,
            name_nl: layer.name_nl,
            category: layer.category,
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
            gwp_d: layer.gwp_d
          }
        }));

      return {
        ...element,
        layers: elementLayers
      };
    });

    // 3. Return project with nested structure
    return NextResponse.json({
      success: true,
      data: {
        ...project,
        elements: elementsWithLayers
      }
    });

  } catch (error: unknown) {
    console.error('LCA Project Get Error:', error);
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
 * PATCH /api/lca/projects/[id]
 *
 * Updates an LCA project
 *
 * Request body (all fields optional):
 * {
 *   "name": "string",
 *   "description": "string",
 *   "gross_floor_area": number,
 *   "building_type": "string",
 *   "construction_system": "string",
 *   "floors": number,
 *   "study_period": number,
 *   "location": "string",
 *   "energy_label": "string"
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

    // 2. Verify project ownership
    const sql = getDbConnection();
    const projectCheck = await sql`
      SELECT user_id FROM lca_projects WHERE id = ${id}
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

    // 3. Parse and validate request body
    const body = await request.json();

    // Extract fields from body (only allowed fields)
    const {
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
      annual_electricity
    } = body;

    // Check if at least one field is being updated
    const hasUpdates = [
      name, description, project_number, gross_floor_area, building_type,
      construction_system, floors, study_period, location, energy_label,
      heating_system, annual_gas_use, annual_electricity
    ].some(val => val !== undefined);

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // 4. Update project using Neon's tagged template syntax
    const result = await sql`
      UPDATE lca_projects
      SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        project_number = COALESCE(${project_number ?? null}, project_number),
        gross_floor_area = COALESCE(${gross_floor_area ?? null}, gross_floor_area),
        building_type = COALESCE(${building_type ?? null}, building_type),
        construction_system = COALESCE(${construction_system ?? null}, construction_system),
        floors = COALESCE(${floors ?? null}, floors),
        study_period = COALESCE(${study_period ?? null}, study_period),
        location = COALESCE(${location ?? null}, location),
        energy_label = COALESCE(${energy_label ?? null}, energy_label),
        heating_system = COALESCE(${heating_system ?? null}, heating_system),
        annual_gas_use = COALESCE(${annual_gas_use ?? null}, annual_gas_use),
        annual_electricity = COALESCE(${annual_electricity ?? null}, annual_electricity),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedProject = result[0];

    // 5. Return updated project
    return NextResponse.json({
      success: true,
      data: updatedProject
    });

  } catch (error: unknown) {
    console.error('LCA Project Update Error:', error);
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
 * DELETE /api/lca/projects/[id]
 *
 * Deletes an LCA project (and all associated elements/layers via CASCADE)
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

    // 2. Verify project ownership
    const sql = getDbConnection();
    const projectCheck = await sql`
      SELECT user_id FROM lca_projects WHERE id = ${id}
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

    // 3. Delete project (CASCADE will delete elements and layers)
    await sql`
      DELETE FROM lca_projects WHERE id = ${id}
    `;

    // 4. Return success
    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error: unknown) {
    console.error('LCA Project Delete Error:', error);
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
