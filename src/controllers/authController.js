const bcrypt = require('bcryptjs');
const db = require('../database/db');
const ActivityLogger = require('../utils/activityLogger');

class AuthController {
  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.showLogin = this.showLogin.bind(this);
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.render('login', {
          error: 'Email and password are required'
        });
      }

      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

      if (!user) {
        return res.render('login', {
          error: 'Invalid credentials'
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.render('login', {
          error: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.render('login', {
          error: 'Your account has been deactivated. Please contact administrator.'
        });
      }

      // Update last_login
      await db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Log login activity
      await ActivityLogger.logLogin(
        user.id,
        req.ip || req.connection?.remoteAddress,
        req.headers?.['user-agent']
      );

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userName = user.name;
      req.session.userRole = user.role;

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      res.render('login', {
        error: 'An error occurred during login'
      });
    }
  }

  async logout(req, res) {
    const userId = req.session.userId;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    // Log logout activity before destroying session
    if (userId) {
      await ActivityLogger.logLogout(userId, ipAddress);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      res.redirect('/login');
    });
  }

  showLogin(req, res) {
    if (req.session.userId) {
      return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
  }
}

module.exports = new AuthController();
