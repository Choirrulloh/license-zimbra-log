const db = require('../database/db');
const ActivityLogger = require('../utils/activityLogger');

class FeaturesController {
  constructor() {
    this.createFeature = this.createFeature.bind(this);
    this.deleteFeature = this.deleteFeature.bind(this);
  }

  /**
   * Create new feature inline from product page
   * POST /products/:productId/features
   */
  async createFeature(req, res) {
    try {
      const { productId } = req.params;
      const { name, feature_key, description } = req.body;

      // Validate required fields
      if (!name || !feature_key) {
        return res.status(400).json({
          success: false,
          message: 'Name and feature key are required'
        });
      }

      // Check if feature_key already exists for this product
      const existing = await db.get(
        'SELECT id FROM features WHERE product_id = ? AND feature_key = ?',
        [productId, feature_key]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Feature key already exists for this product'
        });
      }

      // Insert feature
      const result = await db.run(
        `INSERT INTO features (product_id, name, feature_key, description)
         VALUES (?, ?, ?, ?)`,
        [productId, name, feature_key, description || null]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'create',
        entityType: 'feature',
        entityId: result.id,
        description: `Created feature: ${name} (${feature_key})`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Feature created successfully',
        featureId: result.id
      });
    } catch (error) {
      console.error('Error creating feature:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating feature'
      });
    }
  }

  /**
   * Delete feature
   * DELETE /features/:id
   */
  async deleteFeature(req, res) {
    try {
      const { id } = req.params;

      // Get feature name before deleting
      const feature = await db.get('SELECT name FROM features WHERE id = ?', [id]);

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: 'Feature not found'
        });
      }

      // Delete feature (will cascade delete license_type_features)
      await db.run('DELETE FROM features WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'delete',
        entityType: 'feature',
        entityId: id,
        description: `Deleted feature: ${feature.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Feature deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting feature:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting feature'
      });
    }
  }
}

module.exports = new FeaturesController();
