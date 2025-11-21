# SaaS Licensing Management System

Sistem manajemen lisensi lengkap untuk aplikasi SaaS yang diinstall di server klien. Dibangun dengan Node.js, Express, SQLite, dan dilengkapi dengan Client SDK untuk integrasi yang mudah.

## ✨ Fitur Utama

### 1. Manajemen Produk
- CRUD produk yang akan dilisensikan
- Set tipe lisensi (trial, basic, pro, enterprise)
- Atur durasi lisensi per produk
- Multiple license types per product

### 2. Manajemen Customer
- Registrasi dan data customer
- Riwayat lisensi per customer
- Status aktivasi
- Tracking revenue per customer

### 3. Manajemen Lisensi
- Generate license key unik dan aman
- Aktivasi/deaktivasi lisensi
- Perpanjangan lisensi
- Tracking penggunaan
- Hardware binding untuk keamanan
- Online & offline validation
- Maximum activations control

### 4. Dashboard & Reporting
- Statistik lisensi aktif/expired
- Grafik revenue bulanan
- Alert lisensi akan expired (30 hari)
- Export data ke CSV
- Generate PDF report per license

### 5. Client SDK
- Easy integration ke aplikasi client
- Automatic hardware ID generation
- Caching untuk performa
- Simple API

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 atau lebih baru)
- pnpm package manager

### Installation

```bash
# Clone repository
git clone <repository-url>
cd license-zimbra-log

# Install dependencies
pnpm install

# Setup database
pnpm run setup

# Seed initial data
pnpm run seed

# Start server
pnpm start
```

Server akan berjalan di `http://localhost:3000`

### Default Login

```
Email: admin@example.com
Password: admin123
```

**⚠️ PENTING: Ganti password default setelah login pertama kali!**

## 📁 Struktur Project

```
.
├── src/
│   ├── controllers/        # Business logic
│   ├── database/          # Database setup & models
│   ├── middleware/        # Express middleware
│   ├── routes/           # API routes
│   ├── utils/            # Helper functions, license generator
│   ├── views/            # EJS templates
│   └── server.js         # Main entry point
├── client-sdk/           # Client SDK untuk integrasi
├── database/             # SQLite database files
└── README.md
```

## 🔧 Configuration

Edit file `.env` untuk konfigurasi:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-super-secret-key
LICENSE_ENCRYPTION_KEY=your-encryption-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## 💻 Penggunaan

### 1. Membuat Product

1. Login ke dashboard
2. Navigasi ke **Products** → **Add Product**
3. Isi informasi produk
4. Buat license types untuk product tersebut

### 2. Menambah Customer

1. Navigasi ke **Customers** → **Add Customer**
2. Isi data customer
3. Save

### 3. Generate License

1. Navigasi ke **Licenses** → **Generate License**
2. Pilih Product dan License Type
3. Pilih Customer
4. Klik **Generate License**
5. License key akan otomatis ter-generate

### 4. Validasi License (Client Side)

Gunakan Client SDK yang tersedia di folder `client-sdk/`:

```javascript
const LicenseClient = require('./client-sdk/license-client');

const client = new LicenseClient('http://your-server.com:3000');

// Validate license
const result = await client.validate('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX');

if (result.valid) {
  console.log('✓ License valid!');
  console.log('Product:', result.license.product.name);
  console.log('Expires:', result.license.expiry_date);
} else {
  console.log('✗ License invalid:', result.error);
  process.exit(1);
}
```

Lihat dokumentasi lengkap di `client-sdk/README.md`

## 🔐 Keamanan

### License Key Generation
- Menggunakan cryptographic random generation
- Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (25 karakter)
- Signed dengan HMAC-SHA256
- Encrypted dengan AES

### Hardware Binding
- Automatic hardware ID generation berdasarkan:
  - Platform & Architecture
  - Hostname
  - CPU count
  - Total memory
- Mencegah license key sharing antar mesin

### Validation
- Online validation via REST API
- Caching untuk mengurangi server load
- Expiry date checking

## 📊 API Endpoints

### Public API (untuk Client SDK)

#### Validate License
```http
POST /api/validate
Content-Type: application/json

{
  "license_key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "hardware_id": "abc123...",
  "hostname": "server01",
  "ip_address": "192.168.1.100"
}
```

Response:
```json
{
  "valid": true,
  "license": {
    "key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
    "product": {
      "id": 1,
      "name": "Product A",
      "version": "1.0.0"
    },
    "type": "Pro",
    "status": "active",
    "expiry_date": "2025-12-31",
    "features": ["feature1", "feature2"],
    "activations": {
      "current": 1,
      "max": 3
    }
  }
}
```

#### Deactivate License
```http
POST /api/deactivate
Content-Type: application/json

{
  "license_key": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "hardware_id": "abc123..."
}
```

#### Get License Info
```http
GET /api/license/:key
```

## 📈 Dashboard Features

- **Total Licenses**: Jumlah semua lisensi
- **Active Licenses**: Lisensi yang masih aktif
- **Total Customers**: Jumlah customer
- **Monthly Revenue**: Pendapatan bulan ini
- **Revenue Trend Chart**: Grafik pendapatan 12 bulan terakhir
- **Recent Licenses**: 10 lisensi terbaru
- **Expiring Soon**: Lisensi yang akan expired dalam 30 hari

## 📤 Export & Reports

### Export CSV
- Export semua licenses ke CSV
- Export customers ke CSV
- Export revenue/transactions ke CSV

### Generate PDF
- Generate detailed report per license
- Include activation history
- Customer information
- Product details

## 🛠 Development

### Running in Development Mode

```bash
# With auto-reload
pnpm run dev
```

### Database Commands

```bash
# Setup/reset database
pnpm run setup

# Seed sample data
pnpm run seed
```

### Project Structure Best Practices

- Controllers: Business logic only
- Routes: Route definitions
- Middleware: Authentication, validation
- Utils: Reusable helper functions
- Views: EJS templates dengan Tailwind CSS

## 📝 License Types Examples

### Trial
- Duration: 30 days
- Max Activations: 1
- Price: Free
- Features: Basic features

### Basic
- Duration: 365 days
- Max Activations: 1
- Price: $99
- Features: Standard features

### Pro
- Duration: 365 days
- Max Activations: 3
- Price: $299
- Features: Advanced features + API access

### Enterprise
- Duration: 365 days
- Max Activations: 10+
- Price: $999
- Features: Unlimited features + 24/7 support

## 🔄 License Lifecycle

1. **Created** → License di-generate untuk customer
2. **Active** → License aktif dan bisa digunakan
3. **Activated** → Hardware telah mengaktifkan license
4. **Expiring Soon** → Kurang dari 30 hari sebelum expired
5. **Expired** → Melewati expiry date
6. **Suspended** → Sementara di-suspend oleh admin
7. **Revoked** → Di-revoke permanen oleh admin

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Ganti port di .env
PORT=3001
```

### Database Locked
```bash
# Tutup semua koneksi dan restart
rm database/*.db-journal
pnpm run setup
pnpm run seed
```

### License Validation Failed
- Pastikan server license accessible dari client
- Check firewall settings
- Verify license key format
- Check expiry date

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

Untuk pertanyaan atau issue, silakan buat issue di repository ini.

## 📄 License

MIT License - lihat file LICENSE untuk detail.

---

**Built with ❤️ using Node.js, Express, SQLite, and Tailwind CSS**
