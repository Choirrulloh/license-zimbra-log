const db = require('../db');

/**
 * Migration to add bash license injection support
 */

async function migrate() {
  console.log('Running migration: Add bash license injection support...');

  try {
    // Add columns to code_obfuscations table
    await db.run(`
      ALTER TABLE code_obfuscations
      ADD COLUMN license_injected BOOLEAN DEFAULT 0
    `);
    console.log('✓ Added license_injected column');

    await db.run(`
      ALTER TABLE code_obfuscations
      ADD COLUMN injected_product_id INTEGER
    `);
    console.log('✓ Added injected_product_id column');

    await db.run(`
      ALTER TABLE code_obfuscations
      ADD COLUMN validation_options TEXT
    `);
    console.log('✓ Added validation_options column');

    // Create table for tracking bash script validations
    await db.run(`
      CREATE TABLE IF NOT EXISTS script_license_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_id INTEGER,
        obfuscation_id INTEGER,
        script_hash VARCHAR(64),
        validation_result VARCHAR(20) NOT NULL,
        error_message TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL,
        FOREIGN KEY (obfuscation_id) REFERENCES code_obfuscations(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Created script_license_validations table');

    // Create indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_script_val_license ON script_license_validations(license_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_script_val_obf ON script_license_validations(obfuscation_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_script_val_result ON script_license_validations(validation_result)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_script_val_date ON script_license_validations(validated_at)');
    console.log('✓ Created indexes');

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
