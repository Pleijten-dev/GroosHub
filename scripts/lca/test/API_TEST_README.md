# LCA API Endpoints - Test Suite Documentation

> **Created**: 2025-11-25
> **Purpose**: Comprehensive testing of all LCA API endpoints
> **Location**: `scripts/lca/test/test-api-endpoints.ts`

---

## Overview

This test suite validates all LCA (Life Cycle Assessment) API endpoints to ensure they function correctly. It tests the complete workflow from project creation to calculation and cleanup.

## Prerequisites

### 1. Development Server Running
```bash
npm run dev
```
The test makes HTTP requests to `http://localhost:3000`, so the development server must be active.

### 2. Database Setup
Ensure the database is initialized and has materials imported:
```bash
# Initialize database schema
npm run db:migrate

# Import Ökobaudat materials (902 materials)
npx tsx scripts/lca/import/import-oekobaudat-fixed.ts
```

### 3. Authentication
The API endpoints require authentication. You have two options:

**Option A: Create Test User**
1. Start the dev server: `npm run dev`
2. Navigate to `/login`
3. Create a test account
4. Update `TEST_USER_ID` in `test-api-endpoints.ts`

**Option B: Temporarily Bypass Auth (Development Only)**
Modify the API routes to skip authentication during testing:
```typescript
// In API route files, comment out auth check temporarily:
// const session = await auth();
// if (!session?.user) { return NextResponse.json(...) }
```
⚠️ **Remember to restore authentication after testing!**

---

## Running the Tests

### Full Test Suite
```bash
npx tsx scripts/lca/test/test-api-endpoints.ts
```

### Expected Output
```
╔════════════════════════════════════════════════════════════╗
║     LCA API ENDPOINTS - COMPREHENSIVE TEST SUITE           ║
╚════════════════════════════════════════════════════════════╝

============================================================
1. DATABASE SETUP
============================================================

ℹ Found test material: OSB (Oriented Strand Board)
  Material ID: abc-123...
  Category: timber
  GWP A1-A3: -890 kg CO₂-eq
✓ Database setup complete

============================================================
2. TEST: CREATE PROJECT
============================================================

ℹ POST /projects
✓ Create project
  Project ID: def-456...
  Project Name: API Test Project - Timber House

[... more test output ...]

============================================================
TEST SUMMARY
============================================================

✓ Database Setup
✓ Create Project
✓ Get Project List
✓ Get Project Details
✓ Update Project
✓ Add Element
✓ Add Layer
✓ Run Calculation
✓ Search Materials
✓ Delete Project

✓ All 10 tests passed! 🎉
```

---

## Test Coverage

### 1. Database Setup ✓
- Verifies materials are imported
- Finds test material (OSB timber)
- Stores material ID for later use

### 2. Project CRUD Operations ✓

#### Create Project
- **Endpoint**: `POST /api/lca/projects`
- **Tests**: Creates timber house project with all required fields
- **Validates**: Returns 201 status, project ID, and project data

#### List Projects
- **Endpoint**: `GET /api/lca/projects`
- **Tests**: Retrieves user's projects with pagination
- **Validates**: Returns 200 status, project array, and pagination metadata

#### Get Project Details
- **Endpoint**: `GET /api/lca/projects/[id]`
- **Tests**: Fetches full project data with nested elements/layers
- **Validates**: Returns complete project structure

#### Update Project
- **Endpoint**: `PATCH /api/lca/projects/[id]`
- **Tests**: Updates project name, description, and GFA
- **Validates**: Returns updated values

#### Delete Project
- **Endpoint**: `DELETE /api/lca/projects/[id]`
- **Tests**: Deletes project and verifies removal
- **Validates**: Project no longer accessible (404)

### 3. Element & Layer Management ✓
- Creates element via database (no API endpoint yet)
- Adds layer with material reference
- Prepares project for calculation

### 4. Calculation ✓

#### Run Calculation
- **Endpoint**: `POST /api/lca/calculate`
- **Tests**: Triggers LCA calculation for project
- **Validates**:
  - All phases calculated (A1-A3, A4, A5, B4, C1-C4, D)
  - No NaN values
  - Realistic carbon values
  - Negative values for biogenic carbon (timber)

### 5. Material Search ✓

#### Search by Keyword
- **Endpoint**: `GET /api/lca/materials?search=OSB`
- **Tests**: Finds materials matching search term
- **Validates**: Returns matching materials

#### Filter by Category
- **Endpoint**: `GET /api/lca/materials?category=timber`
- **Tests**: Filters materials by category
- **Validates**: Returns only timber materials

