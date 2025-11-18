const db = require('../database/db');

/**
 * Get default email template for a specific template type
 * @param {string} templateName - The template name (e.g., 'welcome_email', 'license_created')
 * @returns {Promise<{language: string, design: number}>}
 */
async function getDefaultTemplateSettings(templateName) {
  try {
    // Query the default template for this template name
    const defaultTemplate = await db.get(
      `SELECT language, design_variation
       FROM email_templates
       WHERE name = ? AND is_default = 1
       LIMIT 1`,
      [templateName]
    );

    if (defaultTemplate) {
      return {
        language: defaultTemplate.language,
        design: defaultTemplate.design_variation
      };
    }

    // Fallback to English Design 1 if no default set
    return {
      language: 'en',
      design: 1
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
