const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Custom handler for rate limit exceeded
const rateLimitHandler = (req, res, next, options) => {
  logger.security('Rate limit exceeded', req, {
    limit: options.limit,
    windowMs: options.windowMs
  });

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000)
    });
  }

  res.status(429).render('errors/rate-limit', {
    user: req.session,
    retryAfter: Math.ceil(options.windowMs / 1000)
  });
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip for internal requests or health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Auth rate limit exceeded - possible brute force', req);
    rateLimitHandler(req, res, next, options);
  },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Password reset rate limit exceeded', req);
    rateLimitHandler(req, res, next, options);
  }
});

// Rate limiter for license validation API (more generous)
const licenseValidationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

// Rate limiter for license activation (stricter)
const licenseActivationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 activations per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('License activation rate limit exceeded', req);
    rateLimitHandler(req, res, next, options);
  }
});

// Rate limiter for code protection (expensive operation)
const codeProtectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20, // 20 obfuscations per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

// Rate limiter for customer portal login
const customerAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.security('Customer auth rate limit exceeded', req);
    rateLimitHandler(req, res, next, options);
  },
  skipSuccessfulRequests: true
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  licenseValidationLimiter,
  licenseActivationLimiter,
  codeProtectionLimiter,
  customerAuthLimiter
};
