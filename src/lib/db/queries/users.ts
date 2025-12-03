/**
 * Database queries for user_accounts table
 */

import { getDbConnection } from '../connection';

export interface UserAccount {
  id: number;
  org_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number): Promise<UserAccount | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, org_id, email, name, avatar_url, role, is_active,
           email_verified_at, last_login_at, created_at, updated_at
    FROM user_accounts
    WHERE id = ${userId}
    AND is_active = true
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserAccount | null> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, org_id, email, name, avatar_url, role, is_active,
           email_verified_at, last_login_at, created_at, updated_at
    FROM user_accounts
    WHERE LOWER(email) = LOWER(${email})
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all users in an organization
 */
export async function getUsersByOrgId(orgId: string): Promise<UserAccount[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, org_id, email, name, avatar_url, role, is_active,
           email_verified_at, last_login_at, created_at, updated_at
    FROM user_accounts
    WHERE org_id = ${orgId}
    ORDER BY created_at DESC
  `;

  return result;
}

/**
 * Get active users in an organization
 */
export async function getActiveUsersByOrgId(orgId: string): Promise<UserAccount[]> {
  const db = getDbConnection();

  const result = await db`
    SELECT id, org_id, email, name, avatar_url, role, is_active,
           email_verified_at, last_login_at, created_at, updated_at
    FROM user_accounts
    WHERE org_id = ${orgId}
    AND is_active = true
    ORDER BY created_at DESC
  `;

  return result;
}

/**
 * Update user's last login timestamp
 */
export async function updateUserLastLogin(userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE user_accounts
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
}

/**
 * Deactivate user account (soft delete)
 */
export async function deactivateUser(userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE user_accounts
    SET is_active = false,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
}

/**
 * Reactivate user account
 */
export async function reactivateUser(userId: number): Promise<void> {
  const db = getDbConnection();

  await db`
    UPDATE user_accounts
    SET is_active = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${userId}
  `;
}

/**
 * Check if user is admin in their organization
 */
export async function isUserAdmin(userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT role
    FROM user_accounts
    WHERE id = ${userId}
    AND is_active = true
  `;

  if (result.length === 0) return false;

  const role = result[0].role;
  return role === 'admin' || role === 'owner';
}

/**
 * Check if user is owner (platform-level admin)
 */
export async function isUserOwner(userId: number): Promise<boolean> {
  const db = getDbConnection();

  const result = await db`
    SELECT role
    FROM user_accounts
    WHERE id = ${userId}
    AND is_active = true
  `;

  if (result.length === 0) return false;

  return result[0].role === 'owner';
}
