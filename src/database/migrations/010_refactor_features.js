/**
 * Migration: Refactor Features to Normalized Database Design
 *
 * Changes:
 * 1. Create 'features' table (master data)
 * 2. Create 'license_type_features' pivot table (many-to-many)
 * 3. Migrate existing JSON features to normalized structure
 * 4. Keep old 'features' column for backward compatibility (marked as deprecated)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../database/license.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

// Helper function to run queries with promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrate() {
  console.log('Starting features refactor migration...');

  try {
    // Step 1: Create 'features' table
    console.log('Creating features table...');
    await run(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        feature_key VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50),
        is_active BOOLEAN DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(product_id, feature_key)
      )
    `);

    // Step 2: Create 'license_type_features' pivot table
    console.log('Creating license_type_features pivot table...');
    await run(`
      CREATE TABLE IF NOT EXISTS license_type_features (
        license_type_id INTEGER NOT NULL,
        feature_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (license_type_id, feature_id),
        FOREIGN KEY (license_type_id) REFERENCES license_types(id) ON DELETE CASCADE,
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
      )
    `);

    // Step 3: Create indexes for better performance
    console.log('Creating indexes...');
    await run('CREATE INDEX IF NOT EXISTS idx_features_product ON features(product_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_features_key ON features(feature_key)');
    await run('CREATE INDEX IF NOT EXISTS idx_ltf_license_type ON license_type_features(license_type_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_ltf_feature ON license_type_features(feature_id)');

    // Step 4: Migrate existing data
    console.log('Migrating existing features data...');

    // Get all license types with their features
    const licenseTypes = await all(`
      SELECT lt.id, lt.product_id, lt.name, lt.features
      FROM license_types lt
      WHERE lt.features IS NOT NULL AND lt.features != '[]' AND lt.features != ''
    `);

    console.log(`Found ${licenseTypes.length} license types with features to migrate`);

    let totalFeaturesMigrated = 0;
    let featuresCache = {}; // Cache to avoid duplicate inserts

    for (const lt of licenseTypes) {
      try {
        // Parse JSON features
        let featuresArray = [];
        try {
          featuresArray = JSON.parse(lt.features);
        } catch (e) {
          console.warn(`Failed to parse features for license type ${lt.id}: ${e.message}`);
          continue;
        }

        if (!Array.isArray(featuresArray) || featuresArray.length === 0) {
          continue;
        }

        console.log(`  Processing license type: ${lt.name} (${featuresArray.length} features)`);

        for (let i = 0; i < featuresArray.length; i++) {
          const featureName = featuresArray[i];
          if (!featureName || typeof featureName !== 'string') continue;

          // Generate feature_key from name (lowercase, replace spaces with underscore)
          const featureKey = featureName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();

          // Create unique cache key
          const cacheKey = `${lt.product_id}_${featureKey}`;

          let featureId;

          // Check if feature already exists in cache
          if (featuresCache[cacheKey]) {
            featureId = featuresCache[cacheKey];
          } else {
            // Check if feature exists in database
            const existingFeature = await get(
              'SELECT id FROM features WHERE product_id = ? AND feature_key = ?',
              [lt.product_id, featureKey]
            );

            if (existingFeature) {
              featureId = existingFeature.id;
              featuresCache[cacheKey] = featureId;
            } else {
              // Insert new feature
              const result = await run(
                `INSERT INTO features (product_id, name, feature_key, description, display_order)
                 VALUES (?, ?, ?, ?, ?)`,
                [lt.product_id, featureName, featureKey, `Feature: ${featureName}`, i]
              );
              featureId = result.id;
              featuresCache[cacheKey] = featureId;
              console.log(`    Created feature: ${featureName} (key: ${featureKey})`);
            }
          }

          // Link feature to license type
          const existingLink = await get(
            'SELECT * FROM license_type_features WHERE license_type_id = ? AND feature_id = ?',
            [lt.id, featureId]
          );

          if (!existingLink) {
            await run(
              'INSERT INTO license_type_features (license_type_id, feature_id) VALUES (?, ?)',
              [lt.id, featureId]
            );
            totalFeaturesMigrated++;
          }
        }
      } catch (error) {
        console.error(`Error migrating features for license type ${lt.id}:`, error.message);
      }
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`- Total features migrated: ${totalFeaturesMigrated}`);
    console.log(`- Unique features created: ${Object.keys(featuresCache).length}`);
    console.log('\nNote: Old "features" column in license_types table is kept for backward compatibility.');
    console.log('You can safely remove it after verifying the migration.');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
db.serialize(async () => {
  try {
    await migrate();
    console.log('\n✓ Migration completed successfully');
    db.close();
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    db.close();
    process.exit(1);
  }
});
