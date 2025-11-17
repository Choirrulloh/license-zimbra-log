const db = require('../db');

/**
 * Migration to add settings table
 */

async function migrate() {
  console.log('Running migration: Add settings table...');

  try {
    // Create settings table
    await db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created settings table');

    // Insert default settings
    const defaultSettings = [
      ['app_name', 'SaaS License Manager'],
      ['app_url', 'http://localhost:3000'],
      ['timezone', 'Asia/Jakarta'],
      ['date_format', 'YYYY-MM-DD'],
      ['email_enabled', 'false'],
      ['email_from_name', 'License Manager'],
      ['email_from_address', 'noreply@example.com'],
      ['smtp_host', ''],
      ['smtp_port', '587'],
      ['smtp_secure', 'false'],
      ['smtp_user', ''],
      ['smtp_password', ''],
      ['notify_license_expiring', 'true'],
      ['notify_days_before_expiry', '30'],
      ['notify_license_expired', 'true'],
      ['notify_license_created', 'false'],
      ['notify_license_renewed', 'false'],
      ['notify_customer_welcome', 'false']
    ];

    for (const [key, value] of defaultSettings) {
      await db.run(
        `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
        [key, value]
      );
    }
    console.log('✓ Inserted default settings');

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
