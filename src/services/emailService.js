const nodemailer = require('nodemailer');
const db = require('../database/db');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  initializeTransporter() {
    try {
      // Get email settings from database or environment
      const emailSettings = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      };

      // If no credentials, use test account (for development)
      if (!emailSettings.auth.user || !emailSettings.auth.pass) {
        console.log('⚠️  No SMTP credentials found. Email sending will be simulated.');
        this.transporter = null;
        return;
      }

      this.transporter = nodemailer.createTransport(emailSettings);

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter verification failed:', error);
          this.transporter = null;
        } else {
          console.log('✓ Email service ready');
        }
      });
    } catch (error) {
      console.error('Error initializing email transporter:', error);
      this.transporter = null;
    }
  }

  // Replace variables in template
  replaceVariables(text, data) {
    let result = text;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    return result;
  }

  // Send email using template
  async sendEmail(templateName, recipientEmail, recipientName, data, language = 'en', designVariation = 1) {
    try {
      // Get template from database
      const template = await db.get(
        `SELECT * FROM email_templates
         WHERE name = ? AND language = ? AND design_variation = ? AND is_active = 1`,
        [templateName, language, designVariation]
      );

      if (!template) {
        throw new Error(`Email template not found: ${templateName} (${language}, v${designVariation})`);
      }

      // Prepare default data
      const emailData = {
        'user.name': recipientName,
        'user.email': recipientEmail,
        'company.name': process.env.APP_NAME || 'License Manager',
        'company.url': process.env.APP_URL || 'http://localhost:3000',
        'year': new Date().getFullYear(),
        ...data
      };

      // Replace variables in subject and body
      const subject = this.replaceVariables(template.subject, emailData);
      const bodyHtml = this.replaceVariables(template.body_html, emailData);
      const bodyText = template.body_text ? this.replaceVariables(template.body_text, emailData) : '';

      let status = 'pending';
      let errorMessage = null;
      let sentAt = null;

      // Send email if transporter is available
      if (this.transporter) {
        try {
          const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'License Manager'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: subject,
            html: bodyHtml,
            text: bodyText
          };

          await this.transporter.sendMail(mailOptions);
          status = 'sent';
          sentAt = new Date().toISOString();
          console.log(`✓ Email sent to ${recipientEmail}: ${subject}`);
        } catch (error) {
          status = 'failed';
          errorMessage = error.message;
          console.error(`✗ Failed to send email to ${recipientEmail}:`, error.message);
        }
      } else {
        // Simulate sending (development mode)
        status = 'simulated';
        sentAt = new Date().toISOString();
        console.log(`📧 [SIMULATED] Email to ${recipientEmail}: ${subject}`);
        console.log(`   Template: ${templateName} (${language}, v${designVariation})`);
      }

      // Log email
      await db.run(
        `INSERT INTO email_logs (template_id, recipient_email, recipient_name, subject, body_html, body_text, status, error_message, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [template.id, recipientEmail, recipientName, subject, bodyHtml, bodyText, status, errorMessage, sentAt]
      );

      return {
        success: status === 'sent' || status === 'simulated',
        status,
        message: status === 'sent' ? 'Email sent successfully' : status === 'simulated' ? 'Email simulated (no SMTP configured)' : 'Failed to send email',
        errorMessage
      };
    } catch (error) {
      console.error('Error sending email:', error);

      // Log failed attempt
      await db.run(
        `INSERT INTO email_logs (recipient_email, recipient_name, subject, status, error_message)
         VALUES (?, ?, ?, ?, ?)`,
        [recipientEmail, recipientName, 'Email send failed', 'failed', error.message]
      );

      return {
        success: false,
        status: 'failed',
        message: error.message,
        errorMessage: error.message
      };
    }
  }

  // Send welcome email
  async sendWelcomeEmail(user, password, language = 'en') {
    return await this.sendEmail(
      'welcome_email',
      user.email,
      user.name,
      {
        'user.password': password,
        'login.url': `${process.env.APP_URL || 'http://localhost:3000'}/login`
      },
      language
    );
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken, language = 'en') {
    return await this.sendEmail(
      'password_reset',
      user.email,
      user.name,
      {
        'reset.token': resetToken,
        'reset.url': `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        'reset.expiry': '24 hours'
      },
      language
    );
  }

  // Send license created email
  async sendLicenseCreatedEmail(customer, license, language = 'en') {
    return await this.sendEmail(
      'license_created',
      customer.email,
      customer.name,
      {
        'license.key': license.license_key,
        'license.product': license.product_name,
        'license.expiry': license.expiry_date,
        'license.type': license.license_type
      },
      language
    );
  }

  // Send license expiring email
  async sendLicenseExpiringEmail(customer, license, daysRemaining, language = 'en') {
    return await this.sendEmail(
      'license_expiring',
      customer.email,
      customer.name,
      {
        'license.key': license.license_key,
        'license.product': license.product_name,
        'license.expiry': license.expiry_date,
        'license.daysRemaining': daysRemaining
      },
      language
    );
  }

  // Send license expired email
  async sendLicenseExpiredEmail(customer, license, language = 'en') {
    return await this.sendEmail(
      'license_expired',
      customer.email,
      customer.name,
      {
        'license.key': license.license_key,
        'license.product': license.product_name,
        'license.expiry': license.expiry_date,
        'renew.url': `${process.env.APP_URL || 'http://localhost:3000'}/licenses/${license.id}/renew`
      },
      language
    );
  }

  // Send license renewed email
  async sendLicenseRenewedEmail(customer, license, language = 'en') {
    return await this.sendEmail(
      'license_renewed',
      customer.email,
      customer.name,
      {
        'license.key': license.license_key,
        'license.product': license.product_name,
        'license.expiry': license.expiry_date,
        'license.newExpiry': license.new_expiry_date
      },
      language
    );
  }

  // Send role changed email
  async sendRoleChangedEmail(user, oldRole, newRole, language = 'en') {
    return await this.sendEmail(
      'role_changed',
      user.email,
      user.name,
      {
        'role.old': oldRole,
        'role.new': newRole
      },
      language
    );
  }

  // Send monthly report email
  async sendMonthlyReportEmail(user, reportData, language = 'en') {
    return await this.sendEmail(
      'monthly_report',
      user.email,
      user.name,
      {
        'report.month': reportData.month,
        'report.year': reportData.year,
        'report.licenses': reportData.totalLicenses || 0,
        'report.customers': reportData.totalCustomers || 0,
        'report.revenue': reportData.totalRevenue || 0
      },
      language
    );
  }

  // Send test email
  async sendTestEmail(recipientEmail, settings) {
    try {
      // Create transporter with provided settings
      const testTransporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port),
        secure: settings.smtp_secure === 'true',
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password
        }
      });

      // Verify connection first
      await testTransporter.verify();

      // Send test email
      const mailOptions = {
        from: `"${settings.email_from_name}" <${settings.email_from_address}>`,
        to: recipientEmail,
        subject: 'SMTP Test Email - License Manager',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">✓ SMTP Test Successful!</h1>
            </div>
            <div style="background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">
                Congratulations! Your SMTP configuration is working correctly.
              </p>
              <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #48bb78;">
                <h3 style="color: #2d3748; margin-top: 0;">Connection Details:</h3>
                <ul style="color: #4a5568; line-height: 1.8;">
                  <li><strong>SMTP Host:</strong> ${settings.smtp_host}</li>
                  <li><strong>Port:</strong> ${settings.smtp_port}</li>
                  <li><strong>Secure:</strong> ${settings.smtp_secure === 'true' ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}</li>
                  <li><strong>From Name:</strong> ${settings.email_from_name}</li>
                  <li><strong>From Address:</strong> ${settings.email_from_address}</li>
                </ul>
              </div>
              <p style="font-size: 14px; color: #718096; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                This is an automated test email from ${settings.app_name || 'License Manager'}.<br>
                If you received this email, your email configuration is ready to use.
              </p>
            </div>
          </div>
        `,
        text: `SMTP Test Successful!

Congratulations! Your SMTP configuration is working correctly.

Connection Details:
- SMTP Host: ${settings.smtp_host}
- Port: ${settings.smtp_port}
- Secure: ${settings.smtp_secure === 'true' ? 'Yes (SSL/TLS)' : 'No (STARTTLS)'}
- From Name: ${settings.email_from_name}
- From Address: ${settings.email_from_address}

This is an automated test email from ${settings.app_name || 'License Manager'}.
If you received this email, your email configuration is ready to use.`
      };

      await testTransporter.sendMail(mailOptions);

      // Log test email
      await db.run(
        `INSERT INTO email_logs (recipient_email, recipient_name, subject, body_html, body_text, status, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [recipientEmail, 'SMTP Test', mailOptions.subject, mailOptions.html, mailOptions.text, 'sent', new Date().toISOString()]
      );

      return {
        success: true,
        message: 'Test email sent successfully! Please check your inbox.'
      };
    } catch (error) {
      console.error('Test email failed:', error);

      // Log failed test
      await db.run(
        `INSERT INTO email_logs (recipient_email, recipient_name, subject, status, error_message)
         VALUES (?, ?, ?, ?, ?)`,
        [recipientEmail, 'SMTP Test', 'SMTP Test Email - License Manager', 'failed', error.message]
      );

      let errorMessage = 'Failed to send test email';
      if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check your SMTP username and password.';
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection failed. Please check your SMTP host and port settings.';
      } else if (error.code === 'ESOCKET') {
        errorMessage = 'Socket error. Please verify your SMTP server settings.';
      } else {
        errorMessage = `SMTP Error: ${error.message}`;
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }
}

module.exports = new EmailService();
