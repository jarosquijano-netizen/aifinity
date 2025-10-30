import pool from '../config/database.js';

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Adding balance tracking columns to bank_accounts...\n');
    
    await client.query('BEGIN');
    
    // Check if columns already exist
    const checkColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bank_accounts' 
      AND column_name IN ('balance_updated_at', 'balance_source')
    `);
    
    const existingColumns = checkColumns.rows.map(r => r.column_name);
    
    // Add balance_updated_at if it doesn't exist
    if (!existingColumns.includes('balance_updated_at')) {
      console.log('✅ Adding balance_updated_at column...');
      await client.query(`
        ALTER TABLE bank_accounts 
        ADD COLUMN balance_updated_at TIMESTAMP DEFAULT NOW()
      `);
    } else {
      console.log('⚠️  balance_updated_at already exists, skipping...');
    }
    
    // Add balance_source if it doesn't exist
    if (!existingColumns.includes('balance_source')) {
      console.log('✅ Adding balance_source column...');
      await client.query(`
        ALTER TABLE bank_accounts 
        ADD COLUMN balance_source VARCHAR(50) DEFAULT 'manual'
      `);
    } else {
      console.log('⚠️  balance_source already exists, skipping...');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration complete!\n');
    
    // Verify
    const verify = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bank_accounts' 
      AND column_name IN ('balance_updated_at', 'balance_source')
      ORDER BY column_name
    `);
    
    console.log('📋 Verification:\n');
    verify.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });
    console.log('\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Details:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

