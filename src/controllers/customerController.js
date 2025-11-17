const db = require('../database/db');
const moment = require('moment');

class CustomerController {
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
      return res.render('customers/create', {
        user: req.session,
        error: null
      });
    }

    try {
      const { name, email, company, phone, address } = req.body;

      if (!name || !email) {
        return res.render('customers/create', {
          user: req.session,
          error: 'Name and email are required'
        });
      }

      // Check if email already exists
      const existing = await db.get('SELECT id FROM customers WHERE email = ?', [email]);

      if (existing) {
        return res.render('customers/create', {
          user: req.session,
          error: 'Email already exists'
        });
      }

      await db.run(
        'INSERT INTO customers (name, email, company, phone, address) VALUES (?, ?, ?, ?, ?)',
        [name, email, company || null, phone || null, address || null]
      );

      res.redirect('/customers');
    } catch (error) {
      console.error('Error creating customer:', error);
      res.render('customers/create', {
        user: req.session,
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
}

module.exports = new CustomerController();
