/**
 * ============================================
 * LCA API ENDPOINTS - COMPREHENSIVE TEST SUITE
 * ============================================
 *
 * Tests all LCA API endpoints to ensure they work correctly:
 * - POST /api/lca/projects - Create project
 * - GET /api/lca/projects - List projects
 * - GET /api/lca/projects/[id] - Get project details
 * - PATCH /api/lca/projects/[id] - Update project
 * - DELETE /api/lca/projects/[id] - Delete project
 * - POST /api/lca/calculate - Run calculation
 * - GET /api/lca/materials - Search materials
 *
 * Usage:
 *   npx tsx scripts/lca/test/test-api-endpoints.ts
 *
 * Requirements:
 *   - Development server must be running: npm run dev
 *   - User must be authenticated (or test with auth bypass)
 *   - Database must have materials imported
 */

import { getDbConnection } from '@/lib/db/connection';

// ============================================
// CONFIGURATION
// ============================================

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/lca`;

// Test credentials - NOTE: You'll need to create a test user first
// or modify the endpoints temporarily to bypass auth for testing
const TEST_USER_ID = '1'; // Replace with actual test user ID

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// ============================================
// TEST STATE
// ============================================

interface TestState {
  projectId: string | null;
  materialId: string | null;
  elementId: string | null;
  layerId: string | null;
}

const state: TestState = {
  projectId: null,
  materialId: null,
  elementId: null,
  layerId: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function logSection(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

async function apiRequest(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: unknown }> {
  const url = `${API_BASE}${endpoint}`;

  logInfo(`${method} ${endpoint}`);

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      status: response.status,
      data
    };
  } catch (error) {
    logError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

function validateResponse(
  response: { status: number; data: unknown },
  expectedStatus: number,
  testName: string
): boolean {
  const data = response.data as { success?: boolean; error?: string };

  if (response.status !== expectedStatus) {
    logError(`${testName}: Expected status ${expectedStatus}, got ${response.status}`);
    if (data.error) {
      logError(`  Error: ${data.error}`);
    }
    return false;
  }

  if (!data.success) {
    logError(`${testName}: Response success=false`);
    if (data.error) {
      logError(`  Error: ${data.error}`);
    }
    return false;
  }

  logSuccess(testName);
  return true;
}

// ============================================
// TEST: DATABASE SETUP
// ============================================

async function setupDatabase() {
  logSection('1. DATABASE SETUP');

  try {
    const sql = getDbConnection();

    // Get a test material (OSB for timber construction)
    const materials = await sql`
      SELECT id, name_nl, name_en, category, gwp_a1_a3
      FROM lca_materials
      WHERE category = 'timber'
        AND name_en ILIKE '%OSB%'
      LIMIT 1
    `;

    if (materials.length === 0) {
      logError('No timber materials found in database');
      logWarning('Please run: npx tsx scripts/lca/import/import-oekobaudat-fixed.ts');
      return false;
    }

    state.materialId = materials[0].id;
    logSuccess(`Found test material: ${materials[0].name_en} (${materials[0].name_nl})`);
    logInfo(`  Material ID: ${state.materialId}`);
    logInfo(`  Category: ${materials[0].category}`);
    logInfo(`  GWP A1-A3: ${materials[0].gwp_a1_a3} kg CO₂-eq`);

    return true;
  } catch (error) {
    logError(`Database setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// ============================================
// TEST: CREATE PROJECT
// ============================================

async function testCreateProject() {
  logSection('2. TEST: CREATE PROJECT');

  const projectData = {
    name: 'API Test Project - Timber House',
    description: 'Test project created by automated test suite',
    project_number: 'TEST-001',
    gross_floor_area: 120,
    building_type: 'vrijstaand',
    construction_system: 'houtskelet',
    floors: 2,
    study_period: 75,
    location: 'Amsterdam',
    energy_label: 'A++'
  };

  const response = await apiRequest('POST', '/projects', projectData);

  if (!validateResponse(response, 201, 'Create project')) {
    return false;
  }

  const data = response.data as { data?: { id: string; name: string } };
  state.projectId = data.data?.id || null;

  if (!state.projectId) {
    logError('No project ID returned');
    return false;
  }

  logInfo(`  Project ID: ${state.projectId}`);
  logInfo(`  Project Name: ${data.data?.name}`);

  return true;
}

