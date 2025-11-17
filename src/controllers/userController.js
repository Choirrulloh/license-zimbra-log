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
  }

  // List all users
  async index(req, res) {
    try {
      const users = await db.all(
        `SELECT id, name, email, role, phone, is_active, last_login, created_at
         FROM users
         ORDER BY created_at DESC`
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
        `SELECT id, name, email, role, phone, is_active, last_login, created_at, updated_at
         FROM users WHERE id = ?`,
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
      return res.render('users/create', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Create User',
        error: null
      });
    }

    try {
      const { name, email, password, role, phone } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.render('users/create', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Create User',
          error: 'Name, email, and password are required'
        });
      }

      // Check if email already exists
      const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.render('users/create', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Create User',
          error: 'Email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await db.run(
        `INSERT INTO users (name, email, password, role, phone, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [name, email, hashedPassword, role || 'admin', phone || null]
      );

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'user',
        result.id,
        name,
        req
      );

      res.redirect('/users');
    } catch (error) {
      console.error('Error creating user:', error);
      res.render('users/create', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Create User',
        error: 'Error creating user'
      });
    }
  }

  // Edit user form
  async edit(req, res) {
    try {
      const { id } = req.params;

      const viewUser = await db.get(
        'SELECT id, name, email, role, phone, is_active FROM users WHERE id = ?',
        [id]
      );

      if (!viewUser) {
        return res.status(404).send('User not found');
      }

      // Prevent editing super admin by non-super admin
      if (viewUser.role === 'super_admin' && req.session.userRole !== 'super_admin') {
        return res.status(403).send('You cannot edit a super admin user');
      }

      res.render('users/edit', {
        user: req.session,
        currentPage: 'users',
        pageTitle: 'Edit User',
        viewUser,
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
      const { name, email, role, phone, is_active } = req.body;

      if (!name || !email) {
        const viewUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        return res.render('users/edit', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Edit User',
          viewUser,
          error: 'Name and email are required'
        });
      }

      // Get current user data for logging
      const oldUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!oldUser) {
        return res.status(404).send('User not found');
      }

      // Prevent editing super admin
      if (oldUser.role === 'super_admin' && req.session.userRole !== 'super_admin') {
        return res.status(403).send('You cannot edit a super admin user');
      }

      // Check if email is taken by another user
      const emailCheck = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck) {
        const viewUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        return res.render('users/edit', {
          user: req.session,
          currentPage: 'users',
          pageTitle: 'Edit User',
          viewUser,
          error: 'Email is already taken by another user'
        });
      }

      // Update user
      await db.run(
        `UPDATE users
         SET name = ?, email = ?, role = ?, phone = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, role || 'admin', phone || null, is_active === 'on' ? 1 : 0, id]
      );

      // Log activity with changes
      const changes = {};
      if (oldUser.name !== name) changes.name = { from: oldUser.name, to: name };
      if (oldUser.email !== email) changes.email = { from: oldUser.email, to: email };
      if (oldUser.role !== role) changes.role = { from: oldUser.role, to: role };

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
      const userToDelete = await db.get('SELECT * FROM users WHERE id = ?', [id]);

      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent deleting super admin
      if (userToDelete.role === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete super admin user'
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

      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
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
}

module.exports = new UserController();
