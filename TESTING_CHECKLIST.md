# 🧪 Customer Portal - Testing Checklist

Gunakan checklist ini untuk memastikan semua fitur Customer Portal berfungsi dengan baik.

---

## 📦 PART 1: Setup & Database

### Database Migration & Seeding
- [ ] Run `pnpm db:migrate:013` - Migration berhasil tanpa error
- [ ] Run `pnpm db:seed` - Seeding berhasil, menampilkan credentials
- [ ] Cek database memiliki table baru:
  - [ ] `customers` table memiliki kolom: password, license_limit, code_protection_limit, dll
  - [ ] `customer_product_access` table ada
  - [ ] `customer_sessions` table ada
- [ ] Sample customer sudah ada (customer@example.com)
- [ ] Email template `customer_access` sudah ada di database

---

## 👨‍💼 PART 2: Admin Features

### A. Customer Management - Create Customer

**Login sebagai Admin:**
- [ ] Login ke `/login` dengan admin@example.com / admin123
- [ ] Berhasil masuk ke admin dashboard

**Create Customer:**
- [ ] Go to **Customers** → **Create Customer**
- [ ] Form muncul dengan semua field:
  - [ ] Name, Email, Company, Phone, Address (basic fields)
  - [ ] **Customer Portal Settings** section muncul
  - [ ] License Limit field (default 0)
  - [ ] Code Protection Limit field (default 0)
  - [ ] Product Access checkboxes muncul (list semua products)
  - [ ] "Send Access Email" checkbox (default checked)

**Test Create Customer:**
- [ ] Isi form dengan data test:
  ```
  Name: Test Customer
  Email: test@example.com
  Company: Test Corp
  License Limit: 5
  Code Protection Limit: 3
  Product Access: ✓ Product A, ✓ Product B
  Send Access Email: ✓ (checked)
  ```
- [ ] Click **Create Customer**
- [ ] Redirect ke `/customers?success=...`
- [ ] Success message muncul
- [ ] Customer baru muncul di list customers

**Validation Test:**
- [ ] Try create customer dengan email yang sudah ada → Error muncul
- [ ] Try create customer tanpa name → Error muncul
- [ ] Try create customer tanpa email → Error muncul

---

### B. Customer Management - View Customer

**View Customer Details:**
- [ ] Go to **Customers** → Click customer name
- [ ] Customer details page muncul dengan:
  - [ ] Basic info (name, email, company, phone, address)
  - [ ] **Customer Portal Access** section muncul
  - [ ] License Quota progress bar muncul (warna: blue/yellow/red)
  - [ ] Code Protection Quota progress bar muncul
  - [ ] Portal Status: Active/Not Configured
  - [ ] Last Login timestamp
  - [ ] Must Change Password: Yes/No
  - [ ] Statistics cards (Total Licenses, Active Licenses, Total Spent)
  - [ ] **"Login as Customer"** button muncul (purple button) - jika customer punya password

**Test Quota Display:**
- [ ] Quota menampilkan angka yang benar (used/limit)
- [ ] Progress bar warna:
  - [ ] Blue jika < 70%
  - [ ] Yellow jika 70-90%
  - [ ] Red jika > 90%
- [ ] Jika limit = 0, tampil "∞" (unlimited)
- [ ] Remaining count benar

---

### C. Login as Customer (Impersonation)

**Test Admin Impersonation:**
- [ ] Di customer details page, click **"Login as Customer"** button
- [ ] Confirmation dialog muncul
- [ ] Click OK
- [ ] Redirect ke `/customer/dashboard`
- [ ] **Yellow banner impersonation** muncul di top:
  - [ ] "Viewing as: [Customer Name]"
  - [ ] "Admin: [Admin Email]"
  - [ ] **"Exit Customer View"** button ada
- [ ] Customer dashboard muncul dengan data customer tersebut
- [ ] Sidebar customer portal muncul (bukan admin sidebar)

**Test Exit Impersonation:**
- [ ] Click **"Exit Customer View"** button di banner
- [ ] Redirect kembali ke admin `/customers`
- [ ] Kembali ke admin view (sidebar admin)
- [ ] Session admin masih aktif

**Test Impersonation Actions:**
- [ ] Saat impersonation, coba generate license → berhasil, quota customer berkurang
- [ ] Saat impersonation, coba view profile → muncul data customer
- [ ] Semua action di-log sebagai impersonation di `customer_sessions` table

---

## 👤 PART 3: Customer Portal Features

### A. Customer Login

**Test Customer Login:**
- [ ] Logout dari admin (jika masih login)
- [ ] Go to `/customer/login`
- [ ] Login page customer muncul (design berbeda dari admin)
- [ ] Login dengan: customer@example.com / customer123
- [ ] Berhasil login, redirect ke `/customer/dashboard`
- [ ] Sidebar customer muncul dengan menu:
  - [ ] Dashboard
  - [ ] My Licenses
  - [ ] Generate License
  - [ ] Products
  - [ ] Code Protection
  - [ ] My Profile
  - [ ] Logout

