/**
 * Run Migration 006: Fix chat_files foreign key constraints
 *
 * This migration updates the chat_files table to reference the new
 * chat_conversations and user_accounts tables instead of the old
 * chats and users tables.
 *
 * Run with: npx tsx scripts/run-migration-006.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('[Migration 006] Starting...\n');

  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006-fix-chat-files-foreign-key.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('[Migration 006] Running SQL migration...');
    console.log('=====================================\n');

    // Execute migration (Neon doesn't support multi-statement transactions in one call)
    // We need to split by semicolons and execute separately

    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      if (statement.toUpperCase().includes('SELECT')) {
        // Execute SELECT and log results
        const result = await sql.unsafe(statement);
        console.log('Verification query result:');
        console.table(result);
      } else {
        // Execute DDL statement
        await sql.unsafe(statement);
        console.log(`✅ Executed: ${statement.substring(0, 60)}...`);
      }
    }

    console.log('\n[Migration 006] ✅ Migration completed successfully!');
    console.log('\nForeign keys updated:');
    console.log('  - chat_files.chat_id → chat_conversations.id');
    console.log('  - chat_files.user_id → user_accounts.id');

  } catch (error) {
    console.error('\n[Migration 006] ❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration();
