const db = require('../db');

/**
 * Migration to add roles and permissions system
 */

async function migrate() {
  console.log('Running migration: Add roles and permissions system...');

  try {
    // Create roles table
    await db.run(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created roles table');

    // Create permissions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        resource VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created permissions table');

    // Create role_permissions pivot table
    await db.run(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ Created role_permissions table');

    // Add role_id column to users table (keep role column for backward compatibility)
    const columns = await db.all('PRAGMA table_info(users)');
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('role_id')) {
      await db.run('ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id)');
      console.log('✓ Added role_id column to users table');
    }

    // Create indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource)');
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
