import pool from '../config/database.js';

async function addComputableField() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adding computable field to transactions table...');
    
    await client.query('BEGIN');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='transactions' AND column_name='computable';
    `);

    if (checkColumn.rows.length === 0) {
      // Add computable column (default true - all existing transactions are computable)
      await client.query(`
        ALTER TABLE transactions 
        ADD COLUMN computable BOOLEAN DEFAULT true;
      `);
      console.log('✅ Added computable field to transactions');
    } else {
      console.log('ℹ️  Computable field already exists');
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
addComputableField()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });






