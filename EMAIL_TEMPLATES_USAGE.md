# 📧 Email Templates - Panduan Penggunaan

Sistem email template sudah terintegrasi dengan aplikasi. Berikut cara menggunakannya:

## 🔧 Konfigurasi SMTP

### 1. Setup File `.env`

Buat file `.env` di root project (copy dari `.env.example`):

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email From
SMTP_FROM_NAME=License Manager
SMTP_FROM_EMAIL=noreply@yourcompany.com

# Application
APP_NAME=License Manager
APP_URL=http://localhost:3000
```

### 2. Gmail Setup (jika pakai Gmail)

1. Aktifkan **2-Factor Authentication** di Google Account
2. Generate **App Password**:
   - Buka: https://myaccount.google.com/apppasswords
   - Create App Password untuk "Mail"
   - Copy password yang di-generate
3. Masukkan App Password ke `SMTP_PASS` di `.env`

### 3. SMTP Provider Lain

**Mailtrap (Development/Testing):**
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

---

## 📨 Cara Menggunakan Email Templates

### Method 1: Menggunakan Email Service (Helper Functions)

Email service sudah menyediakan helper functions siap pakai:

```javascript
const emailService = require('../services/emailService');

// 1. Welcome Email (saat user dibuat)
await emailService.sendWelcomeEmail(
  { name: 'John Doe', email: 'john@example.com' },
  'password123', // Plain password
  'en' // Language: 'en' atau 'id'
);

// 2. Password Reset Email
await emailService.sendPasswordResetEmail(
  { name: 'John Doe', email: 'john@example.com' },
  'reset-token-123',
  'en'
);

// 3. License Created Email
await emailService.sendLicenseCreatedEmail(
  { name: 'Customer', email: 'customer@example.com' },
  {
    license_key: 'XXXX-XXXX-XXXX-XXXX',
    product_name: 'Premium Plan',
    expiry_date: '2024-12-31',
    license_type: 'Annual'
  },
  'id' // Bahasa Indonesia
);

// 4. License Expiring Email
await emailService.sendLicenseExpiringEmail(
  customer,
  license,
  30, // days remaining
  'en'
);

// 5. License Expired Email
await emailService.sendLicenseExpiredEmail(
  customer,
  license,
  'en'
);

// 6. License Renewed Email
await emailService.sendLicenseRenewedEmail(
  customer,
  {
    license_key: 'XXXX-XXXX-XXXX-XXXX',
    product_name: 'Premium Plan',
    oldExpiry: '2024-12-31',
    newExpiry: '2025-12-31'
  },
  'en'
);

// 7. Role Changed Email
await emailService.sendRoleChangedEmail(
  { name: 'User', email: 'user@example.com' },
  'Viewer', // old role
  'Admin', // new role
  'en'
);

// 8. Monthly Report Email
await emailService.sendMonthlyReportEmail(
  user,
  {
    month: 'January',
    year: 2024,
    totalLicenses: 150,
    totalCustomers: 45,
    totalRevenue: '$12,500'
  },
  'en'
);
```

### Method 2: Send Email Custom (Direct)

Jika ingin kirim email dengan template custom:

```javascript
const emailService = require('../services/emailService');

