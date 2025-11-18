const db = require('../db');
const os = require('os');

/**
 * Migration to update app_url with server IP
 */

function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function migrate() {
  console.log('Running migration: Update app_url with server IP...');

  try {
    const serverIP = getServerIP();
    const port = process.env.PORT || 3000;
    const appUrl = `http://${serverIP}:${port}`;

    // Update app_url in settings
    await db.run(
      `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'app_url'`,
      [appUrl]
    );

    console.log(`✓ Updated app_url to: ${appUrl}`);
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;
