import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import type { PackageSearchParams } from '@/features/lca/types';

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
      category: searchParams.get('category') as any,
      construction_system: searchParams.get('construction_system') as any,
      insulation_level: searchParams.get('insulation_level') as any,
      is_public: searchParams.get('is_public') === 'true',
      is_template: searchParams.get('is_template') === 'true',
      user_only: searchParams.get('user_only') === 'true',
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sort_by: (searchParams.get('sort_by') as any) || 'name',
      sort_order: (searchParams.get('sort_order') as any) || 'asc'
    };

    const sql = getDbConnection();

    // Build WHERE conditions
    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Public packages OR user's own packages
    if (params.user_only) {
      conditions.push(`user_id = $${queryParams.length + 1}`);
      queryParams.push(session.user.id);
    } else {
      conditions.push(`(is_public = true OR user_id = $${queryParams.length + 1})`);
      queryParams.push(session.user.id);
    }

    if (params.category) {
      conditions.push(`category = $${queryParams.length + 1}`);
      queryParams.push(params.category);
    }

    if (params.construction_system) {
      conditions.push(`construction_system = $${queryParams.length + 1}`);
      queryParams.push(params.construction_system);
    }

    if (params.insulation_level) {
      conditions.push(`insulation_level = $${queryParams.length + 1}`);
      queryParams.push(params.insulation_level);
    }

    if (params.is_template !== undefined) {
      conditions.push(`is_template = $${queryParams.length + 1}`);
      queryParams.push(params.is_template);
    }

    if (params.search) {
      conditions.push(`(
        name ILIKE $${queryParams.length + 1} OR
        description ILIKE $${queryParams.length + 1} OR
        $${queryParams.length + 2} = ANY(tags)
      )`);
      queryParams.push(`%${params.search}%`, params.search);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count total
    const countResult = await sql.unsafe(`
      SELECT COUNT(*) as total
      FROM lca_packages
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult[0].total);

    // Fetch packages with layer count
    const packagesResult = await sql.unsafe(`
      SELECT
        p.*,
        COUNT(pl.id) as layer_count
      FROM lca_packages p
      LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.${params.sort_by} ${params.sort_order}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, params.limit, params.offset]);

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
      (sum: number, layer: any) => sum + (layer.thickness || 0),
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