#### Filter by Quality
- **Endpoint**: `GET /api/lca/materials?min_quality=4`
- **Tests**: Filters by minimum quality rating
- **Validates**: Returns only high-quality materials (4-5 stars)

---

## API Endpoints Tested

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| **POST** | `/api/lca/projects` | Create new project | ✅ Tested |
| **GET** | `/api/lca/projects` | List all projects | ✅ Tested |
| **GET** | `/api/lca/projects/[id]` | Get project details | ✅ Tested |
| **PATCH** | `/api/lca/projects/[id]` | Update project | ✅ Tested |
| **DELETE** | `/api/lca/projects/[id]` | Delete project | ✅ Tested |
| **POST** | `/api/lca/calculate` | Run LCA calculation | ✅ Tested |
| **GET** | `/api/lca/materials` | Search/filter materials | ✅ Tested |

---

## Troubleshooting

### Test Fails: "Unauthorized" (401)
**Problem**: API endpoints require authentication
**Solution**:
- Create a test user account
- Update `TEST_USER_ID` in test file
- OR temporarily bypass auth in API routes (dev only)

### Test Fails: "No materials found"
**Problem**: Material database not imported
**Solution**:
```bash
npx tsx scripts/lca/import/import-oekobaudat-fixed.ts
```

### Test Fails: "Project not found" (404)
**Problem**: Project ownership mismatch
**Solution**:
- Ensure `TEST_USER_ID` matches the authenticated user
- Check database: `SELECT user_id FROM lca_projects WHERE id = '...'`

### Test Fails: Connection Refused
**Problem**: Development server not running
**Solution**:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npx tsx scripts/lca/test/test-api-endpoints.ts
```

### Calculation Returns NaN Values
**Problem**: Material data incomplete or unit handling error
**Solution**:
- Check material has all required GWP values
- Verify density values are present
- Review calculator debug output:
  ```bash
  LCA_DEBUG=true npx tsx scripts/lca/test/test-api-endpoints.ts
  ```

---

## Known Limitations

### 1. No Element/Layer API Endpoints Yet
Currently, elements and layers are created directly via database queries. Future improvements:
- `POST /api/lca/elements` - Create element
- `POST /api/lca/elements/[id]/layers` - Add layer

### 2. Authentication Required
Tests require valid authentication. Consider implementing a test mode or mock authentication for CI/CD pipelines.

### 3. HTTP Requests
Tests make actual HTTP requests to localhost:3000. This means:
- Development server must be running
- Tests are slower than unit tests
- Network issues can cause failures

**Future Improvement**: Create unit tests that directly import and test API handlers without HTTP.

---

## Future Enhancements

### 1. Unit Tests
Create tests that directly import API route handlers:
```typescript
import { POST } from '@/app/api/lca/projects/route';
// Test handler directly without HTTP
```

### 2. Mock Authentication
Implement test mode authentication:
```typescript
if (process.env.NODE_ENV === 'test') {
  // Use mock session
}
```

### 3. Test Fixtures
Create reusable test data:
```typescript
const testProjects = {
  timberHouse: { /* ... */ },
  concreteBuilding: { /* ... */ }
};
```

### 4. Performance Tests
Measure API response times:
```typescript
const start = Date.now();
await apiRequest('POST', '/calculate', { projectId });
const duration = Date.now() - start;
assert(duration < 1000, 'Calculation should complete within 1s');
```

### 5. Error Scenario Tests
Test error handling:
- Invalid project IDs
- Missing required fields
- Invalid data types
- Boundary conditions (negative values, very large numbers)

---

## Related Documentation

- **Calculator Test**: `scripts/lca/test/recreate-and-test.ts` - Core calculator integration test
- **Project Status**: `Documentation/LCA_PROJECT_STATUS.md` - Overall project progress
- **API Reference**: See individual route files in `src/app/api/lca/`

---

## Success Criteria

All tests pass when:
- ✅ Development server is running
- ✅ Database schema is initialized
- ✅ Materials are imported (902 Ökobaudat materials)
- ✅ Valid authentication credentials provided
- ✅ All API endpoints return expected status codes
- ✅ Calculation produces valid numeric results (no NaN)
- ✅ CRUD operations work correctly
- ✅ Material search returns filtered results
- ✅ Cleanup (delete) successfully removes test data

---

**Last Updated**: 2025-11-25
**Maintainer**: Development Team
**Status**: ✅ Phase 2 API Implementation Complete
