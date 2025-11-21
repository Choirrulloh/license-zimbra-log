const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const customerPortalController = require('../controllers/customerPortalController');
const {
  requireCustomerAuth,
  redirectIfCustomerAuthenticated,
  checkPasswordChange,
  checkLicenseQuota,
  checkCodeProtectionQuota
} = require('../middleware/customerAuth');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp');
  },
  filename: function (req, file, cb) {
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

// Middleware to set customer portal base URL for views
router.use((req, res, next) => {
  // If on customer subdomain, use root path, otherwise use /customer
  res.locals.customerPortalBase = req.isCustomerPortal ? '' : '/customer';
  next();
});

// Root route - redirect to login or dashboard
router.get('/', (req, res) => {
  if (req.session.customerId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Public routes (not authenticated)
router.get('/login', redirectIfCustomerAuthenticated, customerPortalController.showLogin);
router.post('/login', redirectIfCustomerAuthenticated, customerPortalController.login);
router.get('/impersonate', customerPortalController.impersonate);

// Forgot password routes
router.get('/forgot-password', customerPortalController.showForgotPassword);
router.post('/forgot-password', customerPortalController.forgotPassword);
router.get('/reset-password', customerPortalController.showResetPassword);
router.post('/reset-password', customerPortalController.resetPassword);

// Protected routes (require authentication)
router.get('/dashboard', requireCustomerAuth, checkPasswordChange, customerPortalController.showDashboard.bind(customerPortalController));
router.get('/licenses', requireCustomerAuth, checkPasswordChange, customerPortalController.showLicenses.bind(customerPortalController));
router.get('/generate-license', requireCustomerAuth, checkPasswordChange, customerPortalController.showGenerateLicense.bind(customerPortalController));
router.post('/generate-license', requireCustomerAuth, checkPasswordChange, checkLicenseQuota, customerPortalController.generateLicense.bind(customerPortalController));
router.get('/products', requireCustomerAuth, checkPasswordChange, customerPortalController.showProducts.bind(customerPortalController));
router.get('/profile', requireCustomerAuth, customerPortalController.showProfile.bind(customerPortalController));
router.post('/profile', requireCustomerAuth, customerPortalController.updateProfile.bind(customerPortalController));
router.post('/change-password', requireCustomerAuth, customerPortalController.changePassword.bind(customerPortalController));
router.get('/code-protection', requireCustomerAuth, checkPasswordChange, customerPortalController.showCodeProtection.bind(customerPortalController));
router.post('/code-protection/upload', requireCustomerAuth, checkPasswordChange, checkCodeProtectionQuota, upload.single('file'), customerPortalController.uploadCodeProtectionFile.bind(customerPortalController));
router.post('/code-protection/obfuscate', requireCustomerAuth, checkPasswordChange, checkCodeProtectionQuota, customerPortalController.obfuscateCodeProtectionFile.bind(customerPortalController));
router.get('/code-protection/download/:id', requireCustomerAuth, customerPortalController.downloadCodeProtectionFile.bind(customerPortalController));
router.delete('/code-protection/:id', requireCustomerAuth, customerPortalController.deleteCodeProtectionFile.bind(customerPortalController));

// API routes
router.get('/api/license-types/:product_id', requireCustomerAuth, customerPortalController.getLicenseTypes.bind(customerPortalController));
router.get('/api/license/:id', requireCustomerAuth, customerPortalController.getLicenseDetails.bind(customerPortalController));
router.post('/api/license/:id/request-renewal', requireCustomerAuth, customerPortalController.requestLicenseRenewal.bind(customerPortalController));

// Logout
router.get('/logout', customerPortalController.logout);
router.post('/logout', customerPortalController.logout);

module.exports = router;
