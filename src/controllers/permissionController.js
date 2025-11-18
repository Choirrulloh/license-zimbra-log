const db = require('../database/db');
const { logActivity } = require('../utils/activityLogger');

// List all permissions
exports.index = async (req, res) => {
  try {
    const permissions = await db.all(`
      SELECT
        p.*,
        COUNT(DISTINCT rp.role_id) as role_count
      FROM permissions p
      LEFT JOIN role_permissions rp ON rp.permission_id = p.id
      GROUP BY p.id
      ORDER BY p.resource, p.action
    `);

    // Group permissions by resource
    const groupedPermissions = {};
    permissions.forEach(perm => {
      if (!groupedPermissions[perm.resource]) {
        groupedPermissions[perm.resource] = [];
      }
      groupedPermissions[perm.resource].push(perm);
    });

    res.render('permissions/index', {
      title: 'Permissions Management',
      pageTitle: 'Permissions Management',
      currentPage: 'roles',
      permissions,
      groupedPermissions,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).send('Error fetching permissions');
  }
};

// Show create permission form
exports.create = async (req, res) => {
  if (req.method === 'GET') {
    res.render('permissions/create', {
      title: 'Create Permission',
      pageTitle: 'Create New Permission',
      currentPage: 'roles',
      user: req.session,
      moment: require('moment')
    });
  } else {
    try {
      const { name, resource, action, description } = req.body;

      // Validate required fields
      if (!name || !resource || !action) {
        return res.status(400).json({ error: 'Name, resource, and action are required' });
      }

      // Check if permission already exists
      const existing = await db.get('SELECT id FROM permissions WHERE name = ?', [name]);
      if (existing) {
        return res.status(400).json({ error: 'Permission with this name already exists' });
      }

      // Create permission
      const result = await db.run(
        'INSERT INTO permissions (name, resource, action, description) VALUES (?, ?, ?, ?)',
        [name, resource, action, description || '']
      );

      // Log activity
      await logActivity(
        req.session.userId,
        'create',
        'permission',
        result.id,
        `Created permission: ${name}`,
        req.ip,
        req.get('user-agent')
      );

      res.redirect('/permissions');
    } catch (error) {
      console.error('Error creating permission:', error);
      res.status(500).json({ error: 'Error creating permission' });
    }
  }
};

// Show permission details
exports.show = async (req, res) => {
  try {
    const permission = await db.get('SELECT * FROM permissions WHERE id = ?', [req.params.id]);

    if (!permission) {
      return res.status(404).send('Permission not found');
    }

    // Get roles that have this permission
    const roles = await db.all(`
      SELECT r.*
      FROM roles r
      INNER JOIN role_permissions rp ON rp.role_id = r.id
      WHERE rp.permission_id = ?
      ORDER BY r.display_name
    `, [req.params.id]);

    res.render('permissions/show', {
      title: permission.name,
      pageTitle: `Permission: ${permission.name}`,
      currentPage: 'roles',
      permission,
      roles,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error fetching permission:', error);
    res.status(500).send('Error fetching permission');
  }
};

// Show edit permission form
exports.edit = async (req, res) => {
  try {
    const permission = await db.get('SELECT * FROM permissions WHERE id = ?', [req.params.id]);

    if (!permission) {
      return res.status(404).send('Permission not found');
    }

    res.render('permissions/edit', {
      title: `Edit ${permission.name}`,
      pageTitle: `Edit Permission: ${permission.name}`,
      currentPage: 'roles',
      permission,
      user: req.session,
      moment: require('moment')
    });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.status(500).send('Error loading edit form');
  }
};

// Update permission
exports.update = async (req, res) => {
  try {
    const { resource, action, description } = req.body;
    const permissionId = req.params.id;

    // Validate
    if (!resource || !action) {
      return res.status(400).json({ error: 'Resource and action are required' });
    }

    // Get permission name for logging
    const permission = await db.get('SELECT name FROM permissions WHERE id = ?', [permissionId]);

    // Update permission
    await db.run(
      'UPDATE permissions SET resource = ?, action = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [resource, action, description || '', permissionId]
    );

    // Log activity
    await logActivity(
      req.session.userId,
      'update',
      'permission',
      permissionId,
      `Updated permission: ${permission.name}`,
      req.ip,
      req.get('user-agent')
    );

    res.redirect(`/permissions/${permissionId}`);
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Error updating permission' });
  }
};

// Delete permission
exports.delete = async (req, res) => {
  try {
    const permissionId = req.params.id;

    // Get permission info for logging
    const permission = await db.get('SELECT name FROM permissions WHERE id = ?', [permissionId]);

    // Delete permission (cascades to role_permissions)
    await db.run('DELETE FROM permissions WHERE id = ?', [permissionId]);

    // Log activity
    await logActivity(
      req.session.userId,
      'delete',
      'permission',
      permissionId,
      `Deleted permission: ${permission ? permission.name : permissionId}`,
      req.ip,
      req.get('user-agent')
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Error deleting permission' });
  }
};
