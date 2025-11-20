const express = require('express');
const router = express.Router();
const customerPortalController = require('../controllers/customerPortalController');
const {
  requireCustomerAuth,
  redirectIfCustomerAuthenticated,
  checkPasswordChange,
  checkLicenseQuota,
  checkCodeProtectionQuota
} = require('../middleware/customerAuth');

// Public routes (not authenticated)
router.get('/login', redirectIfCustomerAuthenticated, customerPortalController.showLogin);
router.post('/login', redirectIfCustomerAuthenticated, customerPortalController.login);

// Protected routes (require authentication)
router.get('/dashboard', requireCustomerAuth, checkPasswordChange, customerPortalController.showDashboard);
router.get('/licenses', requireCustomerAuth, checkPasswordChange, customerPortalController.showLicenses);
router.get('/generate-license', requireCustomerAuth, checkPasswordChange, customerPortalController.showGenerateLicense);
router.post('/generate-license', requireCustomerAuth, checkPasswordChange, checkLicenseQuota, customerPortalController.generateLicense);
router.get('/products', requireCustomerAuth, checkPasswordChange, customerPortalController.showProducts);
router.get('/profile', requireCustomerAuth, customerPortalController.showProfile);
router.post('/profile', requireCustomerAuth, customerPortalController.updateProfile);
router.post('/change-password', requireCustomerAuth, customerPortalController.changePassword);
router.get('/code-protection', requireCustomerAuth, checkPasswordChange, customerPortalController.showCodeProtection);
router.post('/code-protection', requireCustomerAuth, checkPasswordChange, checkCodeProtectionQuota, customerPortalController.generateCodeProtection);

// API routes
router.get('/api/license-types/:product_id', requireCustomerAuth, customerPortalController.getLicenseTypes);

// Logout
router.get('/logout', customerPortalController.logout);
router.post('/logout', customerPortalController.logout);

module.exports = router;
