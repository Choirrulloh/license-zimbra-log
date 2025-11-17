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

/**
 * Check if user has any of the required roles
 * @param {string[]} roles - Array of allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    if (!roles.includes(req.session.userRole)) {
      return res.status(403).render('error', {
        user: req.session,
        error: 'Access Denied',
        message: 'You do not have permission to access this page.'
      });
    }

    next();
  };
}

/**
 * Check if user is accessing their own resource or is admin
 * @param {string} userIdParam - Name of the parameter containing user ID
 */
function requireSelfOrAdmin(userIdParam = 'id') {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const targetUserId = parseInt(req.params[userIdParam]);
    const isAdmin = req.session.userRole === 'admin';
    const isSelf = req.session.userId === targetUserId;

    if (!isAdmin && !isSelf) {
      return res.status(403).render('error', {
        user: req.session,
        error: 'Access Denied',
        message: 'You can only access your own resources.'
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  redirectIfAuth,
  requireAdmin,
  requireRole,
  requireSelfOrAdmin
};
