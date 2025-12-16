import pool from '../config/database.js';

async function fixAllTransfersComputable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Fixing ALL transfer-related transactions to be non-computable...');
    
    await client.query('BEGIN');

    // Find all transactions that are transfers but marked as computable
    // Check by category name, description, or type
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE (
        category = 'Transferencias' 
        OR category LIKE '%Transferencias%' 
        OR category LIKE '%Transferencia%'
        OR category = 'NC' 
        OR category = 'nc'
        OR LOWER(description) LIKE '%transferencia%'
        OR LOWER(description) LIKE '%traspaso%'
        OR LOWER(description) LIKE '%transfer%'
      )
      AND computable = true;
    `);

    const countToFix = parseInt(checkResult.rows[0].count);
    console.log(`📊 Found ${countToFix} transfer-related transactions marked as computable`);

    if (countToFix > 0) {
      // Update all transfer-related transactions to be non-computable
      const updateResult = await client.query(`
        UPDATE transactions
        SET computable = false
        WHERE (
          category = 'Transferencias' 
          OR category LIKE '%Transferencias%' 
          OR category LIKE '%Transferencia%'
          OR category = 'NC' 
          OR category = 'nc'
          OR LOWER(description) LIKE '%transferencia%'
          OR LOWER(description) LIKE '%traspaso%'
          OR LOWER(description) LIKE '%transfer%'
        )
        AND computable = true;
      `);

      console.log(`✅ Updated ${updateResult.rowCount} transfer-related transactions to be non-computable`);
      
      // Show some examples
      const examples = await client.query(`
        SELECT id, date, description, category, amount, computable
        FROM transactions
        WHERE (
          category = 'Transferencias' 
          OR category LIKE '%Transferencias%' 
          OR category = 'NC' 
          OR category = 'nc'
        )
        AND computable = false
        ORDER BY date DESC
        LIMIT 5;
      `);
      
      if (examples.rows.length > 0) {
        console.log('\n📋 Sample of fixed transactions:');
        examples.rows.forEach((t, idx) => {
          console.log(`   ${idx + 1}. [${t.date}] ${t.description.substring(0, 50)}... (${t.category}) - €${t.amount}`);
        });
      }
    } else {
      console.log('ℹ️  No transfer-related transactions need fixing');
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
fixAllTransfersComputable()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });


