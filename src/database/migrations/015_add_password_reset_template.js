const db = require('../db');

/**
 * Migration to add password_reset email template
 */

async function migrate() {
  console.log('Running migration: Add password_reset email template...');

  try {
    // Check if template already exists
    const existing = await db.get(
      'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ?',
      ['password_reset', 'en', 1]
    );

    if (existing) {
      console.log('Password reset email template already exists, skipping...');
      return;
    }

    // Insert password reset email template
    await db.run(
      `INSERT INTO email_templates (
        name, type, language, design_variation, subject, body_html, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'password_reset',
        'customer',
        'en',
        1,
        'Reset Your Password - {{ company.name }}',
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .reset-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
    .warning { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>{{ user.name }}</strong>,</p>

      <p>We received a request to reset your password for your account at <strong>{{ company.name }}</strong>.</p>

      <div class="reset-box">
        <p style="margin-bottom: 15px; color: #6b7280;">Click the button below to reset your password:</p>
        <a href="{{ reset.url }}" class="button">Reset My Password</a>
        <p style="margin-top: 15px; font-size: 14px; color: #6b7280;">
          This link will expire in <strong>{{ reset.expiry }}</strong>
        </p>
      </div>

      <div class="warning">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⚠️ Security Notice:</strong><br>
          If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        If the button above doesn't work, copy and paste this link into your browser:<br>
        <a href="{{ reset.url }}" style="color: #f59e0b; word-break: break-all;">{{ reset.url }}</a>
      </p>

      <div class="footer">
        <p>This is an automated email from {{ company.name }}.</p>
        <p>&copy; {{ year }} {{ company.name }}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
        1
      ]
    );
    console.log('✓ Added password_reset email template');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;
