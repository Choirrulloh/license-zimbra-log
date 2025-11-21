const db = require('./db');

/**
 * Complete missing email templates
 * Ensures all 32 template variants exist (8 types × 2 designs × 2 languages)
 */

const TEMPLATE_TYPES = {
  welcome_email: { type: 'user', subject_en: 'Welcome to {{company.name}}', subject_id: 'Selamat Datang di {{company.name}}' },
  password_reset: { type: 'user', subject_en: 'Password Reset Request - {{company.name}}', subject_id: 'Permintaan Reset Password - {{company.name}}' },
  license_created: { type: 'license', subject_en: 'Your License Has Been Activated - {{license.product}}', subject_id: 'Lisensi Anda Telah Diaktifkan - {{license.product}}' },
  license_expiring: { type: 'license', subject_en: '⚠️ Your License is Expiring Soon - {{license.product}}', subject_id: '⚠️ Lisensi Anda Akan Segera Berakhir - {{license.product}}' },
  license_expired: { type: 'license', subject_en: '🔴 Your License Has Expired - {{license.product}}', subject_id: '🔴 Lisensi Anda Telah Kadaluarsa - {{license.product}}' },
  license_renewed: { type: 'license', subject_en: '✅ License Renewed Successfully - {{license.product}}', subject_id: '✅ Lisensi Berhasil Diperpanjang - {{license.product}}' },
  role_changed: { type: 'user', subject_en: 'Your Role Has Been Updated - {{company.name}}', subject_id: 'Role Anda Telah Diperbarui - {{company.name}}' },
  monthly_report: { type: 'system', subject_en: '📊 Monthly Report - {{report.month}} {{report.year}}', subject_id: '📊 Laporan Bulanan - {{report.month}} {{report.year}}' }
};

const SIMPLE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6; }
    .header { background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{company.name}}</h1>
  </div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>This is an automated email from {{company.name}}.</p>
    <p>For more information, please log in to your account.</p>
  </div>
  <div class="footer">
    <p>&copy; {{year}} {{company.name}}. All rights reserved.</p>
  </div>
</body>
</html>
`;

async function completeEmailTemplates() {
  console.log('Checking and completing email templates...\n');

  let created = 0;
  let existing = 0;

  for (const [templateName, config] of Object.entries(TEMPLATE_TYPES)) {
    for (const lang of ['en', 'id']) {
      for (const design of [1, 2]) {
        const existingTemplate = await db.get(
          'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ?',
          [templateName, lang, design]
        );

        if (!existingTemplate) {
          const subject = lang === 'en' ? config.subject_en : config.subject_id;
          const bodyText = `Email from {{company.name}}`;

          await db.run(
            `INSERT INTO email_templates (name, type, language, design_variation, subject, body_html, body_text, variables, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              templateName,
              config.type,
              lang,
              design,
              subject,
              SIMPLE_TEMPLATE.trim(),
              bodyText,
              'user.name, company.name, year'
            ]
          );

          console.log(`✓ Created: ${templateName} (${lang}, v${design})`);
          created++;
        } else {
          existing++;
        }
      }
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Created: ${created} new templates`);
  console.log(`   Existing: ${existing} templates`);
  console.log(`   Total: ${created + existing} of 32 expected templates`);
}

if (require.main === module) {
  completeEmailTemplates()
    .then(() => {
      console.log('\nAll email templates are complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = completeEmailTemplates;
