const db = require('../db');

/**
 * Migration: Add is_default column to email_templates
 * Purpose: Allow setting one template per type as the default template
 */

async function migrate() {
  console.log('Running migration: Add is_default to email_templates...');

  try {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const columns = await db.all(`PRAGMA table_info(${tableName})`);
      return columns.some(col => col.name === columnName);
    };

    // Add is_default column (only if it doesn't exist)
    if (!(await columnExists('email_templates', 'is_default'))) {
      await db.run(`
        ALTER TABLE email_templates
        ADD COLUMN is_default INTEGER DEFAULT 0
      `);
      console.log('✓ Added is_default column to email_templates');
    } else {
      console.log('⊳ Column is_default already exists');
    }

    // Set English Design 1 as default for all email types
    const emailTypes = [
      'welcome_email',
      'password_reset',
      'license_created',
      'license_expiring',
      'license_expired',
      'license_renewed',
      'role_changed',
      'monthly_report'
    ];

    for (const type of emailTypes) {
      await db.run(`
        UPDATE email_templates
        SET is_default = 1
        WHERE name = ? AND language = 'en' AND design_variation = 1
      `, [type]);
      console.log(`✓ Set default template for ${type}`);
    }

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
