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
      ['Trial Plan', 30, 1, 0, ['Basic features', 'Email support']],
      ['Basic Plan', 365, 1, 1500000, ['All basic features', 'Email support', '5 users']],
      ['Pro Plan', 365, 3, 4500000, ['All features', 'Priority support', '25 users', 'API access']],
      ['Enterprise Plan', 365, 10, 15000000, ['Unlimited features', '24/7 support', 'Unlimited users', 'Custom integration']]
    ];

    for (const [name, duration, maxAct, price, features] of licenseTypesA) {
      const existing = await db.get(
        'SELECT id FROM license_types WHERE product_id = ? AND name = ?',
        [product1.id, name]
      );
      if (!existing) {
        await db.run(
          `INSERT INTO license_types (product_id, name, duration_days, max_activations, price, features)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [product1.id, name, duration, maxAct, price, JSON.stringify(features)]
        );
      }
    }

    // Create license types for Product B (prices in IDR/Rupiah)
    const licenseTypesB = [
      ['Trial Plan', 14, 1, 0, ['10GB storage', 'Basic features']],
      ['Standard Plan', 365, 2, 2250000, ['100GB storage', 'File sharing', 'Mobile app']]
    ];

    for (const [name, duration, maxAct, price, features] of licenseTypesB) {
      const existing = await db.get(
        'SELECT id FROM license_types WHERE product_id = ? AND name = ?',
        [product2.id, name]
      );
      if (!existing) {
        await db.run(
          `INSERT INTO license_types (product_id, name, duration_days, max_activations, price, features)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [product2.id, name, duration, maxAct, price, JSON.stringify(features)]
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

    // Create default roles
    const roles = [
      ['admin', 'Administrator', 'Full system access with all permissions'],
      ['manager', 'Manager', 'Can manage licenses, customers, and view reports'],
      ['viewer', 'Viewer', 'Read-only access to view data'],
      ['support', 'Support', 'Can view and manage customer licenses']
    ];

    const roleIds = {};
    for (const [name, displayName, description] of roles) {
      const existing = await db.get('SELECT id FROM roles WHERE name = ?', [name]);
      if (existing) {
        roleIds[name] = existing.id;
      } else {
        const result = await db.run(
          'INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)',
          [name, displayName, description]
        );
        roleIds[name] = result.id;
      }
    }
    console.log('✓ Default roles created/verified');

    // Create permissions (resource, action, description)
    const permissions = [
      // Dashboard
      ['dashboard.view', 'dashboard', 'view', 'View dashboard statistics'],

      // Products
      ['products.view', 'products', 'view', 'View products list'],
      ['products.create', 'products', 'create', 'Create new products'],
      ['products.edit', 'products', 'edit', 'Edit existing products'],
      ['products.delete', 'products', 'delete', 'Delete products'],

      // Customers
      ['customers.view', 'customers', 'view', 'View customers list'],
      ['customers.create', 'customers', 'create', 'Create new customers'],
      ['customers.edit', 'customers', 'edit', 'Edit customer information'],
      ['customers.delete', 'customers', 'delete', 'Delete customers'],

      // Licenses
      ['licenses.view', 'licenses', 'view', 'View licenses list'],
      ['licenses.create', 'licenses', 'create', 'Generate new licenses'],
      ['licenses.edit', 'licenses', 'edit', 'Edit license information'],
      ['licenses.delete', 'licenses', 'delete', 'Delete licenses'],
      ['licenses.renew', 'licenses', 'renew', 'Renew licenses'],
      ['licenses.revoke', 'licenses', 'revoke', 'Revoke licenses'],
      ['licenses.suspend', 'licenses', 'suspend', 'Suspend licenses'],

      // Users
      ['users.view', 'users', 'view', 'View users list'],
      ['users.create', 'users', 'create', 'Create new users'],
      ['users.edit', 'users', 'edit', 'Edit user information'],
      ['users.delete', 'users', 'delete', 'Delete users'],

      // Roles
      ['roles.view', 'roles', 'view', 'View roles list'],
      ['roles.create', 'roles', 'create', 'Create new roles'],
      ['roles.edit', 'roles', 'edit', 'Edit role information'],
      ['roles.delete', 'roles', 'delete', 'Delete roles'],

      // Permissions
      ['permissions.view', 'permissions', 'view', 'View permissions list'],
      ['permissions.assign', 'permissions', 'assign', 'Assign permissions to roles'],

      // Reports
      ['reports.view', 'reports', 'view', 'View reports'],
      ['reports.export', 'reports', 'export', 'Export reports to CSV/PDF'],

      // Settings
      ['settings.view', 'settings', 'view', 'View system settings'],
      ['settings.edit', 'settings', 'edit', 'Edit system settings'],

      // Features
      ['features.view', 'features', 'view', 'View features list']
    ];

    const permissionIds = {};
    for (const [name, resource, action, description] of permissions) {
      const existing = await db.get('SELECT id FROM permissions WHERE name = ?', [name]);
      if (existing) {
        permissionIds[name] = existing.id;
      } else {
        const result = await db.run(
          'INSERT INTO permissions (name, resource, action, description) VALUES (?, ?, ?, ?)',
          [name, resource, action, description]
        );
        permissionIds[name] = result.id;
      }
    }
    console.log('✓ Default permissions created/verified');

    // Assign permissions to roles
    const rolePermissions = {
      'admin': Object.keys(permissionIds), // Admin gets all permissions
      'manager': [
        'dashboard.view',
        'products.view', 'products.edit',
        'customers.view', 'customers.create', 'customers.edit',
        'licenses.view', 'licenses.create', 'licenses.edit', 'licenses.renew', 'licenses.suspend',
        'reports.view', 'reports.export',
        'features.view'
      ],
      'viewer': [
        'dashboard.view',
        'products.view',
        'customers.view',
        'licenses.view',
        'reports.view',
        'features.view'
      ],
      'support': [
        'dashboard.view',
        'customers.view', 'customers.edit',
        'licenses.view', 'licenses.create', 'licenses.renew',
        'features.view'
      ]
    };

    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      const roleId = roleIds[roleName];
      for (const permName of permissionNames) {
        const permId = permissionIds[permName];
        if (roleId && permId) {
          const existing = await db.get(
            'SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?',
            [roleId, permId]
          );
          if (!existing) {
            await db.run(
              'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
              [roleId, permId]
            );
          }
        }
      }
    }
    console.log('✓ Role permissions assigned');

    // Update existing admin user to use role_id
    const adminRole = await db.get('SELECT id FROM roles WHERE name = ?', ['admin']);
    if (adminRole) {
      await db.run(
        'UPDATE users SET role_id = ? WHERE role = ?',
        [adminRole.id, 'admin']
      );
      console.log('✓ Updated admin user with role_id');
    }

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
