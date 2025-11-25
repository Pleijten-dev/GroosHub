// Recreate test data and run calculator test
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('#') || !line.trim()) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = cleanValue;
    }
  });
  console.log('✓ Loaded environment variables from .env.local\n');
}

import { getDbConnection } from '../../../src/lib/db/connection';
import { calculateProjectLCA } from '../../../src/features/lca/utils/lca-calculator';

const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

async function recreateTestData() {
  console.log('🔄 Recreating test data...\n');

  const sql = getDbConnection();

  // Step 1: Clean up existing test data
  console.log('Cleaning up existing test data...');
  await sql`
    DELETE FROM lca_layers WHERE element_id IN (
      SELECT id FROM lca_elements WHERE project_id = ${TEST_PROJECT_ID}
    )
  `;
  await sql`DELETE FROM lca_elements WHERE project_id = ${TEST_PROJECT_ID}`;
  await sql`DELETE FROM lca_projects WHERE id = ${TEST_PROJECT_ID}`;
  console.log('✓ Cleanup complete\n');

  // Step 2: Create test project
  console.log('Creating test project...');
  await sql`
    INSERT INTO lca_projects (
      id, name, description, gross_floor_area, building_type,
      construction_system, floors, study_period, location, energy_label,
      user_id, is_template, is_public
    ) VALUES (
      ${TEST_PROJECT_ID},
      'Test Houtskelet Woning - RC 6.0',
      'Test project voor calculator verificatie: Houtskeletbouw woning met RC 6.0 isolatie',
      120.0, 'vrijstaand', 'houtskelet', 2, 75,
      'Utrecht, Nederland', 'A', 1, false, false
    )
  `;
  console.log('✓ Project created\n');

  // Step 3: Create elements and layers
  console.log('Creating elements and layers...');

  // Element 1: Exterior Wall
  const wallElementId = '00000000-0000-0000-0000-000000000010';
  await sql`
    INSERT INTO lca_elements (id, project_id, name, category, quantity, quantity_unit, description)
    VALUES (
      ${wallElementId}, ${TEST_PROJECT_ID}, 'Gevel Noord', 'exterior_wall',
      50.0, 'm2', 'Houtskelet buitenmuur met RC 6.0 isolatie'
    )
  `;

  // Wall layers with real material IDs
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${wallElementId}, 1, ${'13346b9a-2dea-4699-b356-666b25fb0a49'}, 0.012, 1.0)`;  // Particle board (OSB substitute)
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${wallElementId}, 2, ${'e51edde6-a353-4b1b-be94-d63118bca3b2'}, 0.200, 1.0)`;  // Mineral wool facade
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${wallElementId}, 3, ${'13346b9a-2dea-4699-b356-666b25fb0a49'}, 0.195, 0.075)`;  // Timber studs
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${wallElementId}, 4, ${'2550d0eb-ae35-49bb-b02f-7ba4c4ac5f5f'}, 0.0125, 1.0)`;  // Gypsum plaster

  // Element 2: Roof
  const roofElementId = '00000000-0000-0000-0000-000000000011';
  await sql`
    INSERT INTO lca_elements (id, project_id, name, category, quantity, quantity_unit, description)
    VALUES (
      ${roofElementId}, ${TEST_PROJECT_ID}, 'Dakvlak', 'roof',
      65.0, 'm2', 'Hellend dak met RC 6.0 isolatie'
    )
  `;

  // Roof layers
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${roofElementId}, 2, ${'fa081fea-9df6-4a4b-ba16-850895973ac1'}, 0.240, 1.0)`;  // Mineral wool blowable
  await sql`INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
    VALUES (${roofElementId}, 3, ${'13346b9a-2dea-4699-b356-666b25fb0a49'}, 0.240, 0.08)`;  // Timber rafters

  console.log('✓ Elements and layers created\n');

  // Step 4: Verify creation and show material details
  const layerCount = await sql`
    SELECT COUNT(*) as count FROM lca_layers
    WHERE element_id IN (SELECT id FROM lca_elements WHERE project_id = ${TEST_PROJECT_ID})
  `;
  console.log(`✓ Created ${layerCount[0].count} layers\n`);

  // Show material details
  const materialDetails = await sql`
    SELECT DISTINCT
      m.id, m.name_en, m.declared_unit, m.conversion_to_kg,
      m.gwp_a1_a3, m.density
    FROM lca_layers l
    JOIN lca_materials m ON m.id = l.material_id
    WHERE l.element_id IN (SELECT id FROM lca_elements WHERE project_id = ${TEST_PROJECT_ID})
  `;

  console.log('Materials Used:');
  console.log('---------------');
  materialDetails.forEach((m: any) => {
    console.log(`${m.name_en}:`);
    console.log(`  Unit: ${m.declared_unit}, Conv: ${m.conversion_to_kg}, GWP: ${m.gwp_a1_a3}, Density: ${m.density}`);
  });
  console.log('');

  // Step 5: Run calculator test
  console.log('='.repeat(60));
  console.log('🧪 Running LCA Calculator Test (DEBUG MODE)');
  console.log('='.repeat(60));
  console.log('');

  // Enable debug mode
  process.env.LCA_DEBUG = 'true';

  const startTime = Date.now();
  const result = await calculateProjectLCA(TEST_PROJECT_ID);
  const duration = Date.now() - startTime;

  console.log(`✅ Calculation completed in ${duration}ms\n`);

  // Display results
  console.log('='.repeat(60));
  console.log('📊 LCA RESULTS');
  console.log('='.repeat(60));
  console.log('');

  console.log('Phase Breakdown (kg CO₂-eq):');
  console.log('----------------------------');
  console.log(`  A1-A3 (Production):       ${result.a1_a3.toFixed(2)}`);
  console.log(`  A4 (Transport):           ${result.a4.toFixed(2)}`);
  console.log(`  A5 (Construction):        ${result.a5.toFixed(2)}`);
  console.log(`  B4 (Replacement):         ${result.b4.toFixed(2)}`);
  console.log(`  C1-C2 (Deconstruction):   ${result.c1_c2.toFixed(2)}`);
  console.log(`  C3 (Processing):          ${result.c3.toFixed(2)}`);
  console.log(`  C4 (Disposal):            ${result.c4.toFixed(2)}`);
  console.log(`  D (Benefits):             ${result.d.toFixed(2)}`);
  console.log('');

  console.log('Totals:');
  console.log('-------');
  console.log(`  Total (A-C):              ${result.total_a_to_c.toFixed(2)} kg CO₂-eq`);
  console.log(`  Total (with D):           ${result.total_with_d.toFixed(2)} kg CO₂-eq`);
  console.log(`  Total in tonnes:          ${(result.total_a_to_c / 1000).toFixed(2)} tonnes`);
  console.log('');

  // MPG calculation
  const gfa = 120;
  const studyPeriod = 75;
  const mpgValue = result.total_a_to_c / gfa / studyPeriod;

  console.log('📐 MPG Calculation:');
  console.log('-------------------');
  console.log(`  Gross Floor Area:         ${gfa} m²`);
  console.log(`  Study Period:             ${studyPeriod} years`);
  console.log(`  MPG Value:                ${mpgValue.toFixed(2)} kg CO₂-eq/m²/year`);
  console.log(`  MPG Limit (vrijstaand):   ~0.60 kg CO₂-eq/m²/year (2025)`);
  console.log(`  Compliant:                ${mpgValue <= 0.60 ? '✅ YES' : '❌ NO'}`);
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');

  process.exit(0);
}

recreateTestData().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
