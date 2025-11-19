const db = require('../database/db');
const { logActivity } = require('../utils/activityLogger');

// List all roles
exports.index = async (req, res) => {
  try {
    const roles = await db.all(`
      SELECT
        r.*,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      GROUP BY r.id
      ORDER BY r.name
    `);

    res.render('roles/index', {
      title: 'Roles Management',
      pageTitle: 'Roles Management',
      currentPage: 'roles',
      roles,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).send('Error fetching roles');
  }
};

// Show create role form
exports.create = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const permissions = await db.all('SELECT * FROM permissions ORDER BY resource, action');

      res.render('roles/create', {
        title: 'Create Role',
        pageTitle: 'Create New Role',
        currentPage: 'roles',
        permissions,
        user: req.session,
        moment: require('moment')
      });
    } catch (error) {
      console.error('Error loading create form:', error);
      res.status(500).send('Error loading create form');
    }
  } else {
    try {
      const { name, display_name, description, permissions } = req.body;

      // Validate required fields
      if (!name || !display_name) {
        return res.status(400).json({ error: 'Name and display name are required' });
      }

      // Check if role already exists
      const existing = await db.get('SELECT id FROM roles WHERE name = ?', [name]);
      if (existing) {
        return res.status(400).json({ error: 'Role with this name already exists' });
      }

      // Create role
      const result = await db.run(
        'INSERT INTO roles (name, display_name, description) VALUES (?, ?, ?)',
        [name, display_name, description || '']
      );

      const roleId = result.id;

      // Assign permissions if provided
      if (permissions && Array.isArray(permissions)) {
        for (const permId of permissions) {
          await db.run(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
            [roleId, permId]
          );
        }
      }

      // Log activity
      await logActivity(
        req.session.userId,
        'create',
        'role',
        roleId,
        `Created role: ${display_name}`,
        req.ip,
        req.get('user-agent')
      );

      res.redirect('/roles');
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Error creating role' });
    }
  }
};

// Show role details
exports.show = async (req, res) => {
  try {
    const role = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);

    if (!role) {
      return res.status(404).send('Role not found');
    }

    // Get permissions for this role
    const permissions = await db.all(`
      SELECT p.*
      FROM permissions p
      INNER JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id = ?
      ORDER BY p.resource, p.action
    `, [req.params.id]);

    // Get users with this role
    const users = await db.all(
      'SELECT id, name, email FROM users WHERE role_id = ? ORDER BY name',
      [req.params.id]
    );

    res.render('roles/show', {
      title: role.display_name,
      pageTitle: `Role: ${role.display_name}`,
      currentPage: 'roles',
      role,
      permissions,
      users,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).send('Error fetching role');
  }
};

// Show edit role form
exports.edit = async (req, res) => {
  try {
    const role = await db.get('SELECT * FROM roles WHERE id = ?', [req.params.id]);

    if (!role) {
      return res.status(404).send('Role not found');
    }

    // Get all permissions
    const allPermissions = await db.all('SELECT * FROM permissions ORDER BY resource, action');

    // Get current role permissions
    const rolePermissions = await db.all(
      'SELECT permission_id FROM role_permissions WHERE role_id = ?',
      [req.params.id]
    );
    const rolePermissionIds = rolePermissions.map(rp => rp.permission_id);

    res.render('roles/edit', {
      title: `Edit ${role.display_name}`,
      pageTitle: `Edit Role: ${role.display_name}`,
      currentPage: 'roles',
      role,
      allPermissions,
      rolePermissionIds,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.status(500).send('Error loading edit form');
  }
};

// Update role
exports.update = async (req, res) => {
  try {
    const { display_name, description, permissions, is_active } = req.body;
    const roleId = req.params.id;

    // Validate
    if (!display_name) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Update role
    await db.run(
      'UPDATE roles SET display_name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [display_name, description || '', is_active === 'on' ? 1 : 0, roleId]
    );

    // Delete existing permissions
    await db.run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

    // Add new permissions
    if (permissions && Array.isArray(permissions)) {
      for (const permId of permissions) {
        await db.run(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [roleId, permId]
        );
      }
    }

    // Log activity
    await logActivity(
      req.session.userId,
      'update',
      'role',
      roleId,
      `Updated role: ${display_name}`,
      req.ip,
      req.get('user-agent')
    );

    res.redirect(`/roles/${roleId}`);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Error updating role' });
  }
};

// Delete role
exports.delete = async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role is in use
    const usersWithRole = await db.get(
      'SELECT COUNT(*) as count FROM users WHERE role_id = ?',
      [roleId]
    );

    if (usersWithRole.count > 0) {
      return res.status(400).json({
        error: `Cannot delete role. ${usersWithRole.count} user(s) are assigned to this role.`
      });
    }

    // Get role info for logging
    const role = await db.get('SELECT display_name FROM roles WHERE id = ?', [roleId]);

    // Delete role (cascades to role_permissions)
    await db.run('DELETE FROM roles WHERE id = ?', [roleId]);

    // Log activity
    await logActivity(
      req.session.userId,
      'delete',
      'role',
      roleId,
      `Deleted role: ${role ? role.display_name : roleId}`,
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Error deleting role' });
  }
};
