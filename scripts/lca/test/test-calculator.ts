// ============================================
// LCA CALCULATOR TEST RUNNER
// ============================================
// Tests the LCA calculator with test data
//
// Usage:
//   npx tsx scripts/lca/test/test-calculator.ts

// Load environment variables from .env.local manually
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file if it exists
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line.startsWith('#') || !line.trim()) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = cleanValue;
    }
  });
  console.log('✓ Loaded environment variables from .env.local\n');
} else {
  console.warn('⚠️  Warning: .env.local file not found\n');
}

import { calculateProjectLCA } from '../../../src/features/lca/utils/lca-calculator';

const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

async function runCalculatorTest() {
  console.log('🧪 Testing LCA Calculator\n');
  console.log('='.repeat(60));
  console.log('Project ID:', TEST_PROJECT_ID);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Run calculation
    console.log('⏳ Running calculation...\n');
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

    console.log('Element Breakdown:');
    console.log('------------------');
    result.breakdown_by_element.forEach(element => {
      console.log(`  ${element.element_name}:`);
      console.log(`    Impact: ${element.total_impact.toFixed(2)} kg CO₂-eq (${element.percentage.toFixed(1)}%)`);
    });
    console.log('');

    console.log('Phase Distribution:');
    console.log('-------------------');
    const phases = result.breakdown_by_phase;
    console.log(`  Production:               ${phases.production.toFixed(2)} kg (${((phases.production / result.total_a_to_c) * 100).toFixed(1)}%)`);
    console.log(`  Transport:                ${phases.transport.toFixed(2)} kg (${((phases.transport / result.total_a_to_c) * 100).toFixed(1)}%)`);
    console.log(`  Construction:             ${phases.construction.toFixed(2)} kg (${((phases.construction / result.total_a_to_c) * 100).toFixed(1)}%)`);
    console.log(`  Use/Replacement:          ${phases.use_replacement.toFixed(2)} kg (${((phases.use_replacement / result.total_a_to_c) * 100).toFixed(1)}%)`);
    console.log(`  End of Life:              ${phases.end_of_life.toFixed(2)} kg (${((phases.end_of_life / result.total_a_to_c) * 100).toFixed(1)}%)`);
    console.log(`  Benefits:                 ${phases.benefits.toFixed(2)} kg`);
    console.log('');

    console.log('='.repeat(60));
    console.log('✅ TEST PASSED');
    console.log('='.repeat(60));
    console.log('');

    console.log('📝 Notes:');
    console.log('  - Results have been cached to lca_projects table');
    console.log('  - Project record updated with calculated values');
    console.log('  - Check database to verify cached values match');
    console.log('');

    // Verify the calculation makes sense
    const warnings: string[] = [];

    if (result.total_a_to_c <= 0) {
      warnings.push('⚠️  Total impact is zero or negative - check material data');
    }

    if (result.a1_a3 < result.total_a_to_c * 0.5) {
      warnings.push('⚠️  A1-A3 phase seems low (< 50% of total) - verify material GWP values');
    }

    if (result.b4 > result.total_a_to_c * 0.5) {
      warnings.push('⚠️  B4 replacement impact seems very high (> 50% of total) - check service lives');
    }

    if (warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`  ${warning}`));
      console.log('');
    }

    // Calculate expected MPG value (assuming 120 m² and 75 year study period)
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

    console.log('✨ Test complete!\n');

  } catch (error: unknown) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('');

    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Ensure test data was created: Run create-test-data.sql');
    console.error('  2. Check database connection: Verify POSTGRES_URL in .env.local');
    console.error('  3. Verify materials imported: Run import-oekobaudat.ts first');
    console.error('  4. Check user_id in test data matches an existing user');
    console.error('');

    process.exit(1);
  }
}

// Run the test
runCalculatorTest()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
