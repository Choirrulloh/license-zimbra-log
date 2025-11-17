const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '../../../database/license.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('Running migration: Add activity_logs table and update users table...');

  // Add new columns to users table if they don't exist
  db.run(`
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding is_active column:', err.message);
    } else {
      console.log('✓ Added is_active column to users table');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN last_login DATETIME
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding last_login column:', err.message);
    } else {
      console.log('✓ Added last_login column to users table');
    }
  });

  db.run(`
    ALTER TABLE users ADD COLUMN phone VARCHAR(50)
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding phone column:', err.message);
    } else {
      console.log('✓ Added phone column to users table');
    }
  });

  // Create activity_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      description TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `, (err) => {
    if (err) {
      console.error('Error creating activity_logs table:', err.message);
    } else {
      console.log('✓ Created activity_logs table');
    }
  });

  // Create indexes for activity_logs
  db.run('CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)', (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✓ Created index on activity_logs.user_id');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id)', (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✓ Created index on activity_logs entity');
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)', (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✓ Created index on activity_logs.created_at');
      console.log('\n✅ Migration completed successfully!');
      db.close();
    }
  });
});
