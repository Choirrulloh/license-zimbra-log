const db = require('../db');

/**
 * Migration to add license_renewals table for tracking customer renewal requests
 */

async function migrate() {
  console.log('Running migration: Add license_renewals table...');

  try {
    // Create license_renewals table
    await db.run(`
      CREATE TABLE IF NOT EXISTS license_renewals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        requested_at DATETIME NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER,
        approved_at DATETIME,
        rejected_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    console.log('✓ Created license_renewals table');

    // Create index on license_id for faster lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_license_renewals_license_id
      ON license_renewals(license_id)
    `);
    console.log('✓ Created index on license_id column');

    // Create index on customer_id for faster lookups
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_license_renewals_customer_id
      ON license_renewals(customer_id)
    `);
    console.log('✓ Created index on customer_id column');

    // Create index on status for filtering
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_license_renewals_status
      ON license_renewals(status)
    `);
    console.log('✓ Created index on status column');

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
