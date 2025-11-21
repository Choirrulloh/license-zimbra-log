const db = require('../database/db');
const moment = require('moment-timezone');
const licenseGenerator = require('../utils/licenseGenerator');

class LicenseController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.renew = this.renew.bind(this);
    this.revoke = this.revoke.bind(this);
    this.suspend = this.suspend.bind(this);
    this.activate = this.activate.bind(this);
    this.delete = this.delete.bind(this);
    this.getLicenseTypes = this.getLicenseTypes.bind(this);
    this.approveRenewal = this.approveRenewal.bind(this);
    this.rejectRenewal = this.rejectRenewal.bind(this);
  }

  async index(req, res) {
    try {
      const { status, product_id, customer_id, tab, renewal_status } = req.query;

      let query = `
        SELECT l.*, p.name as product_name, c.name as customer_name, c.email as customer_email,
               lt.name as license_type_name
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

      // Fetch renewal requests for the renewals tab
      let renewals = [];
      if (tab === 'renewals') {
        let renewalQuery = `
          SELECT lr.*, l.license_key, c.name as customer_name, c.email as customer_email,
                 p.name as product_name
          FROM license_renewals lr
          JOIN licenses l ON lr.license_id = l.id
          JOIN customers c ON lr.customer_id = c.id
          JOIN products p ON l.product_id = p.id
          WHERE 1=1
        `;

        const renewalParams = [];

        // Filter by renewal status (default to pending)
        const filterStatus = renewal_status || 'pending';
        renewalQuery += ' AND lr.status = ?';
        renewalParams.push(filterStatus);

        renewalQuery += ' ORDER BY lr.requested_at DESC';

        renewals = await db.all(renewalQuery, renewalParams);
      }

      // Get count of pending renewals for badge
      const renewalCount = await db.get(
        'SELECT COUNT(*) as count FROM license_renewals WHERE status = ?',
        ['pending']
      );

      res.render('licenses/index', {
        user: req.session,
        licenses,
        products,
        customers,
        renewals,
        renewalCount: renewalCount.count,
        filters: { status, product_id, customer_id, tab, renewal_status },
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
                lt.name as license_type_name, lt.features
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

      // Fetch features from normalized database (pivot table)
      const features = await db.all(
        `SELECT f.id, f.name, f.feature_key, f.description
         FROM features f
         INNER JOIN license_type_features ltf ON f.id = ltf.feature_id
         WHERE ltf.license_type_id = ?
         ORDER BY f.name`,
        [license.license_type_id]
      );

      res.render('licenses/show', {
        user: req.session,
        license,
        activations,
        history,
        features,
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

      // Send license created email using default template settings
      try {
        const emailService = require('../services/emailService');
        const { getDefaultTemplateSettings } = require('../utils/templateSettings');
        const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customer_id]);
        const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
        const templateSettings = await getDefaultTemplateSettings('license_created');

        if (customer && customer.email) {
          await emailService.sendEmail(
            'license_created',
            customer.email,
            customer.name,
            {
              'user.name': customer.name,
              'license.key': licenseKey,
              'license.product': product.name,
              'license.expiry': expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              'license.type': licenseType.name
            },
            templateSettings.language,
            templateSettings.design
          );
          console.log(`✓ License created email sent to ${customer.email} (${templateSettings.language}, design ${templateSettings.design})`);
        }
      } catch (emailError) {
        console.error('Failed to send license email:', emailError.message);
        // Don't block license creation if email fails
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

      // Get license info before deleting (to return quota)
      const license = await db.get('SELECT customer_id FROM licenses WHERE id = ?', [id]);

      if (!license) {
        return res.status(404).json({
          success: false,
          message: 'License not found'
        });
      }

      // Delete license
      await db.run('DELETE FROM licenses WHERE id = ?', [id]);

      // Return quota to customer (decrement license_used)
      await db.run(
        'UPDATE customers SET license_used = license_used - 1 WHERE id = ? AND license_used > 0',
        [license.customer_id]
      );

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

  // Approve renewal request
  async approveRenewal(req, res) {
    try {
      const { id } = req.params;

      // Get renewal request details
      const renewal = await db.get(
        `SELECT lr.*, l.expiry_date, l.license_key, lt.duration_days
         FROM license_renewals lr
         JOIN licenses l ON lr.license_id = l.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE lr.id = ? AND lr.status = 'pending'`,
        [id]
      );

      if (!renewal) {
        return res.status(404).json({
          success: false,
          error: 'Renewal request not found or already processed'
        });
      }

      // Calculate new expiry date
      // If current license is expired, extend from now. Otherwise extend from current expiry
      const currentExpiry = renewal.expiry_date ? moment(renewal.expiry_date) : null;
      const now = moment();
      const baseDate = currentExpiry && currentExpiry.isAfter(now) ? currentExpiry : now;
      const newExpiry = baseDate.add(renewal.duration_days, 'days').format('YYYY-MM-DD HH:mm:ss');

      // Update license expiry date and status
      await db.run(
        `UPDATE licenses
         SET expiry_date = ?,
             status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newExpiry, renewal.license_id]
      );

      // Update renewal request
      await db.run(
        `UPDATE license_renewals
         SET status = 'approved',
             approved_by = ?,
             approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [req.session.userId, id]
      );

      // Add to license history
      await db.run(
        `INSERT INTO license_history (license_id, action, old_status, new_status, description, created_by)
         VALUES (?, 'renewed', 'renewal_approved', 'active', ?, ?)`,
        [
          renewal.license_id,
          `License renewed until ${moment(newExpiry).format('YYYY-MM-DD')} via customer renewal request`,
          req.session.userId
        ]
      );

      res.json({
        success: true,
        message: 'Renewal request approved successfully',
        newExpiry: newExpiry
      });
    } catch (error) {
      console.error('Error approving renewal:', error);
      res.status(500).json({
        success: false,
        error: 'Error approving renewal request'
      });
    }
  }

  // Reject renewal request
  async rejectRenewal(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      // Check if renewal request exists and is pending
      const renewal = await db.get(
        'SELECT * FROM license_renewals WHERE id = ? AND status = ?',
        [id, 'pending']
      );

      if (!renewal) {
        return res.status(404).json({
          success: false,
          error: 'Renewal request not found or already processed'
        });
      }

      // Update renewal request
      await db.run(
        `UPDATE license_renewals
         SET status = 'rejected',
             rejected_reason = ?,
             approved_by = ?,
             approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reason.trim(), req.session.userId, id]
      );

      // Add to license history
      await db.run(
        `INSERT INTO license_history (license_id, action, old_status, new_status, description, created_by)
         VALUES (?, 'renewal_rejected', 'pending_renewal', 'rejected', ?, ?)`,
        [
          renewal.license_id,
          `Renewal request rejected: ${reason.trim()}`,
          req.session.userId
        ]
      );

      res.json({
        success: true,
        message: 'Renewal request rejected'
      });
    } catch (error) {
      console.error('Error rejecting renewal:', error);
      res.status(500).json({
        success: false,
        error: 'Error rejecting renewal request'
      });
    }
  }
}

module.exports = new LicenseController();
