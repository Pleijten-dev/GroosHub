/**
 * Check if chat_files table exists
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

async function checkTable() {
  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL is not set in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  try {
    console.log('🔍 Checking if chat_files table exists...\n');

    // Check if table exists
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'chat_files';
    `;

    if (tables.length > 0) {
      console.log('✅ chat_files table EXISTS');

      // Get column info
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'chat_files'
        ORDER BY ordinal_position;
      `;

      console.log('\n📊 Table structure:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });

      // Check indexes
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'chat_files';
      `;

      console.log(`\n📑 Indexes: ${indexes.length} found`);
      indexes.forEach((idx: any) => {
        console.log(`  - ${idx.indexname}`);
      });

      console.log('\n✅ No migration needed - table already exists!');

    } else {
      console.log('❌ chat_files table DOES NOT exist');
      console.log('📝 You need to run the migration.');
    }

  } catch (error) {
    console.error('❌ Error checking table:', error);
    process.exit(1);
  }
}

checkTable();
