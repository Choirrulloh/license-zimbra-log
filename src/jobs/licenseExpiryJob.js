const licenseExpiryService = require('../services/licenseExpiryService');
const db = require('../database/db');
const logger = require('../utils/logger');

class LicenseExpiryJob {
  constructor() {
    this.intervalId = null;
    this.isEnabled = true;
  }

  /**
   * Start the scheduled job
   * Runs daily at the configured time (default: 09:00)
   */
  async start() {
    try {
      // Check if enabled
      const enabledSetting = await db.get("SELECT value FROM settings WHERE key = 'license_expiry_reminder_enabled'");
      this.isEnabled = enabledSetting?.value !== 'false';

      if (!this.isEnabled) {
        logger.info('License expiry reminder job is disabled');
        return;
      }

      // Get check time from settings
      const timeSetting = await db.get("SELECT value FROM settings WHERE key = 'license_expiry_check_time'");
      const checkTime = timeSetting?.value || '09:00';

      logger.info(`License expiry job started. Will run daily at ${checkTime}`);

      // Calculate ms until next run
      const scheduleNextRun = () => {
        const now = new Date();
        const [hours, minutes] = checkTime.split(':').map(Number);

        let nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);

        // If the time has passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }

        const msUntilNextRun = nextRun - now;

        logger.info(`Next license expiry check scheduled for ${nextRun.toISOString()} (in ${Math.round(msUntilNextRun / 1000 / 60)} minutes)`);

        this.intervalId = setTimeout(async () => {
          await this.run();
          scheduleNextRun(); // Schedule next run after completing
        }, msUntilNextRun);
      };

      scheduleNextRun();

      // Also run immediately on startup if it's past the scheduled time today
      // and hasn't run today
      await this.runIfNeeded();

    } catch (error) {
      logger.error('Failed to start license expiry job:', error);
    }
  }

  /**
   * Run if it hasn't run today yet
   */
  async runIfNeeded() {
    try {
      const lastRun = await db.get("SELECT value FROM settings WHERE key = 'license_expiry_last_run'");

      if (lastRun?.value) {
        const lastRunDate = new Date(lastRun.value).toDateString();
        const today = new Date().toDateString();

        if (lastRunDate === today) {
          logger.info('License expiry check already ran today, skipping startup run');
          return;
        }
      }

      // Run the check
      await this.run();
    } catch (error) {
      logger.error('Error in runIfNeeded:', error);
    }
  }

  /**
   * Run the license expiry check
   */
  async run() {
    if (!this.isEnabled) {
      logger.info('License expiry reminder is disabled, skipping');
      return;
    }

    logger.info('Running scheduled license expiry check...');

    try {
      const result = await licenseExpiryService.checkAndSendReminders();

      // Update last run time
      await db.run(`
        INSERT OR REPLACE INTO settings (key, value)
        VALUES ('license_expiry_last_run', ?)
      `, [new Date().toISOString()]);

      logger.info('License expiry check completed:', result);
      return result;
    } catch (error) {
      logger.error('Error running license expiry check:', error);
      throw error;
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
      logger.info('License expiry job stopped');
    }
  }

  /**
   * Manually trigger the check
   */
  async triggerManually(daysBeforeExpiry = null) {
    logger.info('Manually triggering license expiry check...');
    return await licenseExpiryService.checkAndSendReminders(daysBeforeExpiry);
  }
}

module.exports = new LicenseExpiryJob();
