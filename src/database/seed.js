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

    // Create sample customer for customer portal (skip if exists)
    const existingCustomer = await db.get('SELECT id FROM customers WHERE email = ?', ['customer@example.com']);
    let customerId;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('Sample customer already exists, skipping...');
    } else {
      const customerPassword = await bcrypt.hash('customer123', 10);
      const customerResult = await db.run(
        `INSERT INTO customers (
          name, email, company, phone, address,
          password, is_active, must_change_password,
          license_limit, license_used,
          code_protection_limit, code_protection_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'John Doe',
          'customer@example.com',
          'ABC Corporation',
          '+1234567890',
          '123 Main Street, City, Country',
          customerPassword,
          1,
          0, // Password already changed
          10, // License limit
          0,  // License used
          5,  // Code protection limit
          0   // Code protection used
        ]
      );
      customerId = customerResult.id;
      console.log('✓ Sample customer created');

      // Grant product access to sample customer
      await db.run(
        'INSERT INTO customer_product_access (customer_id, product_id, can_generate_license) VALUES (?, ?, 1)',
        [customerId, product1.id]
      );
      await db.run(
        'INSERT INTO customer_product_access (customer_id, product_id, can_generate_license) VALUES (?, ?, 1)',
        [customerId, product2.id]
      );
      console.log('✓ Customer product access granted');
    }

    // Create customer_access email template (skip if exists)
    const existingTemplate = await db.get(
      'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ?',
      ['customer_access', 'en', 1]
    );

    if (existingTemplate) {
      console.log('Customer access email template already exists, skipping...');
    } else {
      await db.run(
        `INSERT INTO email_templates (
          name, type, language, design_variation, subject, body_html, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'customer_access',
          'customer',
          'en',
          1,
          'Welcome to Customer Portal - Your Access Details',
          `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .credentials { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
    .quota { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Customer Portal!</h1>
      <p>Your account has been created successfully</p>
    </div>

    <div class="content">
      <p>Hi <strong>{{customer.name}}</strong>,</p>

      <p>Your customer portal account has been created! You can now manage your licenses, generate new ones, and use code protection features.</p>

      <div class="credentials">
        <h3 style="margin-top: 0;">🔐 Login Credentials</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Email:</strong></td>
            <td style="padding: 8px 0;">{{customer.email}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Password:</strong></td>
            <td style="padding: 8px 0;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{{customer.password}}</code></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Login URL:</strong></td>
            <td style="padding: 8px 0;"><a href="{{customer.login_url}}">{{customer.login_url}}</a></td>
          </tr>
        </table>
      </div>

      <div class="warning">
        <strong>⚠️ Security Notice:</strong> For your security, please change your password after first login.
      </div>

      <h3>📊 Your Quotas</h3>

      <div class="quota">
        <strong>🔑 License Limit:</strong> {{customer.license_limit}}
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">You can generate up to {{customer.license_limit}} licenses</p>
      </div>

      <div class="quota">
        <strong>🛡️ Code Protection Limit:</strong> {{customer.code_protection_limit}}
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">You can create up to {{customer.code_protection_limit}} code protections</p>
      </div>

      <h3>✨ What You Can Do</h3>
      <ul>
        <li>View all your licenses and their status</li>
        <li>Generate new licenses (within your quota)</li>
        <li>Create code protections for your software</li>
        <li>Browse available products</li>
        <li>Manage your profile and settings</li>
      </ul>

      <center>
        <a href="{{customer.login_url}}" class="button">Login to Customer Portal →</a>
      </center>

      <p style="margin-top: 30px;">If you have any questions or need assistance, please contact your administrator.</p>
    </div>

    <div class="footer">
      <p>© 2024 SaaS Licensing System. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`,
          1
        ]
      );
      console.log('✓ Customer access email template created');
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nDefault admin credentials:');
    console.log('Email:', process.env.ADMIN_EMAIL || 'admin@example.com');
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');
    console.log('\nSample customer credentials:');
    console.log('Email: customer@example.com');
    console.log('Password: customer123');
    console.log('Login URL: /customer/login');

    await db.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
