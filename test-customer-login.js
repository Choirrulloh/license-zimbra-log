const bcrypt = require('bcryptjs');
const db = require('./src/database/db');

async function testCustomerLogin() {
  console.log('🔍 Testing Customer Login...\n');

  const testEmail = 'customer@example.com';
  const testPassword = 'customer123';

  try {
    // 1. Find customer
    console.log('1️⃣ Looking for customer:', testEmail);
    const customer = await db.get(
      'SELECT * FROM customers WHERE email = ? AND is_active = 1',
      [testEmail]
    );

    if (!customer) {
      console.log('❌ Customer not found or inactive');
      return;
    }
    console.log('✅ Customer found:', customer.name);
    console.log('   - ID:', customer.id);
    console.log('   - Email:', customer.email);
    console.log('   - Active:', customer.is_active);
    console.log('   - Must change password:', customer.must_change_password);
    console.log('   - Has password:', !!customer.password);

    // 2. Verify password
    if (!customer.password) {
      console.log('\n❌ Customer has no password set');
      return;
    }

    console.log('\n2️⃣ Verifying password...');
    console.log('   - Password hash:', customer.password);
    console.log('   - Testing password:', testPassword);

    const passwordMatch = await bcrypt.compare(testPassword, customer.password);

    if (!passwordMatch) {
      console.log('❌ Password does not match');
      return;
    }
    console.log('✅ Password matches!');

    // 3. Check other conditions
    console.log('\n3️⃣ Checking login conditions...');

    if (customer.must_change_password) {
      console.log('⚠️  Customer must change password on next login');
    } else {
      console.log('✅ No password change required');
    }

    console.log('\n✅ LOGIN TEST SUCCESSFUL!');
    console.log('\n📋 Login credentials:');
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);
    console.log('   URL: http://localhost:3000/customer/login');

  } catch (error) {
    console.error('\n❌ Error during test:', error);
  }
}

testCustomerLogin().then(() => process.exit(0));
