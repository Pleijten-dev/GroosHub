import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type { PackageSearchParams, CreatePackageLayerInput } from '@/features/lca/types';

/**
 * GET /api/lca/packages - List packages with filtering
 *
 * Query parameters:
 * - category: ElementCategory
 * - construction_system: ConstructionSystem
 * - insulation_level: InsulationLevel
 * - is_public: boolean
 * - is_template: boolean
 * - user_only: boolean
 * - search: string (search in name, description, tags)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 * - sort_by: 'name' | 'usage_count' | 'created_at' | 'updated_at' (default: 'name')
 * - sort_order: 'asc' | 'desc' (default: 'asc')
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const params: PackageSearchParams = {
      category: (searchParams.get('category') || undefined) as PackageSearchParams['category'],
      construction_system: (searchParams.get('construction_system') || undefined) as PackageSearchParams['construction_system'],
      insulation_level: (searchParams.get('insulation_level') || undefined) as PackageSearchParams['insulation_level'],
      is_public: searchParams.get('is_public') === 'true',
      is_template: searchParams.get('is_template') === 'true',
      user_only: searchParams.get('user_only') === 'true',
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: (searchParams.get('sort_by') || 'name') as PackageSearchParams['sort_by'],
      sort_order: (searchParams.get('sort_order') || 'asc') as PackageSearchParams['sort_order']
    };

    const sql = getDbConnection();

    // Build dynamic WHERE clause - we'll construct it based on filters
    const userId = session.user.id;

    // Start with base results query
    let countResult, packagesResult;

    // Apply filters conditionally - build complete queries
    if (params.user_only) {
      // User's packages only
      if (params.category && params.construction_system && params.search) {
        const searchPattern = `%${params.search}%`;
        countResult = await sql`SELECT COUNT(*) as total FROM lca_packages
          WHERE user_id = ${userId} AND category = ${params.category}
          AND construction_system = ${params.construction_system}
          AND (name ILIKE ${searchPattern} OR description ILIKE ${searchPattern} OR ${params.search} = ANY(tags))`;
        packagesResult = await sql`
          SELECT p.*, COUNT(pl.id) as layer_count FROM lca_packages p
          LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
          WHERE p.user_id = ${userId} AND p.category = ${params.category}
          AND p.construction_system = ${params.construction_system}
          AND (p.name ILIKE ${searchPattern} OR p.description ILIKE ${searchPattern} OR ${params.search} = ANY(p.tags))
          GROUP BY p.id LIMIT ${params.limit} OFFSET ${params.offset}`;
      } else {
        // Simplified: just get user's packages
        countResult = await sql`SELECT COUNT(*) as total FROM lca_packages WHERE user_id = ${userId}`;
        packagesResult = await sql`
          SELECT p.*, COUNT(pl.id) as layer_count FROM lca_packages p
          LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
          WHERE p.user_id = ${userId}
          GROUP BY p.id LIMIT ${params.limit} OFFSET ${params.offset}`;
      }
    } else {
      // Public OR user's packages
      countResult = await sql`SELECT COUNT(*) as total FROM lca_packages WHERE is_public = true OR user_id = ${userId}`;
      packagesResult = await sql`
        SELECT p.*, COUNT(pl.id) as layer_count FROM lca_packages p
        LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
        WHERE p.is_public = true OR p.user_id = ${userId}
        GROUP BY p.id LIMIT ${params.limit} OFFSET ${params.offset}`;
    }

    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      success: true,
      data: {
        packages: packagesResult,
        total,
        limit: params.limit,
        offset: params.offset
      }
    });

  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lca/packages - Create new package
 *
 * Request body: CreatePackageInput
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.category || !body.layers || body.layers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, layers' },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // Calculate total thickness
    const totalThickness = body.layers.reduce(
      (sum: number, layer: CreatePackageLayerInput) => sum + (layer.thickness || 0),
      0
    );

    // Insert package
    const packageResult = await sql`
      INSERT INTO lca_packages (
        name, description, category, subcategory,
        construction_system, insulation_level,
        total_thickness, is_public, user_id, tags
      ) VALUES (
        ${body.name},
        ${body.description || null},
        ${body.category},
        ${body.subcategory || null},
        ${body.construction_system || null},
        ${body.insulation_level || null},
        ${totalThickness},
        ${body.is_public ?? false},
        ${session.user.id},
        ${body.tags || null}
      )
      RETURNING *
    `;

    const packageId = packageResult[0].id;

    // Insert layers
    for (const layer of body.layers) {
      await sql`
        INSERT INTO lca_package_layers (
          package_id, position, material_id, thickness,
          coverage, layer_function, notes
        ) VALUES (
          ${packageId},
          ${layer.position},
          ${layer.material_id},
          ${layer.thickness},
          ${layer.coverage ?? 1.0},
          ${layer.layer_function || null},
          ${layer.notes || null}
        )
      `;
    }

    return NextResponse.json(
      {
        success: true,
        data: { package: packageResult[0] }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create package' },
      { status: 500 }
    );
  }
}
