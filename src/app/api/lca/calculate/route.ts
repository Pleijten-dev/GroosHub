import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import { calculateProjectLCA } from '@/features/lca/utils/lca-calculator';

/**
 * POST /api/lca/calculate
 *
 * Triggers LCA calculation for a project
 *
 * Request body:
 * {
 *   "projectId": "uuid"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "a1_a3": number,
 *     "a4": number,
 *     "a5": number,
 *     "b4": number,
 *     "c1_c2": number,
 *     "c3": number,
 *     "c4": number,
 *     "d": number,
 *     "total_a_to_c": number,
 *     "total_with_d": number,
 *     "normalized": { ... }
 *   }
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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing projectId' },
        { status: 400 }
      );
    }

    // 3. Verify project ownership
    const sql = getDbConnection();
    const projectCheck = await sql`
      SELECT user_id FROM lca_projects WHERE id = ${projectId}
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

    // 4. Perform calculation
    const result = await calculateProjectLCA(projectId);

    // 5. Return results
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: unknown) {
    console.error('LCA Calculation Error:', error);
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
