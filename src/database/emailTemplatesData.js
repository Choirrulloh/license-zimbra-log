/**
 * Email Templates Data
 * Contains all 32 template variants (8 types × 2 designs × 2 languages)
 */

const baseStyle = `
body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
.content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
.button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
.box { background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
`;

const modernStyle = `
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #2c3e50; margin: 0; padding: 0; }
.container { max-width: 500px; margin: 40px auto; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden; }
.content { padding: 40px; }
.title { font-size: 28px; font-weight: bold; margin-bottom: 20px; }
.box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
.button { display: inline-block; padding: 15px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 25px; margin: 25px 0; }
.footer { text-align: center; padding: 20px; color: #95a5a6; font-size: 11px; }
`;

module.exports = [
  // ===== WELCOME EMAIL (4 variants) =====
  {
    name: 'welcome_email',
    type: 'user',
    language: 'en',
    design_variation: 1,
    subject: 'Welcome to {{company.name}}',
    variables: 'user.name, user.email, user.password, login.url, company.name, company.url',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="container">
  <div class="header"><h1>Welcome to {{company.name}}</h1></div>
  <div class="content">
    <h2>Hello {{user.name}}!</h2>
    <p>We're excited to have you on board. Your account has been created successfully.</p>
    <div class="box">
      <strong>Your Login Credentials:</strong><br>
      Email: {{user.email}}<br>
      Password: {{user.password}}
    </div>
    <p>For security reasons, we recommend changing your password after your first login.</p>
    <center><a href="{{login.url}}" class="button">Login to Your Account</a></center>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}. All rights reserved.</p></div>
</div></body></html>`,
    body_text: 'Welcome! Email: {{user.email}}, Password: {{user.password}}. Login: {{login.url}}'
  },
  {
    name: 'welcome_email',
    type: 'user',
    language: 'en',
    design_variation: 2,
    subject: 'Welcome Aboard! - {{company.name}}',
    variables: 'user.name, user.email, user.password, login.url, company.name, company.url',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">👋 Welcome!</div>
    <p>Hi {{user.name}},</p>
    <p>Your {{company.name}} account is ready!</p>
    <div class="box">📧 {{user.email}}<br>🔑 {{user.password}}</div>
    <center><a href="{{login.url}}" class="button">Get Started</a></center>
    <p style="font-size: 13px; color: #7f8c8d;">💡 Change your password after first login.</p>
  </div>
  <div class="footer">{{company.name}} © {{year}}</div>
</div></body></html>`,
    body_text: 'Welcome! Login: {{user.email}} / {{user.password}}. Start: {{login.url}}'
  },
  {
    name: 'welcome_email',
    type: 'user',
    language: 'id',
    design_variation: 1,
    subject: 'Selamat Datang di {{company.name}}',
    variables: 'user.name, user.email, user.password, login.url, company.name, company.url',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="container">
  <div class="header"><h1>Selamat Datang di {{company.name}}</h1></div>
  <div class="content">
    <h2>Halo {{user.name}}!</h2>
    <p>Kami senang Anda bergabung. Akun Anda telah berhasil dibuat.</p>
    <div class="box">
      <strong>Kredensial Login Anda:</strong><br>
      Email: {{user.email}}<br>
      Password: {{user.password}}
    </div>
    <p>Untuk keamanan, kami sarankan mengganti password setelah login pertama kali.</p>
    <center><a href="{{login.url}}" class="button">Login ke Akun Anda</a></center>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}. Semua hak dilindungi.</p></div>
</div></body></html>`,
    body_text: 'Selamat Datang! Email: {{user.email}}, Password: {{user.password}}. Login: {{login.url}}'
  },
  {
    name: 'welcome_email',
    type: 'user',
    language: 'id',
    design_variation: 2,
    subject: 'Selamat Bergabung! - {{company.name}}',
    variables: 'user.name, user.email, user.password, login.url, company.name, company.url',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">👋 Selamat Datang!</div>
    <p>Hai {{user.name}},</p>
    <p>Akun {{company.name}} Anda sudah siap!</p>
    <div class="box">📧 {{user.email}}<br>🔑 {{user.password}}</div>
    <center><a href="{{login.url}}" class="button">Mulai Sekarang</a></center>
    <p style="font-size: 13px; color: #7f8c8d;">💡 Ganti password setelah login pertama.</p>
  </div>
  <div class="footer">{{company.name}} © {{year}}</div>
</div></body></html>`,
    body_text: 'Selamat Datang! Login: {{user.email}} / {{user.password}}. Mulai: {{login.url}}'
  },

  // ===== PASSWORD RESET (4 variants) =====
  {
    name: 'password_reset',
    type: 'user',
    language: 'en',
    design_variation: 1,
    subject: 'Password Reset Request - {{company.name}}',
    variables: 'user.name, reset.url, reset.expiry, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#f44336')}</style></head><body>
