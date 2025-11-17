const moment = require('moment');

/**
 * Format date for display
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '-';
  return moment(date).format(format);
}

/**
 * Get relative time (e.g., "2 days ago")
 */
function getRelativeTime(date) {
  if (!date) return '-';
  return moment(date).fromNow();
}

/**
 * Calculate days until expiry
 */
function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const now = moment();
  const expiry = moment(expiryDate);
  return expiry.diff(now, 'days');
}

/**
 * Check if license is expiring soon (within 30 days)
 */
function isExpiringSoon(expiryDate, days = 30) {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil !== null && daysUntil <= days && daysUntil > 0;
}

/**
 * Check if license is expired
 */
function isExpired(expiryDate) {
  if (!expiryDate) return false;
  return moment(expiryDate).isBefore(moment());
}

/**
 * Get license status based on expiry date
 */
function getLicenseStatus(expiryDate, currentStatus = 'active') {
  if (currentStatus === 'revoked' || currentStatus === 'suspended') {
    return currentStatus;
  }

  if (isExpired(expiryDate)) {
    return 'expired';
  }

  if (isExpiringSoon(expiryDate)) {
    return 'expiring_soon';
  }

  return 'active';
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Paginate array
 */
function paginate(array, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  const totalPages = Math.ceil(array.length / limit);

  return {
    data: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random string
 */
function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
}

/**
 * Get status badge class for UI
 */
function getStatusBadgeClass(status) {
  const statusClasses = {
    'active': 'bg-green-100 text-green-800',
    'expired': 'bg-red-100 text-red-800',
    'expiring_soon': 'bg-yellow-100 text-yellow-800',
    'suspended': 'bg-gray-100 text-gray-800',
    'revoked': 'bg-red-100 text-red-800',
    'trial': 'bg-blue-100 text-blue-800'
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

module.exports = {
  formatDate,
  getRelativeTime,
  getDaysUntilExpiry,
  isExpiringSoon,
  isExpired,
  getLicenseStatus,
  formatCurrency,
  paginate,
  isValidEmail,
  generateRandomString,
  sanitizeFilename,
  getStatusBadgeClass
};
