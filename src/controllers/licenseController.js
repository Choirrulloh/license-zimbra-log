const db = require('../database/db');
const moment = require('moment');
const licenseGenerator = require('../utils/licenseGenerator');

class LicenseController {
  async index(req, res) {
    try {
      const { status, product_id, customer_id } = req.query;

      let query = `
        SELECT l.*, p.name as product_name, c.name as customer_name, c.email as customer_email,
               lt.name as license_type_name, lt.type as license_type
        FROM licenses l
        JOIN products p ON l.product_id = p.id
        JOIN customers c ON l.customer_id = c.id
        JOIN license_types lt ON l.license_type_id = lt.id
        WHERE 1=1
      `;

      const params = [];

      if (status) {
        query += ' AND l.status = ?';
        params.push(status);
      }

      if (product_id) {
        query += ' AND l.product_id = ?';
        params.push(product_id);
      }

      if (customer_id) {
        query += ' AND l.customer_id = ?';
        params.push(customer_id);
      }

      query += ' ORDER BY l.created_at DESC';

      const licenses = await db.all(query, params);

      const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
      const customers = await db.all('SELECT * FROM customers WHERE is_active = 1 ORDER BY name');

      res.render('licenses/index', {
        user: req.session,
        licenses,
        products,
        customers,
        filters: { status, product_id, customer_id },
        moment
      });
    } catch (error) {
      console.error('Error fetching licenses:', error);
      res.status(500).send('Error loading licenses');
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;

      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                c.name as customer_name, c.email as customer_email, c.company as customer_company,
                lt.name as license_type_name, lt.type as license_type, lt.features
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN customers c ON l.customer_id = c.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.id = ?`,
        [id]
      );

      if (!license) {
        return res.status(404).send('License not found');
      }

      const activations = await db.all(
        'SELECT * FROM license_activations WHERE license_id = ? ORDER BY activated_at DESC',
        [id]
      );

      const history = await db.all(
        `SELECT lh.*, u.name as user_name
         FROM license_history lh
         LEFT JOIN users u ON lh.created_by = u.id
         WHERE lh.license_id = ?
         ORDER BY lh.created_at DESC`,
        [id]
      );

      // Generate offline validation code
      const offlineCode = licenseGenerator.generateOfflineCode(
        license.license_key,
        license.expiry_date
      );

      res.render('licenses/show', {
        user: req.session,
        license,
        activations,
        history,
        offlineCode,
        moment
      });
    } catch (error) {
      console.error('Error fetching license:', error);
      res.status(500).send('Error loading license');
    }
  }

  async create(req, res) {
    if (req.method === 'GET') {
      const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
      const customers = await db.all('SELECT * FROM customers WHERE is_active = 1 ORDER BY name');

      return res.render('licenses/create', {
        user: req.session,
        products,
        customers,
        error: null
      });
    }

    try {
      const { product_id, license_type_id, customer_id, notes } = req.body;

      if (!product_id || !license_type_id || !customer_id) {
        const products = await db.all('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
        const customers = await db.all('SELECT * FROM customers WHERE is_active = 1 ORDER BY name');

        return res.render('licenses/create', {
          user: req.session,
          products,
          customers,
          error: 'Product, license type, and customer are required'
        });
      }

      // Get license type details
      const licenseType = await db.get('SELECT * FROM license_types WHERE id = ?', [license_type_id]);

      // Generate license key
      const licenseKey = licenseGenerator.generateKey();

      // Calculate expiry date
      const issueDate = new Date();
      const expiryDate = new Date(issueDate);
      expiryDate.setDate(expiryDate.getDate() + licenseType.duration_days);

      // Insert license
      const result = await db.run(
        `INSERT INTO licenses (license_key, product_id, license_type_id, customer_id, status,
                               max_activations, issue_date, expiry_date, notes)
         VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [licenseKey, product_id, license_type_id, customer_id, licenseType.max_activations,
         issueDate.toISOString(), expiryDate.toISOString(), notes || null]
      );

      // Add to history
      await db.run(
        `INSERT INTO license_history (license_id, action, new_status, description, created_by)
         VALUES (?, 'created', 'active', 'License created', ?)`,
        [result.id, req.session.userId]
      );

      // Create transaction if price > 0
      if (licenseType.price > 0) {
        await db.run(
          `INSERT INTO transactions (license_id, customer_id, amount, status)
           VALUES (?, ?, ?, 'completed')`,
          [result.id, customer_id, licenseType.price]
        );
      }

      res.redirect(`/licenses/${result.id}`);
    } catch (error) {
      console.error('Error creating license:', error);
      res.status(500).send('Error creating license');
    }
  }

  async renew(req, res) {
    try {
      const { id } = req.params;
      const { duration_days } = req.body;

      const license = await db.get('SELECT * FROM licenses WHERE id = ?', [id]);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      // Calculate new expiry date
      const currentExpiry = new Date(license.expiry_date);
      const now = new Date();
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + parseInt(duration_days));

      await db.run(
        'UPDATE licenses SET expiry_date = ?, status = \'active\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newExpiry.toISOString(), id]
      );

      // Add to history
      await db.run(
        `INSERT INTO license_history (license_id, action, new_status, description, created_by)
         VALUES (?, 'renewed', 'active', ?, ?)`,
        [id, `License renewed for ${duration_days} days`, req.session.userId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error renewing license:', error);
      res.status(500).json({
        success: false,
        message: 'Error renewing license'
      });
    }
  }

  async revoke(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      await db.run(
        'UPDATE licenses SET status = \'revoked\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      // Deactivate all activations
      await db.run(
        'UPDATE license_activations SET is_active = 0 WHERE license_id = ?',
        [id]
      );

      // Add to history
      await db.run(
        `INSERT INTO license_history (license_id, action, old_status, new_status, description, created_by)
         VALUES (?, 'revoked', 'active', 'revoked', ?, ?)`,
        [id, reason || 'License revoked', req.session.userId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error revoking license:', error);
      res.status(500).json({
        success: false,
        message: 'Error revoking license'
      });
    }
  }

  async suspend(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const license = await db.get('SELECT status FROM licenses WHERE id = ?', [id]);

      await db.run(
        'UPDATE licenses SET status = \'suspended\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      // Add to history
      await db.run(
        `INSERT INTO license_history (license_id, action, old_status, new_status, description, created_by)
         VALUES (?, 'suspended', ?, 'suspended', ?, ?)`,
        [id, license.status, reason || 'License suspended', req.session.userId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error suspending license:', error);
      res.status(500).json({
        success: false,
        message: 'Error suspending license'
      });
    }
  }

  async activate(req, res) {
    try {
      const { id } = req.params;

      const license = await db.get('SELECT status FROM licenses WHERE id = ?', [id]);

      await db.run(
        'UPDATE licenses SET status = \'active\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      // Add to history
      await db.run(
        `INSERT INTO license_history (license_id, action, old_status, new_status, description, created_by)
         VALUES (?, 'activated', ?, 'active', 'License activated', ?)`,
        [id, license.status, req.session.userId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error activating license:', error);
      res.status(500).json({
        success: false,
        message: 'Error activating license'
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      await db.run('DELETE FROM licenses WHERE id = ?', [id]);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting license:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting license'
      });
    }
  }

  // Get license types for a product (API endpoint)
  async getLicenseTypes(req, res) {
    try {
      const { product_id } = req.params;

      const licenseTypes = await db.all(
        'SELECT * FROM license_types WHERE product_id = ? AND is_active = 1 ORDER BY name',
        [product_id]
      );

      res.json(licenseTypes);
    } catch (error) {
      console.error('Error fetching license types:', error);
      res.status(500).json({ error: 'Error fetching license types' });
    }
  }
}

module.exports = new LicenseController();
