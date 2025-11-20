const db = require('../database/db');
const moment = require('moment');
const bcrypt = require('bcrypt');
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
  }

  async index(req, res) {
    try {
      const customers = await db.all(
        `SELECT c.*,
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

      res.render('customers/edit', {
        user: req.session,
        customer,
        error: null
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).send('Error loading customer');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, company, phone, address, is_active } = req.body;

      if (!name || !email) {
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
        return res.render('customers/edit', {
          user: req.session,
          customer,
          error: 'Name and email are required'
        });
      }

      await db.run(
        'UPDATE customers SET name = ?, email = ?, company = ?, phone = ?, address = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, email, company, phone, address, is_active === 'on' ? 1 : 0, id]
      );

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
          error: 'Customer does not have a password set. Cannot login as this customer.'
        });
      }

      // Get current admin user
      const adminUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', [req.session.userId]);

      // Log impersonation session
      await db.run(
        `INSERT INTO customer_sessions (customer_id, admin_id, is_impersonation, ip_address, user_agent)
         VALUES (?, ?, 1, ?, ?)`,
        [customer.id, adminUser.id, req.ip, req.get('user-agent')]
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

      // Save admin session data
      req.session.adminUser = adminUser;
      req.session.isImpersonation = true;

      // Set customer session
      req.session.customerId = customer.id;

      res.json({
        success: true,
        redirect: '/customer/dashboard'
      });
    } catch (error) {
      console.error('Error login as customer:', error);
      res.status(500).json({
        success: false,
        error: 'Error logging in as customer'
      });
    }
  }
}

module.exports = new CustomerController();
