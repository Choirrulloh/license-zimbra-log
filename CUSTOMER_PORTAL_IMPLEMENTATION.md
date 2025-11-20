# Customer Portal Implementation Progress

## ✅ Completed Components

### 1. Database Layer
- **File**: `src/database/migrations/013_add_customer_portal.js`
- **Features**:
  - Added columns to customers table: `password`, `is_active`, `last_login`, `must_change_password`
  - Added quota columns: `license_limit`, `license_used`, `code_protection_limit`, `code_protection_used`
  - Created `customer_product_access` table (controls which products customer can generate licenses for)
  - Created `customer_sessions` table (tracking logins and impersonation)

### 2. Authentication & Middleware
- **File**: `src/middleware/customerAuth.js`
- **Features**:
  - `requireCustomerAuth`: Check if customer is logged in
  - `redirectIfCustomerAuthenticated`: Redirect if already logged in
  - `checkPasswordChange`: Force password change on first login
  - `checkLicenseQuota`: Validate license quota before generation
  - `checkCodeProtectionQuota`: Validate code protection quota

### 3. Controller Layer
- **File**: `src/controllers/customerPortalController.js`
- **Features**:
  - Login/Logout handling
  - Dashboard with statistics
  - License management (view, generate)
  - Product catalog (read-only)
  - Profile management
  - Code protection generation
  - Quota checking and enforcement

### 4. Routes
- **File**: `src/routes/customerPortalRoutes.js`
- **Registered in**: `src/server.js` at `/customer`
- **Endpoints**:
  - `GET /customer/login` - Login page
  - `POST /customer/login` - Login action
  - `GET /customer/dashboard` - Customer dashboard
  - `GET /customer/licenses` - View licenses
  - `GET /customer/generate-license` - Generate license page
  - `POST /customer/generate-license` - Generate license action
  - `GET /customer/products` - View products
  - `GET /customer/code-protection` - Code protection page
  - `POST /customer/code-protection` - Generate code protection
  - `GET /customer/profile` - Profile page
  - `POST /customer/profile` - Update profile
  - `POST /customer/change-password` - Change password
  - `GET /customer/logout` - Logout

### 5. Views Created
- ✅ `/customer-portal/login.ejs` - Login page
- ✅ `/customer-portal/dashboard.ejs` - Dashboard with quotas and statistics
- ✅ `/customer-portal/partials/sidebar.ejs` - Navigation sidebar
- ✅ `/customer-portal/partials/header.ejs` - Page header
- ✅ `/customer-portal/partials/toast.ejs` - Toast notifications

## 🔄 In Progress / Remaining

### Views to Create
- `/customer-portal/licenses.ejs` - List all customer licenses
- `/customer-portal/generate-license.ejs` - Generate new license form
- `/customer-portal/products.ejs` - View products catalog
- `/customer-portal/code-protection.ejs` - Code protection management
- `/customer-portal/profile.ejs` - Profile and password change

### Admin Features
- Update `customerController.js` to:
  - Generate password on customer creation
  - Send welcome email with credentials
  - Allow setting license limits and code protection limits
- Add "Login as Customer" button to customer details page
- Update customer create/edit forms with quota fields
- Add product access selection in customer form

### Email Templates
- Create `customer_access` email template with credentials
- Update email service to handle customer welcome emails

### Database Seeds
- Update `seed.js` to include sample customer with:
  - Password set
  - Quotas configured
  - Product access defined

## 📋 Features Summary

### Customer Portal Features
1. **Dashboard**
   - License quota (used/total with progress bar)
   - Code protection quota (used/total with progress bar)
   - License statistics (total, active, expired, suspended)
   - Recent licenses table

2. **My Licenses**
   - View all licenses
   - Filter by status
   - Download license keys
   - See activation history

3. **Generate License** (with quota check)
   - Select from allowed products only
   - Select license type
   - Auto-generate if quota available
   - Error if quota exceeded

4. **Products** (Read-only)
   - View all active products
   - See product details
   - Cannot generate licenses (unless specifically allowed)

5. **Code Protection** (with quota check)
   - Generate protection codes
   - View protection history
   - Check quota status

6. **My Profile**
   - Update personal information
   - Change password (required on first login)
   - View account status

### Admin Features
1. **Customer Management**
   - Set license limit (0 = unlimited)
   - Set code protection limit (0 = unlimited)
   - Enable/disable customer account
   - Assign products (which products customer can generate licenses for)

2. **Login as Customer** (Impersonation)
   - Admin can login as any customer
   - Yellow banner shows impersonation status
   - "Exit Customer View" button to return to admin
   - All actions logged with admin_id

3. **Customer Creation Flow**
   - Auto-generate secure password
   - Send welcome email with credentials
   - Set must_change_password = 1
   - Configure quotas and product access

## 🔐 Security Features

1. **Password Requirements**
   - Minimum 8 characters (enforced)
   - Bcrypt hashing
   - Force password change on first login

2. **Quota Enforcement**
   - License generation blocked if quota exceeded
   - Code protection blocked if quota exceeded
   - Real-time quota tracking

3. **Access Control**
   - Customers can only see their own data
   - Product access controlled via `customer_product_access` table
   - Session-based authentication
   - Automatic logout on account deactivation

4. **Audit Trail**
   - Login/logout tracking in `customer_sessions`
   - Activity logging for all actions
   - Impersonation sessions tracked separately

## 🚀 Next Steps

1. Complete remaining views (licenses, generate-license, products, code-protection, profile)
2. Update admin customer controller to support:
   - Password generation
   - Email sending
   - Quota management
3. Add "Login as Customer" feature
4. Create customer_access email template
5. Run migration and seed database
6. Test all features end-to-end

## 📝 Usage

### For Customers:
```
1. Receive welcome email with credentials
2. Login at /customer/login
3. Change password (forced on first login)
4. View dashboard with quotas
5. Generate licenses (if quota available)
6. Use code protection (if quota available)
```

### For Admins:
```
1. Create customer with quotas
2. Assign product access
3. Customer receives auto-generated password
4. Admin can "Login as Customer" to see their view
5. Admin can adjust quotas anytime
```

## 🎯 Database Schema Changes

```sql
-- Customers table (modified)
ALTER TABLE customers ADD COLUMN password TEXT;
ALTER TABLE customers ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE customers ADD COLUMN last_login TEXT;
ALTER TABLE customers ADD COLUMN must_change_password INTEGER DEFAULT 1;
ALTER TABLE customers ADD COLUMN license_limit INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN license_used INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN code_protection_limit INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN code_protection_used INTEGER DEFAULT 0;

-- New: customer_product_access
CREATE TABLE customer_product_access (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  product_id INTEGER,
  can_generate_license INTEGER DEFAULT 0,  -- 1 = can generate, 0 = view only
  created_at TEXT
);

-- New: customer_sessions
CREATE TABLE customer_sessions (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  admin_id INTEGER,  -- NULL if customer login, set if impersonation
  is_impersonation INTEGER DEFAULT 0,
  login_time TEXT,
  logout_time TEXT,
  ip_address TEXT,
  user_agent TEXT
);
```
