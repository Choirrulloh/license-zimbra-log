const db = require('../database/db');
const ActivityLogger = require('../utils/activityLogger');

class SettingsController {
  constructor() {
    this.index = this.index.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
    this.testEmail = this.testEmail.bind(this);
  }

  async index(req, res) {
    try {
      // Get all settings from database
      const settingsRows = await db.all('SELECT * FROM settings');

      // Convert to key-value object
      const settings = {};
      settingsRows.forEach(row => {
        settings[row.key] = row.value;
      });

      // Default values if not set
      const defaultSettings = {
        // General Settings
        app_name: 'SaaS License Manager',
        app_url: 'http://localhost:3000',
        timezone: 'Asia/Jakarta',
        date_format: 'YYYY-MM-DD',

        // Email Settings
        email_enabled: 'false',
        email_from_name: 'License Manager',
        email_from_address: 'noreply@example.com',
        smtp_host: '',
        smtp_port: '587',
        smtp_secure: 'false',
        smtp_user: '',
        smtp_password: '',

        // Notification Settings
        notify_license_expiring: 'true',
        notify_days_before_expiry: '30',
        notify_license_expired: 'true',
        notify_license_created: 'false',
        notify_license_renewed: 'false',
        notify_customer_welcome: 'false'
      };

      // Merge with defaults
      const finalSettings = { ...defaultSettings, ...settings };

      res.render('settings/index', {
        user: req.session,
        settings: finalSettings
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      res.status(500).send('Error loading settings');
    }
  }

  async updateSettings(req, res) {
    try {
      const updates = req.body;

      // Update each setting
      for (const [key, value] of Object.entries(updates)) {
        await db.run(
          `INSERT INTO settings (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
          [key, value, value]
        );
      }

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'update',
        entityType: 'settings',
        entityId: null,
        description: 'Updated system settings',
        metadata: Object.keys(updates),
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating settings'
      });
    }
  }

  async testEmail(req, res) {
    try {
      // Get SMTP settings from request body (test before saving)
      const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure } = req.body;

      // Validate required SMTP settings
      if (!smtp_host || !smtp_port || !smtp_user || !smtp_password) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in all SMTP settings (host, port, username, password).'
        });
      }

      // Auto-detect secure based on port
      // Port 465 = SSL/TLS (secure: true)
      // Port 587/25/2525 = STARTTLS (secure: false)
      const port = parseInt(smtp_port);
      const secure = port === 465;

      // Test SMTP connection using emailService
      const emailService = require('../services/emailService');
      const result = await emailService.testConnection({
        smtp_host,
        smtp_port: port,
        smtp_user,
        smtp_password,
        smtp_secure: secure
      });

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'test',
        entityType: 'smtp_connection',
        entityId: null,
        description: `Tested SMTP connection to ${smtp_host}:${smtp_port}`,
        metadata: { success: result.success, host: smtp_host, port: smtp_port, secure },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      res.status(500).json({
        success: false,
        message: `Failed to test SMTP connection: ${error.message}`
      });
    }
  }
}

module.exports = new SettingsController();
