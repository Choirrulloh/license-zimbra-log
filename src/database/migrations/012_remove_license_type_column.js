const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../database/license.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration: Remove type column from license_types table...\n');

db.serialize(() => {
  // Step 1: Create new table without type column
  console.log('Creating new license_types table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS license_types_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      duration_days INTEGER NOT NULL,
      max_activations INTEGER DEFAULT 1,
      price DECIMAL(10,2) DEFAULT 0,
      features TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err);
      process.exit(1);
    }
  });

  // Step 2: Copy data from old table to new table (excluding type column)
  console.log('Copying data...');
  db.run(`
    INSERT INTO license_types_new
      (id, product_id, name, duration_days, max_activations, price, features, is_active, created_at, updated_at)
    SELECT
      id, product_id, name, duration_days, max_activations, price, features, is_active, created_at, updated_at
    FROM license_types
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err);
      process.exit(1);
    }
  });

  // Step 3: Drop old table
  console.log('Dropping old table...');
  db.run('DROP TABLE license_types', (err) => {
    if (err) {
      console.error('Error dropping old table:', err);
      process.exit(1);
    }
  });

  // Step 4: Rename new table
  console.log('Renaming new table...');
  db.run('ALTER TABLE license_types_new RENAME TO license_types', (err) => {
    if (err) {
      console.error('Error renaming table:', err);
      process.exit(1);
    }

    console.log('✓ Removed type column from license_types table');
    console.log('\nMigration completed successfully!');

    db.close();
  });
});
