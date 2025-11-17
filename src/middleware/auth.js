/**
 * Authentication middleware
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

/**
 * Redirect if authenticated
 */
function redirectIfAuth(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

/**
 * Check admin role
 */
function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  if (req.session.userRole !== 'admin') {
    return res.status(403).send('Access denied');
  }

  next();
}

module.exports = {
  requireAuth,
  redirectIfAuth,
  requireAdmin
};
