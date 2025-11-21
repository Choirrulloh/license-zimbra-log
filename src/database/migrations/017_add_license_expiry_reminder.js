const db = require('../db');

async function migrate() {
  console.log('Running migration: 017_add_license_expiry_reminder');

  try {
    // Add columns to licenses table for tracking reminder notifications
    const columns = await db.all("PRAGMA table_info(licenses)");
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('last_expiry_reminder_sent')) {
      await db.run('ALTER TABLE licenses ADD COLUMN last_expiry_reminder_sent DATETIME');
      console.log('✓ Added last_expiry_reminder_sent column to licenses');
    }

    if (!columnNames.includes('expired_notification_sent')) {
      await db.run('ALTER TABLE licenses ADD COLUMN expired_notification_sent DATETIME');
      console.log('✓ Added expired_notification_sent column to licenses');
    }

    // Add settings for license expiry reminder
    const settings = [
      ['license_expiry_reminder_days', '7'],
      ['license_expiry_reminder_enabled', 'true'],
      ['license_expiry_check_time', '09:00']
    ];

    // Check if settings table has description column
    const settingsColumns = await db.all("PRAGMA table_info(settings)");
    const hasDescription = settingsColumns.some(c => c.name === 'description');

    for (const [key, value] of settings) {
      const existing = await db.get('SELECT key FROM settings WHERE key = ?', [key]);
      if (!existing) {
        if (hasDescription) {
          await db.run('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)', [key, value, '']);
        } else {
          await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
        console.log(`✓ Added setting: ${key}`);
      }
    }

    // Create license_expiring email template if not exists
    const expiringTemplate = await db.get(
      "SELECT id FROM email_templates WHERE name = 'license_expiring' AND language = 'en'"
    );

    if (!expiringTemplate) {
      await db.run(`
        INSERT INTO email_templates (name, type, language, design_variation, subject, body_html, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'license_expiring',
        'license',
        'en',
        1,
        'Your License is Expiring Soon - {{license.product}}',
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .license-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ License Expiring Soon</h1>
      <p>Action Required</p>
    </div>

    <div class="content">
      <p>Hi <strong>{{user.name}}</strong>,</p>

      <div class="warning-box">
        <strong>⏰ Your license will expire in {{license.daysRemaining}} days!</strong>
        <p style="margin: 10px 0 0 0;">Please renew your license to continue using the software without interruption.</p>
      </div>

      <div class="license-info">
        <h3 style="margin-top: 0;">📋 License Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Product:</strong></td>
            <td style="padding: 8px 0;">{{license.product}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>License Key:</strong></td>
            <td style="padding: 8px 0;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{{license.key}}</code></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Expiry Date:</strong></td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{{license.expiry}}</td>
          </tr>
        </table>
      </div>

      <h3>🔄 How to Renew</h3>
      <p>To renew your license, please contact your administrator or visit the customer portal.</p>

      <center>
        <a href="{{company.url}}/customer/licenses" class="button">Manage Licenses →</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        If you have any questions or need assistance with renewal, please don't hesitate to contact us.
      </p>
    </div>

    <div class="footer">
      <p>© {{year}} {{company.name}}. All rights reserved.</p>
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
        1
      ]);
      console.log('✓ Created license_expiring email template (English)');
    }

    // Create license_expired email template if not exists
    const expiredTemplate = await db.get(
      "SELECT id FROM email_templates WHERE name = 'license_expired' AND language = 'en'"
    );

    if (!expiredTemplate) {
      await db.run(`
        INSERT INTO email_templates (name, type, language, design_variation, subject, body_html, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'license_expired',
        'license',
        'en',
        1,
        'Your License Has Expired - {{license.product}}',
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .expired-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 4px; margin: 20px 0; }
    .license-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ License Expired</h1>
      <p>Immediate Action Required</p>
    </div>

    <div class="content">
      <p>Hi <strong>{{user.name}}</strong>,</p>

      <div class="expired-box">
        <strong>🚫 Your license has expired!</strong>
        <p style="margin: 10px 0 0 0;">Your access to the software may be limited. Please renew immediately to restore full functionality.</p>
      </div>

      <div class="license-info">
        <h3 style="margin-top: 0;">📋 Expired License Details</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>Product:</strong></td>
            <td style="padding: 8px 0;">{{license.product}}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>License Key:</strong></td>
            <td style="padding: 8px 0;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">{{license.key}}</code></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Expired On:</strong></td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{{license.expiry}}</td>
          </tr>
        </table>
      </div>

      <h3>🔄 Renew Your License Now</h3>
      <p>To continue using the software, please renew your license as soon as possible.</p>

      <center>
        <a href="{{renew.url}}" class="button">Renew License Now →</a>
      </center>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Need help? Contact your administrator or our support team for assistance.
      </p>
    </div>

    <div class="footer">
      <p>© {{year}} {{company.name}}. All rights reserved.</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
        1
      ]);
      console.log('✓ Created license_expired email template (English)');
    }

    console.log('✅ Migration 017_add_license_expiry_reminder completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrate().then(() => {
    console.log('Migration completed');
    process.exit(0);
  }).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
