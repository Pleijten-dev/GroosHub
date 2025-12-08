# Security Documentation - GroosHub

> **Last Updated**: 2025-12-04
> **Version**: Phase 5 - Security & Encryption Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Message Encryption](#message-encryption)
3. [Audit Logging](#audit-logging)
4. [Rate Limiting](#rate-limiting)
5. [Setup Instructions](#setup-instructions)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

GroosHub implements enterprise-grade security features to protect sensitive data and ensure compliance with security standards. The system includes:

- **AES-256-GCM Encryption**: Authenticated encryption for chat messages
- **Audit Logging**: Comprehensive tracking of security-relevant actions
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Organization-Scoped Keys**: Per-organization key derivation for data isolation

---

## Message Encryption

### Overview

Chat messages can be encrypted at rest using AES-256-GCM (Galois/Counter Mode), which provides both confidentiality and authenticity. Encryption is organization-specific, ensuring data isolation between organizations.

### Encryption Algorithm

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes) - randomly generated per message
- **Salt Size**: 256 bits (32 bytes) - randomly generated per message
- **Auth Tag Size**: 128 bits (16 bytes)

### Setup

1. **Generate Master Key**:
   ```bash
   openssl rand -base64 32
   ```

2. **Add to Environment**:
   ```bash
   # .env.local
   ENCRYPTION_MASTER_KEY=<your_generated_key>
   ```

3. **Run Migration**:
   ```bash
   psql $POSTGRES_URL_NON_POOLING < src/lib/db/migrations/restructure/015_add_encryption_support.sql
   ```

### Usage

#### Encrypting Messages

```typescript
import { encryptMessage, encryptJSON } from '@/lib/encryption/messageEncryption';

// Encrypt text
const encrypted = encryptMessage('Hello World', organizationId);

// Encrypt JSON data
const encryptedData = encryptJSON({ userId: 123, data: 'sensitive' }, organizationId);
```

#### Decrypting Messages

```typescript
import { decryptMessage, decryptJSON } from '@/lib/encryption/messageEncryption';

// Decrypt text
const plaintext = decryptMessage(encrypted, organizationId);

// Decrypt JSON
const data = decryptJSON<MyType>(encryptedData, organizationId);
```

#### Chat Storage Integration

The chat storage system automatically handles encryption:

```typescript
import { saveChatMessage, loadChatMessages } from '@/lib/ai/chat-store';

// Save with encryption (if ENCRYPTION_MASTER_KEY is set)
await saveChatMessage(chatId, message, {
  modelId: 'gpt-4',
  orgId: user.org_id  // Required for encryption
});

// Load with automatic decryption
const messages = await loadChatMessages(chatId, user.org_id);
```

### Encrypted Data Format

Encrypted messages are stored as colon-separated hex strings:

```
<salt>:<iv>:<ciphertext>:<auth_tag>
```

Example:
```
a1b2c3...def:123456...789abc:fedcba...987654:abcdef...123456
```

### Key Management

#### Master Key Requirements

- **Length**: Minimum 32 bytes (256 bits) recommended
- **Randomness**: Use cryptographically secure random generator
- **Storage**: Store in environment variables, never in code
- **Backup**: Securely back up the key; lost keys = lost data
- **Rotation**: Plan for key rotation (requires re-encryption)

#### Per-Organization Keys

Organization-specific keys are derived from the master key using PBKDF2:

```typescript
// Pseudo-code
derivedKey = PBKDF2(masterKey + orgId, salt, 100000 iterations, SHA-256)
```

This ensures:
- Each organization has a unique encryption key
- Master key compromise doesn't immediately expose all data
- Keys can be revoked per organization

### Migration Strategy

Encryption is **opt-in** and **backward compatible**:

1. **Without ENCRYPTION_MASTER_KEY**: Messages stored unencrypted (default)
2. **With ENCRYPTION_MASTER_KEY**: New messages encrypted, old messages readable
3. **Database flag**: `content_encrypted` column tracks encryption status

To encrypt existing messages, create a background job:

```typescript
// Example migration script (not included)
async function encryptExistingMessages(orgId: string) {
  const messages = await db`
    SELECT id, content, content_json
    FROM chat_messages
    WHERE content_encrypted = false
  `;

  for (const msg of messages) {
    const encryptedContent = encryptMessage(msg.content, orgId);
    const encryptedJson = encryptMessage(msg.content_json, orgId);

    await db`
      UPDATE chat_messages
      SET content = ${encryptedContent},
          content_json = ${encryptedJson},
          content_encrypted = true
      WHERE id = ${msg.id}
    `;
  }
}
```

### Security Considerations

**✅ Strengths**:
- Industry-standard AES-256-GCM encryption
- Authenticated encryption (prevents tampering)
- Organization-specific key derivation
- Random IV per message (prevents pattern analysis)
- Backward compatible (no breaking changes)

**⚠️ Limitations**:
- Master key stored in environment (consider HSM for production)
- No automatic key rotation
- Metadata not encrypted (sender, recipient, timestamp)
- Search on encrypted content not supported

**🔐 Best Practices**:
- Use a Hardware Security Module (HSM) in production
- Implement key rotation policy
- Encrypt backups
- Monitor decryption failures
- Implement access controls on encryption keys

---

## Audit Logging

### Overview

The audit logging system tracks all security-relevant actions for compliance, monitoring, and incident response.

### Database Schema

**Table**: `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | INTEGER | User who performed action |
| org_id | UUID | Organization context |
| action | VARCHAR(100) | Action type (e.g., 'login', 'delete') |
| entity_type | VARCHAR(100) | Entity affected (e.g., 'project', 'file') |
| entity_id | VARCHAR(255) | ID of affected entity |
| ip_address | INET | Client IP address |
| user_agent | TEXT | Client user agent |
| request_method | VARCHAR(10) | HTTP method |
| request_path | TEXT | Request URL path |
| status_code | INTEGER | HTTP status code |
| error_message | TEXT | Error message if failed |
| metadata | JSONB | Additional context |
| created_at | TIMESTAMP | Event timestamp |

### Setup

1. **Run Migration**:
   ```bash
   psql $POSTGRES_URL_NON_POOLING < src/lib/db/migrations/restructure/016_create_audit_logs.sql
   ```

### Usage

#### Basic Logging

```typescript
import { logAuditEvent, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit/auditLogger';

await logAuditEvent({
  userId: 123,
  orgId: 'org-uuid',
  action: AUDIT_ACTIONS.PROJECT_CREATED,
  entityType: ENTITY_TYPES.PROJECT,
  entityId: 'project-uuid',
  ipAddress: '192.168.1.1',
  statusCode: 200,
  metadata: { projectName: 'My Project' }
});
```

#### API Route Integration

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAuditLogger, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit/auditLogger';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  const audit = createAuditLogger(request, session.user.id, session.user.orgId);

  try {
    // Your logic here
    const result = await createProject(data);

    // Log success
    await audit.logSuccess(
      AUDIT_ACTIONS.PROJECT_CREATED,
      ENTITY_TYPES.PROJECT,
      result.id,
      { projectName: result.name }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // Log error
    await audit.logError(
      AUDIT_ACTIONS.PROJECT_CREATED,
      ENTITY_TYPES.PROJECT,
      500,
      error.message
    );

    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Predefined Actions

```typescript
AUDIT_ACTIONS = {
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
};
```

### Predefined Entity Types

```typescript
ENTITY_TYPES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  PROJECT: 'project',
  CHAT: 'chat',
  MESSAGE: 'message',
  FILE: 'file',
  LOCATION: 'location',
  LCA: 'lca'
};
```

### Querying Audit Logs

```sql
-- Get all login attempts for a user
SELECT * FROM audit_logs
WHERE user_id = 123 AND action = 'login'
ORDER BY created_at DESC;

-- Get failed access attempts in last 24 hours
SELECT * FROM audit_logs
WHERE action = 'access_denied'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Get all actions on a specific project
SELECT * FROM audit_logs
WHERE entity_type = 'project' AND entity_id = 'project-uuid'
ORDER BY created_at DESC;

-- Get activity by IP address
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE ip_address = '192.168.1.1'
GROUP BY action;
```

### Retention Policy

Consider implementing a retention policy:

```sql
-- Delete audit logs older than 1 year
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Rate Limiting

### Overview

Rate limiting protects the application from abuse, DDoS attacks, and resource exhaustion. The implementation uses an in-memory store for development and can be upgraded to Redis for production.

### Predefined Limits

| Endpoint Type | Requests | Time Window |
|---------------|----------|-------------|
| Login | 5 | 15 minutes |
| Registration | 3 | 1 hour |
| API Default | 60 | 1 minute |
| API Strict | 10 | 1 minute |
| API Relaxed | 120 | 1 minute |
| Chat Message | 30 | 1 minute |
| Chat Create | 10 | 1 minute |
| File Upload | 10 | 1 minute |
| Project Create | 5 | 1 minute |
| Project Update | 30 | 1 minute |

### Usage

#### Wrap Handler Function

```typescript
import { withRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  },
  RATE_LIMITS.CHAT_MESSAGE // 30 requests per minute
);
```

#### Manual Check

```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/middleware/rateLimit';

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = checkRateLimit(request, RATE_LIMITS.API_STRICT);

  if (rateLimitResponse) {
    return rateLimitResponse; // 429 Too Many Requests
  }

  // Proceed with request
  return NextResponse.json({ success: true });
}
```

#### Custom Configuration

```typescript
import { withRateLimit } from '@/lib/middleware/rateLimit';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Handler
  },
  {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 100          // 100 requests
  }
);
```

### Response Headers

Rate-limited responses include informative headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-12-04T19:31:45.000Z
Retry-After: 45
```

### Client Identifier

Clients are identified by:
- IP address (from `x-forwarded-for` or `x-real-ip`)
- User agent

This provides reasonable accuracy without requiring authentication.

### Production Considerations

**Current Implementation (Development)**:
- In-memory Map store
- Single-instance only
- Lost on server restart
- Fast but not distributed

**Production Recommendations**:
1. **Use Redis** for distributed rate limiting:
   ```typescript
   // Example with Redis
   import { Redis } from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);

   const key = `ratelimit:${clientId}:${endpoint}`;
   const current = await redis.incr(key);

   if (current === 1) {
     await redis.expire(key, windowSeconds);
   }

   if (current > maxRequests) {
     // Rate limit exceeded
   }
   ```

2. **Use Upstash** for serverless:
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, '10 s'),
   });

   const { success } = await ratelimit.limit(clientId);
   ```

3. **Use Vercel Edge Config** for edge runtime

---

## Setup Instructions

### Complete Setup Checklist

- [ ] **1. Run Database Migrations**
  ```bash
  psql $POSTGRES_URL_NON_POOLING < src/lib/db/migrations/restructure/015_add_encryption_support.sql
  psql $POSTGRES_URL_NON_POOLING < src/lib/db/migrations/restructure/016_create_audit_logs.sql
  ```

- [ ] **2. Generate Encryption Key** (Optional but recommended)
  ```bash
  openssl rand -base64 32
  ```

- [ ] **3. Update Environment Variables**
  ```bash
  # Add to .env.local
  ENCRYPTION_MASTER_KEY=<generated_key>
  ```

- [ ] **4. Backup Encryption Key**
  - Store key in secure password manager
  - Document key location
  - Set up key rotation schedule

- [ ] **5. Test Encryption**
  - Send a test chat message
  - Verify `content_encrypted = true` in database
  - Verify message displays correctly

- [ ] **6. Monitor Audit Logs**
  - Check audit_logs table has entries
  - Verify all actions are logged
  - Set up log monitoring/alerts

- [ ] **7. Test Rate Limiting**
  - Make multiple rapid requests
  - Verify 429 responses after limit
  - Check rate limit headers

### Verification Queries

```sql
-- Check encryption is working
SELECT
  COUNT(*) as encrypted_count,
  COUNT(*) FILTER (WHERE content_encrypted = true) as encrypted,
  COUNT(*) FILTER (WHERE content_encrypted = false) as unencrypted
FROM chat_messages;

-- Check audit logs
SELECT
  action,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY count DESC;

-- Check most active users
SELECT
  user_id,
  COUNT(*) as action_count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY action_count DESC
LIMIT 10;
```

---

## Security Best Practices

### Encryption

1. **Key Management**:
   - Use Hardware Security Module (HSM) in production
   - Implement key rotation (every 90 days recommended)
   - Never log encryption keys
   - Separate master keys per environment (dev/staging/prod)

2. **Backup Strategy**:
   - Backup encryption keys separately from data
   - Test key recovery procedures
   - Document key recovery process
   - Implement key escrow for compliance

3. **Monitoring**:
   - Alert on decryption failures
   - Monitor encryption/decryption performance
   - Track encryption coverage percentage
   - Log key access attempts

### Audit Logging

1. **What to Log**:
   - ✅ Authentication events (login, logout, failed attempts)
   - ✅ Authorization events (access granted, access denied)
   - ✅ Data modifications (create, update, delete)
   - ✅ Configuration changes
   - ✅ Permission changes
   - ✅ Sensitive data access

2. **What NOT to Log**:
   - ❌ Passwords or encryption keys
   - ❌ Full credit card numbers
   - ❌ Personal identifiable information (PII) in plaintext
   - ❌ Session tokens or API keys

3. **Log Monitoring**:
   - Set up alerts for suspicious patterns
   - Monitor failed authentication attempts
   - Track unusual access patterns
   - Review logs regularly

4. **Compliance**:
   - GDPR: Log data access and modifications
   - SOC 2: Comprehensive audit trail
   - HIPAA: Track all PHI access
   - ISO 27001: Security event logging

### Rate Limiting

1. **Tune Limits**:
   - Start conservative, adjust based on usage
   - Different limits for authenticated vs anonymous
   - Higher limits for premium users
   - Monitor and adjust based on abuse patterns

2. **Whitelist Trusted IPs**:
   ```typescript
   const WHITELISTED_IPS = ['1.2.3.4', '5.6.7.8'];

   if (WHITELISTED_IPS.includes(clientIp)) {
     return null; // Skip rate limiting
   }
   ```

3. **User-Friendly Responses**:
   - Include `Retry-After` header
   - Provide clear error messages
   - Suggest alternative actions

---

## Troubleshooting

### Encryption Issues

**Problem**: Messages not encrypting

**Checks**:
1. Verify ENCRYPTION_MASTER_KEY is set:
   ```bash
   echo $ENCRYPTION_MASTER_KEY
   ```
2. Check console logs for encryption messages
3. Verify orgId is passed to saveChatMessage()
4. Check database: `SELECT content_encrypted FROM chat_messages LIMIT 1;`

**Problem**: Cannot decrypt messages

**Checks**:
1. Verify using same ENCRYPTION_MASTER_KEY
2. Check orgId matches original encryption
3. Look for "Failed to decrypt" errors in logs
4. Verify message format (salt:iv:ciphertext:tag)

**Problem**: Performance issues with encryption

**Solutions**:
- Encrypt only sensitive fields
- Use async encryption for large payloads
- Consider client-side encryption for very large files
- Cache decrypted messages in memory (carefully!)

### Audit Log Issues

**Problem**: No audit logs appearing

**Checks**:
1. Verify audit_logs table exists: `\dt audit_logs`
2. Check for errors in console: "Failed to log audit event"
3. Verify database permissions
4. Check if API routes are using audit logger

**Problem**: Audit logs growing too large

**Solutions**:
- Implement retention policy (e.g., delete logs > 1 year)
- Archive old logs to cold storage
- Partition table by month
- Use database query optimization

### Rate Limiting Issues

**Problem**: Legitimate users being rate limited

**Solutions**:
- Increase limits for authenticated users
- Implement user-based rate limiting (not just IP)
- Whitelist known good IPs
- Use sliding window instead of fixed window

**Problem**: Rate limits not working

**Checks**:
1. Verify withRateLimit() is wrapping handler
2. Check if request has x-forwarded-for header
3. Look for rate limit headers in response
4. Verify in-memory store has entries

**Problem**: Rate limiting lost on server restart

**Solution**: Upgrade to Redis for persistent rate limiting

---

## Support & Maintenance

### Regular Tasks

**Daily**:
- Monitor audit logs for suspicious activity
- Check encryption failure rates
- Review rate limit violations

**Weekly**:
- Analyze audit log patterns
- Review rate limit effectiveness
- Check encryption coverage

**Monthly**:
- Audit encryption key access
- Review and update rate limits
- Clean up old audit logs
- Security incident review

**Quarterly**:
- Rotate encryption keys (recommended)
- Security audit
- Compliance review
- Update documentation

### Incident Response

If encryption key is compromised:

1. **Immediately**:
   - Rotate encryption key
   - Audit all access to compromised key
   - Identify potentially affected data

2. **Within 24 hours**:
   - Re-encrypt all affected messages
   - Notify affected users (if required)
   - Document incident

3. **Within 1 week**:
   - Root cause analysis
   - Implement preventive measures
   - Update security procedures

---

## References

- **AES-256-GCM**: [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- **PBKDF2**: [RFC 2898](https://tools.ietf.org/html/rfc2898)
- **Rate Limiting**: [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- **Audit Logging**: [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

---

**Document Version**: 1.0
**Last Review**: 2025-12-04
**Next Review**: 2026-03-04 (Quarterly)
