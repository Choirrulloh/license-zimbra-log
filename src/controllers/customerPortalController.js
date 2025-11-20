const db = require('../database/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const ActivityLogger = require('../utils/activityLogger');
const emailService = require('../services/emailService');

class CustomerPortalController {
  // Show login page
  async showLogin(req, res) {
    try {
      const error = req.query.error;
      res.render('customer-portal/login', { error });
    } catch (error) {
      console.error('Error showing customer login:', error);
      res.status(500).render('error', { error: 'Error loading login page' });
    }
  }

  // Handle login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.redirect('/customer/login?error=Email and password are required');
      }

      // Find customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE email = ? AND is_active = 1',
        [email]
      );

      if (!customer || !customer.password) {
        return res.redirect('/customer/login?error=Invalid email or password');
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, customer.password);
      if (!passwordMatch) {
        return res.redirect('/customer/login?error=Invalid email or password');
      }

      // Update last login
      await db.run(
        'UPDATE customers SET last_login = ? WHERE id = ?',
        [new Date().toISOString(), customer.id]
      );

      // Log session
      await db.run(
        `INSERT INTO customer_sessions (customer_id, is_impersonation, ip_address, user_agent)
         VALUES (?, 0, ?, ?)`,
        [customer.id, req.ip, req.get('user-agent')]
      );

      // Set session
      req.session.customerId = customer.id;
      req.session.isImpersonation = false;

      // Log activity
      await ActivityLogger.logLogin(customer.id, 'customer', email, req);

      res.redirect('/customer/dashboard');
    } catch (error) {
      console.error('Customer login error:', error);
      res.redirect('/customer/login?error=Login failed. Please try again');
    }
  }

  // Handle logout
  async logout(req, res) {
    try {
      const customerId = req.session.customerId;
      const isImpersonation = req.session.isImpersonation;
      const adminUser = req.session.adminUser;

      // Log logout time
      await db.run(
        `UPDATE customer_sessions
         SET logout_time = ?
         WHERE customer_id = ? AND logout_time IS NULL
         ORDER BY login_time DESC LIMIT 1`,
        [new Date().toISOString(), customerId]
      );

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }

        // If impersonation, redirect back to admin
        if (isImpersonation && adminUser) {
          // Restore admin session
          req.session = { userId: adminUser.id };
          return res.redirect('/customers');
        }

        res.redirect('/customer/login');
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/customer/login');
    }
  }

  // Show dashboard
  async showDashboard(req, res) {
    try {
      const customerId = req.customer.id;

      // Get license statistics
      const licenseStats = await db.get(
        `SELECT
          COUNT(*) as total_licenses,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_licenses,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_licenses,
          SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_licenses
         FROM licenses
         WHERE customer_id = ?`,
        [customerId]
      );

      // Get code protection statistics
      const codeProtectionStats = await db.get(
        `SELECT
          COUNT(*) as total_protections,
          SUM(CASE WHEN expires_at > datetime('now') OR expires_at IS NULL THEN 1 ELSE 0 END) as active_protections
         FROM code_protection
         WHERE customer_id = ?`,
        [customerId]
      );

      // Get recent licenses
      const recentLicenses = await db.all(
        `SELECT l.*, p.name as product_name, lt.name as license_type_name
         FROM licenses l
         LEFT JOIN products p ON l.product_id = p.id
         LEFT JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.customer_id = ?
         ORDER BY l.created_at DESC
         LIMIT 5`,
        [customerId]
      );

      // Get quota information
      const quotaInfo = {
        license_limit: req.customer.license_limit,
        license_used: req.customer.license_used,
        license_remaining: req.customer.license_limit === 0 ? 'Unlimited' : req.customer.license_limit - req.customer.license_used,
        license_percentage: req.customer.license_limit === 0 ? 0 : Math.round((req.customer.license_used / req.customer.license_limit) * 100),
        code_protection_limit: req.customer.code_protection_limit,
        code_protection_used: req.customer.code_protection_used,
        code_protection_remaining: req.customer.code_protection_limit === 0 ? 'Unlimited' : req.customer.code_protection_limit - req.customer.code_protection_used,
        code_protection_percentage: req.customer.code_protection_limit === 0 ? 0 : Math.round((req.customer.code_protection_used / req.customer.code_protection_limit) * 100)
      };

      res.render('customer-portal/dashboard', {
        customer: req.customer,
        licenseStats,
        codeProtectionStats,
        recentLicenses,
        quotaInfo,
        moment: require('moment-timezone')
      });
    } catch (error) {
      console.error('Error showing customer dashboard:', error);
      res.status(500).render('error', { error: 'Error loading dashboard' });
    }
  }

  // Show licenses
  async showLicenses(req, res) {
    try {
      const customerId = req.customer.id;

      const licenses = await db.all(
        `SELECT l.*, p.name as product_name, lt.name as license_type_name
         FROM licenses l
         LEFT JOIN products p ON l.product_id = p.id
         LEFT JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.customer_id = ?
         ORDER BY l.created_at DESC`,
        [customerId]
      );

      res.render('customer-portal/licenses', {
        customer: req.customer,
        licenses,
        moment: require('moment-timezone')
      });
    } catch (error) {
      console.error('Error showing licenses:', error);
      res.status(500).render('error', { error: 'Error loading licenses' });
    }
  }

  // Show generate license page
  async showGenerateLicense(req, res) {
    try {
      const customerId = req.customer.id;

      // Get products where customer can generate licenses
      const allowedProducts = await db.all(
        `SELECT p.*, cpa.can_generate_license
         FROM products p
         LEFT JOIN customer_product_access cpa ON p.id = cpa.product_id AND cpa.customer_id = ?
         WHERE p.is_active = 1 AND (cpa.can_generate_license = 1 OR cpa.id IS NULL)
         ORDER BY p.name`,
        [customerId]
      );

      // Filter only products where can_generate_license = 1
      const productsCanGenerate = allowedProducts.filter(p => p.can_generate_license === 1);

      res.render('customer-portal/generate-license', {
        customer: req.customer,
        products: productsCanGenerate,
        quotaInfo: {
          license_limit: req.customer.license_limit,
          license_used: req.customer.license_used,
          license_remaining: req.customer.license_limit === 0 ? 'Unlimited' : req.customer.license_limit - req.customer.license_used
        }
      });
    } catch (error) {
      console.error('Error showing generate license page:', error);
      res.status(500).render('error', { error: 'Error loading page' });
    }
  }

  // Generate new license
  async generateLicense(req, res) {
    try {
      const customerId = req.customer.id;
      const { product_id, license_type_id } = req.body;

      // Verify product access
      const access = await db.get(
        'SELECT * FROM customer_product_access WHERE customer_id = ? AND product_id = ? AND can_generate_license = 1',
        [customerId, product_id]
      );

      if (!access) {
        return res.status(403).json({ success: false, error: 'You do not have permission to generate licenses for this product' });
      }

      // Get product and license type
      const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
      const licenseType = await db.get('SELECT * FROM license_types WHERE id = ? AND product_id = ?', [license_type_id, product_id]);

      if (!product || !licenseType) {
        return res.status(404).json({ success: false, error: 'Product or license type not found' });
      }

      // Generate license key
      const licenseKey = this.generateLicenseKey();

      // Calculate expiry date
      let expiryDate = null;
      if (licenseType.duration_days > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + licenseType.duration_days);
      }

      // Create license
      const result = await db.run(
        `INSERT INTO licenses (license_key, customer_id, product_id, license_type_id, status, expires_at, max_activations, current_activations)
         VALUES (?, ?, ?, ?, 'active', ?, ?, 0)`,
        [licenseKey, customerId, product_id, license_type_id, expiryDate ? expiryDate.toISOString() : null, licenseType.max_activations]
      );

      // Update customer license_used count
      await db.run(
        'UPDATE customers SET license_used = license_used + 1 WHERE id = ?',
        [customerId]
      );

      // Log activity
      await ActivityLogger.logCreate(customerId, 'customer', 'license', result.id, { license_key: licenseKey }, req);

      res.json({
        success: true,
        message: 'License generated successfully!',
        license: {
          id: result.id,
          license_key: licenseKey,
          product: product.name,
          license_type: licenseType.name
        }
      });
    } catch (error) {
      console.error('Error generating license:', error);
      res.status(500).json({ success: false, error: 'Error generating license' });
    }
  }

  // Show products (read-only)
  async showProducts(req, res) {
    try {
      const products = await db.all(
        `SELECT p.*,
          (SELECT COUNT(*) FROM license_types WHERE product_id = p.id) as license_type_count
         FROM products p
         WHERE p.is_active = 1
         ORDER BY p.name`
      );

      res.render('customer-portal/products', {
        customer: req.customer,
        products
      });
    } catch (error) {
      console.error('Error showing products:', error);
      res.status(500).render('error', { error: 'Error loading products' });
    }
  }

  // Show profile
  async showProfile(req, res) {
    try {
      const mustChange = req.query.mustChange === '1';
      res.render('customer-portal/profile', {
        customer: req.customer,
        mustChange
      });
    } catch (error) {
      console.error('Error showing profile:', error);
      res.status(500).render('error', { error: 'Error loading profile' });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const customerId = req.customer.id;
      const { name, phone, company, address } = req.body;

      await db.run(
        'UPDATE customers SET name = ?, phone = ?, company = ?, address = ?, updated_at = ? WHERE id = ?',
        [name, phone || null, company || null, address || null, new Date().toISOString(), customerId]
      );

      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ success: false, error: 'Error updating profile' });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const customerId = req.customer.id;
      const { current_password, new_password, confirm_password } = req.body;

      // Validate passwords
      if (new_password !== confirm_password) {
        return res.status(400).json({ success: false, error: 'New passwords do not match' });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
      }

      // Verify current password
      const customer = await db.get('SELECT password FROM customers WHERE id = ?', [customerId]);
      const passwordMatch = await bcrypt.compare(current_password, customer.password);

      if (!passwordMatch) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await db.run(
        'UPDATE customers SET password = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
        [hashedPassword, new Date().toISOString(), customerId]
      );

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ success: false, error: 'Error changing password' });
    }
  }

  // Get license types for a product (API)
  async getLicenseTypes(req, res) {
    try {
      const { product_id } = req.params;

      const licenseTypes = await db.all(
        'SELECT * FROM license_types WHERE product_id = ? ORDER BY name',
        [product_id]
      );

      res.json({ success: true, licenseTypes });
    } catch (error) {
      console.error('Error getting license types:', error);
      res.status(500).json({ success: false, error: 'Error loading license types' });
    }
  }

  // Show code protection page
  async showCodeProtection(req, res) {
    try {
      const customerId = req.customer.id;

      const protections = await db.all(
        `SELECT * FROM code_protection
         WHERE customer_id = ?
         ORDER BY created_at DESC`,
        [customerId]
      );

      res.render('customer-portal/code-protection', {
        customer: req.customer,
        protections,
        quotaInfo: {
          code_protection_limit: req.customer.code_protection_limit,
          code_protection_used: req.customer.code_protection_used,
          code_protection_remaining: req.customer.code_protection_limit === 0 ? 'Unlimited' : req.customer.code_protection_limit - req.customer.code_protection_used
        },
        moment: require('moment-timezone')
      });
    } catch (error) {
      console.error('Error showing code protection:', error);
      res.status(500).render('error', { error: 'Error loading code protection' });
    }
  }

  // Generate code protection
  async generateCodeProtection(req, res) {
    try {
      const customerId = req.customer.id;
      const { code_input, duration_days } = req.body;

      if (!code_input) {
        return res.status(400).json({ success: false, error: 'Code input is required' });
      }

      // Generate protection code
      const protectionCode = this.generateProtectionCode(code_input);

      // Calculate expiry
      let expiresAt = null;
      if (duration_days && parseInt(duration_days) > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(duration_days));
      }

      // Save to database
      const result = await db.run(
        `INSERT INTO code_protection (customer_id, original_code, protected_code, expires_at)
         VALUES (?, ?, ?, ?)`,
        [customerId, code_input, protectionCode, expiresAt ? expiresAt.toISOString() : null]
      );

      // Update customer code_protection_used count
      await db.run(
        'UPDATE customers SET code_protection_used = code_protection_used + 1 WHERE id = ?',
        [customerId]
      );

      // Log activity
      await ActivityLogger.logCreate(customerId, 'customer', 'code_protection', result.id, {}, req);

      res.json({
        success: true,
        message: 'Code protection generated successfully!',
        protection: {
          id: result.id,
          protected_code: protectionCode,
          expires_at: expiresAt
        }
      });
    } catch (error) {
      console.error('Error generating code protection:', error);
      res.status(500).json({ success: false, error: 'Error generating code protection' });
    }
  }

  // Helper: Generate license key
  generateLicenseKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = 4;
    const segmentLength = 4;
    let key = '';

    for (let i = 0; i < segments; i++) {
      if (i > 0) key += '-';
      for (let j = 0; j < segmentLength; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    return key;
  }

  // Helper: Generate protection code
  generateProtectionCode(input) {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return hash.substring(0, 32).toUpperCase();
  }
}

module.exports = new CustomerPortalController();
