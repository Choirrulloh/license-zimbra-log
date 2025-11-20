const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../database/license.db');
const db = new sqlite3.Database(dbPath);

console.log('Running migration 013: Add Customer Portal Support...');

db.serialize(() => {
  // Step 1: Create new customers table with portal columns
  console.log('Creating new customers table with portal columns...');
  db.run(`
    CREATE TABLE IF NOT EXISTS customers_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      company TEXT,
      phone TEXT,
      address TEXT,
      password TEXT,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      must_change_password INTEGER DEFAULT 1,
      license_limit INTEGER DEFAULT 0,
      license_used INTEGER DEFAULT 0,
      code_protection_limit INTEGER DEFAULT 0,
      code_protection_used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating customers_new table:', err.message);
      return;
    }
    console.log('✓ Created customers_new table');

    // Step 2: Copy existing data
    console.log('Copying existing customer data...');
    db.run(`
      INSERT INTO customers_new (id, name, email, company, phone, address, created_at, updated_at)
      SELECT id, name, email, company, phone, address, created_at, updated_at
      FROM customers
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err.message);
        return;
      }
      console.log('✓ Copied existing customer data');

      // Step 3: Drop old table
      console.log('Dropping old customers table...');
      db.run('DROP TABLE customers', (err) => {
        if (err) {
          console.error('Error dropping old table:', err.message);
          return;
        }
        console.log('✓ Dropped old customers table');

        // Step 4: Rename new table
        console.log('Renaming new table to customers...');
        db.run('ALTER TABLE customers_new RENAME TO customers', (err) => {
          if (err) {
            console.error('Error renaming table:', err.message);
            return;
          }
          console.log('✓ Renamed table to customers');

          // Step 5: Create customer_product_access table
          console.log('Creating customer_product_access table...');
          db.run(`
            CREATE TABLE IF NOT EXISTS customer_product_access (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER NOT NULL,
              product_id INTEGER NOT NULL,
              can_generate_license INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
              FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
              UNIQUE(customer_id, product_id)
            )
          `, (err) => {
            if (err) {
              console.error('Error creating customer_product_access table:', err.message);
              return;
            }
            console.log('✓ Created customer_product_access table');

            // Step 6: Create customer_sessions table for tracking
            console.log('Creating customer_sessions table...');
            db.run(`
              CREATE TABLE IF NOT EXISTS customer_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                admin_id INTEGER,
                is_impersonation INTEGER DEFAULT 0,
                login_time TEXT DEFAULT CURRENT_TIMESTAMP,
                logout_time TEXT,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
              )
            `, (err) => {
              if (err) {
                console.error('Error creating customer_sessions table:', err.message);
                return;
              }
              console.log('✓ Created customer_sessions table');
              console.log('✅ Migration 013 completed successfully!');

              db.close((err) => {
                if (err) {
                  console.error('Error closing database:', err.message);
                } else {
                  console.log('Database connection closed.');
                }
              });
            });
          });
        });
      });
    });
  });
});
