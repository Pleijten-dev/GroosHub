#!/usr/bin/env node

/**
 * Database migration script for chat feature
 *
 * Usage:
 *   node src/features/chat/scripts/migrate.js
 *
 * Requirements:
 *   - POSTGRES_URL environment variable must be set
 *   - @neondatabase/serverless package must be installed
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting chat database migration...\n');

  // Check for POSTGRES_URL
  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL environment variable is not set');
    console.error('   Please create .env.local and add your database URL\n');
    process.exit(1);
  }

  try {
    // Import Neon
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.POSTGRES_URL);

    // Read migration file
    const migrationPath = path.join(__dirname, '../../../lib/db/migrations/002_chat_schema.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Reading migration file...');
    console.log(`   ${migrationPath}\n`);

    // Execute migration
    console.log('⚙️  Executing migration...');
    await sql(migration);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - chats');
    console.log('   - messages');
    console.log('   - message_votes');
    console.log('\n🎉 Chat feature is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nDetails:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
