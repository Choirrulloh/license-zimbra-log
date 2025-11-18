const db = require('../db');

/**
 * Migration to add email templates system
 */

async function migrate() {
  console.log('Running migration: Add email templates system...');

  try {
    // Create email_templates table
    await db.run(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        language VARCHAR(5) NOT NULL,
        design_variation INTEGER NOT NULL DEFAULT 1,
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT,
        variables TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, language, design_variation)
      )
    `);
    console.log('✓ Created email_templates table');

    // Create email_logs table
    await db.run(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        subject TEXT NOT NULL,
        body_html TEXT,
        body_text TEXT,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ Created email_logs table');

    // Create indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_templates_language ON email_templates(language)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at)');
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
