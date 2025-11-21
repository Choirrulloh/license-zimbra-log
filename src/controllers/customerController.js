const db = require('../database/db');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/emailService');
const ActivityLogger = require('../utils/activityLogger');

class CustomerController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.edit = this.edit.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.suspend = this.suspend.bind(this);
    this.unsuspend = this.unsuspend.bind(this);
  }

  async index(req, res) {
    try {
      const customers = await db.all(
        `SELECT c.*,
                c.license_used,
                c.license_limit,
                c.code_protection_used,
                c.code_protection_limit,
                COUNT(DISTINCT l.id) as total_licenses,
                COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_licenses,
                COALESCE(SUM(t.amount), 0) as total_revenue
         FROM customers c
         LEFT JOIN licenses l ON c.id = l.customer_id
         LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'completed'
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      );

      res.render('customers/index', {
        user: req.session,
        customers,
        moment
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).send('Error loading customers');
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;

      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);

      if (!customer) {
        return res.status(404).send('Customer not found');
      }

      const licenses = await db.all(
        `SELECT l.*, p.name as product_name, lt.name as license_type_name
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.customer_id = ?
         ORDER BY l.created_at DESC`,
        [id]
      );

      const transactions = await db.all(
        `SELECT t.*, l.license_key, p.name as product_name
         FROM transactions t
         JOIN licenses l ON t.license_id = l.id
         JOIN products p ON l.product_id = p.id
         WHERE t.customer_id = ?
         ORDER BY t.transaction_date DESC`,
        [id]
      );

      const stats = await db.get(
        `SELECT
          COUNT(DISTINCT l.id) as total_licenses,
          COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_licenses,
          COALESCE(SUM(t.amount), 0) as total_spent
         FROM customers c
         LEFT JOIN licenses l ON c.id = l.customer_id
         LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'completed'
         WHERE c.id = ?`,
        [id]
      );

      res.render('customers/show', {
        user: req.session,
        customer,
        licenses,
        transactions,
        stats,
        moment
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).send('Error loading customer');
    }
  }

  async create(req, res) {
    if (req.method === 'GET') {
      // Get all active products for product access selection
      const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');

      return res.render('customers/create', {
        user: req.session,
        products,
        error: null
      });
    }

    try {
      const {
        name,
        email,
        company,
        phone,
        address,
        license_limit,
        code_protection_limit,
        send_access_email,
        product_access
      } = req.body;

      if (!name || !email) {
        const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        return res.render('customers/create', {
          user: req.session,
          products,
          error: 'Name and email are required'
        });
      }

      // Check if email already exists
      const existing = await db.get('SELECT id FROM customers WHERE email = ?', [email]);

      if (existing) {
        const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        return res.render('customers/create', {
          user: req.session,
          products,
          error: 'Email already exists'
        });
      }

      // Generate random password
      const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16 character password
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Insert customer with quotas
      const result = await db.run(
        `INSERT INTO customers (
          name, email, company, phone, address, password,
          license_limit, code_protection_limit,
          is_active, must_change_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [
          name,
          email,
          company || null,
          phone || null,
          address || null,
          hashedPassword,
          parseInt(license_limit) || 0,
          parseInt(code_protection_limit) || 0
        ]
      );

      const customerId = result.id;

      // Insert product access if any selected
      if (product_access) {
        const productIds = Array.isArray(product_access) ? product_access : [product_access];

        for (const productId of productIds) {
          await db.run(
            `INSERT INTO customer_product_access (customer_id, product_id, can_generate_license)
             VALUES (?, ?, 1)`,
            [customerId, productId]
          );
        }
      }

      // Send welcome email if checkbox checked
      if (send_access_email === 'on') {
        try {
          await emailService.sendEmail(
            'customer_access',
            email,
            name,
            {
              'customer.name': name,
              'customer.email': email,
              'customer.password': generatedPassword,
              'customer.login_url': `${process.env.APP_URL || 'http://localhost:3000'}/customer/login`,
              'customer.license_limit': parseInt(license_limit) || 0,
              'customer.code_protection_limit': parseInt(code_protection_limit) || 0
            },
            'en',
            1
          );
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
          // Don't fail the customer creation if email fails
        }
      }

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'user',
        'customer',
        customerId,
        { name, email, license_limit, code_protection_limit },
        req
      );

      res.redirect('/customers?success=Customer created successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
      res.render('customers/create', {
        user: req.session,
        products,
        error: 'Error creating customer'
      });
    }
  }

  async edit(req, res) {
    try {
      const { id } = req.params;

      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);

      if (!customer) {
        return res.status(404).send('Customer not found');
      }

      // Get all active products
      const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');

      // Get customer's product access
      const productAccess = await db.all(
        'SELECT product_id FROM customer_product_access WHERE customer_id = ?',
        [id]
      );
      const accessedProductIds = productAccess.map(pa => pa.product_id);

      res.render('customers/edit', {
        user: req.session,
        customer,
        products,
        accessedProductIds,
        error: null,
        moment: require('moment-timezone')
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).send('Error loading customer');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        company,
        phone,
        address,
        is_active,
        license_limit,
        code_protection_limit,
        product_access
      } = req.body;

      if (!name || !email) {
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        const productAccess = await db.all(
          'SELECT product_id FROM customer_product_access WHERE customer_id = ?',
          [id]
        );
        const accessedProductIds = productAccess.map(pa => pa.product_id);

        return res.render('customers/edit', {
          user: req.session,
          customer,
          products,
          accessedProductIds,
          error: 'Name and email are required',
          moment: require('moment-timezone')
        });
      }

      // Update basic info and quotas
      await db.run(
        `UPDATE customers
         SET name = ?, email = ?, company = ?, phone = ?, address = ?,
             is_active = ?,
             license_limit = ?, code_protection_limit = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name,
          email,
          company,
          phone,
          address,
          is_active === 'on' ? 1 : 0,
          parseInt(license_limit) || 0,
          parseInt(code_protection_limit) || 0,
          id
        ]
      );

      // Update product access
      // First, delete existing access
      await db.run('DELETE FROM customer_product_access WHERE customer_id = ?', [id]);

      // Then, insert new access
      if (product_access) {
        const productIds = Array.isArray(product_access) ? product_access : [product_access];

        for (const productId of productIds) {
          await db.run(
            `INSERT INTO customer_product_access (customer_id, product_id, can_generate_license)
             VALUES (?, ?, 1)`,
            [id, productId]
          );
        }
      }

      res.redirect('/customers');
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).send('Error updating customer');
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Check if customer has active licenses
      const activeLicenses = await db.get(
        `SELECT COUNT(*) as count FROM licenses
         WHERE customer_id = ? AND status = 'active'`,
        [id]
      );

      if (activeLicenses.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete customer with active licenses'
        });
      }

      await db.run('DELETE FROM customers WHERE id = ?', [id]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting customer'
      });
    }
  }

  async changeCustomerPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      // Validate password
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 8 characters'
        });
      }

      // Get customer
      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and set must_change_password flag
      await db.run(
        `UPDATE customers
         SET password = ?,
             must_change_password = 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [hashedPassword, id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'update',
        entityType: 'customer',
        entityId: id,
        description: `Admin changed password for customer: ${customer.email}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Password changed successfully. Customer will be required to change password on next login.'
      });
    } catch (error) {
      console.error('Error changing customer password:', error);
      res.status(500).json({
        success: false,
        error: 'Error changing password'
      });
    }
  }

  async loginAsCustomer(req, res) {
    try {
      const { id } = req.params;

      // Get customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE id = ? AND is_active = 1',
        [id]
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found or inactive'
        });
      }

      // Check if customer has password set
      if (!customer.password) {
        return res.status(400).json({
          success: false,
          error: 'Customer does not have a password set. Please set a password first.'
        });
      }

      // Get current admin user
      const adminUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);

      // Generate temporary impersonation token (expires in 60 seconds)
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();

      // Store token in database
      await db.run(
        `INSERT INTO impersonation_tokens (token, customer_id, admin_id, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [token, customer.id, adminUser.id, expiresAt, req.ip, req.get('user-agent')]
      );

      // Log activity
      await ActivityLogger.log(
        adminUser.id,
        'user',
        'login_as_customer',
        customer.id,
        'customer',
        { customer_email: customer.email },
        req
      );

      res.json({
        success: true,
        url: `/customer/impersonate?token=${token}`
      });
    } catch (error) {
      console.error('Error login as customer:', error);
      res.status(500).json({
        success: false,
        error: 'Error logging in as customer'
      });
    }
  }

  // Suspend customer
  async suspend(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await db.run(
        `UPDATE customers SET suspended = 1, suspended_at = CURRENT_TIMESTAMP, suspended_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reason || null, id]
      );

      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'suspend',
        entityType: 'customer',
        entityId: id,
        description: `Suspended customer: ${customer.name}${reason ? ` - Reason: ${reason}` : ''}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({ success: true, message: 'Customer suspended successfully' });
    } catch (error) {
      console.error('Error suspending customer:', error);
      res.status(500).json({ success: false, message: 'Error suspending customer' });
    }
  }

  // Unsuspend customer
  async unsuspend(req, res) {
    try {
      const { id } = req.params;

      const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await db.run(
        `UPDATE customers SET suspended = 0, suspended_at = NULL, suspended_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'unsuspend',
        entityType: 'customer',
        entityId: id,
        description: `Unsuspended customer: ${customer.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({ success: true, message: 'Customer unsuspended successfully' });
    } catch (error) {
      console.error('Error unsuspending customer:', error);
      res.status(500).json({ success: false, message: 'Error unsuspending customer' });
    }
  }
}

module.exports = new CustomerController();
