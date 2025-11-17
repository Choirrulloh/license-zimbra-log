const db = require('../database/db');
const moment = require('moment');

class DashboardController {
  constructor() {
    this.index = this.index.bind(this);
    this.getStatistics = this.getStatistics.bind(this);
    this.getRecentLicenses = this.getRecentLicenses.bind(this);
    this.getExpiringLicenses = this.getExpiringLicenses.bind(this);
    this.getRevenueData = this.getRevenueData.bind(this);
  }

  async index(req, res) {
    try {
      // Get statistics
      const stats = await this.getStatistics();
      const recentLicenses = await this.getRecentLicenses();
      const expiringLicenses = await this.getExpiringLicenses();
      const revenueData = await this.getRevenueData();

      res.render('dashboard/index', {
        user: req.session,
        stats,
        recentLicenses,
        expiringLicenses,
        revenueData,
        moment
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).send('Error loading dashboard');
    }
  }

  async getStatistics() {
    const totalLicenses = await db.get('SELECT COUNT(*) as count FROM licenses');
    const activeLicenses = await db.get(
      `SELECT COUNT(*) as count FROM licenses
       WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > datetime('now'))`
    );
    const expiredLicenses = await db.get(
      `SELECT COUNT(*) as count FROM licenses
       WHERE expiry_date IS NOT NULL AND expiry_date <= datetime('now')`
    );
    const totalCustomers = await db.get('SELECT COUNT(*) as count FROM customers WHERE is_active = 1');
    const totalProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1');

    const totalRevenue = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE status = 'completed'`
    );

    const monthlyRevenue = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE status = 'completed'
       AND strftime('%Y-%m', transaction_date) = strftime('%Y-%m', 'now')`
    );

    return {
      totalLicenses: totalLicenses.count,
      activeLicenses: activeLicenses.count,
      expiredLicenses: expiredLicenses.count,
      totalCustomers: totalCustomers.count,
      totalProducts: totalProducts.count,
      totalRevenue: totalRevenue.total,
      monthlyRevenue: monthlyRevenue.total
    };
  }

  async getRecentLicenses() {
    return await db.all(
      `SELECT l.*, p.name as product_name, c.name as customer_name, c.email as customer_email,
              lt.name as license_type_name
       FROM licenses l
       JOIN products p ON l.product_id = p.id
       JOIN customers c ON l.customer_id = c.id
       JOIN license_types lt ON l.license_type_id = lt.id
       ORDER BY l.created_at DESC
       LIMIT 10`
    );
  }

  async getExpiringLicenses() {
    return await db.all(
      `SELECT l.*, p.name as product_name, c.name as customer_name, c.email as customer_email
       FROM licenses l
       JOIN products p ON l.product_id = p.id
       JOIN customers c ON l.customer_id = c.id
       WHERE l.status = 'active'
       AND l.expiry_date IS NOT NULL
       AND l.expiry_date > datetime('now')
       AND l.expiry_date <= datetime('now', '+30 days')
       ORDER BY l.expiry_date ASC
       LIMIT 10`
    );
  }

  async getRevenueData() {
    const monthlyData = await db.all(
      `SELECT strftime('%Y-%m', transaction_date) as month,
              COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE status = 'completed'
       AND transaction_date >= date('now', '-12 months')
       GROUP BY month
       ORDER BY month ASC`
    );

    return {
      labels: monthlyData.map(d => d.month),
      data: monthlyData.map(d => d.total)
    };
  }
}

module.exports = new DashboardController();
