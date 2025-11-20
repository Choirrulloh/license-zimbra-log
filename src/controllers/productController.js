const db = require('../database/db');
const moment = require('moment');
const ActivityLogger = require('../utils/activityLogger');

class ProductController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.edit = this.edit.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.createLicenseType = this.createLicenseType.bind(this);
    this.updateLicenseType = this.updateLicenseType.bind(this);
    this.deleteLicenseType = this.deleteLicenseType.bind(this);
  }

  async index(req, res) {
    try {
      const products = await db.all(
        `SELECT p.*,
                COUNT(DISTINCT l.id) as total_licenses,
                COUNT(DISTINCT lt.id) as total_license_types
         FROM products p
         LEFT JOIN licenses l ON p.id = l.product_id
         LEFT JOIN license_types lt ON p.id = lt.product_id
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      );

      res.render('products/index', {
        user: req.session,
        products,
        moment
      });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Error loading products');
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;

      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);

      if (!product) {
        return res.status(404).send('Product not found');
      }

      const licenseTypes = await db.all(
        'SELECT * FROM license_types WHERE product_id = ? ORDER BY created_at DESC',
        [id]
      );

      // Fetch features for each license type from pivot table
      for (const lt of licenseTypes) {
        const ltFeatures = await db.all(
          `SELECT f.id, f.name, f.feature_key
           FROM features f
           INNER JOIN license_type_features ltf ON f.id = ltf.feature_id
           WHERE ltf.license_type_id = ?
           ORDER BY f.name`,
          [lt.id]
        );
        lt.assignedFeatures = ltFeatures;
      }

      const licenses = await db.all(
        `SELECT l.*, c.name as customer_name, c.email as customer_email,
                lt.name as license_type_name
         FROM licenses l
         JOIN customers c ON l.customer_id = c.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.product_id = ?
         ORDER BY l.created_at DESC`,
        [id]
      );

      // Fetch available features for this product
      const features = await db.all(
        'SELECT * FROM features WHERE product_id = ? ORDER BY name',
        [id]
      );

      res.render('products/show', {
        user: req.session,
        product,
        licenseTypes,
        licenses,
        features,
        moment
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).send('Error loading product');
    }
  }

  async create(req, res) {
    if (req.method === 'GET') {
      return res.render('products/create', {
        user: req.session,
        error: null
      });
    }

    try {
      const { name, description, version } = req.body;

      if (!name) {
        return res.render('products/create', {
          user: req.session,
          error: 'Product name is required'
        });
      }

      const result = await db.run(
        'INSERT INTO products (name, description, version) VALUES (?, ?, ?)',
        [name, description || null, version || '1.0.0']
      );

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'product',
        result.id,
        name,
        req
      );

      res.redirect('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      res.render('products/create', {
        user: req.session,
        error: 'Error creating product'
      });
    }
  }

  async edit(req, res) {
    try {
      const { id } = req.params;

      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);

      if (!product) {
        return res.status(404).send('Product not found');
      }

      res.render('products/edit', {
        user: req.session,
        product,
        error: null
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).send('Error loading product');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, version, is_active } = req.body;

      if (!name) {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
        return res.render('products/edit', {
          user: req.session,
          product,
          error: 'Product name is required'
        });
      }

      await db.run(
        'UPDATE products SET name = ?, description = ?, version = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, version, is_active === 'on' ? 1 : 0, id]
      );

      // Log activity
      await ActivityLogger.logUpdate(
        req.session.userId,
        'product',
        id,
        name,
        { name, description, version, is_active },
        req
      );

      res.redirect('/products');
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('Error updating product');
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Get product before deleting
      const product = await db.get('SELECT name FROM products WHERE id = ?', [id]);

      // Check if product exists
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Check if product has licenses
      const licensesCount = await db.get(
        'SELECT COUNT(*) as count FROM licenses WHERE product_id = ?',
        [id]
      );

      if (licensesCount.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete product with existing licenses'
        });
      }

      await db.run('DELETE FROM products WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.logDelete(
        req.session.userId,
        'product',
        id,
        product.name,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting product'
      });
    }
  }

  // License Types Management
  async createLicenseType(req, res) {
    try {
      const { product_id, name, duration_days, max_activations, price, features, feature_ids } = req.body;

      if (!name || !duration_days) {
        return res.status(400).json({
          success: false,
          message: 'Name and duration are required'
        });
      }

      const result = await db.run(
        `INSERT INTO license_types (product_id, name, duration_days, max_activations, price, features)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product_id, name, duration_days, max_activations || 1, price || 0, features || null]
      );

      // Insert feature assignments to pivot table (if feature_ids provided)
      if (feature_ids && feature_ids.length > 0) {
        const featureIdsArray = Array.isArray(feature_ids) ? feature_ids : [];
        for (const featureId of featureIdsArray) {
          await db.run(
            'INSERT INTO license_type_features (license_type_id, feature_id) VALUES (?, ?)',
            [result.id, featureId]
          );
        }
      }

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'license_type',
        result.id,
        name,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error creating license type:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating license type'
      });
    }
  }

  async updateLicenseType(req, res) {
    try {
      const { id } = req.params;
      const { name, duration_days, max_activations, price, features, is_active, feature_ids } = req.body;

      // Update license type basic info
      await db.run(
        `UPDATE license_types
         SET name = ?, duration_days = ?, max_activations = ?, price = ?, features = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, duration_days, max_activations, price, features, is_active ? 1 : 0, id]
      );

      // Parse feature_ids (comes as array or JSON string)
      let featureIdsArray = [];

      // Update feature assignments in pivot table (if feature_ids provided)
      if (feature_ids !== undefined) {
        if (typeof feature_ids === 'string') {
          try {
            featureIdsArray = JSON.parse(feature_ids);
          } catch (e) {
            featureIdsArray = [];
          }
        } else if (Array.isArray(feature_ids)) {
          featureIdsArray = feature_ids;
        }

        // Remove all existing feature assignments
        await db.run('DELETE FROM license_type_features WHERE license_type_id = ?', [id]);

        // Add new feature assignments
        if (featureIdsArray.length > 0) {
          for (const featureId of featureIdsArray) {
            await db.run(
              'INSERT INTO license_type_features (license_type_id, feature_id) VALUES (?, ?)',
              [id, featureId]
            );
          }
        }
      }

      // Log activity
      await ActivityLogger.logUpdate(
        req.session.userId,
        'license_type',
        id,
        name,
        { name, duration_days, max_activations, price, features: featureIdsArray?.length || 0 },
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating license type:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating license type'
      });
    }
  }

  async deleteLicenseType(req, res) {
    try {
      const { id } = req.params;

      // Get license type name before deleting
      const licenseType = await db.get('SELECT name FROM license_types WHERE id = ?', [id]);

      await db.run('DELETE FROM license_types WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.logDelete(
        req.session.userId,
        'license_type',
        id,
        licenseType.name,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting license type:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting license type'
      });
    }
  }
}

module.exports = new ProductController();
