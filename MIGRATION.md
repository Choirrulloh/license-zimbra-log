# Database Migration Guide

## Quick Start

Run all pending migrations:
```bash
npm run db:migrate
```

Or manually:
```bash
node run-migrations.js
```

## Specific Migration Commands

### Run specific migration:
```bash
# Customer code obfuscation support (migration 016)
npm run db:migrate:016
```

### Run individual migrations:
```bash
node src/database/migrations/016_add_customer_code_obfuscation.js
```

## Migration List

| # | Migration | Description |
|---|-----------|-------------|
| 016 | add_customer_code_obfuscation | Add customer support to code obfuscation table |
| 013 | add_customer_portal | Add customer portal tables |
| 012 | remove_license_type_column | Remove unused license type column |
| 011 | simplify_features | Simplify features structure |
| 010 | refactor_features | Refactor features |
| 009 | add_bash_license_injection | Add bash license injection |
| 008 | add_code_obfuscations | Add code obfuscation tables |
| 007 | add_email_template_defaults | Add default email templates |
| 006 | add_email_templates | Add email templates table |
| 005 | add_roles_permissions | Add roles and permissions |
| 004 | update_app_url | Update app URL settings |
| 003 | add_settings_table | Add settings table |
| 002 | safe_update_users | Safe update users table |
| 001 | add_activity_logs | Add activity logs table |

## Troubleshooting

### Error: "no such column: customer_id"

This means migration 016 hasn't been run yet. Fix:

```bash
npm run db:migrate:016
```

Or run all migrations:
```bash
npm run db:migrate
```

### Error: "duplicate column name"

This is safe to ignore - the column already exists. The migration script will skip it automatically.

## Production Deployment

After pulling latest code on production:

```bash
# 1. Pull latest code
git pull origin main

# 2. Run migrations
npm run db:migrate

# 3. Restart server
pm2 restart license-manager
```

## Rollback

Migrations are designed to be safe and idempotent. They can be run multiple times without causing issues.

If you need to rollback:
1. Restore database backup
2. Re-run specific migrations as needed

## Auto-Migration on Startup

To automatically run migrations when server starts, add to your startup script:

```bash
#!/bin/bash
npm run db:migrate && npm start
```

Or in `package.json`:
```json
"start": "node run-migrations.js && node src/server.js"
```
