const db = require('../db');

/**
 * Migration to add customer support to code obfuscation
 */

async function migrate() {
  console.log('Running migration: Add customer support to code obfuscation...');

  try {
    // Add customer_id column to code_obfuscations table
    await db.run(`
      ALTER TABLE code_obfuscations
      ADD COLUMN customer_id INTEGER
    `);
    console.log('✓ Added customer_id column to code_obfuscations table');

    // Make user_id nullable by creating new table and copying data
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    await db.run(`
      CREATE TABLE code_obfuscations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_id INTEGER,

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

        -- License injection info
        license_injected INTEGER DEFAULT 0,
        injected_product_id INTEGER,
        validation_options TEXT,

        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        expires_at DATETIME,

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created new code_obfuscations table with customer support');

    // Copy existing data
    await db.run(`
      INSERT INTO code_obfuscations_new
      SELECT id, user_id, NULL as customer_id, original_filename, file_size, file_hash,
             obfuscation_level, options, obfuscated_filename, obfuscated_size, output_path,
             status, error_message, license_injected, injected_product_id, validation_options,
             created_at, completed_at, expires_at
      FROM code_obfuscations
    `);
    console.log('✓ Copied existing data');

    // Drop old table
    await db.run('DROP TABLE code_obfuscations');
    console.log('✓ Dropped old table');

    // Rename new table
    await db.run('ALTER TABLE code_obfuscations_new RENAME TO code_obfuscations');
    console.log('✓ Renamed new table');

    // Recreate indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_user ON code_obfuscations(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_customer ON code_obfuscations(customer_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_status ON code_obfuscations(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_created ON code_obfuscations(created_at)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_code_obf_hash ON code_obfuscations(file_hash)');
    console.log('✓ Recreated indexes');

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
