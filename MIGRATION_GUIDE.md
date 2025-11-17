# Migration Guide

## Running Migrations

If you encounter database errors like "no such column", you need to run the migrations.

### Step 1: Run Activity Logs Migration
```bash
node src/database/migrations/001_add_activity_logs.js
```

### Step 2: Run Safe Users Table Migration
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
**Solution:** Run migration 002_safe_update_users.js
```bash
node src/database/migrations/002_safe_update_users.js
```

### Error: "no such table: activity_logs"
**Solution:** Run migration 001_add_activity_logs.js
```bash
node src/database/migrations/001_add_activity_logs.js
```

## For Production Deployment

When deploying to production (e.g., /srv/license-zimbra-log), make sure to:

1. Backup your database first:
```bash
cp data/database.sqlite data/database.sqlite.backup
```

2. Run all migrations in order:
```bash
node src/database/migrations/001_add_activity_logs.js
node src/database/migrations/002_safe_update_users.js
```

3. Restart the application:
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
