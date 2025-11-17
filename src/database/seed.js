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

    // Create sample products
    const product1 = await db.run(
      'INSERT INTO products (name, description, version, is_active) VALUES (?, ?, ?, ?)',
      ['Product A', 'Enterprise Management Software', '1.0.0', 1]
    );

    const product2 = await db.run(
      'INSERT INTO products (name, description, version, is_active) VALUES (?, ?, ?, ?)',
      ['Product B', 'Cloud Storage Solution', '2.1.0', 1]
    );

    console.log('✓ Sample products created');

    // Create license types for Product A (prices in IDR/Rupiah)
    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product1.id, 'Trial', 'trial', 30, 1, 0, JSON.stringify(['Basic features', 'Email support'])]
    );

    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product1.id, 'Basic', 'basic', 365, 1, 1500000, JSON.stringify(['All basic features', 'Email support', '5 users'])]
    );

    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product1.id, 'Pro', 'pro', 365, 3, 4500000, JSON.stringify(['All features', 'Priority support', '25 users', 'API access'])]
    );

    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product1.id, 'Enterprise', 'enterprise', 365, 10, 15000000, JSON.stringify(['Unlimited features', '24/7 support', 'Unlimited users', 'Custom integration'])]
    );

    // Create license types for Product B (prices in IDR/Rupiah)
    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product2.id, 'Trial', 'trial', 14, 1, 0, JSON.stringify(['10GB storage', 'Basic features'])]
    );

    await db.run(
      `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product2.id, 'Standard', 'basic', 365, 2, 2250000, JSON.stringify(['100GB storage', 'File sharing', 'Mobile app'])]
    );

    console.log('✓ License types created');

    // Create sample customers
    await db.run(
      'INSERT INTO customers (name, email, company, phone, address) VALUES (?, ?, ?, ?, ?)',
      ['John Doe', 'john@example.com', 'Acme Corp', '+1234567890', '123 Main St, City, Country']
    );

    await db.run(
      'INSERT INTO customers (name, email, company, phone, address) VALUES (?, ?, ?, ?, ?)',
      ['Jane Smith', 'jane@techstart.com', 'TechStart Inc', '+0987654321', '456 Tech Ave, Silicon Valley']
    );

    console.log('✓ Sample customers created');

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
