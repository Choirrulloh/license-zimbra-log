# Subdomain Setup untuk Admin & Customer Portal

Aplikasi ini sekarang mendukung pemisahan admin dan customer portal menggunakan subdomain yang clean (tanpa `/customer` di URL).

## URL Structure

### Production
- **Admin**: `admin.domain.com` atau `app.domain.com`
- **Customer**: `customer.domain.com` atau `portal.domain.com` atau `my.domain.com`

### Development (localhost)
- **Admin**: `admin.localhost:3000` atau `app.localhost:3000`
- **Customer**: `customer.localhost:3000` atau `portal.localhost:3000`

## Setup Development (Local)

### Opsi 1: Edit `/etc/hosts` (Recommended)

1. Buka file `/etc/hosts` dengan root/admin privileges:
   ```bash
   sudo nano /etc/hosts
   ```

2. Tambahkan baris berikut:
   ```
   127.0.0.1 admin.localhost
   127.0.0.1 customer.localhost
   ```

3. Save dan test di browser:
   - Admin: http://admin.localhost:3000
   - Customer: http://customer.localhost:3000

### Opsi 2: Gunakan `lvh.me` (No setup needed)

`lvh.me` secara otomatis resolve ke `127.0.0.1`, jadi bisa langsung dipakai:

- Admin: http://admin.lvh.me:3000
- Customer: http://customer.lvh.me:3000

## Setup Production dengan Nginx Reverse Proxy

### 1. DNS Configuration

Buat subdomain di DNS provider (Cloudflare, etc):
```
A admin.domain.com -> [Server IP]
A customer.domain.com -> [Server IP]
```

### 2. Nginx Configuration

```nginx
# Admin Portal
server {
    listen 80;
    server_name admin.domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Customer Portal
server {
    listen 80;
    server_name customer.domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. SSL dengan Let's Encrypt (Optional tapi Recommended)

```bash
sudo certbot --nginx -d admin.domain.com -d customer.domain.com
```

## PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'license-manager',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      APP_URL: 'http://admin.domain.com',
      CUSTOMER_PORTAL_URL: 'http://customer.domain.com'
    }
  }]
}
```

Start dengan PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Environment Variables

Tambahkan di `.env`:

```bash
# App URLs
APP_URL=http://admin.domain.com
CUSTOMER_PORTAL_URL=http://customer.domain.com

# Atau untuk development:
# APP_URL=http://admin.localhost:3000
# CUSTOMER_PORTAL_URL=http://customer.localhost:3000
```

## Backward Compatibility

Aplikasi masih mendukung path-based routing untuk backward compatibility:

- Admin: `domain.com/login`
- Customer: `domain.com/customer/login`

## Testing

1. **Test Admin Login:**
   ```
   http://admin.localhost:3000
   → Should redirect to login page
   ```

2. **Test Customer Login:**
   ```
   http://customer.localhost:3000
   → Should redirect to customer login page
   ```

3. **Test Forgot Password:**
   ```
   http://customer.localhost:3000/forgot-password
   → Should show forgot password form
   ```

## Login Credentials (Development)

**Admin:**
- URL: http://admin.localhost:3000
- Email: admin@example.com
- Password: admin123

**Customer:**
- URL: http://customer.localhost:3000
- Email: customer@example.com
- Password: customer123

## Troubleshooting

### Subdomain tidak resolve
- Pastikan sudah edit `/etc/hosts` atau gunakan `lvh.me`
- Restart browser setelah edit hosts file

### Session tidak tersimpan
- Check bahwa `proxy_set_header Host $host` sudah di-set di Nginx
- Pastikan cookie domain settings benar

### Email reset password link salah
- Set `CUSTOMER_PORTAL_URL` di `.env` dengan URL customer portal yang benar
