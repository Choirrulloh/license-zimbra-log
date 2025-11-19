const db = require('./db');

/**
 * Seed email templates
 * Creates 2 design variations x 2 languages for each email type
 * Total: 8 email types × 2 designs × 2 languages = 32 templates
 */

async function seedEmailTemplates() {
  console.log('Seeding email templates...');
  console.log('Creating 8 email types × 2 designs × 2 languages = 32 templates\n');

  // Import templates from external file to keep this clean
  const templates = require('./emailTemplatesData');

  try {
    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      // Check if template already exists
      const existing = await db.get(
        'SELECT id FROM email_templates WHERE name = ? AND language = ? AND design_variation = ?',
        [template.name, template.language, template.design_variation]
      );

      if (!existing) {
        await db.run(
          `INSERT INTO email_templates (name, type, language, design_variation, subject, body_html, body_text, variables, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            template.name,
            template.type,
            template.language,
            template.design_variation,
            template.subject,
            template.body_html.trim(),
            template.body_text ? template.body_text.trim() : '',
            template.variables
          ]
        );
        console.log(`✓ Created: ${template.name} (${template.language}, v${template.design_variation})`);
        created++;
      } else {
        console.log(`- Skipped: ${template.name} (${template.language}, v${template.design_variation}) - already exists`);
        skipped++;
      }
    }

    console.log(`\n✅ Email templates seed completed!`);
    console.log(`   Created: ${created} new templates`);
    console.log(`   Skipped: ${skipped} existing templates`);
    console.log(`   Total: ${templates.length} template variants`);
  } catch (error) {
    console.error('Error seeding email templates:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedEmailTemplates()
    .then(() => {
      console.log('Seed successful');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedEmailTemplates;
