/**
 * Test script untuk verifikasi subdomain routing
 * Run: node test-subdomain.js
 */

const express = require('express');

// Mock request object untuk testing
function createMockReq(hostname, path = '/') {
  return {
    hostname,
    path,
    isCustomerPortal: false,
    isAdminPortal: false
  };
}

// Subdomain detection logic (copy dari server.js)
function detectSubdomain(hostname) {
  let isCustomerPortal = false;
  let isAdminPortal = false;

  // Detect customer subdomain
  if (hostname.match(/^(customer|portal|my)\./i) || hostname === 'customer.localhost' || hostname === 'portal.localhost' || hostname === 'my.localhost') {
    isCustomerPortal = true;
    isAdminPortal = false;
  }
  // Detect admin subdomain
  else if (hostname.match(/^(admin|app)\./i) || hostname === 'admin.localhost' || hostname === 'app.localhost') {
    isAdminPortal = true;
    isCustomerPortal = false;
  }
  // Fallback to admin for bare domains
  else {
    isAdminPortal = true;
    isCustomerPortal = false;
  }

  return { isCustomerPortal, isAdminPortal };
}

// Test cases
const testCases = [
  // Customer portal tests
  { hostname: 'customer.localhost', expectedType: 'customer' },
  { hostname: 'portal.localhost', expectedType: 'customer' },
  { hostname: 'my.localhost', expectedType: 'customer' },
  { hostname: 'customer.domain.com', expectedType: 'customer' },
  { hostname: 'portal.domain.com', expectedType: 'customer' },
  { hostname: 'my.domain.com', expectedType: 'customer' },

  // Admin portal tests
  { hostname: 'admin.localhost', expectedType: 'admin' },
  { hostname: 'app.localhost', expectedType: 'admin' },
  { hostname: 'admin.domain.com', expectedType: 'admin' },
  { hostname: 'app.domain.com', expectedType: 'admin' },

  // Bare domain tests (should default to admin)
  { hostname: 'localhost', expectedType: 'admin' },
  { hostname: 'domain.com', expectedType: 'admin' },
  { hostname: 'www.domain.com', expectedType: 'admin' },
];

// Run tests
console.log('🧪 Testing Subdomain Detection\n');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach(({ hostname, expectedType }) => {
  const result = detectSubdomain(hostname);
  const actualType = result.isCustomerPortal ? 'customer' : 'admin';
  const status = actualType === expectedType ? '✅' : '❌';

  if (actualType === expectedType) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} ${hostname.padEnd(30)} → ${actualType.padEnd(10)} (expected: ${expectedType})`);
});

console.log('═'.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

// Test URL generation
console.log('🔗 Testing URL Generation\n');
console.log('═'.repeat(60));

const urlTests = [
  { hostname: 'customer.localhost', basePath: '', fullUrl: 'customer.localhost/login' },
  { hostname: 'admin.localhost', basePath: '/customer', fullUrl: 'admin.localhost/customer/login' },
  { hostname: 'customer.domain.com', basePath: '', fullUrl: 'customer.domain.com/login' },
  { hostname: 'admin.domain.com', basePath: '/customer', fullUrl: 'admin.domain.com/customer/login' },
];

urlTests.forEach(({ hostname, basePath, fullUrl }) => {
  const result = detectSubdomain(hostname);
  const actualBasePath = result.isCustomerPortal ? '' : '/customer';
  const status = actualBasePath === basePath ? '✅' : '❌';

  console.log(`${status} ${hostname.padEnd(30)} → basePath: "${actualBasePath}" (expected: "${basePath}")`);
  console.log(`   Full URL: ${fullUrl}`);
});

console.log('═'.repeat(60));

if (failed === 0) {
  console.log('\n✅ All tests passed! Subdomain routing is working correctly.\n');
  console.log('📝 Next steps:');
  console.log('   1. Add to /etc/hosts:');
  console.log('      127.0.0.1 admin.localhost');
  console.log('      127.0.0.1 customer.localhost');
  console.log('');
  console.log('   2. Start the server:');
  console.log('      npm start');
  console.log('');
  console.log('   3. Test in browser:');
  console.log('      Admin:    http://admin.localhost:3000');
  console.log('      Customer: http://customer.localhost:3000');
} else {
  console.log(`\n❌ ${failed} test(s) failed. Please check subdomain detection logic.\n`);
  process.exit(1);
}