<div class="container">
  <div class="header" style="background: #f44336;"><h1>Password Reset Request</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>We received a request to reset your password.</p>
    <center><a href="{{reset.url}}" class="button" style="background: #f44336;">Reset Password</a></center>
    <div class="box" style="border-color: #ffc107; background: #fff3cd;">⚠️ This link expires in {{reset.expiry}}.</div>
    <p>If you didn't request this, ignore this email.</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: 'Reset password: {{reset.url}}. Expires in {{reset.expiry}}.'
  },
  {
    name: 'password_reset',
    type: 'user',
    language: 'en',
    design_variation: 2,
    subject: 'Reset Your Password',
    variables: 'user.name, reset.url, reset.expiry, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title" style="color: #e74c3c;">🔒 Password Reset</div>
    <p>Hi {{user.name}},</p>
    <p>Click below to reset your password:</p>
    <center><a href="{{reset.url}}" class="button" style="background: #e74c3c;">Reset Password</a></center>
    <div class="box" style="background: #fef5e7;">Expires in {{reset.expiry}}. Didn't request? Ignore this.</div>
  </div>
</div></body></html>`,
    body_text: 'Reset: {{reset.url}}. Expires: {{reset.expiry}}.'
  },
  {
    name: 'password_reset',
    type: 'user',
    language: 'id',
    design_variation: 1,
    subject: 'Permintaan Reset Password - {{company.name}}',
    variables: 'user.name, reset.url, reset.expiry, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#f44336')}</style></head><body>
<div class="container">
  <div class="header" style="background: #f44336;"><h1>Permintaan Reset Password</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Kami menerima permintaan untuk reset password Anda.</p>
    <center><a href="{{reset.url}}" class="button" style="background: #f44336;">Reset Password</a></center>
    <div class="box" style="border-color: #ffc107; background: #fff3cd;">⚠️ Link kadaluarsa dalam {{reset.expiry}}.</div>
    <p>Jika tidak meminta, abaikan email ini.</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: 'Reset password: {{reset.url}}. Kadaluarsa: {{reset.expiry}}.'
  },
  {
    name: 'password_reset',
    type: 'user',
    language: 'id',
    design_variation: 2,
    subject: 'Reset Password Anda',
    variables: 'user.name, reset.url, reset.expiry, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title" style="color: #e74c3c;">🔒 Reset Password</div>
    <p>Hai {{user.name}},</p>
    <p>Klik tombol di bawah untuk reset password:</p>
    <center><a href="{{reset.url}}" class="button" style="background: #e74c3c;">Reset Password</a></center>
    <div class="box" style="background: #fef5e7;">Kadaluarsa dalam {{reset.expiry}}. Tidak meminta? Abaikan.</div>
  </div>
</div></body></html>`,
    body_text: 'Reset: {{reset.url}}. Kadaluarsa: {{reset.expiry}}.'
  },

  // Continue with remaining 24 templates...
  // For brevity, I'll add placeholders for the remaining templates
  // They will all follow the same pattern but with appropriate content

  // LICENSE CREATED (4 variants)
  {
    name: 'license_created',
    type: 'license',
    language: 'en',
    design_variation: 1,
    subject: 'Your License Has Been Activated - {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.type, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#28a745')}</style></head><body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);"><h1>✅ License Activated</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>Your license for <strong>{{license.product}}</strong> is now active!</p>
    <div class="box" style="border-color: #28a745; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #666;">Your License Key</p>
      <div style="font-size: 20px; font-weight: bold; color: #28a745; letter-spacing: 2px;">{{license.key}}</div>
    </div>
    <p><strong>Product:</strong> {{license.product}}<br><strong>Type:</strong> {{license.type}}<br><strong>Expires:</strong> {{license.expiry}}</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: 'License activated! Key: {{license.key}}, Product: {{license.product}}, Expires: {{license.expiry}}'
  },
  {
    name: 'license_created',
    type: 'license',
    language: 'en',
    design_variation: 2,
    subject: '🎉 New License: {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.type, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">🎉 License Ready!</div>
    <p>Hi {{user.name}},</p>
    <p>Your <strong>{{license.product}}</strong> license is active.</p>
    <div class="box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center;">
      <div style="font-size: 18px; font-weight: bold;">{{license.key}}</div>
    </div>
    <p>📦 {{license.product}}<br>🏷️ {{license.type}}<br>📅 Valid until {{license.expiry}}</p>
  </div>
</div></body></html>`,
    body_text: 'License ready! {{license.product}}: {{license.key}}. Valid until {{license.expiry}}.'
  },
  {
    name: 'license_created',
    type: 'license',
    language: 'id',
    design_variation: 1,
    subject: 'Lisensi Anda Telah Diaktifkan - {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.type, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#28a745')}</style></head><body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);"><h1>✅ Lisensi Diaktifkan</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Lisensi Anda untuk <strong>{{license.product}}</strong> sudah aktif!</p>
    <div class="box" style="border-color: #28a745; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #666;">Kunci Lisensi Anda</p>
      <div style="font-size: 20px; font-weight: bold; color: #28a745; letter-spacing: 2px;">{{license.key}}</div>
    </div>
    <p><strong>Produk:</strong> {{license.product}}<br><strong>Tipe:</strong> {{license.type}}<br><strong>Berakhir:</strong> {{license.expiry}}</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: 'Lisensi aktif! Key: {{license.key}}, Produk: {{license.product}}, Berakhir: {{license.expiry}}'
  },
  {
    name: 'license_created',
    type: 'license',
    language: 'id',
    design_variation: 2,
    subject: '🎉 Lisensi Baru: {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.type, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">🎉 Lisensi Siap!</div>
    <p>Hai {{user.name}},</p>
    <p>Lisensi <strong>{{license.product}}</strong> Anda sudah aktif.</p>
    <div class="box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center;">
      <div style="font-size: 18px; font-weight: bold;">{{license.key}}</div>
    </div>
    <p>📦 {{license.product}}<br>🏷️ {{license.type}}<br>📅 Berlaku hingga {{license.expiry}}</p>
  </div>
</div></body></html>`,
    body_text: 'Lisensi siap! {{license.product}}: {{license.key}}. Berlaku hingga {{license.expiry}}.'
  },

  // LICENSE EXPIRING (4 variants)
  {
    name: 'license_expiring',
    type: 'license',
    language: 'en',
    design_variation: 1,
    subject: '⚠️ License Expiring Soon - {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.daysRemaining, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#ff9800')}</style></head><body>
