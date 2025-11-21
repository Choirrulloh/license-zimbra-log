const csrf = require('csurf');
const logger = require('../utils/logger');

// CSRF protection middleware
const csrfProtection = csrf({
  cookie: false, // Use session-based tokens
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req) => {
    // Check multiple sources for CSRF token
    return req.body._csrf ||
           req.query._csrf ||
           req.headers['csrf-token'] ||
           req.headers['xsrf-token'] ||
           req.headers['x-csrf-token'] ||
           req.headers['x-xsrf-token'];
  }
});

// CSRF error handler
const csrfErrorHandler = (err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }

  logger.security('CSRF token validation failed', req, {
    error: err.message
  });

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    });
  }

  res.status(403).render('errors/csrf', {
    user: req.session,
    message: 'Your session has expired or the form submission was invalid. Please try again.'
  });
};

// Middleware to add CSRF token to all views
const addCsrfToken = (req, res, next) => {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
};

// Skip CSRF for specific routes (API endpoints with their own auth)
const skipCsrfRoutes = [
  '/api/validate',
  '/api/deactivate',
  '/api/license/validate',
  '/api/license/activate',
  '/api/license/deactivate',
  '/api/health'
];

const conditionalCsrf = (req, res, next) => {
  // Skip CSRF for API routes that use different auth mechanisms
  if (skipCsrfRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,
  csrfErrorHandler,
  addCsrfToken,
  conditionalCsrf
};
