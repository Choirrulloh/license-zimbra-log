const db = require('../database/db');
const moment = require('moment');
const path = require('path');
const fs = require('fs').promises;
const obfuscatorService = require('../services/obfuscatorService');
const bashObfuscatorService = require('../services/bashObfuscatorService');
const ActivityLogger = require('../utils/activityLogger');

class CodeProtectionController {
  constructor() {
    this.index = this.index.bind(this);
    this.history = this.history.bind(this);
    this.upload = this.upload.bind(this);
    this.obfuscate = this.obfuscate.bind(this);
    this.download = this.download.bind(this);
    this.getQuota = this.getQuota.bind(this);
  }

  /**
   * Show code protection page
   */
  async index(req, res) {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole || 'user';
      const isAdmin = userRole === 'admin';

      // Get user's quota
      let quota = await db.get(
        'SELECT * FROM obfuscation_quotas WHERE user_id = ?',
        [userId]
      );

      // Create quota if doesn't exist
      if (!quota) {
        // Admin gets unlimited quota (monthly_limit = -1 means unlimited)
        const monthlyLimit = isAdmin ? -1 : 10;
        await db.run(
          `INSERT INTO obfuscation_quotas (user_id, monthly_limit, used_this_month, max_file_size_mb, reset_date)
           VALUES (?, ?, 0, 50, date('now', 'start of month', '+1 month'))`,
          [userId, monthlyLimit]
        );
        quota = await db.get(
          'SELECT * FROM obfuscation_quotas WHERE user_id = ?',
          [userId]
        );
      }

      // Check if quota needs reset
      const now = new Date();
      const resetDate = new Date(quota.reset_date);
      if (now >= resetDate) {
        await db.run(
          `UPDATE obfuscation_quotas
           SET used_this_month = 0,
               reset_date = date('now', 'start of month', '+1 month'),
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );
        quota.used_this_month = 0;
        quota.reset_date = moment().add(1, 'month').startOf('month').format('YYYY-MM-DD');
      }

      // Admin has unlimited quota
      if (isAdmin && quota.monthly_limit !== -1) {
        await db.run(
          `UPDATE obfuscation_quotas SET monthly_limit = -1 WHERE user_id = ?`,
          [userId]
        );
        quota.monthly_limit = -1;
      }

      // Get recent obfuscations
      const recentObfuscations = await db.all(
        `SELECT * FROM code_obfuscations
         WHERE user_id = ? AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT 3`,
        [userId]
      );

      // Get products for bash license injection
      const products = await db.all('SELECT id, name FROM products ORDER BY name');

      // Get settings for API URL
      const settings = await db.all('SELECT key, value FROM settings');
      const settingsObj = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});

      res.render('code-protection/index', {
        user: req.session,
        currentPage: 'code-protection',
        quota,
        recentObfuscations,
        products,
        apiUrl: settingsObj.app_url ? `${settingsObj.app_url}/api/validate` : 'http://localhost:3000/api/validate',
        moment
      });
    } catch (error) {
      console.error('Error loading code protection page:', error);
      res.status(500).send('Error loading page');
    }
  }

  /**
   * Show obfuscation history
   */
  async history(req, res) {
    try {
      const userId = req.session.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await db.get(
        'SELECT COUNT(*) as total FROM code_obfuscations WHERE user_id = ?',
        [userId]
      );
      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Get obfuscations
      const obfuscations = await db.all(
        `SELECT * FROM code_obfuscations
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      res.render('code-protection/history', {
        user: req.session,
        currentPage: 'code-protection',
        obfuscations,
        pagination: {
          page,
          totalPages,
          total
        },
        moment
      });
    } catch (error) {
      console.error('Error loading history:', error);
      res.status(500).send('Error loading history');
    }
  }

  /**
   * Upload and validate file
   */
  async upload(req, res) {
    try {
      console.log('Upload request received from user:', req.session.userId);

      if (!req.file) {
        console.log('No file in request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;
      const userId = req.session.userId;

      console.log('File uploaded:', file.originalname, 'Size:', file.size, 'bytes');

      // Validate file extension
      const allowedExtensions = ['.js', '.zip', '.sh'];
      const fileExt = path.extname(file.originalname).toLowerCase();

      if (!allowedExtensions.includes(fileExt)) {
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only .js, .sh, and .zip files are allowed'
        });
      }

      // Check quota (skip for admin)
      const userRole = req.session.userRole || 'user';
      const isAdmin = userRole === 'admin';

      const quota = await db.get(
        'SELECT * FROM obfuscation_quotas WHERE user_id = ?',
        [userId]
      );

      // Check quota limit (skip if admin or unlimited quota)
      if (!isAdmin && quota && quota.monthly_limit !== -1 && quota.used_this_month >= quota.monthly_limit) {
        await fs.unlink(file.path);
        return res.status(403).json({
          success: false,
          message: 'Quota limit reached. Resets on ' + moment(quota.reset_date).format('MMMM D, YYYY')
        });
      }

      // Check file size
      const maxSizeMB = quota ? quota.max_file_size_mb : 50;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (file.size > maxSizeBytes) {
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${maxSizeMB}MB`
        });
      }

      // Validate JavaScript syntax if .js file
      if (fileExt === '.js') {
        const validation = await obfuscatorService.validateJavaScript(file.path);
        if (!validation.valid) {
          await fs.unlink(file.path);
          return res.status(400).json({
            success: false,
            message: `Invalid JavaScript syntax: ${validation.error}`,
            line: validation.line
          });
        }
      }

      // Calculate hash
      const fileHash = await obfuscatorService.calculateFileHash(file.path);

      // Detect shell scripts in ZIP for multi-script support
      let shellScripts = [];
      if (fileExt === '.zip') {
        try {
          shellScripts = await this.detectShellScriptsInZip(file.path);
        } catch (error) {
          console.warn('Error detecting shell scripts in ZIP:', error.message);
        }
      }

      res.json({
        success: true,
        file: {
          id: file.filename,
          originalName: file.originalname,
          size: file.size,
          hash: fileHash,
          path: file.path,
          shellScripts: shellScripts // List of .sh files found in ZIP
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({
        success: false,
        message: 'Upload failed: ' + error.message
      });
    }
  }

  /**
   * Obfuscate uploaded file
   */
  async obfuscate(req, res) {
    try {
      const { fileId, level, options, bashInjection } = req.body;
      const userId = req.session.userId;

      console.log('Obfuscate request:', {
        userId,
        fileId,
        level,
        hasBashInjection: !!bashInjection
      });

      if (!fileId || !level) {
        console.log('Missing parameters - fileId:', fileId, 'level:', level);
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      // Check quota again (skip for admin)
      const userRole = req.session.userRole || 'user';
      const isAdmin = userRole === 'admin';
      console.log('User role:', userRole, 'isAdmin:', isAdmin);

      const quota = await db.get(
        'SELECT * FROM obfuscation_quotas WHERE user_id = ?',
        [userId]
      );
      console.log('User quota:', quota);

      // Check quota limit (skip if admin or unlimited quota)
      if (!isAdmin && quota && quota.monthly_limit !== -1 && quota.used_this_month >= quota.monthly_limit) {
        console.log('Quota limit reached for user:', userId);
        return res.status(403).json({
          success: false,
          message: 'Quota limit reached'
        });
      }

      // Find uploaded file
      const uploadPath = path.join(__dirname, '../../uploads/temp', fileId);
      console.log('Looking for file at:', uploadPath);

      try {
        await fs.access(uploadPath);
        console.log('File found:', uploadPath);
      } catch (error) {
        console.log('File not found:', uploadPath, 'Error:', error.message);
        return res.status(404).json({
          success: false,
          message: 'Uploaded file not found'
        });
      }

      const originalFilename = req.body.originalName || fileId;
      const fileExt = path.extname(originalFilename).toLowerCase();
      const fileStats = await fs.stat(uploadPath);
      console.log('File stats:', { originalFilename, fileExt, size: fileStats.size });

      // Create obfuscation record
      console.log('Creating obfuscation record...');
      const result = await db.run(
        `INSERT INTO code_obfuscations
         (user_id, original_filename, file_size, obfuscation_level, options, status)
         VALUES (?, ?, ?, ?, ?, 'processing')`,
        [userId, originalFilename, fileStats.size, level, JSON.stringify(options || {})]
      );

      const obfuscationId = result.id;
      console.log('Obfuscation record created with ID:', obfuscationId);

      try {
        // Generate output filename
        const timestamp = Date.now();
        const outputFilename = `obfuscated_${userId}_${timestamp}${fileExt}`;
        const outputPath = path.join(__dirname, '../../uploads/obfuscated', outputFilename);

        // Ensure output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Parse custom options
        const customOptions = {};
        if (options) {
          if (options.compact) customOptions.compact = true;
          if (options.renameVariables) customOptions.renameGlobals = true;
          if (options.stringEncoding) customOptions.stringArray = true;
          if (options.controlFlow) customOptions.controlFlowFlattening = true;
          if (options.deadCode) customOptions.deadCodeInjection = true;
          if (options.disableConsole) customOptions.disableConsoleOutput = true;
        }

        // Obfuscate
        let obfResult;
        const startTime = Date.now();
        let licenseInjected = false;
        let injectedProductId = null;

        if (fileExt === '.js') {
          obfResult = await obfuscatorService.obfuscateFile(
            uploadPath,
            outputPath,
            level,
            customOptions
          );
        } else if (fileExt === '.zip') {
          // Detect if ZIP contains .sh files for bash multi-script support
          let zipShellScripts = [];
          try {
            zipShellScripts = await this.detectShellScriptsInZip(uploadPath);
          } catch (error) {
            console.warn('Error detecting shell scripts:', error.message);
          }

          // If ZIP contains .sh files, use bash obfuscator
          if (zipShellScripts.length > 0) {
            // Prepare license config for bash ZIP
            let licenseConfig = null;
            const mainScript = bashInjection?.mainScript || null;

            if (bashInjection && bashInjection.injectLicense && bashInjection.productId && mainScript) {
              const product = await db.get('SELECT * FROM products WHERE id = ?', [bashInjection.productId]);

              if (!product) {
                throw new Error('Selected product not found');
              }

              const settings = await db.all('SELECT key, value FROM settings');
              const settingsObj = settings.reduce((acc, s) => {
                acc[s.key] = s.value;
                return acc;
              }, {});

              const apiUrl = settingsObj.app_url
                ? `${settingsObj.app_url}/api/validate`
                : 'http://localhost:3000/api/validate';

              licenseConfig = {
                productId: product.id,
                productName: product.name,
                apiUrl: apiUrl,
                welcomeMessage: bashInjection.welcomeMessage || `License Protected Script - ${product.name}`,
                supportContact: bashInjection.supportContact || settingsObj.email_from_address || 'support@example.com',
                checkExpiry: bashInjection.checkExpiry !== false,
                checkActivation: bashInjection.checkActivation !== false,
                checkMachine: bashInjection.checkMachine === true,
                showInfo: bashInjection.showInfo !== false
              };

              licenseInjected = true;
              injectedProductId = product.id;
            }

            // Obfuscate bash ZIP with main script selection
            obfResult = await bashObfuscatorService.obfuscateZip(
              uploadPath,
              outputPath,
              level,
              customOptions,
              mainScript,
              licenseConfig
            );
          } else {
            // Regular JavaScript ZIP
            obfResult = await obfuscatorService.obfuscateZip(
              uploadPath,
              outputPath,
              level,
              customOptions
            );
          }
        } else if (fileExt === '.sh') {
          // Handle bash script
          console.log('Processing bash script with bashInjection:', bashInjection);
          let licenseConfig = null;

          // Check if license injection is enabled
          if (bashInjection && bashInjection.injectLicense && bashInjection.productId) {
            console.log('License injection enabled for product:', bashInjection.productId);
            // Get product info
            const product = await db.get('SELECT * FROM products WHERE id = ?', [bashInjection.productId]);

            if (!product) {
              throw new Error('Selected product not found');
            }

            // Get settings for API URL
            const settings = await db.all('SELECT key, value FROM settings');
            const settingsObj = settings.reduce((acc, s) => {
              acc[s.key] = s.value;
              return acc;
            }, {});

            const apiUrl = settingsObj.app_url
              ? `${settingsObj.app_url}/api/validate`
              : 'http://localhost:3000/api/validate';

            // Prepare license config
            licenseConfig = {
              productId: product.id,
              productName: product.name,
              apiUrl: apiUrl,
              welcomeMessage: bashInjection.welcomeMessage || `License Protected Script - ${product.name}`,
              supportContact: bashInjection.supportContact || settingsObj.email_from_address || 'support@example.com',
              checkExpiry: bashInjection.checkExpiry !== false,
              checkActivation: bashInjection.checkActivation !== false,
              checkMachine: bashInjection.checkMachine === true,
              showInfo: bashInjection.showInfo !== false
            };

            licenseInjected = true;
            injectedProductId = product.id;
          }

          // Obfuscate bash script with optional license injection
          console.log('Calling bashObfuscatorService.obfuscateBashFile...');
          obfResult = await bashObfuscatorService.obfuscateBashFile(
            uploadPath,
            outputPath,
            level,
            licenseConfig
          );
          console.log('Bash obfuscation completed:', obfResult);
        } else {
          throw new Error(`Unsupported file type: ${fileExt}`);
        }

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

        // Calculate expiry date (7 days from now)
        const expiresAt = moment().add(7, 'days').format('YYYY-MM-DD HH:mm:ss');

        // Update record
        await db.run(
          `UPDATE code_obfuscations
           SET obfuscated_filename = ?,
               obfuscated_size = ?,
               output_path = ?,
               status = 'completed',
               completed_at = CURRENT_TIMESTAMP,
               expires_at = ?,
               license_injected = ?,
               injected_product_id = ?,
               validation_options = ?
           WHERE id = ?`,
          [
            outputFilename,
            obfResult.obfuscatedSize,
            outputPath,
            expiresAt,
            licenseInjected ? 1 : 0,
            injectedProductId,
            licenseInjected ? JSON.stringify(bashInjection || {}) : null,
            obfuscationId
          ]
        );

        // Update quota
        await db.run(
          `UPDATE obfuscation_quotas
           SET used_this_month = used_this_month + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ?`,
          [userId]
        );

        // Log activity
        await ActivityLogger.log({
          userId,
          action: 'code_obfuscation',
          entityType: 'code_protection',
          entityId: obfuscationId,
          description: `Obfuscated ${originalFilename} (${level} level)`,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent']
        });

        // Cleanup temp file
        await fs.unlink(uploadPath).catch(() => {});

        res.json({
          success: true,
          obfuscation: {
            id: obfuscationId,
            filename: outputFilename,
            originalSize: fileStats.size,
            obfuscatedSize: obfResult.obfuscatedSize,
            reduction: obfResult.reduction,
            processingTime,
            filesProcessed: obfResult.filesProcessed || 1,
            expiresAt
          }
        });
      } catch (error) {
        // Update record with error
        await db.run(
          `UPDATE code_obfuscations
           SET status = 'failed',
               error_message = ?,
               completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [error.message, obfuscationId]
        );

        throw error;
      }
    } catch (error) {
      console.error('Obfuscation error:', error);
      res.status(500).json({
        success: false,
        message: 'Obfuscation failed: ' + error.message
      });
    }
  }

