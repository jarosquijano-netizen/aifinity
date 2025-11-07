import pool from '../config/database.js';

async function up() {
  const client = await pool.connect();
  
  try {
    console.log('Adding balance tracking fields to bank_accounts...');
    
    await client.query(`
      ALTER TABLE bank_accounts
      ADD COLUMN IF NOT EXISTS balance_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS balance_source VARCHAR(20) DEFAULT 'manual'
    `);
    
    console.log('✅ Balance tracking fields added successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  
  try {
    console.log('Removing balance tracking fields...');
    
    await client.query(`
      ALTER TABLE bank_accounts
      DROP COLUMN IF EXISTS balance_updated_at,
      DROP COLUMN IF EXISTS balance_source
    `);
    
    console.log('✅ Rollback successful');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { up, down };






