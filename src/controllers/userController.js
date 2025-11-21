const db = require('../database/db');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const ActivityLogger = require('../utils/activityLogger');

class UserController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.edit = this.edit.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.suspend = this.suspend.bind(this);
    this.unsuspend = this.unsuspend.bind(this);
  }

  // List all users
  async index(req, res) {
    try {
      const users = await db.all(
        `SELECT u.id, u.name, u.email, u.role_id, u.phone, u.is_active, u.last_login, u.created_at,
                u.suspended, u.suspended_at, u.suspended_reason,
                r.name as role_name, r.display_name as role_display_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         ORDER BY u.created_at DESC`
      );

      res.render('users/index', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'User Management',
        users,
        moment
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Error loading users');
    }
  }

  // Show user details
  async show(req, res) {
    try {
      const { id } = req.params;

      const viewUser = await db.get(
        `SELECT u.id, u.name, u.email, u.role_id, u.phone, u.is_active, u.last_login, u.created_at, u.updated_at,
                r.name as role_name, r.display_name as role_display_name, r.description as role_description
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );

      if (!viewUser) {
        return res.status(404).send('User not found');
      }

      // Get user's recent activities
      const activities = await ActivityLogger.getActivitiesByUser(id, 20);

      res.render('users/show', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'User Details',
        viewUser,
        activities,
        moment
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Error loading user');
    }
  }

  // Create user form / submit
  async create(req, res) {
    if (req.method === 'GET') {
      // Get all active roles for dropdown
      const roles = await db.all(
        `SELECT id, name, display_name, description
         FROM roles
         WHERE is_active = 1
         ORDER BY display_name`
      );

      return res.render('users/create', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Create User',
        roles,
        error: null
      });
    }

    try {
      const { name, email, password, role_id, phone } = req.body;

      // Validation
      if (!name || !email || !password || !role_id) {
        const roles = await db.all(
          `SELECT id, name, display_name, description
           FROM roles
           WHERE is_active = 1
           ORDER BY display_name`
        );
        return res.render('users/create', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Create User',
          roles,
          error: 'Name, email, password, and role are required'
        });
      }

      // Check if email already exists
      const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        const roles = await db.all(
          `SELECT id, name, display_name, description
           FROM roles
           WHERE is_active = 1
           ORDER BY display_name`
        );
        return res.render('users/create', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Create User',
          roles,
          error: 'Email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await db.run(
        `INSERT INTO users (name, email, password, role_id, phone, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [name, email, hashedPassword, role_id, phone || null]
      );

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'user',
        result.id,
        name,
        req
      );

      // Send welcome email using default template settings
      try {
        const emailService = require('../services/emailService');
        const { getDefaultTemplateSettings } = require('../utils/templateSettings');
        const templateSettings = await getDefaultTemplateSettings('welcome_email');

        await emailService.sendEmail(
          'welcome_email',
          email,
          name,
          {
            'user.name': name,
            'user.email': email,
            'user.password': password,
            'login.url': `${process.env.APP_URL || 'http://localhost:3000'}/login`
          },
          templateSettings.language,
          templateSettings.design
        );
        console.log(`✓ Welcome email sent to ${email} (${templateSettings.language}, design ${templateSettings.design})`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError.message);
        // Don't block user creation if email fails
      }

      res.redirect('/users');
    } catch (error) {
      console.error('Error creating user:', error);
      const roles = await db.all(
        `SELECT id, name, display_name, description
         FROM roles
         WHERE is_active = 1
         ORDER BY display_name`
      );
      res.render('users/create', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Create User',
        roles,
        error: 'Error creating user'
      });
    }
  }

  // Edit user form
  async edit(req, res) {
    try {
      const { id } = req.params;

      const viewUser = await db.get(
        `SELECT u.id, u.name, u.email, u.role_id, u.phone, u.is_active,
                r.name as role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );

      if (!viewUser) {
        return res.status(404).send('User not found');
      }

      // Get all active roles for dropdown
      const roles = await db.all(
        `SELECT id, name, display_name, description
         FROM roles
         WHERE is_active = 1
         ORDER BY display_name`
      );

      // Prevent editing admin role by non-admin
      if (viewUser.role_name === 'admin' && req.session.userRole !== 'admin') {
        return res.status(403).send('You cannot edit an admin user');
      }

      res.render('users/edit', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Edit User',
        viewUser,
        roles,
        error: null
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).send('Error loading user');
    }
  }

  // Update user
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role_id, phone, is_active } = req.body;

      if (!name || !email || !role_id) {
        const viewUser = await db.get(
          `SELECT u.*, r.name as role_name
           FROM users u
           LEFT JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?`,
          [id]
        );
        const roles = await db.all(
          `SELECT id, name, display_name, description
           FROM roles WHERE is_active = 1 ORDER BY display_name`
        );
        return res.render('users/edit', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Edit User',
          viewUser,
          roles,
          error: 'Name, email, and role are required'
        });
      }

      // Get current user data for logging
      const oldUser = await db.get(
        `SELECT u.*, r.name as role_name, r.display_name as role_display_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );

      if (!oldUser) {
        return res.status(404).send('User not found');
      }

      // Prevent editing admin role
      if (oldUser.role_name === 'admin' && req.session.userRole !== 'admin') {
        return res.status(403).send('You cannot edit an admin user');
      }

      // Check if email is taken by another user
      const emailCheck = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck) {
        const viewUser = await db.get(
          `SELECT u.*, r.name as role_name
           FROM users u
           LEFT JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?`,
          [id]
        );
        const roles = await db.all(
          `SELECT id, name, display_name, description
           FROM roles WHERE is_active = 1 ORDER BY display_name`
        );
        return res.render('users/edit', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Edit User',
          viewUser,
          roles,
          error: 'Email is already taken by another user'
        });
      }

      // Update user
      await db.run(
        `UPDATE users
         SET name = ?, email = ?, role_id = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, role_id, phone || null, is_active === 'on' ? 1 : 0, id]
      );

      // Get new role name for logging
      const newRole = await db.get('SELECT name, display_name FROM roles WHERE id = ?', [role_id]);

      // Log activity with changes
      const changes = {};
      if (oldUser.name !== name) changes.name = { from: oldUser.name, to: name };
      if (oldUser.email !== email) changes.email = { from: oldUser.email, to: email };
      if (oldUser.role_id !== parseInt(role_id)) {
        changes.role = { from: oldUser.role_display_name, to: newRole.display_name };
      }

      await ActivityLogger.logUpdate(
        req.session.userId,
        'user',
        id,
        name,
        changes,
        req
      );

      res.redirect('/users');
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).send('Error updating user');
    }
  }

  // Delete user
  async delete(req, res) {
    try {
      const { id } = req.params;

      // Get user data before deletion
      const userToDelete = await db.get(
        `SELECT u.*, r.name as role_name
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [id]
      );

      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent deleting admin role
      if (userToDelete.role_name === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete admin user'
        });
      }

      // Prevent self-deletion
      if (parseInt(id) === parseInt(req.session.userId)) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete yourself'
        });
      }

      // Delete user
      await db.run('DELETE FROM users WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.logDelete(
        req.session.userId,
        'user',
        id,
        userToDelete.name,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { current_password, new_password, confirm_password } = req.body;

      // Only allow users to change their own password, unless they're super admin
      if (parseInt(id) !== parseInt(req.session.userId) && req.session.userRole !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only change your own password'
        });
      }

      // Validate passwords
      if (!new_password || !confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation are required'
        });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation do not match'
        });
      }

      // Stronger password policy
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{12,}$/;
      if (!passwordRegex.test(new_password)) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 12 characters and contain: uppercase, lowercase, number, and special character'
        });
      }

      // Get user
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password (unless super admin is changing another user's password)
      if (parseInt(id) === parseInt(req.session.userId)) {
        if (!current_password) {
          return res.status(400).json({
            success: false,
            message: 'Current password is required'
          });
        }

        const isValid = await bcrypt.compare(current_password, user.password);
        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      // Update password
      await db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'change_password',
        entityType: 'user',
        entityId: id,
        description: `Password changed for user: ${user.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password'
      });
    }
  }

  // Suspend user
  async suspend(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await db.get(
        `SELECT u.*, r.name as role_name FROM users u
         LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
        [id]
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Prevent suspending admin
      if (user.role_name === 'admin') {
        return res.status(403).json({ success: false, message: 'Cannot suspend admin user' });
      }

      // Prevent self-suspension
      if (parseInt(id) === parseInt(req.session.userId)) {
        return res.status(403).json({ success: false, message: 'Cannot suspend yourself' });
      }

      await db.run(
        `UPDATE users SET suspended = 1, suspended_at = CURRENT_TIMESTAMP, suspended_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [reason || null, id]
      );

      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'suspend',
        entityType: 'user',
        entityId: id,
        description: `Suspended user: ${user.name}${reason ? ` - Reason: ${reason}` : ''}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({ success: true, message: 'User suspended successfully' });
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ success: false, message: 'Error suspending user' });
    }
  }

  // Unsuspend user
  async unsuspend(req, res) {
    try {
      const { id } = req.params;

      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await db.run(
        `UPDATE users SET suspended = 0, suspended_at = NULL, suspended_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'unsuspend',
        entityType: 'user',
        entityId: id,
        description: `Unsuspended user: ${user.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({ success: true, message: 'User unsuspended successfully' });
    } catch (error) {
      console.error('Error unsuspending user:', error);
      res.status(500).json({ success: false, message: 'Error unsuspending user' });
    }
  }
}

module.exports = new UserController();