**Test Login Validation:**
- [ ] Login dengan email salah → Error message
- [ ] Login dengan password salah → Error message
- [ ] Login dengan customer inactive → Error message
- [ ] Login dengan customer tanpa password → Error message

---

### B. Customer Dashboard

**Dashboard Display:**
- [ ] **Quota Cards** muncul dengan:
  - [ ] License Quota: X/Y dengan progress bar
  - [ ] Code Protection Quota: X/Y dengan progress bar
  - [ ] Remaining count benar
  - [ ] Progress bar color coding (blue/yellow/red)
- [ ] **Statistics Cards** muncul:
  - [ ] Total Licenses
  - [ ] Active Licenses
  - [ ] Expired Licenses
  - [ ] Code Protections
- [ ] **Recent Licenses** table muncul
  - [ ] Menampilkan 5 licenses terbaru (jika ada)
  - [ ] Jika tidak ada: "No licenses yet" dengan link to generate

**Password Change Warning:**
- [ ] Jika `must_change_password = 1`, red banner muncul di top
- [ ] Banner mengarahkan ke profile untuk change password
- [ ] Setelah change password, banner hilang

---

### C. My Licenses Page

**View All Licenses:**
- [ ] Go to **My Licenses**
- [ ] Table muncul dengan kolom:
  - [ ] License Key (dengan copy button)
  - [ ] Product
  - [ ] Type
  - [ ] Status (badge: green/red/yellow)
  - [ ] Activations (current/max)
  - [ ] Expires
  - [ ] Actions (Download button)

**Test License Actions:**
- [ ] Click **copy button** → License key copied to clipboard, toast muncul
- [ ] Click **Download** → File .txt ter-download dengan license key
- [ ] Jika tidak ada license: "No Licenses Yet" message muncul dengan link to generate

---

### D. Generate License Page

**Generate License Form:**
- [ ] Go to **Generate License**
- [ ] **Quota Status Card** muncul di top (blue card)
  - [ ] Menampilkan used/limit yang benar
  - [ ] Menampilkan remaining count
- [ ] Form muncul dengan:
  - [ ] Product dropdown
  - [ ] License Type dropdown (disabled sampai product dipilih)
  - [ ] License type details muncul setelah dipilih (duration, max activations)
  - [ ] Generate button
  - [ ] Cancel button

**Test Generate License - Normal Flow:**
- [ ] Pilih product dari dropdown
- [ ] License types untuk product tersebut muncul di dropdown
- [ ] Pilih license type
- [ ] License type details muncul (duration, max activations)
- [ ] Click **Generate License** button
- [ ] Loading state muncul ("Generating...")
- [ ] **Success modal** muncul dengan:
  - [ ] Green checkmark icon
  - [ ] "License Generated!" message
  - [ ] License key ditampilkan
  - [ ] Copy button ada
  - [ ] "View All Licenses" button
  - [ ] "Generate Another" button
- [ ] License quota berkurang (refresh page untuk cek)

**Test Generate License - Quota Exceeded:**
- [ ] Generate license sampai quota limit tercapai
- [ ] Try generate lagi saat quota habis
- [ ] **Red error banner** muncul: "License quota exceeded!"
- [ ] Form disabled atau error message di form
- [ ] Generate button disabled

**Test Product Access Control:**
- [ ] Login dengan customer yang tidak punya akses ke semua product
- [ ] Dropdown product hanya menampilkan product yang di-assign
- [ ] Product yang tidak ada access tidak muncul di dropdown

---

### E. Products Page (Read-Only)

**View Products:**
- [ ] Go to **Products**
- [ ] Blue info banner muncul: "This is read-only..."
- [ ] Grid cards muncul dengan semua products
- [ ] Setiap card menampilkan:
  - [ ] Product icon
  - [ ] Product name
  - [ ] Description (jika ada)
  - [ ] Version
  - [ ] License type count
  - [ ] Status (Active/Inactive)
  - [ ] "View Details" button

**Test Product Details:**
- [ ] Click **View Details** button
- [ ] Modal muncul dengan product info lengkap
- [ ] Modal menampilkan:
  - [ ] Product name
  - [ ] Description
  - [ ] Version
  - [ ] Available license types count
  - [ ] Info banner tentang product access
  - [ ] "Generate License" button (link to generate page)
  - [ ] Close button
- [ ] Click outside modal → Modal close
- [ ] Press Escape key → Modal close

---

### F. Code Protection Page

