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
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  // Verify POSTGRES_URL is set
  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL is not set in .env.local');
    console.error('Please make sure .env.local exists in the project root and contains:');
    console.error('POSTGRES_URL=your_postgres_connection_url_here');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  console.log('🔄 Running chat_files table migration...');

  try {
    // First, check if table already exists
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'chat_files';
    `;

    if (existingTables.length > 0) {
      console.log('✅ Table chat_files already exists - skipping migration');
      console.log('📝 No action needed');
      return;
    }

    console.log('📝 Table does not exist - creating...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', '003-create-chat-files-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the migration using neon's query method for raw SQL
    await sql.query(sqlContent);

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
