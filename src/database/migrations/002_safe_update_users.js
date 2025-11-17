const db = require('../db');

/**
 * Migration to add missing columns to users table (safe migration)
 * This migration checks if columns exist before adding them
 */

async function migrate() {
  console.log('Running safe migration for users table...');

  try {
    // Get current columns
    const columns = await db.all('PRAGMA table_info(users)');
    const columnNames = columns.map(col => col.name);

    // Add is_active if not exists
    if (!columnNames.includes('is_active')) {
      console.log('Adding is_active column...');
      await db.run('ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1');
    }

    // Add last_login if not exists
    if (!columnNames.includes('last_login')) {
      console.log('Adding last_login column...');
      await db.run('ALTER TABLE users ADD COLUMN last_login DATETIME');
    }

    // Add phone if not exists
    if (!columnNames.includes('phone')) {
      console.log('Adding phone column...');
      await db.run('ALTER TABLE users ADD COLUMN phone VARCHAR(50)');
    }

    console.log('Users table migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;
