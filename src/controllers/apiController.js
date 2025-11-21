const db = require('../database/db');
const licenseGenerator = require('../utils/licenseGenerator');

class ApiController {
  constructor() {
    this.validateLicense = this.validateLicense.bind(this);
    this.deactivateLicense = this.deactivateLicense.bind(this);
    this.getLicenseInfo = this.getLicenseInfo.bind(this);
    this.getLicenseTypeFeatures = this.getLicenseTypeFeatures.bind(this);
  }

  /**
   * Validate license key
   * POST /api/validate
   */
  async validateLicense(req, res) {
    try {
      const {
        license_key,
        licenseKey, // Support both formats (bash script uses this)
        hardware_id,
        hostname,
        ip_address,
        productId, // For bash script validation
        machineId, // For bash script validation
        checkExpiry,
        checkActivation,
        checkMachine
      } = req.body;

      const key = license_key || licenseKey;

      if (!key) {
        return res.status(400).json({
          valid: false,
          message: 'License key is required',
          error: 'License key is required'
        });
      }

      // Get license from database with customer info
      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                lt.name as license_type_name, lt.features,
                c.name as customer_name, c.email as customer_email,
                c.company as customer_company, c.phone as customer_phone
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         JOIN customers c ON l.customer_id = c.id
         WHERE l.license_key = ?`,
        [key]
      );

      if (!license) {
        return res.json({
          valid: false,
          message: 'Invalid license key',
          error: 'Invalid license key'
        });
      }

      // Check product match (for bash scripts)
      if (productId && license.product_id !== parseInt(productId)) {
        return res.json({
          valid: false,
          message: 'License not valid for this product',
          error: 'License not valid for this product'
        });
      }

      // Check if license is active (if checkActivation is true or undefined)
      if (checkActivation !== false && license.status !== 'active') {
        return res.json({
          valid: false,
          message: `License is ${license.status}`,
          error: `License is ${license.status}`,
          status: license.status
        });
      }

      // Check expiry date (if checkExpiry is true or undefined)
      if (checkExpiry !== false && license.expiry_date) {
        const expiryDate = new Date(license.expiry_date);
        const now = new Date();
        if (now > expiryDate) {
          // Update license status to expired
          await db.run(
            'UPDATE licenses SET status = \'expired\' WHERE id = ?',
            [license.id]
          );

          return res.json({
            valid: false,
            message: `License expired on ${license.expiry_date.split(' ')[0]}`,
            error: 'License has expired',
            expiry_date: license.expiry_date
          });
        }
      }

      // Check hardware binding if provided (support both hardware_id and machineId)
      const hwId = hardware_id || machineId;
      if (hwId) {
        // Check if this hardware is already activated
        const activation = await db.get(
          'SELECT * FROM license_activations WHERE license_id = ? AND hardware_id = ?',
          [license.id, hwId]
        );

        if (activation) {
          // Update last check time
          await db.run(
            'UPDATE license_activations SET last_check = CURRENT_TIMESTAMP WHERE id = ?',
            [activation.id]
          );
        } else {
          // Check if max activations reached
          const activeActivations = await db.get(
            'SELECT COUNT(*) as count FROM license_activations WHERE license_id = ? AND is_active = 1',
            [license.id]
          );

          if (activeActivations.count >= license.max_activations) {
            return res.json({
              valid: false,
              error: 'Maximum activations reached',
              max_activations: license.max_activations
            });
          }

          // Create new activation
          await db.run(
            `INSERT INTO license_activations (license_id, hardware_id, ip_address, hostname)
             VALUES (?, ?, ?, ?)`,
            [license.id, hwId, ip_address || req.ip, hostname || null]
          );

          // Update current activations count
          await db.run(
            'UPDATE licenses SET current_activations = current_activations + 1 WHERE id = ?',
            [license.id]
          );

          // Add to history
          await db.run(
            `INSERT INTO license_history (license_id, action, description)
             VALUES (?, 'activated_device', ?)`,
            [license.id, `Device activated: ${hwId.substring(0, 8)}...`]
          );
        }
      }

      // Fetch features from normalized database (pivot table)
      const features = await db.all(
        `SELECT f.id, f.name, f.feature_key, f.description
         FROM features f
         INNER JOIN license_type_features ltf ON f.id = ltf.feature_id
         WHERE ltf.license_type_id = ?
         ORDER BY f.name`,
        [license.license_type_id]
      );

      // Log bash script validation if applicable
      if (productId) {
        await db.run(
          `INSERT INTO script_license_validations
           (license_id, validation_result, ip_address, user_agent, validated_at)
           VALUES (?, 'valid', ?, ?, CURRENT_TIMESTAMP)`,
          [license.id, req.ip || req.connection?.remoteAddress, req.headers?.['user-agent']]
        );
      }

      // Return validation response
      res.json({
        valid: true,
        // Bash script friendly fields
        productName: license.product_name,
        customerName: license.customer_name,
        expiresAt: license.expiry_date,
        status: license.status,
        // Full license object for backward compatibility
        license: {
          key: license.license_key,
          product: {
            id: license.product_id,
            name: license.product_name,
            version: license.product_version
          },
          customer: {
            name: license.customer_name,
            email: license.customer_email,
            company: license.customer_company,
            phone: license.customer_phone
          },
          type: license.license_type_name,
          status: license.status,
          issue_date: license.issue_date,
          expiry_date: license.expiry_date,
          features: features,
          activations: {
            current: license.current_activations,
            max: license.max_activations
          }
        }
      });
    } catch (error) {
      console.error('License validation error:', error);
      res.status(500).json({
        valid: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Deactivate hardware
   * POST /api/deactivate
   */
  async deactivateLicense(req, res) {
    try {
      const { license_key, hardware_id } = req.body;

      if (!license_key || !hardware_id) {
        return res.status(400).json({
          success: false,
          error: 'License key and hardware ID are required'
        });
      }

      const license = await db.get(
        'SELECT id FROM licenses WHERE license_key = ?',
        [license_key]
      );

      if (!license) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }

      // Deactivate the hardware
      const result = await db.run(
        'UPDATE license_activations SET is_active = 0 WHERE license_id = ? AND hardware_id = ?',
        [license.id, hardware_id]
      );

      if (result.changes > 0) {
        // Update current activations count
        await db.run(
          'UPDATE licenses SET current_activations = current_activations - 1 WHERE id = ?',
          [license.id]
        );

        // Add to history
        await db.run(
          `INSERT INTO license_history (license_id, action, description)
           VALUES (?, 'deactivated_device', ?)`,
          [license.id, `Device deactivated: ${hardware_id.substring(0, 8)}...`]
        );

        res.json({ success: true });
      } else {
        res.status(404).json({
          success: false,
          error: 'Activation not found'
        });
      }
    } catch (error) {
      console.error('License deactivation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get license info
   * GET /api/license/:key
   */
  async getLicenseInfo(req, res) {
    try {
      const { key } = req.params;

      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                lt.name as license_type_name, lt.features,
                c.name as customer_name, c.email as customer_email,
                c.company as customer_company, c.phone as customer_phone
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         JOIN customers c ON l.customer_id = c.id
         WHERE l.license_key = ?`,
        [key]
      );

      if (!license) {
        return res.status(404).json({
          error: 'License not found'
        });
      }

      // Fetch features from normalized database (pivot table)
      const features = await db.all(
        `SELECT f.id, f.name, f.feature_key, f.description
         FROM features f
         INNER JOIN license_type_features ltf ON f.id = ltf.feature_id
         WHERE ltf.license_type_id = ?
         ORDER BY f.name`,
        [license.license_type_id]
      );

      res.json({
        license_key: license.license_key,
        product: {
          name: license.product_name,
          version: license.product_version
        },
        customer: {
          name: license.customer_name,
          email: license.customer_email,
          company: license.customer_company,
          phone: license.customer_phone
        },
        type: license.license_type_name,
        status: license.status,
        issue_date: license.issue_date,
        expiry_date: license.expiry_date,
        features: features,
        activations: {
          current: license.current_activations,
          max: license.max_activations
        }
      });
    } catch (error) {
      console.error('Error fetching license info:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get features for a license type
   * GET /api/license-types/:id/features
   */
  async getLicenseTypeFeatures(req, res) {
    try {
      const { id } = req.params;

      // Fetch features assigned to this license type from pivot table
      const features = await db.all(
        `SELECT f.id, f.name, f.feature_key, f.description
         FROM features f
         INNER JOIN license_type_features ltf ON f.id = ltf.feature_id
         WHERE ltf.license_type_id = ?
         ORDER BY f.name`,
        [id]
      );

      res.json({
        success: true,
        features
      });
    } catch (error) {
      console.error('Error fetching license type features:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new ApiController();
