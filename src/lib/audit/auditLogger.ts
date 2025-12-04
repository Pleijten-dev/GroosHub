/**
 * Audit Logging System
 * Tracks security-relevant actions for compliance and monitoring
 */

import { getDbConnection } from '@/lib/db/connection';

export interface AuditLogEntry {
  userId?: number;
  orgId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = getDbConnection();

    await db`
      INSERT INTO audit_logs (
        user_id, org_id, action, entity_type, entity_id,
        ip_address, user_agent, request_method, request_path,
        status_code, error_message, metadata
      )
      VALUES (
        ${entry.userId || null},
        ${entry.orgId || null},
        ${entry.action},
        ${entry.entityType},
        ${entry.entityId || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.requestMethod || null},
        ${entry.requestPath || null},
        ${entry.statusCode || null},
        ${entry.errorMessage || null},
        ${JSON.stringify(entry.metadata || {})}
      )
    `;
  } catch (error) {
    // Don't throw errors from audit logging - log to console instead
    console.error('Failed to log audit event:', error, entry);
  }
}

/**
 * Common audit actions
 */
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',

  // CRUD operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',

  // Permissions
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  ACCESS_DENIED: 'access_denied',

  // Projects
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  PROJECT_SHARED: 'project_shared',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',

  // Files
  FILE_UPLOADED: 'file_uploaded',
  FILE_DOWNLOADED: 'file_downloaded',
  FILE_DELETED: 'file_deleted',

  // Organizations
  ORG_CREATED: 'org_created',
  ORG_UPDATED: 'org_updated',
  ORG_DELETED: 'org_deleted'
} as const;

/**
 * Entity types
 */
export const ENTITY_TYPES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  PROJECT: 'project',
  CHAT: 'chat',
  MESSAGE: 'message',
  FILE: 'file',
  LOCATION: 'location',
  LCA: 'lca'
} as const;

/**
 * Extract IP address from request headers
 */
export function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return real || undefined;
}

/**
 * Create audit log helper for API routes
 */
export function createAuditLogger(request: Request, userId?: number, orgId?: string) {
  const ipAddress = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  const url = new URL(request.url);
  const requestMethod = request.method;
  const requestPath = url.pathname;

  return {
    log: (params: Omit<AuditLogEntry, 'userId' | 'orgId' | 'ipAddress' | 'userAgent' | 'requestMethod' | 'requestPath'>) => {
      return logAuditEvent({
        ...params,
        userId,
        orgId,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath
      });
    },

    logSuccess: (action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) => {
      return logAuditEvent({
        userId,
        orgId,
        action,
        entityType,
        entityId,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        statusCode: 200,
        metadata
      });
    },

    logError: (action: string, entityType: string, statusCode: number, errorMessage: string, metadata?: Record<string, unknown>) => {
      return logAuditEvent({
        userId,
        orgId,
        action,
        entityType,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        statusCode,
        errorMessage,
        metadata
      });
    }
  };
}