// ============================================
// TEST: GET PROJECT LIST
// ============================================

async function testGetProjectList() {
  logSection('3. TEST: GET PROJECT LIST');

  const response = await apiRequest('GET', '/projects?limit=10&offset=0');

  if (!validateResponse(response, 200, 'Get project list')) {
    return false;
  }

  const data = response.data as {
    data?: Array<{ id: string; name: string }>;
    pagination?: { total: number; limit: number; offset: number };
  };

  const projects = data.data || [];
  const pagination = data.pagination;

  logInfo(`  Found ${projects.length} projects`);
  if (pagination) {
    logInfo(`  Total: ${pagination.total}, Limit: ${pagination.limit}, Offset: ${pagination.offset}`);
  }

  // Verify our test project is in the list
  const ourProject = projects.find(p => p.id === state.projectId);
  if (!ourProject) {
    logWarning('Test project not found in list (might be permission issue)');
  } else {
    logSuccess('Test project found in list');
  }

  return true;
}

// ============================================
// TEST: GET PROJECT DETAILS
// ============================================

async function testGetProjectDetails() {
  logSection('4. TEST: GET PROJECT DETAILS');

  if (!state.projectId) {
    logError('No project ID available');
    return false;
  }

  const response = await apiRequest('GET', `/projects/${state.projectId}`);

  if (!validateResponse(response, 200, 'Get project details')) {
    return false;
  }

  const data = response.data as {
    data?: {
      id: string;
      name: string;
      gross_floor_area: number;
      elements?: Array<unknown>;
    };
  };

  const project = data.data;

  if (!project) {
    logError('No project data returned');
    return false;
  }

  logInfo(`  Project: ${project.name}`);
  logInfo(`  GFA: ${project.gross_floor_area} m²`);
  logInfo(`  Elements: ${project.elements?.length || 0}`);

  return true;
}

// ============================================
// TEST: UPDATE PROJECT
// ============================================

async function testUpdateProject() {
  logSection('5. TEST: UPDATE PROJECT');

  if (!state.projectId) {
    logError('No project ID available');
    return false;
  }

  const updates = {
    name: 'API Test Project - Updated Name',
    description: 'Updated description',
    gross_floor_area: 125
  };

  const response = await apiRequest('PATCH', `/projects/${state.projectId}`, updates);

  if (!validateResponse(response, 200, 'Update project')) {
    return false;
  }

  const data = response.data as {
    data?: {
      name: string;
      description: string;
      gross_floor_area: number;
    };
  };

  const project = data.data;

  if (!project) {
    logError('No project data returned');
    return false;
  }

  logInfo(`  Updated name: ${project.name}`);
  logInfo(`  Updated GFA: ${project.gross_floor_area} m²`);

  return true;
}

// ============================================
// TEST: ADD ELEMENT TO PROJECT
// ============================================

