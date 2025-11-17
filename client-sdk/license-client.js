/**
 * License Client SDK
 * Easy integration for license validation in your applications
 *
 * Usage:
 *   const LicenseClient = require('./license-client');
 *   const client = new LicenseClient('http://localhost:3000');
 *
 *   const result = await client.validate('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX');
 */

const crypto = require('crypto');
const os = require('os');
const https = require('https');
const http = require('http');

class LicenseClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl || 'http://localhost:3000';
    this.licenseKey = null;
    this.cachedValidation = null;
    this.cacheExpiry = null;
  }

  /**
   * Generate hardware ID from system information
   */
  getHardwareId() {
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalmem: os.totalmem()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .digest('hex');
  }

  /**
   * Make HTTP request
   */
  request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.serverUrl + path);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = client.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Validate license key
   */
  async validate(licenseKey, options = {}) {
    try {
      // Check cache
      if (this.cachedValidation && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        if (this.licenseKey === licenseKey) {
          return this.cachedValidation;
        }
      }

      const hardwareId = options.hardwareId || this.getHardwareId();
      const hostname = os.hostname();
      const ip = this.getLocalIp();

      const response = await this.request('POST', '/api/validate', {
        license_key: licenseKey,
        hardware_id: hardwareId,
        hostname: hostname,
        ip_address: ip
      });

      if (response.valid) {
        // Cache the validation result for 1 hour
        this.licenseKey = licenseKey;
        this.cachedValidation = response;
        this.cacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
      }

      return response;
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Deactivate current hardware
   */
  async deactivate(licenseKey, hardwareId = null) {
    try {
      const hwId = hardwareId || this.getHardwareId();

      const response = await this.request('POST', '/api/deactivate', {
        license_key: licenseKey,
        hardware_id: hwId
      });

      // Clear cache
      if (this.licenseKey === licenseKey) {
        this.cachedValidation = null;
        this.cacheExpiry = null;
        this.licenseKey = null;
      }

      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get license information
   */
  async getLicenseInfo(licenseKey) {
    try {
      return await this.request('GET', `/api/license/${licenseKey}`);
    } catch (error) {
      return {
        error: error.message
      };
    }
  }

  /**
   * Get local IP address
   */
  getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.cachedValidation = null;
    this.cacheExpiry = null;
    this.licenseKey = null;
  }

  /**
   * Check if license is valid (simple wrapper)
   */
  async isValid(licenseKey, options = {}) {
    const result = await this.validate(licenseKey, options);
    return result.valid === true;
  }
}

module.exports = LicenseClient;
