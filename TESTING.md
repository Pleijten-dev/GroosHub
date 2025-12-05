# Testing Guide - GroosHub Database Restructuring

## Overview

This document outlines the testing strategy for the GroosHub database restructuring project. Tests are organized into unit tests, integration tests, and end-to-end tests.

## Test Structure

```
src/
├── lib/
│   ├── db/
│   │   └── queries/
│   │       └── __tests__/
│   │           ├── projects.test.ts
│   │           ├── users.test.ts
│   │           ├── chats.test.ts
│   │           ├── locations.test.ts
│   │           └── lca.test.ts
│   └── encryption/
│       └── __tests__/
│           └── messageEncryption.test.ts
└── features/
    └── projects/
        └── __tests__/
            └── components.test.tsx
```

## Running Tests

### Install Dependencies

```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest
```

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test src/lib/encryption/__tests__/messageEncryption.test.ts
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

## Test Categories

### 1. Unit Tests

**Location**: `src/lib/**/__tests__/*.test.ts`

Test individual functions and utilities in isolation.

#### Database Query Tests

- **File**: `src/lib/db/queries/__tests__/projects.test.ts`
- **Tests**:
  - `getProjectById` - Returns correct project or null
  - `getUserProjects` - Returns user's projects with roles
  - `isProjectMember` - Correctly identifies membership
  - `isProjectAdmin` - Correctly identifies admin/creator roles
  - Type safety for return values

#### Encryption Tests

- **File**: `src/lib/encryption/__tests__/messageEncryption.test.ts`
- **Tests**:
  - Encrypt/decrypt roundtrip
  - Organization-specific encryption
  - Different ciphertexts for same plaintext
  - Error handling for invalid inputs
  - JSON encryption/decryption
  - Special characters and unicode support

### 2. Integration Tests

Test API endpoints and database operations together.

#### API Tests

```typescript
describe('Projects API', () => {
  it('POST /api/projects - creates new project', async () => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test description'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.project.name).toBe('Test Project');
  });

  it('GET /api/projects/:id - returns project details', async () => {
    // Test implementation
  });

  it('PATCH /api/projects/:id - updates project', async () => {
    // Test implementation
  });

  it('DELETE /api/projects/:id - soft deletes project', async () => {
    // Test implementation
  });
});
```

### 3. Migration Tests

Test database migrations and rollbacks.

```bash
# Test migrations on staging database
psql $STAGING_DB < migrations/restructure/001_create_organizations.sql
psql $STAGING_DB < migrations/restructure/002_create_user_accounts.sql
# ... continue with all migrations

# Verify data integrity
psql $STAGING_DB -c "SELECT COUNT(*) FROM user_accounts;"
psql $STAGING_DB -c "SELECT COUNT(*) FROM project_projects;"
psql $STAGING_DB -c "SELECT COUNT(*) FROM chat_conversations;"

# Test rollback
psql $STAGING_DB < migrations/restructure/014_rollback_files.sql
# ... rollback in reverse order
```

## Test Data Setup

### Test Database

Set up a separate test database:

```bash
# Create test database
createdb grooshub_test

# Run migrations
psql $TEST_POSTGRES_URL < migrations/restructure/*.sql

# Seed test data
psql $TEST_POSTGRES_URL < migrations/test-data/seed.sql
```

### Test Environment Variables

Create `.env.test`:

```bash
NODE_ENV=test
POSTGRES_URL=postgresql://user:pass@localhost/grooshub_test
POSTGRES_URL_NON_POOLING=postgresql://user:pass@localhost/grooshub_test
ENCRYPTION_MASTER_KEY=test-master-key-32-characters-long
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000
```

## Testing Checklist

### Phase 6: Testing Tasks

- [x] **6.1**: Write unit tests for database queries
  - [x] Projects queries
  - [ ] Users queries
  - [ ] Chats queries
  - [ ] Locations queries
  - [ ] LCA queries

