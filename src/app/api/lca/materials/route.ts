import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/materials
 *
 * Search and filter LCA materials (EPD data)
 *
 * Query params:
 * - search: string (search in name_nl, name_en, name_de)
 * - category: string (filter by category: insulation, concrete, timber, etc.)
 * - min_quality: number (1-5, minimum quality rating)
 * - dutch_only: boolean (default: true, only Dutch-available materials)
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name_nl": "string",
 *       "name_en": "string",
 *       "category": "string",
 *       "subcategory": "string",
 *       "density": number,
 *       "declared_unit": "string",
 *       "gwp_a1_a3": number,
 *       "quality_rating": number,
 *       "is_generic": boolean,
 *       "epd_validity": "timestamp"
 *     }
 *   ],
 *   "pagination": {
 *     "limit": number,
 *     "offset": number,
 *     "total": number
 *   }
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
    const categoriesOnly = searchParams.get('categories_only') === 'true';
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const minQuality = searchParams.get('min_quality');
    const dutchOnly = searchParams.get('dutch_only') !== 'false'; // Default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const sql = getDbConnection();

    // If categories_only, return just the list of categories
    if (categoriesOnly) {
      const categories = await sql`
        SELECT DISTINCT category
        FROM lca_materials
        WHERE dutch_availability = true
        ORDER BY category
      `;

      return NextResponse.json({
        success: true,
        data: {
          categories: categories.map(c => c.category)
        }
      });
    }

    // 3. Build WHERE conditions using Neon's tagged template syntax
    const conditions = [];

    if (dutchOnly) {
      conditions.push(sql`dutch_availability = true`);
    }

    if (category) {
      conditions.push(sql`category = ${category}`);
    }

    if (minQuality) {
      const minQualityNum = parseInt(minQuality);
      conditions.push(sql`quality_rating >= ${minQualityNum}`);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(sql`(name_nl ILIKE ${searchPattern} OR name_en ILIKE ${searchPattern} OR name_de ILIKE ${searchPattern})`);
    }

    // 4. Count total results
    let countResult;
    if (conditions.length > 0) {
      countResult = await sql`
        SELECT COUNT(*) as total
        FROM lca_materials
        WHERE (${conditions.length > 0 ? sql`true` : sql`true`})
        ${dutchOnly ? sql`AND dutch_availability = true` : sql``}
        ${category ? sql`AND category = ${category}` : sql``}
        ${minQuality ? sql`AND quality_rating >= ${parseInt(minQuality)}` : sql``}
        ${search ? sql`AND (name_nl ILIKE ${`%${search}%`} OR name_en ILIKE ${`%${search}%`} OR name_de ILIKE ${`%${search}%`})` : sql``}
      `;
    } else {
      countResult = await sql`SELECT COUNT(*) as total FROM lca_materials`;
    }

    const total = parseInt(String(countResult[0].total));

    // 5. Fetch materials
    const materials = await sql`
      SELECT
        id,
        oekobaudat_uuid,
        name_de,
        name_en,
        name_nl,
        category,
        subcategory,
        material_type,
        density,
        bulk_density,
        declared_unit,
        conversion_to_kg,
        gwp_a1_a3,
        gwp_a4,
        gwp_a5,
        gwp_c1,
        gwp_c2,
        gwp_c3,
        gwp_c4,
        gwp_d,
        biogenic_carbon,
        reference_service_life,
        quality_rating,
        is_generic,
        is_verified,
        epd_validity,
        epd_owner,
        region
      FROM lca_materials
      WHERE true
      ${dutchOnly ? sql`AND dutch_availability = true` : sql``}
      ${category ? sql`AND category = ${category}` : sql``}
      ${minQuality ? sql`AND quality_rating >= ${parseInt(minQuality)}` : sql``}
      ${search ? sql`AND (name_nl ILIKE ${`%${search}%`} OR name_en ILIKE ${`%${search}%`} OR name_de ILIKE ${`%${search}%`})` : sql``}
      ORDER BY quality_rating DESC, name_nl ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // 6. Return results
    return NextResponse.json({
      success: true,
      data: {
        materials,
        pagination: {
          limit,
          offset,
          total
        }
      }
    });

  } catch (error: unknown) {
    console.error('LCA Materials Search Error:', error);
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
 * GET /api/lca/materials/categories
 *
 * Get list of available material categories with counts
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "category": "insulation",
 *       "count": 245,
 *       "avg_gwp": 12.5
 *     }
 *   ]
 * }
 */
export async function POST(_request: NextRequest) {
  try {
    // This POST endpoint is used for getting categories (avoiding route naming conflict)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDbConnection();

    const categories = await sql`
      SELECT
        category,
        COUNT(*) as count,
        AVG(gwp_a1_a3) as avg_gwp,
        AVG(quality_rating) as avg_quality
      FROM lca_materials
      WHERE dutch_availability = true
      GROUP BY category
      ORDER BY category
    `;

    return NextResponse.json({
      success: true,
      data: categories
    });

  } catch (error: unknown) {
    console.error('LCA Categories Error:', error);
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
