const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

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

// Products
router.get('/products', requireAuth, productController.index);
router.get('/products/create', requireAuth, productController.create);
router.post('/products/create', requireAuth, productController.create);
router.get('/products/:id', requireAuth, productController.show);
router.get('/products/:id/edit', requireAuth, productController.edit);
router.post('/products/:id/edit', requireAuth, productController.update);
router.delete('/products/:id', requireAuth, productController.delete);

// License Types
router.post('/license-types', requireAuth, productController.createLicenseType);
router.put('/license-types/:id', requireAuth, productController.updateLicenseType);
router.delete('/license-types/:id', requireAuth, productController.deleteLicenseType);

// Customers
router.get('/customers', requireAuth, customerController.index);
router.get('/customers/create', requireAuth, customerController.create);
router.post('/customers/create', requireAuth, customerController.create);
router.get('/customers/:id', requireAuth, customerController.show);
router.get('/customers/:id/edit', requireAuth, customerController.edit);
router.post('/customers/:id/edit', requireAuth, customerController.update);
router.delete('/customers/:id', requireAuth, customerController.delete);

// Users
router.get('/users', requireAuth, userController.index);
router.get('/users/create', requireAuth, userController.create);
router.post('/users/create', requireAuth, userController.create);
router.get('/users/:id', requireAuth, userController.show);
router.get('/users/:id/edit', requireAuth, userController.edit);
router.post('/users/:id/edit', requireAuth, userController.update);
router.delete('/users/:id', requireAuth, userController.delete);
router.post('/users/:id/change-password', requireAuth, userController.changePassword);

// Licenses
router.get('/licenses', requireAuth, licenseController.index);
router.get('/licenses/create', requireAuth, licenseController.create);
router.post('/licenses/create', requireAuth, licenseController.create);
router.get('/licenses/:id', requireAuth, licenseController.show);
router.post('/licenses/:id/renew', requireAuth, licenseController.renew);
router.post('/licenses/:id/revoke', requireAuth, licenseController.revoke);
router.post('/licenses/:id/suspend', requireAuth, licenseController.suspend);
router.post('/licenses/:id/activate', requireAuth, licenseController.activate);
router.delete('/licenses/:id', requireAuth, licenseController.delete);

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

// Public API for license validation
router.post('/api/validate', apiController.validateLicense);
router.post('/api/deactivate', apiController.deactivateLicense);
router.get('/api/license/:key', apiController.getLicenseInfo);

module.exports = router;
