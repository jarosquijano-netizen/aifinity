import pool from '../config/database.js';

async function addIsAnnualToCategories() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adding is_annual field to categories table...');

    // Check if column already exists
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'is_annual'
    `);

    if (columnExists.rows.length > 0) {
      console.log('✅ Column is_annual already exists');
      return;
    }

    // Add is_annual column
    await client.query(`
      ALTER TABLE categories 
      ADD COLUMN is_annual BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Added is_annual column to categories table');

    // Set default annual categories (Seguro Hogar, Seguro Auto)
    await client.query(`
      UPDATE categories 
      SET is_annual = TRUE 
      WHERE name IN ('Seguros > Seguro hogar', 'Seguro hogar', 'Seguros > Seguro auto', 'Seguro auto')
    `);

    const result = await client.query(`
      SELECT COUNT(*) as count 
      FROM categories 
      WHERE is_annual = TRUE
    `);
    console.log(`✅ Set ${result.rows[0].count} categories as annual by default`);

    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding is_annual column:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Only run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('add-is-annual-to-categories.js')) {
  addIsAnnualToCategories()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default addIsAnnualToCategories;

