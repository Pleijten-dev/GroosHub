import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * GET /api/lca/materials/benchmark
 *
 * Get benchmark statistics for a material category including alternatives
 *
 * Query params:
 * - category: string (required) - Material category to benchmark
 * - material_id: string (optional) - Current material to find alternatives for
 * - limit: number (default: 5) - Number of alternatives to return
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "category": "insulation",
 *     "stats": {
 *       "min_gwp": 0.8,
 *       "max_gwp": 45.2,
 *       "avg_gwp": 12.5,
 *       "median_gwp": 8.3,
 *       "count": 156,
 *       "percentiles": {
 *         "p25": 4.2,
 *         "p75": 18.5,
 *         "p90": 32.1
 *       }
 *     },
 *     "alternatives": [
 *       {
 *         "id": "uuid",
 *         "name_nl": "...",
 *         "name_en": "...",
 *         "name_de": "...",
 *         "gwp_a1_a3": 2.1,
 *         "quality_rating": 4,
 *         "declared_unit": "kg",
 *         "density": 100
 *       }
 *     ]
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
    const category = searchParams.get('category');
    const materialId = searchParams.get('material_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10);

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 3. Get category statistics
    const statsResult = await sql`
      SELECT
        COUNT(*) as count,
        MIN(gwp_a1_a3) as min_gwp,
        MAX(gwp_a1_a3) as max_gwp,
        AVG(gwp_a1_a3) as avg_gwp,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY gwp_a1_a3) as p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gwp_a1_a3) as median_gwp,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY gwp_a1_a3) as p75,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY gwp_a1_a3) as p90
      FROM lca_materials
      WHERE category = ${category}
        AND dutch_availability = true
        AND gwp_a1_a3 IS NOT NULL
        AND gwp_a1_a3 > 0
    `;

    const stats = statsResult[0];

    // 4. Get current material GWP if provided
    let currentGwp: number | null = null;
    if (materialId) {
      const currentMaterial = await sql`
        SELECT gwp_a1_a3
        FROM lca_materials
        WHERE id = ${materialId}
      `;
      if (currentMaterial.length > 0) {
        currentGwp = currentMaterial[0].gwp_a1_a3;
      }
    }

    // 5. Get lower-carbon alternatives
    let alternatives: unknown[] = [];
    if (currentGwp !== null) {
      // Find materials with lower GWP in the same category
      alternatives = await sql`
        SELECT
          id,
          name_nl,
          name_en,
          name_de,
          gwp_a1_a3,
          quality_rating,
          declared_unit,
          density,
          subcategory,
          is_generic
        FROM lca_materials
        WHERE category = ${category}
          AND dutch_availability = true
          AND gwp_a1_a3 IS NOT NULL
          AND gwp_a1_a3 > 0
          AND gwp_a1_a3 < ${currentGwp}
          AND id != ${materialId}
        ORDER BY gwp_a1_a3 ASC, quality_rating DESC
        LIMIT ${limit}
      `;
    } else {
      // Just get the lowest GWP materials in category
      alternatives = await sql`
        SELECT
          id,
          name_nl,
          name_en,
          name_de,
          gwp_a1_a3,
          quality_rating,
          declared_unit,
          density,
          subcategory,
          is_generic
        FROM lca_materials
        WHERE category = ${category}
          AND dutch_availability = true
          AND gwp_a1_a3 IS NOT NULL
          AND gwp_a1_a3 > 0
        ORDER BY gwp_a1_a3 ASC, quality_rating DESC
        LIMIT ${limit}
      `;
    }

    // 6. Return results
    return NextResponse.json({
      success: true,
      data: {
        category,
        stats: {
          count: parseInt(String(stats.count)),
          min_gwp: parseFloat(stats.min_gwp) || 0,
          max_gwp: parseFloat(stats.max_gwp) || 0,
          avg_gwp: parseFloat(stats.avg_gwp) || 0,
          median_gwp: parseFloat(stats.median_gwp) || 0,
          percentiles: {
            p25: parseFloat(stats.p25) || 0,
            p75: parseFloat(stats.p75) || 0,
            p90: parseFloat(stats.p90) || 0,
          },
        },
        currentMaterialGwp: currentGwp,
        alternatives,
      },
    });
  } catch (error: unknown) {
    console.error('LCA Materials Benchmark Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
