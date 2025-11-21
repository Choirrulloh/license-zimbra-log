const db = require('../db');

async function migrate() {
  console.log('Running migration: 018_add_impersonation_tokens');

  try {
    // Create impersonation_tokens table
    await db.run(`
      CREATE TABLE IF NOT EXISTS impersonation_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )
    `);
    console.log('✓ Created impersonation_tokens table');

    // Create index for faster token lookup
    await db.run('CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_token ON impersonation_tokens(token)');
    console.log('✓ Created index on impersonation_tokens.token');

    console.log('✅ Migration 018_add_impersonation_tokens completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = migrate;