**View Code Protection:**
- [ ] Go to **Code Protection**
- [ ] **Quota Status Card** muncul di top (purple card)
  - [ ] Menampilkan used/limit
  - [ ] Progress bar
- [ ] Form muncul dengan:
  - [ ] Code input textarea
  - [ ] Expiration dropdown (Never, 7 days, 30 days, etc)
  - [ ] Generate button
- [ ] **Protection History** table muncul dengan kolom:
  - [ ] Protected Code (hash, dengan copy button)
  - [ ] Original (truncated)
  - [ ] Status (Active/Expired)
  - [ ] Expires
  - [ ] Actions (View button)

**Test Generate Code Protection - Normal Flow:**
- [ ] Isi code input: "test code 123"
- [ ] Pilih expiration: "30 days"
- [ ] Click **Generate Protection Code**
- [ ] Loading state muncul
- [ ] Success toast muncul
- [ ] Page reload
- [ ] Code protection baru muncul di table
- [ ] Quota berkurang

**Test Generate Code Protection - Quota Exceeded:**
- [ ] Generate sampai quota habis
- [ ] Try generate lagi
- [ ] Red error banner muncul: "Quota exceeded!"
- [ ] Form disabled

**Test View Code Details:**
- [ ] Click **View** button di table
- [ ] Modal muncul dengan:
  - [ ] Original code (full text)
  - [ ] Protected code (hash, dengan copy button)
  - [ ] Close button
- [ ] Click copy button → Hash copied to clipboard

---

### G. My Profile Page

**View Profile:**
- [ ] Go to **My Profile**
- [ ] Form muncul dengan data customer:
  - [ ] Name (editable)
  - [ ] Email (readonly, disabled)
  - [ ] Company (editable)
  - [ ] Phone (editable)
  - [ ] Address (editable)
  - [ ] Save Changes button
- [ ] **Change Password** section muncul dengan:
  - [ ] Current Password field
  - [ ] New Password field (min 8 chars)
  - [ ] Confirm Password field
  - [ ] Change Password button
- [ ] **Account Status** card muncul (right side):
  - [ ] Status: Active
  - [ ] Customer ID
  - [ ] Last Login
  - [ ] Member Since
- [ ] **Quotas Summary** card muncul:
  - [ ] License quota dengan progress bar
  - [ ] Code protection quota dengan progress bar

**Test Update Profile:**
- [ ] Update name: "New Name"
- [ ] Update company: "New Company"
- [ ] Click **Save Changes**
- [ ] Success toast muncul: "Profile updated successfully"
- [ ] Data tersimpan (refresh untuk cek)

**Test Change Password:**
- [ ] Isi Current Password: customer123
- [ ] Isi New Password: newpassword123
- [ ] Isi Confirm Password: newpassword123
- [ ] Click **Change Password**
- [ ] Success toast muncul: "Password changed successfully"
- [ ] Password form clear
- [ ] Logout dan login lagi dengan password baru → Berhasil

**Test Change Password - Validation:**
- [ ] New password < 8 chars → Error: "Password must be at least 8 characters"
- [ ] New password ≠ Confirm password → Error: "Passwords do not match"
- [ ] Wrong current password → Error: "Current password is incorrect"

**Test Forced Password Change:**
- [ ] Set customer `must_change_password = 1` di database
- [ ] Login dengan customer tersebut
- [ ] Red warning banner muncul di profile page
- [ ] Try access dashboard → Redirect ke profile dengan warning
- [ ] Change password
- [ ] Warning banner hilang
- [ ] Bisa access semua pages

---

## 🔒 PART 4: Security & Edge Cases

### A. Authentication & Authorization

- [ ] Access `/customer/dashboard` tanpa login → Redirect ke `/customer/login`
- [ ] Access `/customer/profile` tanpa login → Redirect ke `/customer/login`
- [ ] Admin tidak bisa access `/customer/*` routes (kecuali via impersonation)
- [ ] Customer tidak bisa access `/admin` routes
- [ ] Session timeout works (test dengan expired session)

### B. Quota Enforcement

- [ ] Generate license saat quota = 0 (unlimited) → Berhasil tanpa limit
- [ ] Generate license saat used = limit → Error, tidak bisa generate
- [ ] Generate license saat used < limit → Berhasil, quota berkurang
- [ ] Generate code protection dengan quota enforcement yang sama

### C. Product Access Control

- [ ] Customer hanya bisa generate license untuk product yang di-assign
- [ ] Try manual POST request ke `/customer/generate-license` dengan product yang tidak ada access → Error 403
- [ ] Product yang tidak ada access tetap muncul di Products page (read-only)

### D. Password Security

- [ ] Password di-hash dengan bcrypt (check di database, bukan plaintext)
- [ ] Password tidak muncul di response API
- [ ] Password change requires current password
- [ ] Password validation (min 8 chars) enforced

