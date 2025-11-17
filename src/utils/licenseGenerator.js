const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class LicenseGenerator {
  constructor() {
    this.encryptionKey = process.env.LICENSE_ENCRYPTION_KEY || 'default-key-change-this';
  }

  /**
   * Generate a unique license key
   * Format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
   */
  generateKey() {
    const segments = 5;
    const segmentLength = 5;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let key = '';
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segmentLength; j++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < segments - 1) {
        key += '-';
      }
    }

    return key;
  }

  /**
   * Generate a signed license with encrypted metadata
   */
  generateSignedLicense(licenseData) {
    const data = {
      licenseKey: licenseData.licenseKey,
      productId: licenseData.productId,
      customerId: licenseData.customerId,
      expiryDate: licenseData.expiryDate,
      maxActivations: licenseData.maxActivations,
      features: licenseData.features || [],
      issuedAt: new Date().toISOString(),
      uuid: uuidv4()
    };

    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data),
      this.encryptionKey
    ).toString();

    // Create signature
    const signature = this.createSignature(encrypted);

    return {
      encrypted,
      signature,
      licenseKey: licenseData.licenseKey
    };
  }

  /**
   * Create signature for license data
   */
  createSignature(data) {
    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify license signature
   */
  verifySignature(data, signature) {
    const computedSignature = this.createSignature(data);
    return computedSignature === signature;
  }

  /**
   * Decrypt and validate license
   */
  decryptLicense(encrypted, signature) {
    try {
      // Verify signature first
      if (!this.verifySignature(encrypted, signature)) {
        return { valid: false, error: 'Invalid license signature' };
      }

      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
      const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedStr) {
        return { valid: false, error: 'Failed to decrypt license' };
      }

      const data = JSON.parse(decryptedStr);

      // Validate expiry date
      if (data.expiryDate) {
        const expiryDate = new Date(data.expiryDate);
        const now = new Date();
        if (now > expiryDate) {
          return { valid: false, error: 'License has expired', data };
        }
      }

      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate hardware ID from system info
   */
  generateHardwareId(systemInfo) {
    const data = JSON.stringify(systemInfo);
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Validate hardware binding
   */
  validateHardwareBinding(licenseHardwareId, currentHardwareId) {
    if (!licenseHardwareId) {
      return true; // No hardware binding
    }
    return licenseHardwareId === currentHardwareId;
  }

  /**
   * Generate offline validation code
   * This can be used for offline license validation
   */
  generateOfflineCode(licenseKey, expiryDate) {
    const data = `${licenseKey}|${expiryDate}`;
    const hash = crypto
      .createHmac('sha256', this.encryptionKey)
      .update(data)
      .digest('hex');

    // Take first 16 characters and format nicely
    const code = hash.substring(0, 16).toUpperCase();
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}-${code.substring(12, 16)}`;
  }

  /**
   * Verify offline validation code
   */
  verifyOfflineCode(licenseKey, expiryDate, code) {
    const expectedCode = this.generateOfflineCode(licenseKey, expiryDate);
    return code.replace(/-/g, '') === expectedCode.replace(/-/g, '');
  }
}

module.exports = new LicenseGenerator();