  /**
   * Download obfuscated file
   */
  async download(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      // Get obfuscation record
      const obfuscation = await db.get(
        `SELECT * FROM code_obfuscations
         WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (!obfuscation) {
        return res.status(404).send('File not found');
      }

      if (obfuscation.status !== 'completed') {
        return res.status(400).send('File not ready for download');
      }

      // Check if file expired
      if (obfuscation.expires_at) {
        const expiryDate = new Date(obfuscation.expires_at);
        if (new Date() > expiryDate) {
          return res.status(410).send('Download link expired');
        }
      }

      // Check if file exists
      const filePath = obfuscation.output_path;
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).send('File not found on server');
      }

      // Send file
      res.download(filePath, obfuscation.obfuscated_filename);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).send('Download failed');
    }
  }

  /**
   * Get user quota info
   */
  async getQuota(req, res) {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole || 'user';
      const isAdmin = userRole === 'admin';

      const quota = await db.get(
        'SELECT * FROM obfuscation_quotas WHERE user_id = ?',
        [userId]
      );

      if (!quota) {
        const monthlyLimit = isAdmin ? -1 : 10;
        return res.json({
          success: true,
          quota: {
            monthly_limit: monthlyLimit,
            used_this_month: 0,
            remaining: monthlyLimit === -1 ? -1 : monthlyLimit,
            reset_date: moment().add(1, 'month').startOf('month').format('YYYY-MM-DD'),
            isUnlimited: isAdmin
          }
        });
      }

      // Calculate remaining (-1 for unlimited)
      const remaining = quota.monthly_limit === -1 ? -1 : quota.monthly_limit - quota.used_this_month;

      res.json({
        success: true,
        quota: {
          ...quota,
          remaining,
          isUnlimited: quota.monthly_limit === -1
        }
      });
    } catch (error) {
      console.error('Error getting quota:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching quota'
      });
    }
  }

  /**
   * Delete obfuscation record and file
   * DELETE /code-protection/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session.userId;

      // Get obfuscation record
      const obfuscation = await db.get(
        'SELECT * FROM code_obfuscations WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (!obfuscation) {
        return res.status(404).json({
          success: false,
          message: 'Obfuscation not found or access denied'
        });
      }

      // Delete file from disk
      const fs = require('fs');
      if (obfuscation.obfuscated_file_path && fs.existsSync(obfuscation.obfuscated_file_path)) {
        fs.unlinkSync(obfuscation.obfuscated_file_path);
      }

      // Delete from database
      await db.run('DELETE FROM code_obfuscations WHERE id = ?', [id]);

      // Log activity
      await ActivityLogger.log({
        userId: userId,
        action: 'delete',
        entityType: 'code_obfuscation',
        entityId: id,
        description: `Deleted obfuscation: ${obfuscation.original_filename}`,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers?.['user-agent']
      });

      res.json({
        success: true,
        message: 'Obfuscation deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting obfuscation:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting obfuscation'
      });
    }
  }

  /**
   * Detect shell scripts in uploaded ZIP file
   */
  async detectShellScriptsInZip(zipPath) {
    const unzipper = require('unzipper');
    const tempDir = path.join(path.dirname(zipPath), `detect_${Date.now()}`);

    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });

      // Extract ZIP
      await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();

      // Find all .sh files using bashObfuscatorService
      const shFiles = await bashObfuscatorService.findShellFiles(tempDir);

      // Get relative paths
      const shellScripts = shFiles.map(file => {
        const relativePath = path.relative(tempDir, file);
        return {
          path: relativePath,
          name: path.basename(file)
        };
      });

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

      return shellScripts;
    } catch (error) {
      // Cleanup on error
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  }
}

module.exports = new CodeProtectionController();
