const db = require('../database/db');
const moment = require('moment-timezone');

class FeaturesController {
  constructor() {
    this.index = this.index.bind(this);
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
}

module.exports = new FeaturesController();
