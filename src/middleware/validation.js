const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Password policy configuration
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.security('Validation failed', req, { errors: errors.array() });

    // Check if it's an API request
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // For regular form submissions, store errors and redirect back
    req.flash = errors.array().map(e => e.msg).join(', ');
    return res.status(400).render('errors/validation', {
      user: req.session,
      errors: errors.array()
    });
  }
  next();
};

// Password validation helper
const passwordValidator = (fieldName = 'password') => {
  return body(fieldName)
    .isLength({ min: PASSWORD_POLICY.minLength })
    .withMessage(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character');
};

// Common validators
const validators = {
  // Auth validators
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  // User validators
  createUser: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .escape(),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    passwordValidator('password'),
    body('role_id')
      .notEmpty()
      .withMessage('Role is required')
      .isInt({ min: 1 })
      .withMessage('Invalid role'),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[+]?[\d\s-()]+$/)
      .withMessage('Invalid phone number format'),
    handleValidationErrors
  ],

  updateUser: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .escape(),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('role_id')
      .notEmpty()
      .withMessage('Role is required')
      .isInt({ min: 1 })
      .withMessage('Invalid role'),
    handleValidationErrors
  ],

  changePassword: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID'),
    body('current_password')
      .optional()
      .notEmpty()
      .withMessage('Current password is required'),
    passwordValidator('new_password'),
    body('confirm_password')
      .custom((value, { req }) => {
        if (value !== req.body.new_password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
    handleValidationErrors
  ],

  // Customer validators
  createCustomer: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .escape(),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('company')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 200 })
      .withMessage('Company name must be less than 200 characters')
      .escape(),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[+]?[\d\s-()]+$/)
      .withMessage('Invalid phone number format'),
    handleValidationErrors
  ],

  // License validators
  createLicense: [
    body('customer_id')
      .notEmpty()
      .withMessage('Customer is required')
      .isInt({ min: 1 })
      .withMessage('Invalid customer ID'),
    body('product_id')
      .notEmpty()
      .withMessage('Product is required')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID'),
    body('license_type_id')
      .notEmpty()
      .withMessage('License type is required')
      .isInt({ min: 1 })
      .withMessage('Invalid license type ID'),
    handleValidationErrors
  ],

  // Product validators
  createProduct: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Product name must be between 2 and 100 characters')
      .escape(),
    body('description')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('version')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[\d.]+$/)
      .withMessage('Invalid version format'),
    handleValidationErrors
  ],

  // ID param validator
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid ID'),
    handleValidationErrors
  ],

  // API license validation
  apiValidateLicense: [
    body('license_key')
      .trim()
      .notEmpty()
      .withMessage('License key is required')
      .isLength({ min: 25, max: 30 })
      .withMessage('Invalid license key format'),
    body('hardware_id')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Invalid hardware ID'),
    handleValidationErrors
  ],

  // API license activation
  apiActivateLicense: [
    body('license_key')
      .trim()
      .notEmpty()
      .withMessage('License key is required')
      .isLength({ min: 25, max: 30 })
      .withMessage('Invalid license key format'),
    body('hardware_id')
      .trim()
      .notEmpty()
      .withMessage('Hardware ID is required')
      .isLength({ min: 10, max: 100 })
      .withMessage('Invalid hardware ID format'),
    body('device_name')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Device name too long')
      .escape(),
    handleValidationErrors
  ]
};

module.exports = {
  validators,
  handleValidationErrors,
  passwordValidator,
  PASSWORD_POLICY
};
