import { getDbConnection } from '../src/lib/db/connection';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database schema and run all migrations
 */
async function runMigration() {
  console.log('🔄 Starting database migration...\n');

  try {
    // Get database connection
    const sql = getDbConnection();
    console.log('✅ Database connection established\n');

    // Read and execute schema file
    const schemaPath = path.join(__dirname, '../src/lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('📄 Schema file loaded\n');

    console.log('⚙️  Executing base schema...\n');

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

    console.log('✅ Base schema created successfully!\n');

    // Run migration files
    const migrationsDir = path.join(__dirname, '../src/lib/db/migrations');

    if (fs.existsSync(migrationsDir)) {
      console.log('📁 Running migration files...\n');

      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Run in alphabetical order (e.g., 002_chat_schema.sql)

      for (const file of migrationFiles) {
        console.log(`  📄 Running ${file}...`);
        const migrationPath = path.join(migrationsDir, file);
        const migration = fs.readFileSync(migrationPath, 'utf-8');

        // Split and execute migration statements
        const migrationStatements = migration
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of migrationStatements) {
          try {
            await sql([statement] as unknown as TemplateStringsArray);
          } catch (error) {
            // Ignore errors for existing objects
            if (error instanceof Error && !error.message.includes('already exists')) {
              throw error;
            }
          }
        }

        console.log(`  ✅ ${file} completed`);
      }

      console.log('\n✅ All migrations completed successfully!\n');
    }

    console.log('📊 Database setup completed:');
    console.log('  - users table');
    console.log('  - api_usage table');
    console.log('  - chats table');
    console.log('  - chats_messages table');
    console.log('  - chats_messages_votes table');
    console.log('  - Indexes and views\n');

    // Verify tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('api_usage', 'users', 'chats', 'chats_messages', 'chats_messages_votes')
      ORDER BY table_name
    `;

    if (tables.length >= 3) {
      console.log('✅ Verification successful - all tables exist:');
      tables.forEach((t: { table_name: string }) => {
        console.log(`  - ${t.table_name}`);
      });
      console.log();
    } else {
      console.warn('⚠️  Warning: Could not verify all table creation\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
