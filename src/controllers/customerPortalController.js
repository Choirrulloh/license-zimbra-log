const db = require('../database/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ActivityLogger = require('../utils/activityLogger');
const emailService = require('../services/emailService');
const licenseGenerator = require('../utils/licenseGenerator');

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
      const basePath = req.isCustomerPortal ? '' : '/customer';

      // Validate input
      if (!email || !password) {
        return res.redirect(`${basePath}/login?error=Email and password are required`);
      }

      // Find customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE email = ? AND is_active = 1',
        [email]
      );

      if (!customer || !customer.password) {
        console.log(`Login attempt failed for email: ${email} - Customer not found or no password`);
        return res.redirect(`${basePath}/login?error=Invalid email or password`);
      }

      // Verify password
      console.log(`Verifying password for customer: ${email}`);
      const passwordMatch = await bcrypt.compare(password, customer.password);
      if (!passwordMatch) {
        console.log(`Password verification failed for customer: ${email}`);
        return res.redirect(`${basePath}/login?error=Invalid email or password`);
      }

      console.log(`Login successful for customer: ${email}`);

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

      res.redirect(`${basePath}/dashboard`);
    } catch (error) {
      console.error('Customer login error:', error);
      const basePath = req.isCustomerPortal ? '' : '/customer';
      res.redirect(`${basePath}/login?error=Login failed. Please try again`);
    }
  }

  // Handle logout
  async logout(req, res) {
    try {
      const customerId = req.session.customerId;
      const isImpersonation = req.session.isImpersonation;
      const adminUser = req.session.adminUser;
      const basePath = req.isCustomerPortal ? '' : '/customer';

      // Log logout time (find the most recent session first)
      if (customerId) {
        const session = await db.get(
          `SELECT id FROM customer_sessions
           WHERE customer_id = ? AND logout_time IS NULL
           ORDER BY login_time DESC LIMIT 1`,
          [customerId]
        );

        if (session) {
          await db.run(
            'UPDATE customer_sessions SET logout_time = ? WHERE id = ?',
            [new Date().toISOString(), session.id]
          );
        }
      }

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

        res.redirect(`${basePath}/login`);
      });
    } catch (error) {
      console.error('Logout error:', error);
      const basePath = req.isCustomerPortal ? '' : '/customer';
      res.redirect(`${basePath}/login`);
    }
  }

  // Show forgot password page
  async showForgotPassword(req, res) {
    try {
      res.render('customer-portal/forgot-password', {
        error: null,
        success: false
      });
    } catch (error) {
      console.error('Error showing forgot password page:', error);
      res.status(500).render('error', { error: 'Error loading page' });
    }
  }

  // Handle forgot password request
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.render('customer-portal/forgot-password', {
          error: 'Email is required',
          success: false
        });
      }

      // Find customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE email = ? AND is_active = 1',
        [email]
      );

      // Always show success message for security (don't reveal if email exists)
      if (!customer) {
        return res.render('customer-portal/forgot-password', {
          error: null,
          success: true
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save reset token
      await db.run(
        `INSERT INTO password_reset_tokens (customer_id, token, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?)`,
        [customer.id, resetToken, expiresAt.toISOString(), req.ip, req.get('user-agent')]
      );

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(customer, resetToken);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Continue anyway - don't reveal email send failure
      }

      // Log activity
      await ActivityLogger.log({
        userId: customer.id,
        action: 'password_reset_requested',
        entityType: 'customer',
        entityId: customer.id,
        description: `Password reset requested for ${customer.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.render('customer-portal/forgot-password', {
        error: null,
        success: true
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.render('customer-portal/forgot-password', {
        error: 'An error occurred. Please try again later.',
        success: false
      });
    }
  }

  // Show reset password page
  async showResetPassword(req, res) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.render('customer-portal/reset-password', {
          error: 'Invalid or missing reset token',
          success: false,
          token: null
        });
      }

      // Verify token exists and is not expired
      const resetToken = await db.get(
        `SELECT * FROM password_reset_tokens
         WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
        [token]
      );

      if (!resetToken) {
        return res.render('customer-portal/reset-password', {
          error: 'This password reset link is invalid or has expired',
          success: false,
          token: null
        });
      }

      res.render('customer-portal/reset-password', {
        error: null,
        success: false,
        token: token
      });
    } catch (error) {
      console.error('Error showing reset password page:', error);
      res.status(500).render('error', { error: 'Error loading page' });
    }
  }

  // Handle reset password
  async resetPassword(req, res) {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password || !confirmPassword) {
        return res.render('customer-portal/reset-password', {
          error: 'All fields are required',
          success: false,
          token: token
        });
      }

      if (password !== confirmPassword) {
        return res.render('customer-portal/reset-password', {
          error: 'Passwords do not match',
          success: false,
          token: token
        });
      }

      if (password.length < 8) {
        return res.render('customer-portal/reset-password', {
          error: 'Password must be at least 8 characters',
          success: false,
          token: token
        });
      }

      // Verify token
      const resetToken = await db.get(
        `SELECT * FROM password_reset_tokens
         WHERE token = ? AND used = 0 AND expires_at > datetime('now')`,
        [token]
      );

      if (!resetToken) {
        return res.render('customer-portal/reset-password', {
          error: 'This password reset link is invalid or has expired',
          success: false,
          token: null
        });
      }

      // Get customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE id = ?',
        [resetToken.customer_id]
      );

      if (!customer) {
        return res.render('customer-portal/reset-password', {
          error: 'Customer not found',
          success: false,
          token: null
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear must_change_password flag
      await db.run(
        `UPDATE customers
         SET password = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [hashedPassword, customer.id]
      );

      // Mark token as used
      await db.run(
        `UPDATE password_reset_tokens
         SET used = 1, used_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), resetToken.id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: customer.id,
        action: 'password_reset_completed',
        entityType: 'customer',
        entityId: customer.id,
        description: `Password reset completed for ${customer.email}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      res.render('customer-portal/reset-password', {
        error: null,
        success: true,
        token: null
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.render('customer-portal/reset-password', {
        error: 'An error occurred. Please try again later.',
        success: false,
        token: req.body.token
      });
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

      // Get code protection statistics (for customer portal, use code_protection_used from customers table)
      const codeProtectionStats = {
        total_protections: req.customer.code_protection_used || 0,
        active_protections: req.customer.code_protection_used || 0
      };

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
        currentPage: 'generate',
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
      const licenseKey = licenseGenerator.generateKey();

      // Calculate expiry date
      let expiryDate = null;
      if (licenseType.duration_days > 0) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + licenseType.duration_days);
      }

      // Create license
      const result = await db.run(
        `INSERT INTO licenses (license_key, customer_id, product_id, license_type_id, status, expiry_date, max_activations, current_activations)
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

      // Check if customer has password set
      const customer = await db.get('SELECT password FROM customers WHERE id = ?', [req.customer.id]);
      const isInitialSetup = !customer.password && req.customer.must_change_password;

      res.render('customer-portal/profile', {
        customer: req.customer,
        currentPage: 'profile',
        mustChange,
        isInitialSetup
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

      // Get customer with password
      const customer = await db.get('SELECT password, must_change_password FROM customers WHERE id = ?', [customerId]);

      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' });
      }

      // Special case: Customer has no password set but must change password (initial setup)
      const isInitialSetup = !customer.password && customer.must_change_password;

      // Validate input
      if (isInitialSetup) {
        // For initial setup, only new password and confirm are required
        if (!new_password || !confirm_password) {
          return res.status(400).json({ success: false, error: 'New password and confirmation are required' });
        }
      } else {
        // For normal password change, all fields are required
        if (!current_password || !new_password || !confirm_password) {
          return res.status(400).json({ success: false, error: 'All password fields are required' });
        }
      }

      // Validate passwords match
      if (new_password !== confirm_password) {
        return res.status(400).json({ success: false, error: 'New passwords do not match' });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
      }

      // Verify current password (skip for initial setup)
      if (!isInitialSetup) {
        const passwordMatch = await bcrypt.compare(String(current_password), String(customer.password));

        if (!passwordMatch) {
          return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Check if new password is same as current password
        const isSamePassword = await bcrypt.compare(String(new_password), String(customer.password));
        if (isSamePassword) {
          return res.status(400).json({ success: false, error: 'New password must be different from current password' });
        }
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

      // Get customer's quota info (use code_protection_limit and code_protection_used from customers table)
      const quota = {
        monthly_limit: req.customer.code_protection_limit,
        used_this_month: req.customer.code_protection_used,
        max_file_size_mb: 50, // Default 50MB for customers
        reset_date: null // Customers don't have monthly reset, just total limit
      };

      // Get recent obfuscations - with error handling for missing column
      let recentObfuscations = [];
      try {
        recentObfuscations = await db.all(
          `SELECT * FROM code_obfuscations
           WHERE customer_id = ? AND status = 'completed'
           ORDER BY created_at DESC
           LIMIT 3`,
          [customerId]
        );
      } catch (error) {
        // If customer_id column doesn't exist yet (migration not run), return empty array
        if (error.code === 'SQLITE_ERROR' && error.message.includes('no such column: customer_id')) {
          console.warn('⚠️  Code obfuscations table needs migration - customer_id column missing');
          console.warn('   Please run: node src/database/migrations/016_add_customer_code_obfuscation.js');
          recentObfuscations = [];
        } else {
          throw error; // Re-throw other errors
        }
      }

      // Get products for bash license injection
      const products = await db.all('SELECT id, name FROM products ORDER BY name');

      // Get settings for API URL
      const settings = await db.all('SELECT key, value FROM settings');
      const settingsObj = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      res.render('customer-portal/code-protection', {
        customer: req.customer,
        currentPage: 'code-protection',
        quota,
        recentObfuscations,
        products,
        apiUrl: settingsObj.app_url ? `${settingsObj.app_url}/api/validate` : 'http://localhost:3000/api/validate',
        moment: require('moment-timezone')
      });
    } catch (error) {
      console.error('Error showing code protection:', error);
      res.status(500).render('error', { error: 'Error loading code protection' });
    }
  }

  // Upload and validate file for code protection
  async uploadCodeProtectionFile(req, res) {
    try {
      const path = require('path');
      const fs = require('fs').promises;
      const obfuscatorService = require('../services/obfuscatorService');
      const bashObfuscatorService = require('../services/bashObfuscatorService');

      console.log('Upload request received from customer:', req.customer.id);

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;
      const customerId = req.customer.id;

      console.log('File uploaded:', file.originalname, 'Size:', file.size, 'bytes');

      // Validate file extension
      const allowedExtensions = ['.js', '.zip', '.sh'];
      const fileExt = path.extname(file.originalname).toLowerCase();

      if (!allowedExtensions.includes(fileExt)) {
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only .js, .sh, and .zip files are allowed'
        });
      }

      // Check quota (0 means unlimited)
      if (req.customer.code_protection_limit > 0 &&
          req.customer.code_protection_used >= req.customer.code_protection_limit) {
        await fs.unlink(file.path);
        return res.status(403).json({
          success: false,
          message: `Quota limit reached. You have used ${req.customer.code_protection_used} of ${req.customer.code_protection_limit} protections.`
        });
      }

      // Check file size (50MB max for customers)
      const maxSizeMB = 50;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSizeMB}MB`
        });
      }

      // Validate JavaScript syntax if .js file
      if (fileExt === '.js') {
        const validation = await obfuscatorService.validateJavaScript(file.path);
        if (!validation.valid) {
          await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: `Invalid JavaScript syntax: ${validation.error}`,
            line: validation.line
          });
        }
      }

      // Calculate hash
      const fileHash = await obfuscatorService.calculateFileHash(file.path);

      // Detect shell scripts in ZIP for multi-script support
      let shellScripts = [];
      if (fileExt === '.zip') {
        try {
          shellScripts = await this.detectShellScriptsInZip(file.path);
        } catch (error) {
          console.warn('Error detecting shell scripts in ZIP:', error.message);
        }
      }

      res.json({
        success: true,
        file: {
          id: file.filename,
          originalName: file.originalname,
          size: file.size,
          hash: fileHash,
          path: file.path,
          shellScripts: shellScripts
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (req.file && req.file.path) {
        const fs = require('fs').promises;
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({
        success: false,
        message: 'Upload failed: ' + error.message
      });
    }
  }

  // Obfuscate uploaded file
  async obfuscateCodeProtectionFile(req, res) {
    try {
      const path = require('path');
      const fs = require('fs').promises;
      const obfuscatorService = require('../services/obfuscatorService');
      const bashObfuscatorService = require('../services/bashObfuscatorService');
      const moment = require('moment');

      const { fileId, level, options, bashInjection } = req.body;
      const customerId = req.customer.id;

      console.log('Obfuscate request:', {
        customerId,
        fileId,
        level,
        hasBashInjection: !!bashInjection
      });

      if (!fileId || !level) {
        console.log('Missing parameters - fileId:', fileId, 'level:', level);
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      // Check quota again (0 means unlimited)
      if (req.customer.code_protection_limit > 0 &&
          req.customer.code_protection_used >= req.customer.code_protection_limit) {
        console.log('Quota limit reached for customer:', customerId);
        return res.status(403).json({
          success: false,
          message: 'Quota limit reached'
        });
      }

      // Find uploaded file
      const uploadPath = path.join(__dirname, '../../uploads/temp', fileId);
      console.log('Looking for file at:', uploadPath);

      try {
        await fs.access(uploadPath);
        console.log('File found:', uploadPath);
      } catch (error) {
        console.log('File not found:', uploadPath, 'Error:', error.message);
        return res.status(404).json({
          success: false,
          message: 'Uploaded file not found'
        });
      }

      const originalFilename = req.body.originalName || fileId;
      const fileExt = path.extname(originalFilename).toLowerCase();
      const fileStats = await fs.stat(uploadPath);
      console.log('File stats:', { originalFilename, fileExt, size: fileStats.size });

      // Create obfuscation record
      console.log('Creating obfuscation record...');
      const result = await db.run(
        `INSERT INTO code_obfuscations
         (customer_id, original_filename, file_size, obfuscation_level, options, status)
         VALUES (?, ?, ?, ?, ?, 'processing')`,
        [customerId, originalFilename, fileStats.size, level, JSON.stringify(options || {})]
      );

      const obfuscationId = result.id;
      console.log('Obfuscation record created with ID:', obfuscationId);

      try {
        // Generate output filename
        const timestamp = Date.now();
        const outputFilename = `obfuscated_customer_${customerId}_${timestamp}${fileExt}`;
        const outputPath = path.join(__dirname, '../../uploads/obfuscated', outputFilename);

        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Parse custom options
        const customOptions = {};
        if (options) {
          if (options.compact) customOptions.compact = true;
          if (options.renameVariables) customOptions.renameGlobals = true;
          if (options.stringEncoding) customOptions.stringArray = true;
          if (options.controlFlow) customOptions.controlFlowFlattening = true;
          if (options.deadCode) customOptions.deadCodeInjection = true;
          if (options.disableConsole) customOptions.disableConsoleOutput = true;
        }

        // Obfuscate
        let obfResult;
        const startTime = Date.now();
        let licenseInjected = false;
        let injectedProductId = null;

        if (fileExt === '.js') {
          obfResult = await obfuscatorService.obfuscateFile(
            uploadPath,
            outputPath,
            level,
            customOptions
          );
        } else if (fileExt === '.zip') {
          // Detect if ZIP contains .sh files
          let zipShellScripts = [];
          try {
            zipShellScripts = await this.detectShellScriptsInZip(uploadPath);
          } catch (error) {
            console.warn('Error detecting shell scripts:', error.message);
          }

          if (zipShellScripts.length > 0) {
            let licenseConfig = null;
            const mainScript = bashInjection?.mainScript || null;

            if (bashInjection && bashInjection.injectLicense && bashInjection.productId && mainScript) {
              const product = await db.get('SELECT * FROM products WHERE id = ?', [bashInjection.productId]);

              if (!product) {
                throw new Error('Selected product not found');
              }

              const settings = await db.all('SELECT key, value FROM settings');
              const settingsObj = settings.reduce((acc, s) => {
                acc[s.key] = s.value;
                return acc;
              }, {});

              const apiUrl = settingsObj.app_url
                ? `${settingsObj.app_url}/api/validate`
                : 'http://localhost:3000/api/validate';

              licenseConfig = {
                productId: product.id,
                productName: product.name,
                apiUrl: apiUrl,
                welcomeMessage: `License Protected Script - ${product.name}`,
                supportContact: 'support@excelent.co.id',
                checkExpiry: true,
                checkActivation: true,
                checkMachine: true,
                showInfo: true
              };

              licenseInjected = true;
              injectedProductId = product.id;
            }

            obfResult = await bashObfuscatorService.obfuscateZip(
              uploadPath,
              outputPath,
              level,
              customOptions,
              mainScript,
              licenseConfig
            );
          } else {
            obfResult = await obfuscatorService.obfuscateZip(
              uploadPath,
              outputPath,
              level,
              customOptions
            );
          }
        } else if (fileExt === '.sh') {
          console.log('Processing bash script with bashInjection:', bashInjection);
          let licenseConfig = null;

          if (bashInjection && bashInjection.injectLicense && bashInjection.productId) {
            console.log('License injection enabled for product:', bashInjection.productId);
            const product = await db.get('SELECT * FROM products WHERE id = ?', [bashInjection.productId]);

            if (!product) {
              throw new Error('Selected product not found');
            }

            const settings = await db.all('SELECT key, value FROM settings');
            const settingsObj = settings.reduce((acc, s) => {
              acc[s.key] = s.value;
              return acc;
            }, {});

            const apiUrl = settingsObj.app_url
              ? `${settingsObj.app_url}/api/validate`
              : 'http://localhost:3000/api/validate';

            licenseConfig = {
              productId: product.id,
              productName: product.name,
              apiUrl: apiUrl,
              welcomeMessage: `License Protected Script - ${product.name}`,
              supportContact: 'support@excelent.co.id',
              checkExpiry: true,
              checkActivation: true,
              checkMachine: true,
              showInfo: true
            };

            licenseInjected = true;
            injectedProductId = product.id;
          }

          console.log('Calling bashObfuscatorService.obfuscateBashFile...');
          obfResult = await bashObfuscatorService.obfuscateBashFile(
            uploadPath,
            outputPath,
            level,
            licenseConfig
          );
          console.log('Bash obfuscation completed:', obfResult);
        } else {
          throw new Error(`Unsupported file type: ${fileExt}`);
        }

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Calculate expiry date (7 days from now)
        const expiresAt = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');

        // Update record
        await db.run(
          `UPDATE code_obfuscations
           SET obfuscated_filename = ?,
               obfuscated_size = ?,
               output_path = ?,
               status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               expires_at = ?,
               license_injected = ?,
               injected_product_id = ?,
               validation_options = ?
           WHERE id = ?`,
          [
            outputFilename,
            obfResult.obfuscatedSize,
            outputPath,
            expiresAt,
            licenseInjected ? 1 : 0,
            injectedProductId,
            licenseInjected ? JSON.stringify(bashInjection || {}) : null,
            obfuscationId
          ]
        );

        // Update customer's code_protection_used count
        await db.run(
          `UPDATE customers
           SET code_protection_used = code_protection_used + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [customerId]
        );

        // Log activity
        await ActivityLogger.log({
          userId: customerId,
          userType: 'customer',
          action: 'code_obfuscation',
          entityType: 'code_protection',
          entityId: obfuscationId,
          description: `Obfuscated ${originalFilename} (${level} level)`,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent']
        });

        // Cleanup temp file
        await fs.unlink(uploadPath).catch(() => {});

        res.json({
          success: true,
          obfuscation: {
            id: obfuscationId,
            filename: outputFilename,
            originalSize: fileStats.size,
            obfuscatedSize: obfResult.obfuscatedSize,
            reduction: obfResult.reduction,
            processingTime,
            filesProcessed: obfResult.filesProcessed || 1,
            expiresAt
          }
        });
      } catch (error) {
        // Update record with error
        await db.run(
          `UPDATE code_obfuscations
           SET status = 'failed',
               error_message = ?,
               completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [error.message, obfuscationId]
        );

        throw error;
      }
    } catch (error) {
      console.error('Obfuscation error:', error);
      res.status(500).json({
        success: false,
        message: 'Obfuscation failed: ' + error.message
      });
    }
  }

  // Download obfuscated file
  async downloadCodeProtectionFile(req, res) {
    try {
      const fs = require('fs').promises;
      const { id } = req.params;
      const customerId = req.customer.id;

      // Get obfuscation record
      const obfuscation = await db.get(
        `SELECT * FROM code_obfuscations
         WHERE id = ? AND customer_id = ?`,
        [id, customerId]
      );

      if (!obfuscation) {
        return res.status(404).send('File not found');
      }

      if (obfuscation.status !== 'completed') {
        return res.status(400).send('File not ready for download');
      }

      // Check if file expired
      if (obfuscation.expires_at) {
        const expiryDate = new Date(obfuscation.expires_at);
        if (new Date() > expiryDate) {
          return res.status(410).send('Download link expired');
        }
      }

      // Check if file exists
      const filePath = obfuscation.output_path;
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).send('File not found on server');
      }

      // Send file
      res.download(filePath, obfuscation.obfuscated_filename);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).send('Download failed');
    }
  }

  // Delete obfuscation record
  async deleteCodeProtectionFile(req, res) {
    try {
      const fs = require('fs');
      const { id } = req.params;
      const customerId = req.customer.id;

      // Get obfuscation record
      const obfuscation = await db.get(
        'SELECT * FROM code_obfuscations WHERE id = ? AND customer_id = ?',
        [id, customerId]
      );

      if (!obfuscation) {
        return res.status(404).json({
          success: false,
          message: 'Obfuscation not found or access denied'
        });
      }

      // Delete file from disk
      if (obfuscation.output_path && fs.existsSync(obfuscation.output_path)) {
        fs.unlinkSync(obfuscation.output_path);
      }

      // Delete from database
      await db.run('DELETE FROM code_obfuscations WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.log({
        userId: customerId,
        userType: 'customer',
        action: 'delete',
        entityType: 'code_obfuscation',
        entityId: id,
        description: `Deleted obfuscation: ${obfuscation.original_filename}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Obfuscation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting obfuscation:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting obfuscation'
      });
    }
  }

  // Detect shell scripts in ZIP
  async detectShellScriptsInZip(zipPath) {
    const path = require('path');
    const fs = require('fs').promises;
    const unzipper = require('unzipper');
    const bashObfuscatorService = require('../services/bashObfuscatorService');
    const tempDir = path.join(path.dirname(zipPath), `detect_${Date.now()}`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      await require('fs').createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();

      const shFiles = await bashObfuscatorService.findShellFiles(tempDir);

      const shellScripts = shFiles.map(file => {
        const relativePath = path.relative(tempDir, file);
        return {
          path: relativePath,
          name: path.basename(file)
        };
      });

      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

      return shellScripts;
    } catch (error) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }

  // Helper: Generate protection code
  generateProtectionCode(input) {
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return hash.substring(0, 32).toUpperCase();
  }

  // API: Get license details
  async getLicenseDetails(req, res) {
    try {
      const customerId = req.customer.id;
      const { id } = req.params;

      // Get license details with product and license type info
      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                lt.name as license_type_name
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.id = ? AND l.customer_id = ?`,
        [id, customerId]
      );

      if (!license) {
        return res.status(404).json({ success: false, error: 'License not found' });
      }

      res.json({
        success: true,
        license
      });
    } catch (error) {
      console.error('Error getting license details:', error);
      res.status(500).json({ success: false, error: 'Error loading license details' });
    }
  }

  // API: Request license renewal
  async requestLicenseRenewal(req, res) {
    try {
      const customerId = req.customer.id;
      const { id } = req.params;

      // Check if license exists and belongs to customer
      const license = await db.get(
        'SELECT * FROM licenses WHERE id = ? AND customer_id = ?',
        [id, customerId]
      );

      if (!license) {
        return res.status(404).json({ success: false, error: 'License not found' });
      }

      // Check if there's already a pending request
      const existingRequest = await db.get(
        'SELECT * FROM license_renewals WHERE license_id = ? AND status = ?',
        [id, 'pending']
      );

      if (existingRequest) {
        return res.json({ success: false, error: 'A renewal request is already pending for this license' });
      }

      // Create renewal request
      await db.run(
        `INSERT INTO license_renewals (license_id, customer_id, requested_at, status)
         VALUES (?, ?, CURRENT_TIMESTAMP, 'pending')`,
        [id, customerId]
      );

      // Log activity
      await ActivityLogger.logCreate(
        customerId,
        'customer',
        'license_renewal',
        id,
        { license_key: license.license_key },
        req
      );

      res.json({
        success: true,
        message: 'Renewal request submitted successfully'
      });
    } catch (error) {
      console.error('Error requesting license renewal:', error);
      res.status(500).json({ success: false, error: 'Error submitting renewal request' });
    }
  }

  // Handle admin impersonation login
  async impersonate(req, res) {
    try {
      const { token } = req.query;
      const basePath = req.isCustomerPortal ? '' : '/customer';

      if (!token) {
        return res.redirect(`${basePath}/login?error=Invalid impersonation link`);
      }

      // Find and validate token
      const tokenData = await db.get(
        `SELECT * FROM impersonation_tokens
         WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')`,
        [token]
      );

      if (!tokenData) {
        return res.redirect(`${basePath}/login?error=Invalid or expired impersonation link`);
      }

      // Get customer
      const customer = await db.get(
        'SELECT * FROM customers WHERE id = ? AND is_active = 1',
        [tokenData.customer_id]
      );

      if (!customer) {
        return res.redirect(`${basePath}/login?error=Customer not found or inactive`);
      }

      // Get admin info
      const admin = await db.get('SELECT id, name, email FROM users WHERE id = ?', [tokenData.admin_id]);

      // Mark token as used
      await db.run(
        'UPDATE impersonation_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tokenData.id]
      );

      // Log impersonation session
      await db.run(
        `INSERT INTO customer_sessions (customer_id, admin_id, is_impersonation, ip_address, user_agent)
         VALUES (?, ?, 1, ?, ?)`,
        [customer.id, tokenData.admin_id, req.ip, req.get('user-agent')]
      );

      // Set session
      req.session.customerId = customer.id;
      req.session.isImpersonation = true;
      req.session.impersonatedBy = admin;

      // Redirect to dashboard
      res.redirect(`${basePath}/dashboard`);
    } catch (error) {
      console.error('Error in impersonation:', error);
      const basePath = req.isCustomerPortal ? '' : '/customer';
      res.redirect(`${basePath}/login?error=Error during impersonation`);
    }
  }
}

module.exports = new CustomerPortalController();
