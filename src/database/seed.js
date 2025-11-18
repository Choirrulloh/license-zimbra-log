const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

async function seed() {
  try {
    console.log('Starting database seeding...');

    // Create default admin user
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);

    try {
      await db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [process.env.ADMIN_EMAIL || 'admin@example.com', hashedPassword, 'Administrator', 'admin']
      );
      console.log('✓ Admin user created');
    } catch (err) {
      console.log('Admin user already exists');
    }

    // Create sample products (skip if already exists)
    let product1, product2;

    // Check if Product A exists
    const existingProduct1 = await db.get('SELECT id FROM products WHERE name = ?', ['Product A']);
    if (existingProduct1) {
      product1 = existingProduct1;
      console.log('Product A already exists, skipping...');
    } else {
      product1 = await db.run(
        'INSERT INTO products (name, description, version, is_active) VALUES (?, ?, ?, ?)',
        ['Product A', 'Enterprise Management Software', '1.0.0', 1]
      );
      console.log('✓ Product A created');
    }

    // Check if Product B exists
    const existingProduct2 = await db.get('SELECT id FROM products WHERE name = ?', ['Product B']);
    if (existingProduct2) {
      product2 = existingProduct2;
      console.log('Product B already exists, skipping...');
    } else {
      product2 = await db.run(
        'INSERT INTO products (name, description, version, is_active) VALUES (?, ?, ?, ?)',
        ['Product B', 'Cloud Storage Solution', '2.1.0', 1]
      );
      console.log('✓ Product B created');
    }

    // Create license types for Product A (prices in IDR/Rupiah)
    const licenseTypesA = [
      ['Trial', 'trial', 30, 1, 0, ['Basic features', 'Email support']],
      ['Basic', 'basic', 365, 1, 1500000, ['All basic features', 'Email support', '5 users']],
      ['Pro', 'pro', 365, 3, 4500000, ['All features', 'Priority support', '25 users', 'API access']],
      ['Enterprise', 'enterprise', 365, 10, 15000000, ['Unlimited features', '24/7 support', 'Unlimited users', 'Custom integration']]
    ];

    for (const [name, type, duration, maxAct, price, features] of licenseTypesA) {
      const existing = await db.get(
        'SELECT id FROM license_types WHERE product_id = ? AND name = ?',
        [product1.id, name]
      );
      if (!existing) {
        await db.run(
          `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product1.id, name, type, duration, maxAct, price, JSON.stringify(features)]
        );
      }
    }

    // Create license types for Product B (prices in IDR/Rupiah)
    const licenseTypesB = [
      ['Trial', 'trial', 14, 1, 0, ['10GB storage', 'Basic features']],
      ['Standard', 'basic', 365, 2, 2250000, ['100GB storage', 'File sharing', 'Mobile app']]
    ];

    for (const [name, type, duration, maxAct, price, features] of licenseTypesB) {
      const existing = await db.get(
        'SELECT id FROM license_types WHERE product_id = ? AND name = ?',
        [product2.id, name]
      );
      if (!existing) {
        await db.run(
          `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product2.id, name, type, duration, maxAct, price, JSON.stringify(features)]
        );
      }
    }

    console.log('✓ License types created/verified');

    // Create sample customers (skip if already exists)
    const customers = [
      ['John Doe', 'john@example.com', 'Acme Corp', '+1234567890', '123 Main St, City, Country'],
      ['Jane Smith', 'jane@techstart.com', 'TechStart Inc', '+0987654321', '456 Tech Ave, Silicon Valley']
    ];

    for (const [name, email, company, phone, address] of customers) {
      const existing = await db.get('SELECT id FROM customers WHERE email = ?', [email]);
      if (!existing) {
        await db.run(
          'INSERT INTO customers (name, email, company, phone, address) VALUES (?, ?, ?, ?, ?)',
          [name, email, company, phone, address]
        );
      }
    }

    console.log('✓ Sample customers created/verified');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nDefault admin credentials:');
    console.log('Email:', process.env.ADMIN_EMAIL || 'admin@example.com');
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');

    await db.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