async function testAddElement() {
  logSection('6. TEST: ADD ELEMENT TO PROJECT');

  if (!state.projectId) {
    logError('No project ID available');
    return false;
  }

  try {
    const sql = getDbConnection();

    // Create element directly in database (no POST endpoint for elements yet)
    const result = await sql`
      INSERT INTO lca_elements (
        project_id,
        name,
        category,
        quantity,
        quantity_unit
      ) VALUES (
        ${state.projectId},
        'Exterior Wall',
        'exterior_wall',
        50,
        'm2'
      )
      RETURNING id, name, category, quantity
    `;

    if (result.length === 0) {
      logError('Failed to create element');
      return false;
    }

    state.elementId = result[0].id;

    logSuccess('Element created via database');
    logInfo(`  Element ID: ${state.elementId}`);
    logInfo(`  Name: ${result[0].name}`);
    logInfo(`  Category: ${result[0].category}`);
    logInfo(`  Quantity: ${result[0].quantity} ${result[0].quantity_unit}`);

    return true;
  } catch (error) {
    logError(`Failed to add element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// ============================================
// TEST: ADD LAYER TO ELEMENT
// ============================================

async function testAddLayer() {
  logSection('7. TEST: ADD LAYER TO ELEMENT');

  if (!state.elementId || !state.materialId) {
    logError('No element ID or material ID available');
    return false;
  }

  try {
    const sql = getDbConnection();

    // Create layer directly in database
    const result = await sql`
      INSERT INTO lca_layers (
        element_id,
        material_id,
        position,
        thickness,
        coverage
      ) VALUES (
        ${state.elementId},
        ${state.materialId},
        1,
        0.012,
        1.0
      )
      RETURNING id, position, thickness, coverage
    `;

    if (result.length === 0) {
      logError('Failed to create layer');
      return false;
    }

    state.layerId = result[0].id;

    logSuccess('Layer created via database');
    logInfo(`  Layer ID: ${state.layerId}`);
    logInfo(`  Position: ${result[0].position}`);
    logInfo(`  Thickness: ${result[0].thickness * 1000} mm`);
    logInfo(`  Coverage: ${result[0].coverage * 100}%`);

    return true;
  } catch (error) {
    logError(`Failed to add layer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

// ============================================
// TEST: RUN CALCULATION
// ============================================

async function testCalculation() {
  logSection('8. TEST: RUN CALCULATION');

  if (!state.projectId) {
    logError('No project ID available');
    return false;
  }

  const response = await apiRequest('POST', '/calculate', {
    projectId: state.projectId
  });

  if (!validateResponse(response, 200, 'Run calculation')) {
    return false;
  }

  const data = response.data as {
    data?: {
      a1_a3: number;
      a4: number;
      a5: number;
      b4: number;
      c1_c2: number;
      c3: number;
      c4: number;
      d: number;
      total_a_to_c: number;
      total_with_d: number;
    };
  };

  const result = data.data;

  if (!result) {
    logError('No calculation result returned');
    return false;
  }

  logInfo('  LCA Results:');
  logInfo(`    A1-A3 (Production):     ${result.a1_a3.toFixed(2)} kg CO₂-eq`);
  logInfo(`    A4 (Transport):         ${result.a4.toFixed(2)} kg CO₂-eq`);
  logInfo(`    A5 (Construction):      ${result.a5.toFixed(2)} kg CO₂-eq`);
  logInfo(`    B4 (Replacement):       ${result.b4.toFixed(2)} kg CO₂-eq`);
  logInfo(`    C1-C2 (Deconstruction): ${result.c1_c2.toFixed(2)} kg CO₂-eq`);
  logInfo(`    C3 (Processing):        ${result.c3.toFixed(2)} kg CO₂-eq`);
  logInfo(`    C4 (Disposal):          ${result.c4.toFixed(2)} kg CO₂-eq`);
  logInfo(`    D (Benefits):           ${result.d.toFixed(2)} kg CO₂-eq`);
  logInfo(`    Total (A-C):            ${result.total_a_to_c.toFixed(2)} kg CO₂-eq`);
  logInfo(`    Total (with D):         ${result.total_with_d.toFixed(2)} kg CO₂-eq`);

  // Verify no NaN values
  const hasNaN = Object.values(result).some(v => typeof v === 'number' && isNaN(v));
  if (hasNaN) {
    logError('Calculation contains NaN values!');
    return false;
  }

  logSuccess('All calculation values are valid numbers');

  return true;
}

// ============================================
// TEST: SEARCH MATERIALS
// ============================================

async function testMaterialSearch() {
  logSection('9. TEST: SEARCH MATERIALS');

  // Test 1: Search by keyword
  logInfo('Test 9.1: Search by keyword "OSB"');
  const response1 = await apiRequest('GET', '/materials?search=OSB&limit=5');

  if (!validateResponse(response1, 200, 'Search materials by keyword')) {
    return false;
  }

  const data1 = response1.data as {
    data?: Array<{ name_en: string; category: string }>;
  };

  logInfo(`  Found ${data1.data?.length || 0} materials`);

  // Test 2: Filter by category
  logInfo('\nTest 9.2: Filter by category "timber"');
  const response2 = await apiRequest('GET', '/materials?category=timber&limit=5');

  if (!validateResponse(response2, 200, 'Filter materials by category')) {
    return false;
  }

  const data2 = response2.data as {
    data?: Array<{ name_en: string; category: string }>;
    pagination?: { total: number };
  };

  logInfo(`  Found ${data2.pagination?.total || 0} timber materials`);

  // Test 3: Filter by quality rating
  logInfo('\nTest 9.3: Filter by minimum quality rating 4');
  const response3 = await apiRequest('GET', '/materials?min_quality=4&limit=5');

  if (!validateResponse(response3, 200, 'Filter materials by quality')) {
    return false;
  }

  const data3 = response3.data as {
    pagination?: { total: number };
  };

  logInfo(`  Found ${data3.pagination?.total || 0} high-quality materials`);

  return true;
}

// ============================================
// TEST: DELETE PROJECT
// ============================================

async function testDeleteProject() {
  logSection('10. TEST: DELETE PROJECT (CLEANUP)');

  if (!state.projectId) {
    logError('No project ID available');
    return false;
  }

  const response = await apiRequest('DELETE', `/projects/${state.projectId}`);

  if (!validateResponse(response, 200, 'Delete project')) {
    return false;
  }

  logInfo(`  Project ${state.projectId} deleted successfully`);

  // Verify deletion
  const verifyResponse = await apiRequest('GET', `/projects/${state.projectId}`);

  if (verifyResponse.status === 404) {
    logSuccess('Verified: Project no longer exists');
    return true;
  } else {
    logWarning('Project still exists after deletion attempt');
    return false;
  }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
  console.log(`${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     LCA API ENDPOINTS - COMPREHENSIVE TEST SUITE           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  logWarning('NOTE: This test requires the development server to be running');
  logWarning('      Start it with: npm run dev');
  logWarning('      Authentication bypass may be needed for testing\n');

  const tests = [
    { name: 'Database Setup', fn: setupDatabase },
    { name: 'Create Project', fn: testCreateProject },
    { name: 'Get Project List', fn: testGetProjectList },
    { name: 'Get Project Details', fn: testGetProjectDetails },
    { name: 'Update Project', fn: testUpdateProject },
    { name: 'Add Element', fn: testAddElement },
    { name: 'Add Layer', fn: testAddLayer },
    { name: 'Run Calculation', fn: testCalculation },
    { name: 'Search Materials', fn: testMaterialSearch },
    { name: 'Delete Project', fn: testDeleteProject }
  ];

  const results: Array<{ name: string; passed: boolean }> = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });

      if (!passed) {
        logWarning(`Stopping tests due to failure in: ${test.name}`);
        break;
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error:`);
      console.error(error);
      results.push({ name: test.name, passed: false });
      break;
    }
  }

  // Summary
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    if (result.passed) {
      logSuccess(result.name);
    } else {
      logError(result.name);
    }
  });

  console.log();
  if (passed === total) {
    logSuccess(`All ${total} tests passed! 🎉`);
    return true;
  } else {
    logError(`${passed}/${total} tests passed`);
    return false;
  }
}

// ============================================
// RUN TESTS
// ============================================

runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    logError(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  });
