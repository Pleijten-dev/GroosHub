import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/packages/for-quick-start
 *
 * Returns packages organized by category, optimized for Quick Start form
 *
 * Query parameters:
 * - construction_system: Filter packages by construction system
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     exterior_wall: [...packages],
 *     roof: [...packages],
 *     floor: [...packages],
 *     windows: [...packages],
 *     foundation: [...packages]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const constructionSystem = searchParams.get('construction_system');

    const sql = getDbConnection();

    // Categories we need for Quick Start
    const categories = [
      'exterior_wall',
      'roof',
      'floor',
      'windows',
      'foundation'
    ];

    const packagesByCategory: Record<string, unknown[]> = {};

    for (const category of categories) {
      let result;

      if (constructionSystem) {
        // Filter by construction system if provided
        result = await sql`
          SELECT
            p.*,
            COUNT(pl.id) as layer_count
          FROM lca_packages p
          LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
          WHERE p.category = ${category}
            AND p.is_public = true
            AND (p.construction_system = ${constructionSystem} OR p.construction_system IS NULL)
          GROUP BY p.id
          ORDER BY p.usage_count DESC, p.name ASC
          LIMIT 20
        `;
      } else {
        // No construction system filter - get all public packages
        result = await sql`
          SELECT
            p.*,
            COUNT(pl.id) as layer_count
          FROM lca_packages p
          LEFT JOIN lca_package_layers pl ON pl.package_id = p.id
          WHERE p.category = ${category}
            AND p.is_public = true
          GROUP BY p.id
          ORDER BY p.usage_count DESC, p.name ASC
          LIMIT 20
        `;
      }

      packagesByCategory[category] = result;
    }

    return NextResponse.json({
      success: true,
      data: packagesByCategory
    });

  } catch (error) {
    console.error('Error fetching packages for quick start:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