await emailService.sendEmail(
  'template_name', // nama template (e.g., 'welcome_email')
  'recipient@example.com',
  'Recipient Name',
  {
    // Data variables untuk replace {{variable}}
    'user.name': 'John Doe',
    'company.name': 'My Company'
  },
  'en', // language: 'en' atau 'id'
  1 // design_variation: 1 atau 2
);
```

---

## 🎨 Template Variables

Setiap template punya variables yang bisa di-customize:

### Welcome Email
- `{{user.name}}` - Nama user
- `{{user.email}}` - Email user
- `{{user.password}}` - Password (plain text)
- `{{login.url}}` - URL login
- `{{company.name}}` - Nama company
- `{{company.url}}` - URL company
- `{{year}}` - Tahun saat ini

### License Templates
- `{{license.key}}` - License key
- `{{license.product}}` - Nama produk
- `{{license.expiry}}` - Tanggal kadaluarsa
- `{{license.type}}` - Tipe lisensi
- `{{license.daysRemaining}}` - Sisa hari (untuk expiring)
- `{{renew.url}}` - URL renewal

### Role Changed
- `{{role.old}}` - Role lama
- `{{role.new}}` - Role baru

### Monthly Report
- `{{report.month}}` - Bulan
- `{{report.year}}` - Tahun
- `{{report.licenses}}` - Total lisensi
- `{{report.customers}}` - Total customer
- `{{report.revenue}}` - Total revenue

---

## 🔍 Monitoring & Logs

### Lihat Email Logs

Akses: **Settings → Email Templates → Email Logs**

Atau via URL: `/settings/email-templates/logs`

Log mencatat:
- ✅ Email yang berhasil dikirim
- ❌ Email yang gagal (dengan error message)
- 🧪 Email yang di-simulate (saat SMTP belum dikonfigurasi)

### Console Logs

Email service akan log ke console:
```
✓ Email sent to user@example.com: Welcome to License Manager
✗ Failed to send email to user@example.com: SMTP Error
📧 [SIMULATED] Email to user@example.com: Welcome (no SMTP configured)
```

---

## 🛠️ Customize Templates

### Via UI (Recommended)

1. Login sebagai Admin
2. **Settings → Email Templates**
3. Pilih template yang ingin di-edit
4. Klik **Edit**
5. Ubah:
   - Subject
   - HTML Body
   - Variables
   - Language / Design Variation
6. Klik **Preview** untuk test
7. **Save**

### Via Database

Templates tersimpan di table `email_templates`. Bisa edit langsung via SQL jika perlu.

---

## 📝 Contoh Implementasi Lengkap

### Contoh 1: Auto-send Welcome Email saat User Dibuat

Sudah terintegrasi di `userController.js` line 153-165:

```javascript
// Send welcome email
try {
  const emailService = require('../services/emailService');
  await emailService.sendWelcomeEmail(
    { name, email },
    password,
    'en'
  );
  console.log(`✓ Welcome email sent to ${email}`);
} catch (emailError) {
  console.error('Failed to send welcome email:', emailError.message);
}
```

### Contoh 2: Auto-send License Created Email

Sudah terintegrasi di `licenseController.js` line 188-210:

```javascript
// Send license created email
try {
  const emailService = require('../services/emailService');
  const customer = await db.get('SELECT * FROM customers WHERE id = ?', [customer_id]);
  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);

  if (customer && customer.email) {
    await emailService.sendLicenseCreatedEmail(
      customer,
      {
        license_key: licenseKey,
        product_name: product.name,
        expiry_date: expiryDate.toLocaleDateString(),
        license_type: licenseType.name
      },
      'en'
    );
  }
} catch (emailError) {
  console.error('Failed to send license email:', emailError.message);
}
```

---

## ⚠️ Important Notes

1. **Email tidak akan block proses utama** - Jika email gagal kirim, proses create user/license tetap berhasil
2. **Tanpa SMTP = Simulation Mode** - Email akan di-simulate dan log ke console saja
3. **Error handling** - Selalu wrap dalam try-catch agar tidak crash aplikasi
4. **Template caching** - Restart server jika edit template via database langsung

---

## 🚀 Testing

### Test Email Service

```bash
node -e "
const emailService = require('./src/services/emailService');
emailService.sendWelcomeEmail(
  { name: 'Test User', email: 'test@example.com' },
  'password123',
  'en'
).then(result => console.log('Result:', result));
"
```

### Check SMTP Connection

```bash
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your@email.com', pass: 'your-app-password' }
});
transporter.verify((err, success) => {
  if (err) console.error('SMTP Error:', err);
  else console.log('✓ SMTP Ready');
});
"
```

---

## 📚 Resources

- **Nodemailer Docs:** https://nodemailer.com/
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Mailtrap (Testing):** https://mailtrap.io/
- **SendGrid:** https://sendgrid.com/

---

**Made with ❤️ for License Manager System**
