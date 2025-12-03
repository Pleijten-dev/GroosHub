/**
 * Run Chat Files ALTER TABLE Migration for R2 Support
 *
 * Updates the existing chat_files table with R2-specific fields
 *
 * Usage: npx tsx scripts/run-migration-alter-chat-files.ts
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

  console.log('🔄 Running ALTER TABLE migration for R2 support...\n');

  try {
    // First, check current table structure
    console.log('📋 Current table structure:');
    const currentColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
      ORDER BY ordinal_position;
    `;

    currentColumns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
    });

    // Check which new columns already exist
    const columnNames = currentColumns.map((c: any) => c.column_name);
    const hasUserId = columnNames.includes('user_id');
    const hasStorageKey = columnNames.includes('storage_key');
    const hasExpiresAt = columnNames.includes('expires_at');

    console.log('\n🔍 Checking for new columns:');
    console.log(`  - user_id: ${hasUserId ? '✅ already exists' : '❌ needs to be added'}`);
    console.log(`  - storage_key: ${hasStorageKey ? '✅ already exists' : '❌ needs to be added'}`);
    console.log(`  - expires_at: ${hasExpiresAt ? '✅ already exists' : '❌ needs to be added'}`);

    if (hasUserId && hasStorageKey && hasExpiresAt) {
      console.log('\n✅ All R2 columns already exist - checking constraints and indexes...');
    } else {
      console.log('\n📝 Running migration to add missing columns...');
    }

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', '004-alter-chat-files-for-r2.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Execute the migration
    // Split by semicolons and execute each statement separately
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      try {
        await sql.unsafe(statement + ';');
      } catch (error: any) {
        // Ignore errors for already existing constraints/indexes
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          continue;
        }
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify the changes
    console.log('\n📊 Updated table structure:');
    const updatedColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_files'
      ORDER BY ordinal_position;
    `;

    updatedColumns.forEach((col: any) => {
      const isNew = !columnNames.includes(col.column_name);
      const marker = isNew ? ' 🆕' : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}${marker}`);
    });

    // Check indexes
    console.log('\n📑 Indexes:');
    const indexes = await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'chat_files'
      ORDER BY indexname;
    `;

    indexes.forEach((idx: any) => {
      console.log(`  - ${idx.indexname}`);
    });

    console.log('\n✨ Table is now ready for R2 file uploads!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
