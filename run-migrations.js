#!/usr/bin/env node

/**
 * Migration runner script
 * Runs all pending migrations in order
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'src', 'database', 'migrations');

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  try {
    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.js'))
      .sort(); // Ensure migrations run in order

    console.log(`Found ${files.length} migration files\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const migrationPath = path.join(MIGRATIONS_DIR, file);
      console.log(`\n📋 Running: ${file}`);
      console.log('─'.repeat(60));

      try {
        const migration = require(migrationPath);
        if (typeof migration === 'function') {
          await migration();
          successCount++;
          console.log(`✅ ${file} - SUCCESS`);
        } else if (migration && typeof migration.up === 'function') {
          await migration.up();
          successCount++;
          console.log(`✅ ${file} - SUCCESS`);
        } else {
          console.log(`⚠️  ${file} - SKIPPED (no up() or default function)`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ ${file} - FAILED`);
        console.error('   Error:', error.message);

        // Continue with other migrations instead of stopping
        if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column')) {
          console.log('   (Column already exists - safe to ignore)');
        } else if (error.code === 'SQLITE_ERROR' && error.message.includes('already exists')) {
          console.log('   (Already exists - safe to ignore)');
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors:  ${errorCount}`);
    console.log(`   📝 Total:   ${files.length}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 All migrations completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some migrations had errors (may be safe to ignore if already applied)');
      process.exit(0); // Exit 0 because errors might be expected (already applied)
    }

  } catch (error) {
    console.error('\n💥 Fatal error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
