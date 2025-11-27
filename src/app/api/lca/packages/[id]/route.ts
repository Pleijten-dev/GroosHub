import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type { CreatePackageLayerInput } from '@/features/lca/types';

/**
 * GET /api/lca/packages/[id] - Get package details with layers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sql = getDbConnection();

    // Get package
    const packageResult = await sql`
      SELECT * FROM lca_packages
      WHERE id = ${id}
        AND (is_public = true OR user_id = ${session.user.id})
    `;

    if (packageResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    // Get layers with materials
    const layersResult = await sql`
      SELECT
        pl.*,
        row_to_json(m.*) as material
      FROM lca_package_layers pl
      JOIN lca_materials m ON m.id = pl.material_id
      WHERE pl.package_id = ${id}
      ORDER BY pl.position ASC
    `;

    const packageData = {
      ...packageResult[0],
      layers: layersResult
    };

    return NextResponse.json({
      success: true,
      data: { package: packageData }
    });

  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/lca/packages/[id] - Update package
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const sql = getDbConnection();

    // Check ownership
    const ownerCheck = await sql`
      SELECT user_id FROM lca_packages WHERE id = ${id}
    `;

    if (ownerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    if (ownerCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to edit this package' },
        { status: 403 }
      );
    }

    // Build update fields dynamically
    const updates: Record<string, string | string[] | boolean | null> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.subcategory !== undefined) updates.subcategory = body.subcategory;
    if (body.construction_system !== undefined) updates.construction_system = body.construction_system;
    if (body.insulation_level !== undefined) updates.insulation_level = body.insulation_level;
    if (body.is_public !== undefined) updates.is_public = body.is_public;
    if (body.tags !== undefined) updates.tags = body.tags;

    // Update package metadata
    if (Object.keys(updates).length > 0) {
      await sql`
        UPDATE lca_packages
        SET ${sql(updates)}
        WHERE id = ${id}
      `;
    }

    // Update layers if provided
    if (body.layers) {
      // Delete existing layers
      await sql`DELETE FROM lca_package_layers WHERE package_id = ${id}`;

      // Calculate new total thickness
      const totalThickness = body.layers.reduce(
        (sum: number, layer: CreatePackageLayerInput) => sum + (layer.thickness || 0),
        0
      );

      await sql`
        UPDATE lca_packages
        SET total_thickness = ${totalThickness}
        WHERE id = ${id}
      `;

      // Insert new layers
      for (const layer of body.layers) {
        await sql`
          INSERT INTO lca_package_layers (
            package_id, position, material_id, thickness,
            coverage, layer_function, notes
          ) VALUES (
            ${id},
            ${layer.position},
            ${layer.material_id},
            ${layer.thickness},
            ${layer.coverage ?? 1.0},
            ${layer.layer_function || null},
            ${layer.notes || null}
          )
        `;
      }
    }

    // Fetch updated package
    const result = await sql`SELECT * FROM lca_packages WHERE id = ${id}`;

    return NextResponse.json({
      success: true,
      data: { package: result[0] }
    });

  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update package' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lca/packages/[id] - Delete package
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const sql = getDbConnection();

    // Check ownership
    const ownerCheck = await sql`
      SELECT user_id FROM lca_packages WHERE id = ${id}
    `;

    if (ownerCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    if (ownerCheck[0].user_id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this package' },
        { status: 403 }
      );
    }

    // Delete package (layers will cascade)
    await sql`DELETE FROM lca_packages WHERE id = ${id}`;

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}
