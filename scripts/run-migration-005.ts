/**
 * Run migration 005: Make file_url nullable
 *
 * Usage:
 *   npx tsx scripts/run-migration-005.ts
 */

import { sql } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.error('❌ Error: POSTGRES_URL environment variable not found');
  console.error('Make sure you have POSTGRES_URL set in your .env.local file');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Running migration 005: Make file_url nullable...\n');

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'scripts', 'migrations', '005-make-file-url-nullable.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log();

    // Execute migration
    console.log('⚙️  Executing migration...');
    await sql(databaseUrl, {
      fullResults: true,
    })`${migrationSQL}`;

    console.log('✅ Migration completed successfully!\n');

    // Verify the changes
    console.log('🔍 Verifying changes...');
    const result = await sql(databaseUrl)`
      SELECT
        column_name,
        is_nullable,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
        AND column_name IN ('file_url', 'status', 'error_message')
      ORDER BY column_name;
    `;

    console.log('\nColumn Nullability:');
    console.table(result.rows);

    console.log('✅ All done!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
