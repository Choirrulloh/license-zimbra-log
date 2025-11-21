const db = require('../database/db');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class LicenseExpiryService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Check for licenses expiring soon and send reminder emails
   * @param {number} daysBeforeExpiry - Days before expiry to send reminder (default: 7)
   */
  async checkAndSendReminders(daysBeforeExpiry = null) {
    if (this.isRunning) {
      logger.warn('License expiry check already running, skipping...');
      return { success: false, message: 'Already running' };
    }

    this.isRunning = true;
    const results = { sent: 0, failed: 0, skipped: 0, errors: [] };

    try {
      // Get reminder days from settings if not provided
      if (daysBeforeExpiry === null) {
        const setting = await db.get("SELECT value FROM settings WHERE key = 'license_expiry_reminder_days'");
        daysBeforeExpiry = setting ? parseInt(setting.value) : 7;
      }

      logger.info(`Checking for licenses expiring in ${daysBeforeExpiry} days...`);

      // Get licenses expiring within the specified days that haven't been notified yet
      const expiringLicenses = await db.all(`
        SELECT
          l.id,
          l.license_key,
          l.expiry_date,
          l.status,
          l.last_expiry_reminder_sent,
          c.id as customer_id,
          c.name as customer_name,
          c.email as customer_email,
          p.name as product_name,
          lt.name as license_type_name
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        JOIN products p ON l.product_id = p.id
        LEFT JOIN license_types lt ON l.license_type_id = lt.id
        WHERE l.status = 'active'
          AND l.expiry_date IS NOT NULL
          AND date(l.expiry_date) <= date('now', '+' || ? || ' days')
          AND date(l.expiry_date) > date('now')
          AND (l.last_expiry_reminder_sent IS NULL
               OR date(l.last_expiry_reminder_sent) < date('now', '-1 day'))
          AND c.is_active = 1
          AND c.email IS NOT NULL
        ORDER BY l.expiry_date ASC
      `, [daysBeforeExpiry]);

      logger.info(`Found ${expiringLicenses.length} licenses expiring soon`);

      // Get default language setting
      const langSetting = await db.get("SELECT value FROM settings WHERE key = 'default_language'");
      const language = langSetting?.value || 'en';

      // Send reminder for each expiring license
      for (const license of expiringLicenses) {
        try {
          // Calculate days remaining
          const expiryDate = new Date(license.expiry_date);
          const today = new Date();
          const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

          // Send email
          const emailResult = await emailService.sendLicenseExpiringEmail(
            { email: license.customer_email, name: license.customer_name },
            {
              license_key: license.license_key,
              product_name: license.product_name,
              expiry_date: license.expiry_date,
              license_type: license.license_type_name
            },
            daysRemaining,
            language
          );

          if (emailResult.success) {
            // Update last reminder sent timestamp
            await db.run(
              'UPDATE licenses SET last_expiry_reminder_sent = CURRENT_TIMESTAMP WHERE id = ?',
              [license.id]
            );

            results.sent++;
            logger.info(`Sent expiry reminder for license ${license.license_key} to ${license.customer_email} (${daysRemaining} days remaining)`);
          } else {
            results.failed++;
            results.errors.push({
              licenseKey: license.license_key,
              error: emailResult.message
            });
            logger.error(`Failed to send expiry reminder for license ${license.license_key}: ${emailResult.message}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            licenseKey: license.license_key,
            error: error.message
          });
          logger.error(`Error processing license ${license.license_key}: ${error.message}`);
        }
      }

      // Also check for already expired licenses (send expired notification)
      await this.checkAndNotifyExpired(language, results);

      logger.info(`License expiry check completed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);

      return {
        success: true,
        message: `Processed ${expiringLicenses.length} expiring licenses`,
        results
      };
    } catch (error) {
      logger.error('Error in license expiry check:', error);
      return {
        success: false,
        message: error.message,
        results
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check for expired licenses and send notification
   */
  async checkAndNotifyExpired(language = 'en', results = { sent: 0, failed: 0, skipped: 0, errors: [] }) {
    try {
      // Get licenses that just expired (within last 24 hours) and haven't been notified
      const expiredLicenses = await db.all(`
        SELECT
          l.id,
          l.license_key,
          l.expiry_date,
          l.status,
          l.expired_notification_sent,
          c.id as customer_id,
          c.name as customer_name,
          c.email as customer_email,
          p.name as product_name,
          lt.name as license_type_name
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        JOIN products p ON l.product_id = p.id
        LEFT JOIN license_types lt ON l.license_type_id = lt.id
        WHERE l.expiry_date IS NOT NULL
          AND date(l.expiry_date) < date('now')
          AND date(l.expiry_date) >= date('now', '-7 days')
          AND l.expired_notification_sent IS NULL
          AND c.is_active = 1
          AND c.email IS NOT NULL
        ORDER BY l.expiry_date DESC
      `);

      logger.info(`Found ${expiredLicenses.length} recently expired licenses to notify`);

      for (const license of expiredLicenses) {
        try {
          // Send expired notification
          const emailResult = await emailService.sendLicenseExpiredEmail(
            { email: license.customer_email, name: license.customer_name },
            {
              id: license.id,
              license_key: license.license_key,
              product_name: license.product_name,
              expiry_date: license.expiry_date
            },
            language
          );

          if (emailResult.success) {
            // Update notification sent timestamp and status
            await db.run(
              `UPDATE licenses
               SET expired_notification_sent = CURRENT_TIMESTAMP,
                   status = CASE WHEN status = 'active' THEN 'expired' ELSE status END
               WHERE id = ?`,
              [license.id]
            );

            results.sent++;
            logger.info(`Sent expired notification for license ${license.license_key} to ${license.customer_email}`);
          } else {
            results.failed++;
            results.errors.push({
              licenseKey: license.license_key,
              error: emailResult.message
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            licenseKey: license.license_key,
            error: error.message
          });
          logger.error(`Error processing expired license ${license.license_key}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      logger.error('Error checking expired licenses:', error);
      throw error;
    }
  }

  /**
   * Get license expiry statistics
   */
  async getExpiryStats() {
    try {
      const stats = await db.get(`
        SELECT
          COUNT(CASE WHEN date(expiry_date) < date('now') THEN 1 END) as expired,
          COUNT(CASE WHEN date(expiry_date) BETWEEN date('now') AND date('now', '+7 days') THEN 1 END) as expiring_7_days,
          COUNT(CASE WHEN date(expiry_date) BETWEEN date('now') AND date('now', '+30 days') THEN 1 END) as expiring_30_days,
          COUNT(CASE WHEN date(expiry_date) > date('now', '+30 days') OR expiry_date IS NULL THEN 1 END) as healthy
        FROM licenses
        WHERE status = 'active'
      `);

      return stats;
    } catch (error) {
      logger.error('Error getting expiry stats:', error);
      throw error;
    }
  }

  /**
   * Get list of licenses expiring soon
   */
  async getExpiringLicenses(days = 30) {
    try {
      return await db.all(`
        SELECT
          l.id,
          l.license_key,
          l.expiry_date,
          l.status,
          l.last_expiry_reminder_sent,
          c.name as customer_name,
          c.email as customer_email,
          p.name as product_name,
          CAST((julianday(l.expiry_date) - julianday('now')) AS INTEGER) as days_remaining
        FROM licenses l
        JOIN customers c ON l.customer_id = c.id
        JOIN products p ON l.product_id = p.id
        WHERE l.status = 'active'
          AND l.expiry_date IS NOT NULL
          AND date(l.expiry_date) BETWEEN date('now') AND date('now', '+' || ? || ' days')
        ORDER BY l.expiry_date ASC
      `, [days]);
    } catch (error) {
      logger.error('Error getting expiring licenses:', error);
      throw error;
    }
  }
}

module.exports = new LicenseExpiryService();
