const db = require('../database/db');
const moment = require('moment-timezone');
const ActivityLogger = require('../utils/activityLogger');

class EmailTemplateController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.edit = this.edit.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.preview = this.preview.bind(this);
    this.logs = this.logs.bind(this);
  }

  // List all email templates
  async index(req, res) {
    try {
      const templates = await db.all(
        `SELECT id, name, type, language, design_variation, subject, is_active, created_at, updated_at
         FROM email_templates
         ORDER BY type, name, language, design_variation`
      );

      console.log('=== EMAIL TEMPLATES DEBUG ===');
      console.log('Templates fetched:', templates.length);
      console.log('Is array:', Array.isArray(templates));
      console.log('First template:', templates.length > 0 ? templates[0].name : 'NONE');
      console.log('============================');

      res.render('settings/email-templates/index', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Email Templates',
        templates,
        moment
      });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).send('Error loading email templates');
    }
  }

  // Show email template details
  async show(req, res) {
    try {
      const { id } = req.params;

      const template = await db.get(
        'SELECT * FROM email_templates WHERE id = ?',
        [id]
      );

      if (!template) {
        return res.status(404).send('Email template not found');
      }

      res.render('settings/email-templates/show', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Email Template Details',
        template,
        moment
      });
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).send('Error loading email template');
    }
  }

  // Create email template form / submit
  async create(req, res) {
    if (req.method === 'GET') {
      return res.render('settings/email-templates/create', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Create Email Template',
        error: null
      });
    }

    try {
      const { name, type, language, design_variation, subject, body_html, body_text, variables } = req.body;

      // Validation
      if (!name || !type || !language || !design_variation || !subject || !body_html) {
        return res.render('settings/email-templates/create', {
          user: req.session,
          currentPage: 'settings',
          pageTitle: 'Create Email Template',
          error: 'Name, type, language, design variation, subject, and HTML body are required'
        });
      }

      // Check if template already exists
      const existing = await db.get(
        'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ?',
        [name, language, design_variation]
      );

      if (existing) {
        return res.render('settings/email-templates/create', {
          user: req.session,
          currentPage: 'settings',
          pageTitle: 'Create Email Template',
          error: 'Template with this name, language, and design variation already exists'
        });
      }

      // Insert template
      const result = await db.run(
        `INSERT INTO email_templates (name, type, language, design_variation, subject, body_html, body_text, variables, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [name, type, language, parseInt(design_variation), subject, body_html, body_text || '', variables || '']
      );

      // Log activity
      await ActivityLogger.logCreate(
        req.session.userId,
        'email_template',
        result.id,
        `${name} (${language}, v${design_variation})`,
        req
      );

      res.redirect('/settings/email-templates');
    } catch (error) {
      console.error('Error creating email template:', error);
      res.render('settings/email-templates/create', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Create Email Template',
        error: 'Error creating email template'
      });
    }
  }

  // Edit email template form
  async edit(req, res) {
    try {
      const { id } = req.params;

      const template = await db.get(
        'SELECT * FROM email_templates WHERE id = ?',
        [id]
      );

      if (!template) {
        return res.status(404).send('Email template not found');
      }

      res.render('settings/email-templates/edit', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Edit Email Template',
        template,
        error: null
      });
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).send('Error loading email template');
    }
  }

  // Update email template
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, type, language, design_variation, subject, body_html, body_text, variables, is_active } = req.body;

      if (!name || !type || !language || !design_variation || !subject || !body_html) {
        const template = await db.get('SELECT * FROM email_templates WHERE id = ?', [id]);
        return res.render('settings/email-templates/edit', {
          user: req.session,
          currentPage: 'settings',
          pageTitle: 'Edit Email Template',
          template,
          error: 'Name, type, language, design variation, subject, and HTML body are required'
        });
      }

      // Get old template for logging
      const oldTemplate = await db.get('SELECT * FROM email_templates WHERE id = ?', [id]);

      if (!oldTemplate) {
        return res.status(404).send('Email template not found');
      }

      // Check if name+language+design combination is taken by another template
      const existing = await db.get(
        'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ? AND id != ?',
        [name, language, design_variation, id]
      );

      if (existing) {
        const template = await db.get('SELECT * FROM email_templates WHERE id = ?', [id]);
        return res.render('settings/email-templates/edit', {
          user: req.session,
          currentPage: 'settings',
          pageTitle: 'Edit Email Template',
          template,
          error: 'Another template with this name, language, and design variation already exists'
        });
      }

      // Update template
      await db.run(
        `UPDATE email_templates
         SET name = ?, type = ?, language = ?, design_variation = ?, subject = ?,
             body_html = ?, body_text = ?, variables = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, type, language, parseInt(design_variation), subject, body_html, body_text || '', variables || '', is_active === 'on' ? 1 : 0, id]
      );

      // Log activity
      const changes = {};
      if (oldTemplate.subject !== subject) changes.subject = { from: oldTemplate.subject, to: subject };
      if (oldTemplate.language !== language) changes.language = { from: oldTemplate.language, to: language };

      await ActivityLogger.logUpdate(
        req.session.userId,
        'email_template',
        id,
        `${name} (${language}, v${design_variation})`,
        changes,
        req
      );

      res.redirect('/settings/email-templates');
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).send('Error updating email template');
    }
  }

  // Delete email template
  async delete(req, res) {
    try {
      const { id } = req.params;

      const template = await db.get('SELECT * FROM email_templates WHERE id = ?', [id]);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found'
        });
      }

      // Delete template
      await db.run('DELETE FROM email_templates WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.logDelete(
        req.session.userId,
        'email_template',
        id,
        `${template.name} (${template.language}, v${template.design_variation})`,
        req
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email template:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting email template'
      });
    }
  }

  // Preview email template with sample data
  async preview(req, res) {
    try {
      const { id } = req.params;
      const sampleData = req.body;

      const template = await db.get(
        'SELECT * FROM email_templates WHERE id = ?',
        [id]
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found'
        });
      }

      // Replace variables in subject and body
      let subject = template.subject;
      let bodyHtml = template.body_html;

      // Default sample data if not provided
      const defaultData = {
        'user.name': 'John Doe',
        'user.email': 'john.doe@example.com',
        'license.key': 'XXXX-XXXX-XXXX-XXXX',
        'license.product': 'Premium Plan',
        'license.expiry': '2024-12-31',
        'company.name': 'License Manager',
        'company.url': 'https://license-manager.com'
      };

      const data = { ...defaultData, ...sampleData };

      // Replace all variables
      Object.keys(data).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(regex, data[key]);
        bodyHtml = bodyHtml.replace(regex, data[key]);
      });

      res.json({
        success: true,
        subject,
        body_html: bodyHtml
      });
    } catch (error) {
      console.error('Error previewing email template:', error);
      res.status(500).json({
        success: false,
        message: 'Error previewing email template'
      });
    }
  }

  // View email logs
  async logs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      const logs = await db.all(
        `SELECT el.*, et.name as template_name, et.type as template_type
         FROM email_logs el
         LEFT JOIN email_templates et ON el.template_id = et.id
         ORDER BY el.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const totalResult = await db.get('SELECT COUNT(*) as count FROM email_logs');
      const total = totalResult.count;
      const totalPages = Math.ceil(total / limit);

      res.render('settings/email-templates/logs', {
        user: req.session,
        currentPage: 'settings',
        pageTitle: 'Email Logs',
        logs,
        currentPage: page,
        totalPages,
        moment
      });
    } catch (error) {
      console.error('Error fetching email logs:', error);
      res.status(500).send('Error loading email logs');
    }
  }
}

module.exports = new EmailTemplateController();
