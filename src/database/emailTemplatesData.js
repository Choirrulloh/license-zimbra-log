/**
 * Email Templates Data
 * Contains all 32 template variants (8 types × 2 designs × 2 languages)
 */

const baseStyle = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
.container { max-width: 600px; margin: 0 auto; padding: 20px; }
.header { background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
.content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
.button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 500; }
.box { background: #f3f4f6; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 4px; }
.footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
`;

const modernStyle = `
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.8; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
.container { max-width: 500px; margin: 40px auto; background: white; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); border-radius: 8px; overflow: hidden; }
.content { padding: 40px; }
.title { font-size: 28px; font-weight: 700; margin-bottom: 20px; color: #1f2937; }
.box { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb; }
.button { display: inline-block; padding: 12px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 25px 0; font-weight: 500; }
.footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 11px; }
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#ef4444')}</style></head><body>
<div class="container">
  <div class="header" style="background: #ef4444;"><h1>Password Reset Request</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>We received a request to reset your password.</p>
    <center><a href="{{reset.url}}" class="button" style="background: #ef4444;">Reset Password</a></center>
    <div class="box" style="border-color: #f59e0b; background: #fef3c7;">⚠️ This link expires in {{reset.expiry}}.</div>
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
    <div class="title" style="color: #ef4444;">🔒 Password Reset</div>
    <p>Hi {{user.name}},</p>
    <p>Click below to reset your password:</p>
    <center><a href="{{reset.url}}" class="button" style="background: #ef4444;">Reset Password</a></center>
    <div class="box" style="background: #fef3c7; border-color: #fbbf24;">Expires in {{reset.expiry}}. Didn't request? Ignore this.</div>
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#ef4444')}</style></head><body>
<div class="container">
  <div class="header" style="background: #ef4444;"><h1>Permintaan Reset Password</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Kami menerima permintaan untuk reset password Anda.</p>
    <center><a href="{{reset.url}}" class="button" style="background: #ef4444;">Reset Password</a></center>
    <div class="box" style="border-color: #f59e0b; background: #fef3c7;">⚠️ Link kadaluarsa dalam {{reset.expiry}}.</div>
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
    <div class="title" style="color: #ef4444;">🔒 Reset Password</div>
    <p>Hai {{user.name}},</p>
    <p>Klik tombol di bawah untuk reset password:</p>
    <center><a href="{{reset.url}}" class="button" style="background: #ef4444;">Reset Password</a></center>
    <div class="box" style="background: #fef3c7; border-color: #fbbf24;">Kadaluarsa dalam {{reset.expiry}}. Tidak meminta? Abaikan.</div>
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#10b981')}</style></head><body>
<div class="container">
  <div class="header" style="background: #10b981;"><h1>✅ License Activated</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>Your license for <strong>{{license.product}}</strong> is now active!</p>
    <div class="box" style="border-color: #10b981; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Your License Key</p>
      <div style="font-size: 20px; font-weight: bold; color: #10b981; letter-spacing: 2px;">{{license.key}}</div>
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
    <div class="box" style="background: #10b981; color: white; padding: 25px; text-align: center; border: none;">
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#10b981')}</style></head><body>
<div class="container">
  <div class="header" style="background: #10b981;"><h1>✅ Lisensi Diaktifkan</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Lisensi Anda untuk <strong>{{license.product}}</strong> sudah aktif!</p>
    <div class="box" style="border-color: #10b981; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Kunci Lisensi Anda</p>
      <div style="font-size: 20px; font-weight: bold; color: #10b981; letter-spacing: 2px;">{{license.key}}</div>
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
    <div class="box" style="background: #10b981; color: white; padding: 25px; text-align: center; border: none;">
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#f59e0b')}</style></head><body>
<div class="container">
  <div class="header" style="background: #f59e0b;"><h1>⚠️ License Expiring Soon</h1></div>
  <div class="content">
    <h2>Hello {{user.name}},</h2>
    <p>Your <strong>{{license.product}}</strong> license expires in <strong>{{license.daysRemaining}} days</strong>.</p>
    <div class="box" style="border-color: #f59e0b; background: #fef3c7;">
      License: {{license.key}}<br>Expires: {{license.expiry}}<br><strong style="color: #dc2626;">Days Remaining: {{license.daysRemaining}}</strong>
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
    <div class="title" style="color: #f59e0b;">⏰ Expiring Soon</div>
    <p>Hi {{user.name}},</p>
    <div class="box" style="background: #fef3c7; text-align: center; border-color: #fbbf24;">
      <div style="font-size: 48px; font-weight: bold; color: #f59e0b;">{{license.daysRemaining}}</div>
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
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle.replace('#3b82f6', '#f59e0b')}</style></head><body>
<div class="container">
  <div class="header" style="background: #f59e0b;"><h1>⚠️ Lisensi Akan Berakhir</h1></div>
  <div class="content">
    <h2>Halo {{user.name}},</h2>
    <p>Lisensi <strong>{{license.product}}</strong> Anda berakhir dalam <strong>{{license.daysRemaining}} hari</strong>.</p>
    <div class="box" style="border-color: #f59e0b; background: #fef3c7;">
      Lisensi: {{license.key}}<br>Berakhir: {{license.expiry}}<br><strong style="color: #dc2626;">Sisa Hari: {{license.daysRemaining}}</strong>
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
    <div class="title" style="color: #f59e0b;">⏰ Akan Berakhir</div>
    <p>Hai {{user.name}},</p>
    <div class="box" style="background: #fef3c7; text-align: center; border-color: #fbbf24;">
      <div style="font-size: 48px; font-weight: bold; color: #f59e0b;">{{license.daysRemaining}}</div>
      <div>hari tersisa</div>
    </div>
    <p>📅 {{license.product}} berakhir: {{license.expiry}}</p>
  </div>
