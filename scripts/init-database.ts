import { getDbConnection } from '../src/lib/db/connection';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database schema for Google Places API usage tracking
 */
async function runMigration() {
  console.log('🔄 Starting database migration...\n');

  try {
    // Get database connection
    const sql = getDbConnection();
    console.log('✅ Database connection established\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '../src/lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('📄 Schema file loaded\n');

    // Execute schema
    // Note: Neon SQL client requires template literals, not strings
    // We use neon() which returns a function that accepts template strings
    console.log('⚙️  Executing schema...\n');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (statement.toLowerCase().startsWith('create')) {
        // Execute CREATE statements
        await sql([statement] as unknown as TemplateStringsArray);
      }
    }

    console.log('✅ Database schema created successfully!\n');
    console.log('📊 Created:');
    console.log('  - api_usage table');
    console.log('  - Indexes for optimized queries');
    console.log('  - monthly_quota_usage view');
    console.log('  - current_month_usage view\n');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'api_usage'
    `;

    if (tables.length > 0) {
      console.log('✅ Verification successful - api_usage table exists\n');
    } else {
      console.warn('⚠️  Warning: Could not verify table creation\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
