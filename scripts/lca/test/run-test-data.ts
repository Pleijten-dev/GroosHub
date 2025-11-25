// Execute test data SQL
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

async function runTestData() {
  console.log('🔄 Creating test data for LCA calculator...\n');

  const sql = getDbConnection();

  // Read the SQL file
  const sqlPath = resolve(process.cwd(), 'scripts/lca/test/create-test-data.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  // Split into individual statements and execute
  // Note: This is a simplified approach - for production use a proper SQL parser
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let executed = 0;
  let failed = 0;

  for (const statement of statements) {
    // Skip comments
    if (statement.trim().startsWith('--')) continue;

    try {
      // Execute the statement using neon's unsafe query method
      // This is needed because we can't use tagged template literals with dynamic SQL
      const result = await sql.unsafe(statement);
      executed++;

      // If it's a SELECT statement, show the results
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        console.log('\n' + '='.repeat(60));
        if (Array.isArray(result) && result.length > 0) {
          console.table(result);
        } else {
          console.log('No results');
        }
      }
    } catch (error) {
      // Some errors are expected (e.g., DELETE with no matching rows)
      // Only log actual errors
      if (error instanceof Error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
        console.error(`❌ Error executing statement:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Test data creation complete`);
  console.log(`   Executed: ${executed} statements`);
  if (failed > 0) {
    console.log(`   Failed: ${failed} statements`);
  }
  console.log('='.repeat(60));
  console.log('\n');

  process.exit(0);
}

runTestData().catch(error => {
  console.error('\n❌ Error creating test data:', error);
  process.exit(1);
});
