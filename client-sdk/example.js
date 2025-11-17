/**
 * Example usage of License Client SDK
 */

const LicenseClient = require('./license-client');

// Initialize the client
const client = new LicenseClient('http://localhost:3000');

async function main() {
  const licenseKey = 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'; // Replace with actual license key

  console.log('=== License Validation Example ===\n');

  // Example 1: Validate license
  console.log('1. Validating license...');
  const validation = await client.validate(licenseKey);

  if (validation.valid) {
    console.log('✓ License is valid!');
    console.log('Product:', validation.license.product.name);
    console.log('Type:', validation.license.type);
    console.log('Status:', validation.license.status);
    console.log('Expiry:', validation.license.expiry_date || 'Never');
    console.log('Features:', validation.license.features);
    console.log('Activations:', `${validation.license.activations.current}/${validation.license.activations.max}`);
  } else {
    console.log('✗ License is invalid');
    console.log('Error:', validation.error);
    return;
  }

  console.log('\n2. Checking license validity (simple check)...');
  const isValid = await client.isValid(licenseKey);
  console.log('Is valid:', isValid);

  // Example 2: Get license info
  console.log('\n3. Getting license information...');
  const info = await client.getLicenseInfo(licenseKey);
  if (info.error) {
    console.log('Error:', info.error);
  } else {
    console.log('License Info:', info);
  }

  // Example 3: Get hardware ID
  console.log('\n4. Hardware Information:');
  console.log('Hardware ID:', client.getHardwareId());
  console.log('Local IP:', client.getLocalIp());

  // Example 4: Deactivate (optional - uncomment to test)
  // console.log('\n5. Deactivating license...');
  // const deactivation = await client.deactivate(licenseKey);
  // console.log('Deactivation result:', deactivation);
}

// Run the example
main().catch(console.error);
