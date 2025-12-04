/**
 * API routes for projects
 * GET /api/projects - List user's projects
 * POST /api/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import {
  getUserProjects,
  getUserPinnedProjects,
  getUserRecentProjects,
} from '@/lib/db/queries/projects';

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'pinned', 'recent'

    let projects;

    switch (filter) {
      case 'pinned':
        projects = await getUserPinnedProjects(session.user.id);
        break;
      case 'recent':
        const limit = parseInt(searchParams.get('limit') || '5');
        projects = await getUserRecentProjects(session.user.id, limit);
        break;
      default:
        projects = await getUserProjects(session.user.id);
    }

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, project_number, settings = {}, is_template = false } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    const db = getDbConnection();

    // Create project
    const projectResult = await db`
      INSERT INTO project_projects (org_id, name, description, project_number, settings, is_template)
      VALUES (${session.user.org_id}, ${name.trim()}, ${description || null}, ${project_number || null}, ${JSON.stringify(settings)}, ${is_template})
      RETURNING id, org_id, name, description, project_number, settings, metadata, status, is_template, created_at, updated_at, last_accessed_at
    `;

    const project = projectResult[0];

    // Add creator as project member
    await db`
      INSERT INTO project_members (project_id, user_id, role, permissions)
      VALUES (
        ${project.id},
        ${session.user.id},
        'creator',
        ${JSON.stringify({
          can_edit: true,
          can_delete: true,
          can_manage_members: true,
          can_manage_files: true,
          can_view_analytics: true,
        })}
      )
    `;

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