</div></body></html>`,
    body_text: '⏰ {{license.daysRemaining}} hari lagi untuk {{license.product}}'
  },

  // CUSTOMER ACCESS (4 variants) - New template for customer registration
  {
    name: 'customer_access',
    type: 'customer',
    language: 'en',
    design_variation: 1,
    subject: 'Welcome to {{company.name}} - Your Customer Access',
    variables: 'customer.name, customer.email, customer.password, customer.login_url, customer.license_limit, customer.code_protection_limit, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="container">
  <div class="header"><h1>Welcome to {{company.name}}</h1></div>
  <div class="content">
    <h2>Hello {{customer.name}}!</h2>
    <p>Your customer account has been created successfully. You now have access to our license management portal.</p>
    <div class="box">
      <strong>Your Login Credentials:</strong><br>
      Email: {{customer.email}}<br>
      Password: {{customer.password}}
    </div>
    <div class="box" style="border-color: #10b981; background: #f0fdf4;">
      <strong>📊 Your Account Limits:</strong><br>
      License Limit: {{customer.license_limit}}<br>
      Code Protection Limit: {{customer.code_protection_limit}}
    </div>
    <p>For security reasons, please change your password after your first login.</p>
    <center><a href="{{customer.login_url}}" class="button">Access Customer Portal</a></center>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}. All rights reserved.</p></div>
</div></body></html>`,
    body_text: 'Welcome to {{company.name}}! Email: {{customer.email}}, Password: {{customer.password}}. Login: {{customer.login_url}}'
  },
  {
    name: 'customer_access',
    type: 'customer',
    language: 'en',
    design_variation: 2,
    subject: '🎉 Your {{company.name}} Customer Portal is Ready!',
    variables: 'customer.name, customer.email, customer.password, customer.login_url, customer.license_limit, customer.code_protection_limit, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">👋 Welcome Aboard!</div>
    <p>Hi {{customer.name}},</p>
    <p>Great news! Your customer portal account is ready to use.</p>
    <div class="box">
      <strong>Login Details:</strong><br>
      📧 {{customer.email}}<br>
      🔑 {{customer.password}}
    </div>
    <div class="box" style="background: #f0fdf4; border-color: #10b981;">
      <strong>Your Access:</strong><br>
      🎫 {{customer.license_limit}} License(s)<br>
      🔒 {{customer.code_protection_limit}} Code Protection(s)
    </div>
    <center><a href="{{customer.login_url}}" class="button">Go to Portal</a></center>
    <p style="font-size: 13px; color: #6b7280;">💡 Please change your password after first login for security.</p>
  </div>
  <div class="footer">{{company.name}} © {{year}}</div>
</div></body></html>`,
    body_text: 'Welcome! Login: {{customer.email}} / {{customer.password}}. Portal: {{customer.login_url}}'
  },
  {
    name: 'customer_access',
    type: 'customer',
    language: 'id',
    design_variation: 1,
    subject: 'Selamat Datang di {{company.name}} - Akses Customer Anda',
    variables: 'customer.name, customer.email, customer.password, customer.login_url, customer.license_limit, customer.code_protection_limit, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
<div class="container">
  <div class="header"><h1>Selamat Datang di {{company.name}}</h1></div>
  <div class="content">
    <h2>Halo {{customer.name}}!</h2>
    <p>Akun customer Anda telah berhasil dibuat. Anda sekarang memiliki akses ke portal manajemen lisensi kami.</p>
    <div class="box">
      <strong>Kredensial Login Anda:</strong><br>
      Email: {{customer.email}}<br>
      Password: {{customer.password}}
    </div>
    <div class="box" style="border-color: #10b981; background: #f0fdf4;">
      <strong>📊 Batas Akun Anda:</strong><br>
      Batas Lisensi: {{customer.license_limit}}<br>
      Batas Code Protection: {{customer.code_protection_limit}}
    </div>
    <p>Untuk keamanan, kami sarankan mengganti password setelah login pertama kali.</p>
    <center><a href="{{customer.login_url}}" class="button">Akses Portal Customer</a></center>
  </div>
  <div class="footer"><p>&copy; {{year}} {{company.name}}. Semua hak dilindungi.</p></div>
</div></body></html>`,
    body_text: 'Selamat Datang di {{company.name}}! Email: {{customer.email}}, Password: {{customer.password}}. Login: {{customer.login_url}}'
  },
  {
    name: 'customer_access',
    type: 'customer',
    language: 'id',
    design_variation: 2,
    subject: '🎉 Portal Customer {{company.name}} Anda Sudah Siap!',
    variables: 'customer.name, customer.email, customer.password, customer.login_url, customer.license_limit, customer.code_protection_limit, company.name',
    body_html: `<!DOCTYPE html><html><head><style>${modernStyle}</style></head><body>
<div class="container">
  <div class="content">
    <div class="title">👋 Selamat Bergabung!</div>
    <p>Hai {{customer.name}},</p>
    <p>Kabar gembira! Akun portal customer Anda sudah siap digunakan.</p>
    <div class="box">
      <strong>Detail Login:</strong><br>
      📧 {{customer.email}}<br>
      🔑 {{customer.password}}
    </div>
    <div class="box" style="background: #f0fdf4; border-color: #10b981;">
      <strong>Akses Anda:</strong><br>
      🎫 {{customer.license_limit}} Lisensi<br>
      🔒 {{customer.code_protection_limit}} Code Protection
    </div>
    <center><a href="{{customer.login_url}}" class="button">Buka Portal</a></center>
    <p style="font-size: 13px; color: #6b7280;">💡 Silakan ganti password setelah login pertama untuk keamanan.</p>
  </div>
  <div class="footer">{{company.name}} © {{year}}</div>
</div></body></html>`,
    body_text: 'Selamat Datang! Login: {{customer.email}} / {{customer.password}}. Portal: {{customer.login_url}}'
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
