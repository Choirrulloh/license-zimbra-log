# Migration Guide

## Running Migrations

If you encounter database errors like "no such column", you need to run the migrations.

### Quick Method (Recommended)

Run all migrations at once using pnpm:
```bash
pnpm migrate
```

Or run individual migrations:
```bash
# Migration 001: Activity Logs
pnpm migrate:001

# Migration 002: Users Table Update
pnpm migrate:002
```

### Manual Method

You can also run migrations directly with Node:

#### Step 1: Run Activity Logs Migration
```bash
node src/database/migrations/001_add_activity_logs.js
```

#### Step 2: Run Safe Users Table Migration
```bash
node src/database/migrations/002_safe_update_users.js
```

This migration will safely add missing columns to the users table:
- `is_active` (BOOLEAN) - User active status
- `last_login` (DATETIME) - Last login timestamp
- `phone` (VARCHAR) - User phone number

The migration checks if columns exist before adding them, so it's safe to run multiple times.

## Common Errors

### Error: "no such column: phone"
**Solution:** Run migration 002
```bash
pnpm migrate:002
# or
node src/database/migrations/002_safe_update_users.js
```

### Error: "no such table: activity_logs"
**Solution:** Run migration 001
```bash
pnpm migrate:001
# or
node src/database/migrations/001_add_activity_logs.js
```

## For Production Deployment

When deploying to production (e.g., /srv/license-zimbra-log), make sure to:

1. Navigate to application directory:
```bash
cd /srv/license-zimbra-log
```

2. Backup your database first:
```bash
cp data/database.sqlite data/database.sqlite.backup
```

3. Run all migrations:
```bash
pnpm migrate
```

Or run migrations individually:
```bash
pnpm migrate:001  # Activity logs
pnpm migrate:002  # Users table updates
```

4. Restart the application:
```bash
pm2 restart license-manager
# or
systemctl restart license-manager
```

## Verification

To verify migrations were successful, you can check the table structure:

```bash
node -e "const db = require('./src/database/db'); db.all('PRAGMA table_info(users)').then(cols => console.log(cols));"
```

You should see columns including: id, email, password, name, role, is_active, last_login, phone, created_at, updated_at.