- [x] **6.2**: Write encryption tests
  - [x] Message encryption/decryption
  - [x] JSON encryption/decryption
  - [x] Organization-specific keys
  - [x] Error handling

- [ ] **6.3**: Write API integration tests
  - [ ] Projects API
  - [ ] Users API
  - [ ] Chats API
  - [ ] Locations API
  - [ ] LCA API

- [ ] **6.4**: Write component tests
  - [ ] ProjectsSidebar
  - [ ] ProjectOverview
  - [ ] NewProjectForm
  - [ ] ProjectsListClient

- [ ] **6.5**: Test database migrations
  - [ ] Forward migration (001-014)
  - [ ] Data integrity verification
  - [ ] Rollback procedure
  - [ ] Re-migration after rollback

## Coverage Goals

### Minimum Coverage Requirements

- **Unit Tests**: 80% coverage
- **Integration Tests**: 70% coverage
- **Critical Paths**: 95% coverage

### Critical Paths

1. User authentication and session management
2. Project creation and access control
3. Message encryption/decryption
4. Database queries with type safety
5. API error handling

## Performance Testing

### Database Query Performance

```typescript
describe('Performance Tests', () => {
  it('getUserProjects should complete in <100ms', async () => {
    const start = Date.now();
    await getUserProjects(testUserId);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should handle 100 concurrent project queries', async () => {
    const promises = Array(100).fill(null).map(() =>
      getProjectById(testProjectId)
    );
    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 5 seconds for 100 queries
  });
});
```

### Encryption Performance

```typescript
describe('Encryption Performance', () => {
  it('should encrypt 1000 messages in <1s', () => {
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      encryptMessage('test message', 'test-org');
    }
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });
});
```

## Security Testing

### SQL Injection Tests

```typescript
describe('SQL Injection Prevention', () => {
  it('should handle malicious input in project name', async () => {
    const maliciousName = "'; DROP TABLE projects; --";
    const result = await createProject({
      name: maliciousName,
      orgId: testOrgId,
      userId: testUserId
    });
    expect(result).toBeDefined();
    // Verify projects table still exists
    const projects = await getUserProjects(testUserId);
    expect(Array.isArray(projects)).toBe(true);
  });
});
```

### Encryption Security Tests

```typescript
describe('Encryption Security', () => {
  it('should not decrypt with wrong organization ID', () => {
    const encrypted = encryptMessage('secret', 'org1');
    expect(() => decryptMessage(encrypted, 'org2')).toThrow();
  });

  it('should detect tampering', () => {
    const encrypted = encryptMessage('secret', 'org1');
    const tampered = encrypted.replace('a', 'b');
    expect(() => decryptMessage(tampered, 'org1')).toThrow();
  });
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run db:migrate:test
      - run: npm test -- --coverage
      - run: npm run lint
```

## Manual Testing Checklist

### Before Production Deployment

- [ ] Test all API endpoints with Postman/Insomnia
- [ ] Verify encryption/decryption in production-like environment
- [ ] Test project creation flow end-to-end
- [ ] Test user authentication and session management
- [ ] Verify database migrations on staging
- [ ] Test rollback procedure
- [ ] Performance test under load (100+ concurrent users)
- [ ] Security audit of API endpoints
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive testing
- [ ] Accessibility testing (screen readers, keyboard navigation)

## Troubleshooting

### Common Test Failures

**Database connection errors**:
```bash
# Ensure test database is running
pg_isready -h localhost -p 5432

# Check connection string
echo $TEST_POSTGRES_URL
```

**Encryption test failures**:
```bash
# Verify master key is set
echo $ENCRYPTION_MASTER_KEY | wc -c  # Should be 32+ characters
```

**Type errors**:
```bash
# Regenerate types from database
npm run db:generate-types
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [PostgreSQL Testing](https://www.postgresql.org/docs/current/regress.html)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

**Last Updated**: 2025-12-04
**Status**: Implementation Phase
