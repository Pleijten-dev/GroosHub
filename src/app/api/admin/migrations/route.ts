/**
 * Database Migration API
 * Admin-only endpoint to check and run migrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  checkWmsGradingColumnExists,
  ensureWmsGradingMigration
} from '@/lib/db/migrations/migrationHelper';

/**
 * GET /api/admin/migrations
 * Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (you can add role check here)
    // For now, any authenticated user can check status

    const wmsGradingExists = await checkWmsGradingColumnExists();

    return NextResponse.json({
      success: true,
      migrations: {
        wms_grading_data: {
          name: 'WMS Grading Data Column',
          status: wmsGradingExists ? 'applied' : 'pending',
          description: 'Adds wms_grading_data JSONB column to location_snapshots table'
        }
      }
    });

  } catch (error) {
    console.error('Error checking migrations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/migrations
 * Run pending migrations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    // TODO: Add proper role check when role system is implemented
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const body = await request.json().catch(() => ({}));
    const { auto = true } = body;

    if (!auto) {
      return NextResponse.json({
        success: false,
        error: 'Manual migration confirmation required. Set auto: true to proceed.'
      }, { status: 400 });
    }

    // Run WMS grading migration
    const result = await ensureWmsGradingMigration();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      migrationRan: result.migrationRan
    });

  } catch (error) {
    console.error('Error running migrations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run migrations' },
      { status: 500 }
    );
  }
}
