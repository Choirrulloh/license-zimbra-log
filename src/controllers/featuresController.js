const db = require('../database/db');
const moment = require('moment-timezone');
const ActivityLogger = require('../utils/activityLogger');

class FeaturesController {
  constructor() {
    this.index = this.index.bind(this);
    this.create = this.create.bind(this);
    this.store = this.store.bind(this);
    this.edit = this.edit.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.updateFeatures = this.updateFeatures.bind(this);
  }

  /**
   * Display all features grouped by product
   * GET /features
   */
  async index(req, res) {
    try {
      // Get all products with their features
      const products = await db.all(`
        SELECT p.id as product_id, p.name as product_name, p.version,
               f.id as feature_id, f.name as feature_name,
               f.feature_key, f.description, f.category, f.display_order, f.is_active
        FROM products p
        LEFT JOIN features f ON p.id = f.product_id
        WHERE p.is_active = 1
        ORDER BY p.name, f.display_order ASC, f.name ASC
      `);

      // Group by product
      const groupedData = {};
      products.forEach(row => {
        if (!groupedData[row.product_id]) {
          groupedData[row.product_id] = {
            id: row.product_id,
            name: row.product_name,
            version: row.version,
            features: []
          };
        }

        if (row.feature_id) {
          groupedData[row.product_id].features.push({
            id: row.feature_id,
            name: row.feature_name,
            feature_key: row.feature_key,
            description: row.description,
            category: row.category,
            display_order: row.display_order,
            is_active: row.is_active
          });
        }
      });

      const productsWithFeatures = Object.values(groupedData);

      res.render('features/index', {
        user: req.session,
        currentPage: 'features',
        moment,
        products: productsWithFeatures
      });
    } catch (error) {
      console.error('Error loading features:', error);
      res.status(500).send('Error loading features page');
    }
  }

  /**
   * Show create feature form
   * GET /features/create
   */
  async create(req, res) {
    try {
      const products = await db.all('SELECT id, name FROM products WHERE is_active = 1 ORDER BY name');

      res.render('features/create', {
        user: req.session,
        currentPage: 'features',
        products,
        moment
      });
    } catch (error) {
      console.error('Error loading create feature page:', error);
      res.status(500).send('Error loading page');
    }
  }

  /**
   * Store new feature
   * POST /features/create
   */
  async store(req, res) {
    try {
      const { product_id, name, feature_key, description, category, display_order } = req.body;

      // Validate required fields
      if (!product_id || !name || !feature_key) {
        return res.status(400).json({
          success: false,
          message: 'Product, name, and feature key are required'
        });
      }

      // Check if feature_key already exists for this product
      const existing = await db.get(
        'SELECT id FROM features WHERE product_id = ? AND feature_key = ?',
        [product_id, feature_key]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Feature key already exists for this product'
        });
      }

      // Insert feature
      const result = await db.run(
        `INSERT INTO features (product_id, name, feature_key, description, category, display_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product_id, name, feature_key, description || null, category || null, display_order || 0]
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
   * Show edit feature form
   * GET /features/:id/edit
   */
  async edit(req, res) {
    try {
      const { id } = req.params;

      const feature = await db.get('SELECT * FROM features WHERE id = ?', [id]);

      if (!feature) {
        return res.status(404).send('Feature not found');
      }

      const products = await db.all('SELECT id, name FROM products WHERE is_active = 1 ORDER BY name');

      res.render('features/edit', {
        user: req.session,
        currentPage: 'features',
        feature,
        products,
        moment
      });
    } catch (error) {
      console.error('Error loading edit feature page:', error);
      res.status(500).send('Error loading page');
    }
  }

  /**
   * Update feature
   * POST /features/:id/edit
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { product_id, name, feature_key, description, category, display_order, is_active } = req.body;

      // Get current feature
      const feature = await db.get('SELECT * FROM features WHERE id = ?', [id]);

      if (!feature) {
        return res.status(404).json({
          success: false,
          message: 'Feature not found'
        });
      }

      // Check if feature_key is unique (excluding current feature)
      const existing = await db.get(
        'SELECT id FROM features WHERE product_id = ? AND feature_key = ? AND id != ?',
        [product_id, feature_key, id]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Feature key already exists for this product'
        });
      }

      // Update feature
      await db.run(
        `UPDATE features
         SET product_id = ?, name = ?, feature_key = ?, description = ?,
             category = ?, display_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [product_id, name, feature_key, description || null, category || null,
         display_order || 0, is_active ? 1 : 0, id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'update',
        entityType: 'feature',
        entityId: id,
        description: `Updated feature: ${name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Feature updated successfully'
      });
    } catch (error) {
      console.error('Error updating feature:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating feature'
      });
    }
  }

  /**
   * Delete feature
   * DELETE /features/:id
   */
  async delete(req, res) {
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

  /**
   * Update features for a license type (Legacy endpoint - keep for backward compatibility)
   * PUT /features/license-types/:id
   *
   * @deprecated This endpoint is kept for backward compatibility
   * Use the new many-to-many relationship via productController instead
   */
  async updateFeatures(req, res) {
    try {
      const { id } = req.params;
      const { features } = req.body;

      // Get current license type data
      const licenseType = await db.get('SELECT * FROM license_types WHERE id = ?', [id]);

      if (!licenseType) {
        return res.status(404).json({
          success: false,
          message: 'License type not found'
        });
      }

      // Update the old features column (for backward compatibility)
      await db.run(
        `UPDATE license_types
         SET features = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [features, id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'update_features_legacy',
        entityType: 'license_type',
        entityId: id,
        description: `Updated features (legacy) for license type: ${licenseType.name}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Features updated successfully'
      });
    } catch (error) {
      console.error('Error updating features:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating features'
      });
    }
  }
}

module.exports = new FeaturesController();
