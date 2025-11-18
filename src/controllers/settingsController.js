const db = require('../database/db');
const ActivityLogger = require('../utils/activityLogger');

class SettingsController {
  constructor() {
    this.index = this.index.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
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
        default_email_language: 'en',
        default_email_design: '1',

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
}

module.exports = new SettingsController();
