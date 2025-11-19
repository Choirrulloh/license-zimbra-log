const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../database/license.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting features table simplification migration...');

// SQLite doesn't support DROP COLUMN directly, so we need to:
// 1. Create new table with simplified schema
// 2. Copy data
// 3. Drop old table
// 4. Rename new table

db.serialize(() => {
  // Create new simplified features table
  console.log('Creating simplified features table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS features_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      name VARCHAR(100) NOT NULL,
      feature_key VARCHAR(100) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, feature_key)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating simplified features table:', err);
      process.exit(1);
    }
  });

  // Copy data from old table to new table
  console.log('Copying data to simplified table...');
  db.run(`
    INSERT INTO features_new (id, product_id, name, feature_key, description, created_at, updated_at)
    SELECT id, product_id, name, feature_key, description, created_at, updated_at
    FROM features
  `, (err) => {
    if (err) {
      console.error('Error copying data:', err);
      process.exit(1);
    }
  });

  // Drop old table
  console.log('Dropping old features table...');
  db.run('DROP TABLE features', (err) => {
    if (err) {
      console.error('Error dropping old table:', err);
      process.exit(1);
    }
  });

  // Rename new table
  console.log('Renaming new table...');
  db.run('ALTER TABLE features_new RENAME TO features', (err) => {
    if (err) {
      console.error('Error renaming table:', err);
      process.exit(1);
    }
  });

  // Recreate indexes
  console.log('Recreating indexes...');
  db.run('CREATE INDEX IF NOT EXISTS idx_features_product_id ON features(product_id)', (err) => {
    if (err) {
      console.error('Error creating index:', err);
      process.exit(1);
    }
  });

  db.run('CREATE INDEX IF NOT EXISTS idx_features_feature_key ON features(feature_key)', (err) => {
    if (err) {
      console.error('Error creating index:', err);
      process.exit(1);
    }

    console.log('\n✓ Migration completed successfully');
    console.log('Removed columns: category, display_order, is_active');
    console.log('Kept columns: id, product_id, name, feature_key, description, created_at, updated_at\n');

    db.close();
    process.exit(0);
  });
});
