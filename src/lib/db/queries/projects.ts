/**
 * Database queries for project_projects and project_members tables
 */

import { getDbConnection } from '../connection';

export interface Project {
  id: string; // UUID
  org_id: string;
  name: string;
  description: string | null;
  project_number: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: string;
  is_template: boolean;
  is_pinned: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_accessed_at: Date;
}

export interface ProjectMember {
  id: string; // UUID
  project_id: string;
  user_id: number;
  role: string;
  permissions: Record<string, unknown>;
  invited_by_user_id: number | null;
  joined_at: Date;
  left_at: Date | null;
}

export interface ProjectWithMemberRole extends Project {
  user_role: string;
  user_permissions: Record<string, unknown>;
}

/**
 * Get project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, org_id, name, description, project_number, settings, metadata,
           status, is_template, is_pinned, deleted_at, created_at, updated_at, last_accessed_at
    FROM project_projects
    WHERE id = ${projectId}
    AND deleted_at IS NULL
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all projects for a user (with their role)
 */
export async function getUserProjects(userId: number): Promise<ProjectWithMemberRole[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      p.id, p.org_id, p.name, p.description, p.project_number, p.settings, p.metadata,
      p.status, p.is_template, p.is_pinned, p.deleted_at, p.created_at, p.updated_at, p.last_accessed_at,
      pm.role as user_role,
      pm.permissions as user_permissions
    FROM project_projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ${userId}
    AND p.deleted_at IS NULL
    AND pm.left_at IS NULL
    ORDER BY p.last_accessed_at DESC
  `;

  return result;
}

/**
 * Get pinned projects for a user
 */
export async function getUserPinnedProjects(userId: number): Promise<ProjectWithMemberRole[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      p.id, p.org_id, p.name, p.description, p.project_number, p.settings, p.metadata,
      p.status, p.is_template, p.is_pinned, p.deleted_at, p.created_at, p.updated_at, p.last_accessed_at,
      pm.role as user_role,
      pm.permissions as user_permissions
    FROM project_projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ${userId}
    AND p.deleted_at IS NULL
    AND p.is_pinned = true
    AND pm.left_at IS NULL
    ORDER BY p.name ASC
  `;

  return result;
}

/**
 * Get recent projects for a user (not pinned)
 */
export async function getUserRecentProjects(
  userId: number,
  limit: number = 5
): Promise<ProjectWithMemberRole[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT
      p.id, p.org_id, p.name, p.description, p.project_number, p.settings, p.metadata,
      p.status, p.is_template, p.is_pinned, p.deleted_at, p.created_at, p.updated_at, p.last_accessed_at,
      pm.role as user_role,
      pm.permissions as user_permissions
    FROM project_projects p
    INNER JOIN project_members pm ON p.id = pm.project_id
    WHERE pm.user_id = ${userId}
    AND p.deleted_at IS NULL
    AND p.is_pinned = false
    AND pm.left_at IS NULL
    ORDER BY p.last_accessed_at DESC
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Get all members of a project
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, project_id, user_id, role, permissions, invited_by_user_id, joined_at, left_at
    FROM project_members
    WHERE project_id = ${projectId}
    AND left_at IS NULL
    ORDER BY joined_at ASC
  `;

  return result;
}

/**
 * Check if user is member of project
 */
export async function isProjectMember(projectId: string, userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT id
    FROM project_members
    WHERE project_id = ${projectId}
    AND user_id = ${userId}
    AND left_at IS NULL
  `;

  return result.length > 0;
}

/**
 * Check if user is creator/admin of project
 */
export async function isProjectAdmin(projectId: string, userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT role
    FROM project_members
    WHERE project_id = ${projectId}
    AND user_id = ${userId}
    AND left_at IS NULL
  `;

  if (result.length === 0) return false;

  const role = result[0].role;
  return role === 'creator' || role === 'admin';
}

/**
 * Update project's last accessed timestamp
 */
export async function updateProjectLastAccessed(projectId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_projects
    SET last_accessed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
  `;
}

/**
 * Toggle project pin status
 */
export async function toggleProjectPin(projectId: string, isPinned: boolean): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_projects
    SET is_pinned = ${isPinned},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
  `;
}

/**
 * Soft delete project
 */
export async function softDeleteProject(projectId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_projects
    SET deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
  `;
}

/**
 * Restore soft deleted project (within 30 days)
 */
export async function restoreProject(projectId: string): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_projects
    SET deleted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${projectId}
    AND deleted_at > (CURRENT_TIMESTAMP - INTERVAL '30 days')
  `;
}

/**
 * Add member to project
 */
export async function addProjectMember(
  projectId: string,
  userId: number,
  role: string,
  invitedByUserId: number | null = null
): Promise<void> {
  const db = getDbConnection();

  await db`
    INSERT INTO project_members (project_id, user_id, role, invited_by_user_id)
    VALUES (${projectId}, ${userId}, ${role}, ${invitedByUserId})
  `;
}

/**
 * Remove member from project
 */
export async function removeProjectMember(projectId: string, userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_members
    SET left_at = CURRENT_TIMESTAMP
    WHERE project_id = ${projectId}
    AND user_id = ${userId}
  `;
}

/**
 * Update project member role
 */
export async function updateProjectMemberRole(
  projectId: string,
  userId: number,
  newRole: string
): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE project_members
    SET role = ${newRole}
    WHERE project_id = ${projectId}
    AND user_id = ${userId}
    AND left_at IS NULL
  `;
}

/**
 * Get project statistics
 */
export async function getProjectStats(projectId: string) {
  const db = getDbConnection();

  const result = await db`
    SELECT
      (SELECT COUNT(*) FROM project_members WHERE project_id = ${projectId} AND left_at IS NULL) as member_count,
      (SELECT COUNT(*) FROM file_uploads WHERE project_id = ${projectId} AND deleted_at IS NULL) as file_count,
      (SELECT COUNT(*) FROM chat_conversations WHERE project_id = ${projectId}) as chat_count,
      (SELECT COUNT(*) FROM location_snapshots WHERE project_id = ${projectId}) as location_snapshot_count,
      (SELECT COUNT(*) FROM lca_snapshots WHERE project_id = ${projectId}) as lca_snapshot_count
  `;

  return result[0];
}