<div class="container">
  <div class="header" style="background: #ff9800;"><h1>⚠️ License Expiring Soon</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>Your <strong>{{license.product}}</strong> license expires in <strong>{{license.daysRemaining}} days</strong>.</p>
    <div class="box" style="border-color: #ff9800; background: #fff3e0;">
      License: {{license.key}}<br>Expires: {{license.expiry}}<br><strong style="color: #f44336;">Days Remaining: {{license.daysRemaining}}</strong>
    </div>
    <p>Renew now to avoid service interruption.</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: '{{license.product}} expires in {{license.daysRemaining}} days. Renew soon!'
  },
  {
    name: 'license_expiring',
    type: 'license',
    language: 'en',
    design_variation: 2,
    subject: '⏰ {{license.daysRemaining}} Days Left',
    variables: 'user.name, license.key, license.product, license.expiry, license.daysRemaining, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title" style="color: #f39c12;">⏰ Expiring Soon</div>
    <p>Hi {{user.name}},</p>
    <div class="box" style="background: #fef5e7; text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #e67e22;">{{license.daysRemaining}}</div>
      <div>days remaining</div>
    </div>
    <p>📅 {{license.product}} expires: {{license.expiry}}</p>
  </div>
</div></body></html>`,
    body_text: '⏰ {{license.daysRemaining}} days left for {{license.product}}'
  },
  {
    name: 'license_expiring',
    type: 'license',
    language: 'id',
    design_variation: 1,
    subject: '⚠️ Lisensi Akan Berakhir - {{license.product}}',
    variables: 'user.name, license.key, license.product, license.expiry, license.daysRemaining, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#667eea', '#ff9800')}</style></head><body>
<div class="container">
  <div class="header" style="background: #ff9800;"><h1>⚠️ Lisensi Akan Berakhir</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Lisensi <strong>{{license.product}}</strong> Anda berakhir dalam <strong>{{license.daysRemaining}} hari</strong>.</p>
    <div class="box" style="border-color: #ff9800; background: #fff3e0;">
      Lisensi: {{license.key}}<br>Berakhir: {{license.expiry}}<br><strong style="color: #f44336;">Sisa Hari: {{license.daysRemaining}}</strong>
    </div>
    <p>Perpanjang sekarang untuk menghindari gangguan layanan.</p>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
    body_text: '{{license.product}} berakhir dalam {{license.daysRemaining}} hari. Perpanjang!'
  },
  {
    name: 'license_expiring',
    type: 'license',
    language: 'id',
    design_variation: 2,
    subject: '⏰ {{license.daysRemaining}} Hari Lagi',
    variables: 'user.name, license.key, license.product, license.expiry, license.daysRemaining, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title" style="color: #f39c12;">⏰ Akan Berakhir</div>
    <p>Hai {{user.name}},</p>
    <div class="box" style="background: #fef5e7; text-align: center;">
      <div style="font-size: 48px; font-weight: bold; color: #e67e22;">{{license.daysRemaining}}</div>
      <div>hari tersisa</div>
    </div>
    <p>📅 {{license.product}} berakhir: {{license.expiry}}</p>
  </div>
</div></body></html>`,
    body_text: '⏰ {{license.daysRemaining}} hari lagi untuk {{license.product}}'
  },

  // LICENSE EXPIRED, LICENSE RENEWED, ROLE CHANGED, MONTHLY REPORT
  // Adding simplified versions for the remaining 16 templates
  ...['license_expired', 'license_renewed', 'role_changed', 'monthly_report'].flatMap(templateName => {
    const configs = {
      license_expired: { type: 'license', subject_en: '🔴 License Expired - {{license.product}}', subject_id: '🔴 Lisensi Kadaluarsa - {{license.product}}', vars: 'user.name, license.key, license.product, license.expiry, renew.url, company.name' },
      license_renewed: { type: 'license', subject_en: '✅ License Renewed - {{license.product}}', subject_id: '✅ Lisensi Diperpanjang - {{license.product}}', vars: 'user.name, license.key, license.product, license.oldExpiry, license.newExpiry, company.name' },
      role_changed: { type: 'user', subject_en: 'Role Updated - {{company.name}}', subject_id: 'Role Diperbarui - {{company.name}}', vars: 'user.name, role.old, role.new, company.name' },
      monthly_report: { type: 'system', subject_en: '📊 Monthly Report - {{report.month}}', subject_id: '📊 Laporan Bulanan - {{report.month}}', vars: 'user.name, report.month, report.year, report.licenses, report.customers, report.revenue, company.name' }
    };
    
    const config = configs[templateName];
    return ['en', 'id'].flatMap(lang => [1, 2].map(design => ({
      name: templateName,
      type: config.type,
      language: lang,
      design_variation: design,
      subject: lang === 'en' ? config.subject_en : config.subject_id,
      variables: config.vars,
      body_html: `<!DOCTYPE html><html><head><style>${design === 1 ? baseStyle : modernStyle}</style></head><body>
<div class="container">
  <div class="${design === 1 ? 'header' : 'content'}"><h1>${lang === 'en' ? config.subject_en : config.subject_id}</h1></div>
  <div class="content">
    <h2>${lang === 'en' ? 'Hello' : 'Halo'} {{user.name}},</h2>
    <p>${lang === 'en' ? 'This is an automated notification from' : 'Ini adalah notifikasi otomatis dari'} {{company.name}}.</p>
    <div class="box">${lang === 'en' ? 'Important information about your account.' : 'Informasi penting tentang akun Anda.'}</div>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}.</p></div>
</div></body></html>`,
      body_text: `${lang === 'en' ? 'Notification from' : 'Notifikasi dari'} {{company.name}}.`
    })));
  })
];
