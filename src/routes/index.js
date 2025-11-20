const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth, requireAdmin, requireRole, requireSelfOrAdmin } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Controllers
const authController = require('../controllers/authController');
const dashboardController = require('../controllers/dashboardController');
const productController = require('../controllers/productController');
const customerController = require('../controllers/customerController');
const licenseController = require('../controllers/licenseController');
const apiController = require('../controllers/apiController');
const reportController = require('../controllers/reportController');
const docsController = require('../controllers/docsController');
const userController = require('../controllers/userController');
const featuresController = require('../controllers/featuresController');
const settingsController = require('../controllers/settingsController');
const roleController = require('../controllers/roleController');
const permissionController = require('../controllers/permissionController');
const emailTemplateController = require('../controllers/emailTemplateController');
const codeProtectionController = require('../controllers/codeProtectionController');

// Public routes
router.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Protected routes
router.get('/dashboard', requireAuth, dashboardController.index);

// Products (Admin only for create/edit/delete)
router.get('/products', requireAuth, productController.index);
router.get('/products/create', requireAdmin, productController.create);
router.post('/products/create', requireAdmin, productController.create);
router.get('/products/:id', requireAuth, productController.show);
router.get('/products/:id/edit', requireAdmin, productController.edit);
router.post('/products/:id/edit', requireAdmin, productController.update);
router.delete('/products/:id', requireAdmin, productController.delete);

// License Types (Admin only)
router.post('/license-types', requireAdmin, productController.createLicenseType);
router.put('/license-types/:id', requireAdmin, productController.updateLicenseType);
router.delete('/license-types/:id', requireAdmin, productController.deleteLicenseType);

// Customers (Admin only for create/edit/delete)
router.get('/customers', requireAuth, customerController.index);
router.get('/customers/create', requireAdmin, customerController.create);
router.post('/customers/create', requireAdmin, customerController.create);
router.get('/customers/:id', requireAuth, customerController.show);
router.get('/customers/:id/edit', requireAdmin, customerController.edit);
router.post('/customers/:id/edit', requireAdmin, customerController.update);
router.delete('/customers/:id', requireAdmin, customerController.delete);
router.post('/customers/:id/login-as', requireAdmin, customerController.loginAsCustomer);
router.post('/customers/:id/change-password', requireAdmin, customerController.changeCustomerPassword);

// Users (Admin only for management, users can edit their own profile)
router.get('/users', requireAdmin, userController.index);
router.get('/users/create', requireAdmin, userController.create);
router.post('/users/create', requireAdmin, userController.create);
router.get('/users/:id', requireSelfOrAdmin('id'), userController.show);
router.get('/users/:id/edit', requireSelfOrAdmin('id'), userController.edit);
router.post('/users/:id/edit', requireSelfOrAdmin('id'), userController.update);
router.delete('/users/:id', requireAdmin, userController.delete);
router.post('/users/:id/change-password', requireSelfOrAdmin('id'), userController.changePassword);

// Features - Inline management (Admin only)
router.post('/products/:productId/features/batch', requireAdmin, featuresController.createFeaturesBatch);
router.post('/products/:productId/features', requireAdmin, featuresController.createFeature);
router.delete('/features/:id', requireAdmin, featuresController.deleteFeature);

// Licenses (Admin only for create/modify/delete)
router.get('/licenses', requireAuth, licenseController.index);
router.get('/licenses/create', requireAdmin, licenseController.create);
router.post('/licenses/create', requireAdmin, licenseController.create);
router.get('/licenses/:id', requireAuth, licenseController.show);
router.post('/licenses/:id/renew', requireAdmin, licenseController.renew);
router.post('/licenses/:id/revoke', requireAdmin, licenseController.revoke);
router.post('/licenses/:id/suspend', requireAdmin, licenseController.suspend);
router.post('/licenses/:id/activate', requireAdmin, licenseController.activate);
router.delete('/licenses/:id', requireAdmin, licenseController.delete);

// API for getting license types
router.get('/api/products/:product_id/license-types', requireAuth, licenseController.getLicenseTypes);

// Reports
router.get('/reports', requireAuth, reportController.index);
router.get('/reports/licenses/csv', requireAuth, reportController.exportLicensesCSV);
router.get('/reports/customers/csv', requireAuth, reportController.exportCustomersCSV);
router.get('/reports/revenue/csv', requireAuth, reportController.exportRevenueCSV);
router.get('/reports/license/:id/pdf', requireAuth, reportController.generateLicenseReport);

// Docs
router.get('/docs', requireAuth, docsController.index);

// Roles (Admin only)
router.get('/roles', requireAdmin, roleController.index);
router.get('/roles/create', requireAdmin, roleController.create);
router.post('/roles/create', requireAdmin, roleController.create);
router.get('/roles/:id', requireAdmin, roleController.show);
router.get('/roles/:id/edit', requireAdmin, roleController.edit);
router.post('/roles/:id/edit', requireAdmin, roleController.update);
router.delete('/roles/:id', requireAdmin, roleController.delete);

// Permissions (Admin only)
router.get('/permissions', requireAdmin, permissionController.index);
router.get('/permissions/create', requireAdmin, permissionController.create);
router.post('/permissions/create', requireAdmin, permissionController.create);
router.get('/permissions/:id', requireAdmin, permissionController.show);
router.get('/permissions/:id/edit', requireAdmin, permissionController.edit);
router.post('/permissions/:id/edit', requireAdmin, permissionController.update);
router.delete('/permissions/:id', requireAdmin, permissionController.delete);

// Settings (Admin only)
router.get('/settings', requireAdmin, settingsController.index);
router.post('/settings', requireAdmin, settingsController.updateSettings);
router.post('/settings/test-email', requireAdmin, settingsController.testEmail);

// Email Templates (Admin only)
router.get('/settings/email-templates', requireAdmin, emailTemplateController.index);
router.get('/settings/email-templates/create', requireAdmin, emailTemplateController.create);
router.post('/settings/email-templates/create', requireAdmin, emailTemplateController.create);
router.get('/settings/email-templates/logs', requireAdmin, emailTemplateController.logs);
router.get('/settings/email-templates/:id', requireAdmin, emailTemplateController.show);
router.get('/settings/email-templates/:id/edit', requireAdmin, emailTemplateController.edit);
router.post('/settings/email-templates/:id/edit', requireAdmin, emailTemplateController.update);
router.post('/settings/email-templates/:id/preview', requireAdmin, emailTemplateController.preview);
router.post('/settings/email-templates/:id/set-default', requireAdmin, emailTemplateController.setAsDefault);
router.delete('/settings/email-templates/:id', requireAdmin, emailTemplateController.delete);

// Code Protection Service (All authenticated users)
router.get('/code-protection', requireAuth, codeProtectionController.index);
router.get('/code-protection/history', requireAuth, codeProtectionController.history);
router.post('/code-protection/upload', requireAuth, upload.single('file'), codeProtectionController.upload);
router.post('/code-protection/obfuscate', requireAuth, codeProtectionController.obfuscate);
router.get('/code-protection/download/:id', requireAuth, codeProtectionController.download);
router.get('/code-protection/quota', requireAuth, codeProtectionController.getQuota);
router.delete('/code-protection/:id', requireAuth, codeProtectionController.delete);

// Public API for license validation
router.post('/api/validate', apiController.validateLicense);
router.post('/api/deactivate', apiController.deactivateLicense);
router.get('/api/license/:key', apiController.getLicenseInfo);
router.get('/api/license-types/:id/features', apiController.getLicenseTypeFeatures);

module.exports = router;
