const db = require('../database/db');
const moment = require('moment-timezone');
const ActivityLogger = require('../utils/activityLogger');

class FeaturesController {
  constructor() {
    this.index = this.index.bind(this);
    this.updateFeatures = this.updateFeatures.bind(this);
  }

  async index(req, res) {
    try {
      // Get all products with their license types and features
      const products = await db.all(`
        SELECT p.id as product_id, p.name as product_name, p.version,
               lt.id as license_type_id, lt.name as license_type_name,
               lt.features, lt.price
        FROM products p
        LEFT JOIN license_types lt ON p.id = lt.product_id
        WHERE p.is_active = 1
        ORDER BY p.name, lt.name
      `);

      // Group by product
      const groupedData = {};
      products.forEach(row => {
        if (!groupedData[row.product_id]) {
          groupedData[row.product_id] = {
            id: row.product_id,
            name: row.product_name,
            version: row.version,
            license_types: []
          };
        }

        if (row.license_type_id) {
          let features = [];
          try {
            features = row.features ? JSON.parse(row.features) : [];
          } catch (e) {
            features = [];
          }

          groupedData[row.product_id].license_types.push({
            id: row.license_type_id,
            name: row.license_type_name,
            features: features,
            price: row.price
          });
        }
      });

      const productsWithTypes = Object.values(groupedData);

      res.render('features/index', {
        user: req.session,
        moment,
        products: productsWithTypes
      });
    } catch (error) {
      console.error('Error loading features:', error);
      res.status(500).send('Error loading features page');
    }
  }

  /**
   * Update features for a license type
   * PUT /features/license-types/:id
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

      // Update only the features field
      await db.run(
        `UPDATE license_types
         SET features = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [features, id]
      );

      // Log activity
      await ActivityLogger.log({
        userId: req.session.userId,
        action: 'update_features',
        entityType: 'license_type',
        entityId: id,
        description: `Updated features for license type: ${licenseType.name}`,
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
