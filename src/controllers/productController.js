const db = require('../database/db');
const moment = require('moment');

class ProductController {
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

      res.render('products/show', {
        user: req.session,
        product,
        licenseTypes,
        licenses,
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

      await db.run(
        'INSERT INTO products (name, description, version) VALUES (?, ?, ?)',
        [name, description || null, version || '1.0.0']
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

      res.redirect('/products');
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).send('Error updating product');
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

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
      const { product_id, name, type, duration_days, max_activations, price, features } = req.body;

      if (!name || !type || !duration_days) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and duration are required'
        });
      }

      await db.run(
        `INSERT INTO license_types (product_id, name, type, duration_days, max_activations, price, features)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product_id, name, type, duration_days, max_activations || 1, price || 0, features || null]
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
      const { name, type, duration_days, max_activations, price, features, is_active } = req.body;

      await db.run(
        `UPDATE license_types
         SET name = ?, type = ?, duration_days = ?, max_activations = ?, price = ?, features = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, type, duration_days, max_activations, price, features, is_active ? 1 : 0, id]
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

      await db.run('DELETE FROM license_types WHERE id = ?', [id]);

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
