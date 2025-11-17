const db = require('../database/db');
const licenseGenerator = require('../utils/licenseGenerator');

class ApiController {
  constructor() {
    this.validateLicense = this.validateLicense.bind(this);
    this.deactivateLicense = this.deactivateLicense.bind(this);
    this.getLicenseInfo = this.getLicenseInfo.bind(this);
  }

  /**
   * Validate license key
   * POST /api/validate
   */
  async validateLicense(req, res) {
    try {
      const { license_key, hardware_id, hostname, ip_address } = req.body;

      if (!license_key) {
        return res.status(400).json({
          valid: false,
          error: 'License key is required'
        });
      }

      // Get license from database
      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                lt.name as license_type_name, lt.features
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.license_key = ?`,
        [license_key]
      );

      if (!license) {
        return res.json({
          valid: false,
          error: 'Invalid license key'
        });
      }

      // Check if license is active
      if (license.status !== 'active') {
        return res.json({
          valid: false,
          error: `License is ${license.status}`,
          status: license.status
        });
      }

      // Check expiry date
      if (license.expiry_date) {
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
            error: 'License has expired',
            expiry_date: license.expiry_date
          });
        }
      }

      // Check hardware binding if provided
      if (hardware_id) {
        // Check if this hardware is already activated
        const activation = await db.get(
          'SELECT * FROM license_activations WHERE license_id = ? AND hardware_id = ?',
          [license.id, hardware_id]
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
            [license.id, hardware_id, ip_address || null, hostname || null]
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
            [license.id, `Device activated: ${hardware_id.substring(0, 8)}...`]
          );
        }
      }

      // Parse features
      let features = [];
      try {
        features = license.features ? JSON.parse(license.features) : [];
      } catch (e) {
        features = [];
      }

      // Return validation response
      res.json({
        valid: true,
        license: {
          key: license.license_key,
          product: {
            id: license.product_id,
            name: license.product_name,
            version: license.product_version
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
        `SELECT l.*, p.name as product_name, lt.name as license_type_name
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.license_key = ?`,
        [key]
      );

      if (!license) {
        return res.status(404).json({
          error: 'License not found'
        });
      }

      res.json({
        license_key: license.license_key,
        product: license.product_name,
        type: license.license_type_name,
        status: license.status,
        expiry_date: license.expiry_date
      });
    } catch (error) {
      console.error('Error fetching license info:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
}

module.exports = new ApiController();
