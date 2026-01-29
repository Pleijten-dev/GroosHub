# Security and User Management Documentation

This document provides comprehensive documentation for all security features, authentication, authorization, and user management in GroosHub.

**Last Updated**: 2026-01-29

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [User Management](#user-management)
4. [Password Security](#password-security)
5. [Authorization & Access Control](#authorization--access-control)
6. [Security Features](#security-features)
7. [Environment Variables](#environment-variables)
8. [File Reference](#file-reference)

---

## Overview

GroosHub implements a comprehensive security architecture with:

- **NextAuth v5** for authentication with JWT-based sessions
- **bcrypt** password hashing with 10 salt rounds
- **Multi-tenant** organization structure with role-based access control
- **First-login password reset** for admin-created users
- **Audit logging** for security events
- **Rate limiting** for API protection
- **AES-256-GCM encryption** for sensitive data

---

## Authentication System

### Login/Logout Mechanism

- **Framework:** NextAuth v5 (beta.30) with Credentials provider
- **Email handling:** Case-insensitive (converted to lowercase)
- **Password handling:** Trimmed before comparison
- **Session strategy:** JWT-based (not database sessions)

### Session Management

| Setting | Value | Description |
|---------|-------|-------------|
| Strategy | JWT | Stateless token-based sessions |
| Max Age | 30 days | Session expiration time |
| Secret | `NEXTAUTH_SECRET` | Environment variable for signing |

**Session Object Contents:**
```typescript
{
  user: {
    id: number;           // User ID from database
    email: string;        // User email
    name: string;         // Display name
    role: string;         // 'user' | 'admin' | 'owner'
    org_id: string;       // Organization UUID
    must_change_password: boolean;  // First-login flag
  }
}
```

### Login Flow

1. User submits email and password
2. Email is trimmed and lowercased
3. User is queried from `user_accounts` table (case-insensitive email match)
4. `is_active` flag is checked (inactive accounts cannot log in)
5. Password is verified with bcrypt
6. JWT token is created with user data
7. If `must_change_password` is true, user is redirected to change password page

### Logout Flow

1. NextAuth `signOut()` is called
2. JWT cookie is cleared
3. User is redirected to login page

---

## User Management

### Admin Panel

Located at `/{locale}/admin`, the admin panel provides:

- **Users Tab:** Create, edit, and delete users
- **AI Memory Tab:** Manage organization AI memory

Access restricted to users with `admin` or `owner` role.

### Role System

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular user | Access own projects, no admin panel |
| `admin` | Organization admin | Manage users in own organization, access admin panel |
| `owner` | Platform admin | Manage all organizations and users |

### User Operations

#### Create User
- **Endpoint:** `POST /api/admin/users`
- **Required fields:** `name`, `email`, `password`, `role`
- **Automatic settings:**
  - `must_change_password` = `true` (user must change password on first login)
  - `org_id` = admin's organization (unless owner specifies different)
- **Password:** Hashed with bcrypt (10 rounds)

#### Update User
- **Endpoint:** `PUT /api/admin/users`
- **Fields:** `id`, `name`, `email`, `role`, `password` (optional)
- **Password reset behavior:** If password is provided, `must_change_password` is set to `true`

#### Delete User
- **Endpoint:** `DELETE /api/admin/users?id={userId}`
- **Type:** Hard delete (not soft delete)
- **Restriction:** Admins cannot delete themselves

#### List Users
- **Endpoint:** `GET /api/admin/users`
- **Admins:** See only users in their organization
- **Owners:** See all users across all organizations

### Organization/Multi-tenant Structure

```
org_organizations
├── user_accounts (org_id)
├── project_projects (org_id)
│   └── project_members (project_id, user_id)
└── domain_memories (org_id)
```

- Each user belongs to exactly one organization
- Users can only see/manage resources within their organization
- Owners can access all organizations

---

## Password Security

### Password Requirements

All passwords must meet these complexity requirements:

| Requirement | Validation |
|-------------|------------|
| Minimum length | 8 characters |
| Uppercase letter | At least one (A-Z) |
| Lowercase letter | At least one (a-z) |
| Number | At least one (0-9) |

**Validation Regex:**
```javascript
const hasUppercase = /[A-Z]/.test(password);
const hasLowercase = /[a-z]/.test(password);
const hasNumber = /[0-9]/.test(password);
```

Validation is enforced on both client-side and server-side.

### Password Hashing

- **Algorithm:** bcrypt
- **Salt rounds:** 10
- **Implementation:** `bcryptjs` library

```javascript
// Hashing
const hashedPassword = await bcrypt.hash(password, 10);

// Verification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### First-Login Password Reset

When an admin creates a new user or resets a user's password:

1. `must_change_password` is set to `true` in the database
2. On login, the JWT includes `must_change_password: true`
3. Page layouts (server components) check this flag via `auth()` call
4. User is redirected to `/change-password` if flag is true
5. User cannot access any other page until password is changed
6. After successful password change:
   - `must_change_password` is set to `false`
   - User is signed out
   - User logs in with new password

**Why sign out after password change?**
- Ensures the JWT is refreshed with `must_change_password: false`
- Confirms user remembers their new password

**Note:** The `must_change_password` check is handled in page layouts (server-side), not in the proxy. This allows for proper server-side auth checks with database access.

### Password Change API

**Endpoint:** `POST /api/auth/change-password`

**Request:**
```json
{
  "newPassword": "SecurePass123"
}
```

**Validation:**
1. User must be authenticated
2. Password must meet complexity requirements
3. Password is hashed and stored
4. `must_change_password` is set to `false`

---

## Authorization & Access Control

### Route Protection (Proxy)

Route protection is handled by `src/proxy.ts` (Next.js 16's proxy, formerly middleware):

| Route Type | Access Rule |
|------------|-------------|
| `/api/*` | Skipped by proxy (API routes handle their own auth) |
| `/nl/login`, `/en/login` | Public routes |
| `/nl/change-password`, `/en/change-password` | Public routes |
| All other page routes | Requires session cookie |

**How it works:**
1. Proxy checks for `authjs.session-token` cookie (or `__Secure-authjs.session-token` on HTTPS)
2. If no cookie, redirects to `/{locale}/login` with `callbackUrl`
3. If cookie exists, allows request through
4. Advanced checks (like `must_change_password`) are done server-side in page layouts

**Important:** The proxy only checks cookie existence, not validity. Full session validation happens server-side via `auth()` calls.

See `docs/NEXTJS-ROUTING-AND-API.md` for detailed proxy configuration.

### API Endpoint Protection

All protected API endpoints follow this pattern:

```typescript
export async function POST(request: NextRequest) {
  const session = await auth();

  // 1. Check authentication
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check authorization (role-based)
  if (session.user.role !== 'admin' && session.user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Check organization isolation
  if (session.user.org_id !== resource.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... proceed with operation
}
```

### Project Access Control

Project membership is managed through `project_members` table:

| Role | Permissions |
|------|-------------|
| `creator` | Full access: edit, delete, manage members/files, view analytics |
| `admin` | Edit, manage members/files, view analytics (no delete) |
| `member` | Edit with limited permissions |
| `viewer` | Read-only access |

**Permission Checks:**
```typescript
// Check if user is project member
const isMember = await isProjectMember(userId, projectId);

// Check if user is project admin
const isAdmin = await isProjectAdmin(userId, projectId);
```

---

## Security Features

### Rate Limiting

In-memory rate limiting protects against abuse:

| Configuration | Limit | Window |
|---------------|-------|--------|
| LOGIN | 5 requests | 15 minutes |
| REGISTER | 3 requests | 1 hour |
| API_DEFAULT | 60 requests | 1 minute |
| API_STRICT | 10 requests | 1 minute |
| CHAT_MESSAGE | 30 requests | 1 minute |
| FILE_UPLOAD | 10 requests | 1 minute |
| PROJECT_CREATE | 5 requests | 1 minute |

**Note:** For production distributed systems, consider using Redis instead of in-memory storage.

### Audit Logging

Security events are logged to the `audit_logs` table:

**Logged Information:**
- User ID and Organization ID
- Action type (LOGIN, LOGOUT, PASSWORD_CHANGED, CREATE, UPDATE, DELETE)
- Entity type and ID
- IP address (from `X-Forwarded-For` or `X-Real-IP` headers)
- User agent
- HTTP method and request path
- Response status code
- Error messages
- Custom metadata

**Usage:**
```typescript
import { auditLog } from '@/lib/audit/auditLogger';

await auditLog({
  userId: session.user.id,
  orgId: session.user.org_id,
  action: 'PASSWORD_CHANGED',
  entityType: 'user',
  entityId: session.user.id.toString(),
  request,
  statusCode: 200,
});
```

### Data Encryption

Sensitive data can be encrypted using AES-256-GCM:

```typescript
import { encryptMessage, decryptMessage } from '@/lib/encryption';

// Encrypt
const encrypted = encryptMessage(plaintext, orgId);

// Decrypt
const decrypted = decryptMessage(encrypted, orgId);
```

- Organization-specific encryption keys derived from master key
- Backward compatible with unencrypted data
- Requires `ENCRYPTION_MASTER_KEY` environment variable

### SQL Injection Prevention

All database queries use parameterized queries:

```typescript
// Safe - parameterized query
const result = await db`
  SELECT * FROM user_accounts WHERE email = ${email}
`;

// Never do this - vulnerable to SQL injection
// const result = await db`SELECT * FROM users WHERE email = '${email}'`;
```

### CSRF Protection

NextAuth v5 provides built-in CSRF protection for all authentication endpoints.

### Cron Job Authentication

Protected cron endpoints support two authentication methods:

1. **Header-based:** `x-cron-secret` header matching `CRON_SECRET` env var
2. **Session-based:** Authenticated admin session

Protected endpoints:
- `POST /api/files/cleanup`
- `POST /api/memory/consolidate`
- `POST /api/summaries/inactivity`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_SECRET` | Yes | Secret for signing JWT tokens (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Application URL for redirects |
| `ENCRYPTION_MASTER_KEY` | No | Master key for AES-256-GCM encryption |
| `CRON_SECRET` | No | Secret for cron job authentication |
| `POSTGRES_URL` | Yes | Database connection (pooled) |
| `POSTGRES_URL_NON_POOLING` | Yes | Database connection (for transactions) |

---

## File Reference

| Component | File Path |
|-----------|-----------|
| **Route Protection** | |
| Proxy (route protection) | `src/proxy.ts` |
| Next.js config (API rewrites) | `next.config.ts` |
| **Authentication** | |
| Auth configuration | `src/lib/auth.config.ts` |
| Auth implementation | `src/lib/auth.ts` |
| Auth provider (client) | `src/lib/AuthProvider.tsx` |
| NextAuth route handler | `src/app/api/auth/[...nextauth]/route.ts` |
| **Password Management** | |
| Change password API | `src/app/api/auth/change-password/route.ts` |
| Change password page | `src/app/[locale]/change-password/page.tsx` |
| Change password form | `src/app/[locale]/change-password/ChangePasswordForm.tsx` |
| **Login** | |
| Login page | `src/app/[locale]/login/page.tsx` |
| Login form | `src/app/[locale]/login/LoginForm.tsx` |
| **Admin & User Management** | |
| Admin users API | `src/app/api/admin/users/route.ts` |
| Admin panel | `src/app/[locale]/admin/AdminPanel.tsx` |
| User database queries | `src/lib/db/queries/users.ts` |
| **Security Utilities** | |
| Audit logger | `src/lib/audit/auditLogger.ts` |
| Rate limiting | `src/lib/middleware/rateLimit.ts` |
| Encryption utilities | `src/lib/encryption/index.ts` |
| Database schema | `src/lib/db/schema.sql` |

---

## Security Checklist

When deploying to production, ensure:

- [ ] `NEXTAUTH_SECRET` is set to a strong, unique value
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] Database connections use SSL
- [ ] Rate limiting is configured appropriately
- [ ] Audit logging is enabled
- [ ] All admin accounts have strong passwords
- [ ] Default/test accounts are removed
- [ ] HTTPS is enforced
- [ ] Security headers are configured (CSP, HSTS, etc.)
