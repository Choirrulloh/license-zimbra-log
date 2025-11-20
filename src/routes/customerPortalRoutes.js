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

// Forgot password routes
router.get('/forgot-password', customerPortalController.showForgotPassword);
router.post('/forgot-password', customerPortalController.forgotPassword);
router.get('/reset-password', customerPortalController.showResetPassword);
router.post('/reset-password', customerPortalController.resetPassword);

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
router.post('/code-protection/upload', requireCustomerAuth, checkPasswordChange, checkCodeProtectionQuota, upload.single('file'), customerPortalController.uploadCodeProtectionFile);
router.post('/code-protection/obfuscate', requireCustomerAuth, checkPasswordChange, checkCodeProtectionQuota, customerPortalController.obfuscateCodeProtectionFile);
router.get('/code-protection/download/:id', requireCustomerAuth, customerPortalController.downloadCodeProtectionFile);
router.delete('/code-protection/:id', requireCustomerAuth, customerPortalController.deleteCodeProtectionFile);

// API routes
router.get('/api/license-types/:product_id', requireCustomerAuth, customerPortalController.getLicenseTypes);

// Logout
router.get('/logout', customerPortalController.logout);
router.post('/logout', customerPortalController.logout);

module.exports = router;
