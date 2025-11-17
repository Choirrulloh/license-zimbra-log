const db = require('../database/db');

class ActivityLogger {
  /**
   * Log an activity to the database
   * @param {Object} options
   * @param {number} options.userId - ID of the user performing the action
   * @param {string} options.action - Action performed (e.g., 'create', 'update', 'delete', 'login')
   * @param {string} options.entityType - Type of entity (e.g., 'user', 'license', 'product', 'customer')
   * @param {number} options.entityId - ID of the entity
   * @param {string} options.description - Human-readable description
   * @param {Object} options.metadata - Additional metadata (will be JSON stringified)
   * @param {string} options.ipAddress - IP address of the request
   * @param {string} options.userAgent - User agent string
   */
  static async log({
    userId = null,
    action,
    entityType = null,
    entityId = null,
    description,
    metadata = null,
    ipAddress = null,
    userAgent = null
  }) {
    try {
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      await db.run(
        `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, action, entityType, entityId, description, ipAddress, userAgent, metadataJson]
      );
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }

  /**
   * Log user login
   */
  static async logLogin(userId, ipAddress, userAgent) {
    await this.log({
      userId,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      description: 'User logged in',
      ipAddress,
      userAgent
    });
  }

  /**
   * Log user logout
   */
  static async logLogout(userId, ipAddress) {
    await this.log({
      userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      description: 'User logged out',
      ipAddress
    });
  }

  /**
   * Log entity creation
   */
  static async logCreate(userId, entityType, entityId, entityName, req) {
    await this.log({
      userId,
      action: 'create',
      entityType,
      entityId,
      description: `Created ${entityType}: ${entityName}`,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log entity update
   */
  static async logUpdate(userId, entityType, entityId, entityName, changes, req) {
    await this.log({
      userId,
      action: 'update',
      entityType,
      entityId,
      description: `Updated ${entityType}: ${entityName}`,
      metadata: changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Log entity deletion
   */
  static async logDelete(userId, entityType, entityId, entityName, req) {
    await this.log({
      userId,
      action: 'delete',
      entityType,
      entityId,
      description: `Deleted ${entityType}: ${entityName}`,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(limit = 50, offset = 0) {
    const activities = await db.all(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return activities;
  }

  /**
   * Get activities by user
   */
  static async getActivitiesByUser(userId, limit = 50) {
    const activities = await db.all(
      `SELECT * FROM activity_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return activities;
  }

  /**
   * Get activities by entity
   */
  static async getActivitiesByEntity(entityType, entityId, limit = 50) {
    const activities = await db.all(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = ? AND al.entity_id = ?
       ORDER BY al.created_at DESC
       LIMIT ?`,
      [entityType, entityId, limit]
    );

    return activities;
  }
}

module.exports = ActivityLogger;
