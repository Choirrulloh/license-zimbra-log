# License Client SDK

Easy-to-use SDK for integrating license validation into your Node.js applications.

## Installation

Copy the `license-client.js` file to your project:

```bash
cp license-client.js /path/to/your/project/
```

## Quick Start

```javascript
const LicenseClient = require('./license-client');

// Initialize client with your license server URL
const client = new LicenseClient('http://your-license-server.com:3000');

// Validate a license
const result = await client.validate('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX');

if (result.valid) {
  console.log('License is valid!');
  console.log('Product:', result.license.product.name);
  console.log('Features:', result.license.features);
} else {
  console.log('License is invalid:', result.error);
  process.exit(1);
}
```

## API Reference

### Constructor

```javascript
new LicenseClient(serverUrl)
```

- `serverUrl` (string): URL of your license server (e.g., 'http://localhost:3000')

### Methods

#### `validate(licenseKey, options)`

Validates a license key and activates the current hardware if needed.

```javascript
const result = await client.validate('LICENSE-KEY-HERE', {
  hardwareId: 'optional-custom-hardware-id' // Auto-generated if not provided
});
```

Returns:
```javascript
{
  valid: true,
  license: {
    key: 'LICENSE-KEY',
    product: { id, name, version },
    type: 'pro',
    status: 'active',
    issue_date: '2024-01-01',
    expiry_date: '2025-01-01',
    features: ['feature1', 'feature2'],
    activations: { current: 1, max: 3 }
  }
}
```

#### `isValid(licenseKey, options)`

Simple boolean check if license is valid.

```javascript
const isValid = await client.isValid('LICENSE-KEY-HERE');
// Returns: true or false
```

#### `deactivate(licenseKey, hardwareId)`

Deactivates the current hardware activation.

```javascript
const result = await client.deactivate('LICENSE-KEY-HERE');
```

#### `getLicenseInfo(licenseKey)`

Gets basic license information without activating.

```javascript
const info = await client.getLicenseInfo('LICENSE-KEY-HERE');
```

#### `getHardwareId()`

Gets the hardware ID for the current system.

```javascript
const hardwareId = client.getHardwareId();
```

#### `clearCache()`

Clears the validation cache.

```javascript
client.clearCache();
```

## Example Usage in Application

```javascript
const LicenseClient = require('./license-client');

class MyApplication {
  constructor() {
    this.licenseClient = new LicenseClient('http://localhost:3000');
    this.licenseKey = null;
  }

  async initialize(licenseKey) {
    // Validate license on startup
    const validation = await this.licenseClient.validate(licenseKey);

    if (!validation.valid) {
      throw new Error(`License validation failed: ${validation.error}`);
    }

    this.licenseKey = licenseKey;
    console.log(`Application licensed to: ${validation.license.product.name}`);

    // Check if specific feature is enabled
    if (validation.license.features.includes('premium-feature')) {
      this.enablePremiumFeatures();
    }
  }

  async periodicCheck() {
    // Periodically revalidate license (e.g., every hour)
    setInterval(async () => {
      const isValid = await this.licenseClient.isValid(this.licenseKey);
      if (!isValid) {
        console.error('License is no longer valid!');
        this.shutdown();
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  enablePremiumFeatures() {
    console.log('Premium features enabled!');
  }

  shutdown() {
    console.log('Shutting down due to invalid license');
    process.exit(1);
  }
}

// Usage
const app = new MyApplication();
app.initialize('YOUR-LICENSE-KEY-HERE')
  .then(() => {
    console.log('Application started successfully!');
    app.periodicCheck();
  })
  .catch(err => {
    console.error('Failed to start application:', err.message);
    process.exit(1);
  });
```

## Caching

The SDK automatically caches validation results for 1 hour to reduce server load. You can clear the cache manually using `clearCache()`.

## Hardware Binding

The SDK automatically generates a hardware ID based on system information (platform, architecture, hostname, CPU count, memory). This prevents license key sharing across different machines.

## Error Handling

Always check the `valid` or `success` property in the response:

```javascript
const result = await client.validate(licenseKey);

if (!result.valid) {
  console.error('Validation failed:', result.error);
  // Handle error (e.g., exit application, show error message)
}
```

## Common Use Cases

### 1. Application Startup Validation

```javascript
async function startApp() {
  const client = new LicenseClient('http://license-server.com:3000');
  const license = process.env.LICENSE_KEY;

  const result = await client.validate(license);
  if (!result.valid) {
    console.error('Invalid license. Application cannot start.');
    process.exit(1);
  }

  // Continue with application startup
  console.log('License validated. Starting application...');
}
```

### 2. Feature Gating

```javascript
async function checkFeature(featureName) {
  const result = await client.validate(licenseKey);

  if (result.valid && result.license.features.includes(featureName)) {
    return true;
  }

  return false;
}

// Usage
if (await checkFeature('api-access')) {
  enableApiAccess();
}
```

### 3. Periodic Validation

```javascript
// Revalidate every 6 hours
setInterval(async () => {
  const isValid = await client.isValid(licenseKey);
  if (!isValid) {
    notifyAdminLicenseExpired();
  }
}, 6 * 60 * 60 * 1000);
```

## Support

For issues or questions, please contact support or refer to the main documentation.
