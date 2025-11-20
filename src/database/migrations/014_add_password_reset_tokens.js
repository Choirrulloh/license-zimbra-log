const db = require('../db');

/**
 * Migration to add password_reset_tokens table for forgot password functionality
 */

async function migrate() {
  console.log('Running migration: Add password_reset_tokens table...');

  try {
    // Create password_reset_tokens table
    await db.run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        token VARCHAR(100) UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT 0,
        used_at DATETIME,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created password_reset_tokens table');

    // Create index on token for faster lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
      ON password_reset_tokens(token)
    `);
    console.log('✓ Created index on token column');

    // Create index on expires_at for cleanup queries
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
      ON password_reset_tokens(expires_at)
    `);
    console.log('✓ Created index on expires_at column');

    console.log('\n✅ Migration completed successfully!');
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
