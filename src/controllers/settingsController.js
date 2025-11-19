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
      const { email } = req.body;

      // Validate email
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }

      // Get SMTP settings from database
      const settingsRows = await db.all('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach(row => {
        settings[row.key] = row.value;
      });

      // Check if email is enabled
      if (settings.email_enabled !== 'true') {
        return res.status(400).json({
          success: false,
          message: 'Email is not enabled. Please enable email and configure SMTP settings first.'
        });
      }

      // Check if SMTP is configured
      if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
        return res.status(400).json({
          success: false,
          message: 'SMTP is not fully configured. Please fill in all SMTP settings (host, username, password).'
        });
      }

      // Send test email using emailService
      const emailService = require('../services/emailService');
      const result = await emailService.sendTestEmail(email, settings);

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'test',
        entityType: 'email',
        entityId: null,
        description: `Sent test email to ${email}`,
        metadata: { success: result.success, recipient: email },
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
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        message: `Failed to send test email: ${error.message}`
      });
    }
  }
}

module.exports = new SettingsController();
