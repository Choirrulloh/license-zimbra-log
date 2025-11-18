const db = require('../database/db');

/**
 * Get default email template settings from database
 * @returns {Promise<{language: string, design: number}>}
 */
async function getDefaultTemplateSettings() {
  try {
    const languageSetting = await db.get("SELECT value FROM settings WHERE key = 'default_email_language'");
    const designSetting = await db.get("SELECT value FROM settings WHERE key = 'default_email_design'");

    return {
      language: languageSetting?.value || 'en',
      design: parseInt(designSetting?.value || '1')
    };
  } catch (error) {
    console.error('Error getting default template settings:', error);
    // Return defaults if error
    return {
      language: 'en',
      design: 1
    };
  }
}

module.exports = {
  getDefaultTemplateSettings
};
