const licenseExpiryService = require('../services/licenseExpiryService');
const licenseExpiryJob = require('../jobs/licenseExpiryJob');
const db = require('../database/db');

const licenseExpiryController = {
  /**
   * Show expiring licenses page
   */
  async index(req, res) {
    try {
      const days = parseInt(req.query.days) || 30;
      const expiringLicenses = await licenseExpiryService.getExpiringLicenses(days);
      const stats = await licenseExpiryService.getExpiryStats();

      // Get settings
      const settings = {};
      const settingsRows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'license_expiry%'");
      settingsRows.forEach(row => { settings[row.key] = row.value; });

      res.render('licenses/expiring', {
        user: req.session,
        expiringLicenses,
        stats,
        settings,
        days
      });
    } catch (error) {
      console.error('Error fetching expiring licenses:', error);
      res.status(500).render('errors/500', {
        user: req.session,
        error: process.env.NODE_ENV === 'development' ? error : {}
      });
    }
  },

  /**
   * Manually trigger expiry check
   */
  async triggerCheck(req, res) {
    try {
      const daysBeforeExpiry = req.body.days ? parseInt(req.body.days) : null;
      const result = await licenseExpiryJob.triggerManually(daysBeforeExpiry);

      res.json({
        success: true,
        message: result.message,
        results: result.results
      });
    } catch (error) {
      console.error('Error triggering expiry check:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Update expiry reminder settings
   */
  async updateSettings(req, res) {
    try {
      const { reminder_days, reminder_enabled, check_time } = req.body;

      if (reminder_days !== undefined) {
        await db.run(`
          INSERT INTO settings (key, value, description)
          VALUES ('license_expiry_reminder_days', ?, 'Days before expiry to send reminder')
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [reminder_days]);
      }

      if (reminder_enabled !== undefined) {
        await db.run(`
          INSERT INTO settings (key, value, description)
          VALUES ('license_expiry_reminder_enabled', ?, 'Enable automatic license expiry reminders')
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [reminder_enabled === 'true' || reminder_enabled === true ? 'true' : 'false']);
      }

      if (check_time !== undefined) {
        await db.run(`
          INSERT INTO settings (key, value, description)
          VALUES ('license_expiry_check_time', ?, 'Time of day to run expiry check (HH:MM)')
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, [check_time]);
      }

      // Restart the job with new settings
      licenseExpiryJob.stop();
      await licenseExpiryJob.start();

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Get expiry statistics (API)
   */
  async getStats(req, res) {
    try {
      const stats = await licenseExpiryService.getExpiryStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error getting expiry stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = licenseExpiryController;
