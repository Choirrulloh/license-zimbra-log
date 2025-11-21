const db = require('../db');

async function up() {
  console.log('Running migration: Add user suspension columns...');

  // Check if columns exist
  const tableInfo = await db.all("PRAGMA table_info(users)");
  const columns = tableInfo.map(col => col.name);

  if (!columns.includes('suspended')) {
    await db.run(`ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0`);
    console.log('✓ Added suspended column');
  }

  if (!columns.includes('suspended_at')) {
    await db.run(`ALTER TABLE users ADD COLUMN suspended_at TEXT`);
    console.log('✓ Added suspended_at column');
  }

  if (!columns.includes('suspended_reason')) {
    await db.run(`ALTER TABLE users ADD COLUMN suspended_reason TEXT`);
    console.log('✓ Added suspended_reason column');
  }

  // Also add for customers table
  const customerTableInfo = await db.all("PRAGMA table_info(customers)");
  const customerColumns = customerTableInfo.map(col => col.name);

  if (!customerColumns.includes('suspended')) {
    await db.run(`ALTER TABLE customers ADD COLUMN suspended INTEGER DEFAULT 0`);
    console.log('✓ Added suspended column to customers');
  }

  if (!customerColumns.includes('suspended_at')) {
    await db.run(`ALTER TABLE customers ADD COLUMN suspended_at TEXT`);
    console.log('✓ Added suspended_at column to customers');
  }

  if (!customerColumns.includes('suspended_reason')) {
    await db.run(`ALTER TABLE customers ADD COLUMN suspended_reason TEXT`);
    console.log('✓ Added suspended_reason column to customers');
  }

  console.log('✓ Migration completed: User suspension');
}

async function down() {
  // SQLite doesn't support DROP COLUMN easily
  console.log('Down migration not supported for this migration');
}

module.exports = { up, down };
