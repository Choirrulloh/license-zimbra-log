const db = require('../db');

/**
 * Migration to add code obfuscation service tables
 */

async function migrate() {
  console.log('Running migration: Add code obfuscation service...');

  try {
    // Create code_obfuscations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS code_obfuscations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,

        -- File info
        original_filename VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash VARCHAR(64),

        -- Obfuscation settings
        obfuscation_level VARCHAR(20) NOT NULL,
        options TEXT,

        -- Output
        obfuscated_filename VARCHAR(255),
        obfuscated_size INTEGER,
        output_path VARCHAR(500),

        -- Status
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        expires_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created code_obfuscations table');

    // Create obfuscation_quotas table
    await db.run(`
      CREATE TABLE IF NOT EXISTS obfuscation_quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,

        -- Quota limits
        monthly_limit INTEGER DEFAULT 10,
        used_this_month INTEGER DEFAULT 0,

        -- File size limits
        max_file_size_mb INTEGER DEFAULT 50,

        -- Reset tracking
        reset_date DATE,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created obfuscation_quotas table');

    // Create indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_user ON code_obfuscations(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_status ON code_obfuscations(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_created ON code_obfuscations(created_at)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_hash ON code_obfuscations(file_hash)');
    console.log('✓ Created indexes');

    // Initialize quotas for existing users
    await db.run(`
      INSERT INTO obfuscation_quotas (user_id, monthly_limit, used_this_month, max_file_size_mb, reset_date)
      SELECT id, 10, 0, 50, date('now', 'start of month', '+1 month')
      FROM users
      WHERE id NOT IN (SELECT user_id FROM obfuscation_quotas)
    `);
    console.log('✓ Initialized quotas for existing users');

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
