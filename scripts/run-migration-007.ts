/**
 * Run Migration 007: Fix llm_usage Foreign Key
 *
 * This migration updates the llm_usage table to reference chat_conversations
 * instead of the old chats table.
 *
 * Usage:
 *   npx ts-node scripts/run-migration-007.ts
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Starting Migration 007: Fix llm_usage Foreign Key\n');

  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  try {
    // Read migration SQL file
    const migrationPath = join(__dirname, 'migrations', '007-fix-llm-usage-foreign-key.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('⚙️  Executing migration...\n');

    // Execute migration
    await sql(migrationSQL);

    console.log('\n✅ Migration 007 completed successfully!');
    console.log('   - Updated llm_usage.chat_id foreign key');
    console.log('   - Now references chat_conversations(id)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
