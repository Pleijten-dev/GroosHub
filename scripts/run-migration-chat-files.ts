/**
 * Run Chat Files Table Migration
 *
 * Creates the chat_files table for storing file upload metadata
 *
 * Usage: npx tsx scripts/run-migration-chat-files.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const sql = neon(process.env.POSTGRES_URL!);

  console.log('🔄 Running chat_files table migration...');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', '003-create-chat-files-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the migration
    await sql(sqlContent);

    console.log('✅ Migration completed successfully!');
    console.log('📝 Created table: chat_files');
    console.log('📝 Created 6 indexes for performance');

    // Verify table creation
    const result = await sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
      ORDER BY ordinal_position;
    `;

    console.log('\n📊 Table structure:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