### E. Data Isolation

- [ ] Customer hanya bisa lihat licenses milik sendiri
- [ ] Customer tidak bisa lihat data customer lain
- [ ] Admin bisa lihat semua data
- [ ] Impersonation: Admin bisa lihat data customer yang di-impersonate

---

## 🔗 PART 5: Integration & Email

### A. Email Sending (jika SMTP configured)

**Create Customer dengan Send Email:**
- [ ] Configure SMTP di Settings → Email
- [ ] Create customer baru dengan "Send Access Email" checked
- [ ] Email terkirim ke customer email
- [ ] Email template benar:
  - [ ] Subject: "Welcome to Customer Portal..."
  - [ ] Header gradient (blue-purple)
  - [ ] Login credentials muncul (email + password)
  - [ ] Quotas muncul
  - [ ] Login URL muncul
  - [ ] Security warning muncul
  - [ ] Button "Login to Customer Portal" ada
- [ ] Password di email bisa digunakan untuk login

**Create Customer tanpa Send Email:**
- [ ] Uncheck "Send Access Email"
- [ ] Create customer
- [ ] Email tidak terkirim
- [ ] Customer tetap dibuat dengan password

---

## 📊 PART 6: Admin Dashboard Integration

### A. Customer List View

- [ ] Go to **Customers** page
- [ ] Table menampilkan semua customers
- [ ] Columns ada: Name, Email, Company, Licenses, Revenue, Actions
- [ ] Customer dengan portal access ada indicator (icon/badge)
- [ ] Click customer name → Go to details page

### B. Customer Statistics

- [ ] Customer stats di admin dashboard update saat ada customer baru
- [ ] License count per customer benar
- [ ] Revenue tracking benar (jika ada transactions)

---

## 🎯 PART 7: User Experience

### A. Responsive Design

- [ ] Desktop view: Semua layout rapi
- [ ] Tablet view: Sidebar collapse/responsive
- [ ] Mobile view: Table scroll horizontal, cards stack vertical
- [ ] All forms responsive

### B. Toast Notifications

- [ ] Success toast (green) muncul untuk success actions
- [ ] Error toast (red) muncul untuk error actions
- [ ] Toast auto-dismiss setelah 5 detik
- [ ] Toast bisa di-close manual dengan X button

### C. Loading States

- [ ] Generate license: Button shows "Generating..."
- [ ] Login: Button shows loading state
- [ ] Form submission: Button disabled saat processing

### D. Empty States

- [ ] No licenses: "No licenses yet" message dengan link
- [ ] No code protections: Message dengan CTA
- [ ] No products: Message untuk admin

---

## ✅ FINAL CHECKS

### Database Integrity
- [ ] All foreign keys working (customer_product_access, customer_sessions)
- [ ] Cascade deletes working (delete customer → sessions deleted)
- [ ] Unique constraints working (email unique)

### Activity Logging
- [ ] Customer login logged in activity_logs
- [ ] License generation logged
- [ ] Code protection generation logged
- [ ] Admin impersonation logged
- [ ] Profile updates logged

### Session Management
- [ ] Customer session persists across page refresh
- [ ] Admin impersonation session tracked in customer_sessions table
- [ ] Logout clears session properly
- [ ] Exit impersonation restores admin session

---

## 🐛 Bug Testing

### Common Edge Cases
- [ ] Customer dengan 0 licenses, 0 quotas → UI handles gracefully
- [ ] Customer dengan expired licenses only → Shows correctly
- [ ] Product dengan 0 license types → Handled properly
- [ ] Very long license keys → UI tidak break
- [ ] Special characters di customer name → Saved correctly
- [ ] Unicode/emoji di address → Saved correctly

### Error Handling
- [ ] Network error saat generate license → Error toast muncul
- [ ] Database error → User-friendly error message
- [ ] Invalid input → Validation error muncul
- [ ] Session expired → Redirect ke login

---

## 📈 Performance

- [ ] Dashboard loads < 2 seconds
- [ ] Generate license response < 1 second
- [ ] Tables dengan banyak data (100+ rows) load dengan pagination/scroll
- [ ] No memory leaks (test dengan long session)

---

## 🎉 COMPLETION

Jika semua checklist ✅, Customer Portal implementation **COMPLETE!**

**Total Checklist Items:** ~150+

---

## 📝 Notes & Issues

Catat issues yang ditemukan di sini:

```
Issue #1: [Description]
Severity: High/Medium/Low
Steps to reproduce:
Expected:
Actual:

Issue #2: ...
```

---

**Testing Date:** ___________
**Tested By:** ___________
**Environment:** Development/Staging/Production
**Database:** SQLite
**Version:** 1.0.0

---

**Status:** 🟢 All Passed | 🟡 Minor Issues | 🔴 Critical Issues
