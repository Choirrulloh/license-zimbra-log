const db = require('../database/db');
const moment = require('moment');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class ReportController {
  async index(req, res) {
    try {
      res.render('reports/index', {
        user: req.session
      });
    } catch (error) {
      console.error('Error loading reports page:', error);
      res.status(500).send('Error loading reports');
    }
  }

  async exportLicensesCSV(req, res) {
    try {
      const licenses = await db.all(
        `SELECT l.license_key, l.status, l.issue_date, l.expiry_date,
                l.max_activations, l.current_activations,
                p.name as product, c.name as customer, c.email as customer_email,
                lt.name as license_type
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN customers c ON l.customer_id = c.id
         JOIN license_types lt ON l.license_type_id = lt.id
         ORDER BY l.created_at DESC`
      );

      const fields = [
        { label: 'License Key', value: 'license_key' },
        { label: 'Product', value: 'product' },
        { label: 'Type', value: 'license_type' },
        { label: 'Customer', value: 'customer' },
        { label: 'Email', value: 'customer_email' },
        { label: 'Status', value: 'status' },
        { label: 'Issue Date', value: 'issue_date' },
        { label: 'Expiry Date', value: 'expiry_date' },
        { label: 'Max Activations', value: 'max_activations' },
        { label: 'Current Activations', value: 'current_activations' }
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(licenses);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=licenses-${moment().format('YYYY-MM-DD')}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).send('Error exporting data');
    }
  }

  async exportCustomersCSV(req, res) {
    try {
      const customers = await db.all(
        `SELECT c.name, c.email, c.company, c.phone, c.address,
                COUNT(DISTINCT l.id) as total_licenses,
                COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_licenses,
                COALESCE(SUM(t.amount), 0) as total_revenue,
                c.created_at
         FROM customers c
         LEFT JOIN licenses l ON c.id = l.customer_id
         LEFT JOIN transactions t ON c.id = t.customer_id AND t.status = 'completed'
         GROUP BY c.id
         ORDER BY c.created_at DESC`
      );

      const fields = [
        { label: 'Name', value: 'name' },
        { label: 'Email', value: 'email' },
        { label: 'Company', value: 'company' },
        { label: 'Phone', value: 'phone' },
        { label: 'Total Licenses', value: 'total_licenses' },
        { label: 'Active Licenses', value: 'active_licenses' },
        { label: 'Total Revenue', value: 'total_revenue' },
        { label: 'Created At', value: 'created_at' }
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(customers);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers-${moment().format('YYYY-MM-DD')}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).send('Error exporting data');
    }
  }

  async exportRevenueCSV(req, res) {
    try {
      const transactions = await db.all(
        `SELECT t.*, l.license_key, c.name as customer, p.name as product
         FROM transactions t
         JOIN licenses l ON t.license_id = l.id
         JOIN customers c ON t.customer_id = c.id
         JOIN products p ON l.product_id = p.id
         WHERE t.status = 'completed'
         ORDER BY t.transaction_date DESC`
      );

      const fields = [
        { label: 'Date', value: 'transaction_date' },
        { label: 'Customer', value: 'customer' },
        { label: 'Product', value: 'product' },
        { label: 'License Key', value: 'license_key' },
        { label: 'Amount', value: 'amount' },
        { label: 'Currency', value: 'currency' },
        { label: 'Payment Method', value: 'payment_method' },
        { label: 'Status', value: 'status' }
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(transactions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=revenue-${moment().format('YYYY-MM-DD')}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).send('Error exporting data');
    }
  }

  async generateLicenseReport(req, res) {
    try {
      const { id } = req.params;

      const license = await db.get(
        `SELECT l.*, p.name as product_name, p.version as product_version,
                c.name as customer_name, c.email as customer_email, c.company,
                lt.name as license_type_name, lt.features
         FROM licenses l
         JOIN products p ON l.product_id = p.id
         JOIN customers c ON l.customer_id = c.id
         JOIN license_types lt ON l.license_type_id = lt.id
         WHERE l.id = ?`,
        [id]
      );

      if (!license) {
        return res.status(404).send('License not found');
      }

      const activations = await db.all(
        'SELECT * FROM license_activations WHERE license_id = ? ORDER BY activated_at DESC',
        [id]
      );

      // Create PDF
      const doc = new PDFDocument();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=license-${license.license_key}.pdf`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text('License Report', { align: 'center' });
      doc.moveDown();

      // License Details
      doc.fontSize(14).text('License Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`License Key: ${license.license_key}`);
      doc.text(`Product: ${license.product_name} v${license.product_version}`);
      doc.text(`Type: ${license.license_type_name}`);
      doc.text(`Status: ${license.status.toUpperCase()}`);
      doc.text(`Issue Date: ${moment(license.issue_date).format('YYYY-MM-DD HH:mm:ss')}`);
      doc.text(`Expiry Date: ${license.expiry_date ? moment(license.expiry_date).format('YYYY-MM-DD HH:mm:ss') : 'Never'}`);
      doc.moveDown();

      // Customer Details
      doc.fontSize(14).text('Customer Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Name: ${license.customer_name}`);
      doc.text(`Email: ${license.customer_email}`);
      if (license.company) doc.text(`Company: ${license.company}`);
      doc.moveDown();

      // Activations
      doc.fontSize(14).text(`Activations (${activations.length}/${license.max_activations})`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      if (activations.length > 0) {
        activations.forEach((act, index) => {
          doc.text(`${index + 1}. Hardware ID: ${act.hardware_id.substring(0, 16)}...`);
          doc.text(`   Activated: ${moment(act.activated_at).format('YYYY-MM-DD HH:mm:ss')}`);
          doc.text(`   Last Check: ${moment(act.last_check).format('YYYY-MM-DD HH:mm:ss')}`);
          doc.text(`   Status: ${act.is_active ? 'Active' : 'Inactive'}`);
          if (act.hostname) doc.text(`   Hostname: ${act.hostname}`);
          if (act.ip_address) doc.text(`   IP: ${act.ip_address}`);
          doc.moveDown(0.5);
        });
      } else {
        doc.text('No activations yet');
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).text(`Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).send('Error generating report');
    }
  }
}

module.exports = new ReportController();
