const db = require('../database/db');

// Middleware to check if customer is authenticated
const requireCustomerAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.customerId) {
      return res.redirect('/customer/login');
    }

    // Get customer data
    const customer = await db.get(
      'SELECT * FROM customers WHERE id = ? AND is_active = 1',
      [req.session.customerId]
    );

    if (!customer) {
      req.session.destroy();
      return res.redirect('/customer/login');
    }

    // Attach customer to request
    req.customer = customer;
    res.locals.customer = customer;

    // Check if this is admin impersonation
    res.locals.isImpersonation = req.session.isImpersonation || false;
    res.locals.adminUser = req.session.adminUser || null;

    next();
  } catch (error) {
    console.error('Customer auth error:', error);
    res.redirect('/customer/login');
  }
};

// Middleware to redirect if already logged in
const redirectIfCustomerAuthenticated = (req, res, next) => {
  if (req.session && req.session.customerId) {
    return res.redirect('/customer/dashboard');
  }
  next();
};

// Middleware to check if customer must change password
const checkPasswordChange = (req, res, next) => {
  if (req.customer && req.customer.must_change_password === 1) {
    // Allow access to profile/change password page
    if (req.path === '/profile' || req.path === '/change-password') {
      return next();
    }
    // Redirect to profile to change password
    return res.redirect('/customer/profile?mustChange=1');
  }
  next();
};

// Middleware to check license quota
const checkLicenseQuota = async (req, res, next) => {
  try {
    const customer = req.customer;

    // 0 means unlimited
    if (customer.license_limit === 0) {
      return next();
    }

    // Check if customer has reached limit
    if (customer.license_used >= customer.license_limit) {
      return res.status(403).json({
        success: false,
        error: `License quota exceeded! You have used ${customer.license_used} of ${customer.license_limit} licenses. Please contact administrator to increase your limit.`
      });
    }

    next();
  } catch (error) {
    console.error('License quota check error:', error);
    res.status(500).json({ success: false, error: 'Error checking license quota' });
  }
};

// Middleware to check code protection quota
const checkCodeProtectionQuota = async (req, res, next) => {
  try {
    const customer = req.customer;

    // 0 means unlimited
    if (customer.code_protection_limit === 0) {
      return next();
    }

    // Check if customer has reached limit
    if (customer.code_protection_used >= customer.code_protection_limit) {
      return res.status(403).json({
        success: false,
        error: `Code protection quota exceeded! You have used ${customer.code_protection_used} of ${customer.code_protection_limit} protections. Please contact administrator to increase your limit.`
      });
    }

    next();
  } catch (error) {
    console.error('Code protection quota check error:', error);
    res.status(500).json({ success: false, error: 'Error checking code protection quota' });
  }
};

module.exports = {
  requireCustomerAuth,
  redirectIfCustomerAuthenticated,
  checkPasswordChange,
  checkLicenseQuota,
  checkCodeProtectionQuota
};
