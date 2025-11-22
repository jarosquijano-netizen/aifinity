import pool from '../config/database.js';

async function fixNCComputable() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Fixing NC category transactions to be non-computable...');
    
    await client.query('BEGIN');

    // Find all transactions with NC category that are marked as computable
    const checkResult = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE (category = 'NC' OR category = 'nc')
      AND computable = true;
    `);

    const countToFix = parseInt(checkResult.rows[0].count);
    console.log(`📊 Found ${countToFix} transactions with NC category marked as computable`);

    if (countToFix > 0) {
      // Update all NC transactions to be non-computable
      const updateResult = await client.query(`
        UPDATE transactions
        SET computable = false
        WHERE (category = 'NC' OR category = 'nc')
        AND computable = true;
      `);

      console.log(`✅ Updated ${updateResult.rowCount} transactions to be non-computable`);
    } else {
      console.log('ℹ️  No NC transactions need fixing');
    }

    // Also fix Transferencias category if needed
    const transferCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE category = 'Transferencias'
      AND computable = true;
    `);

    const transferCountToFix = parseInt(transferCheck.rows[0].count);
    console.log(`📊 Found ${transferCountToFix} transactions with Transferencias category marked as computable`);

    if (transferCountToFix > 0) {
      const transferUpdateResult = await client.query(`
        UPDATE transactions
        SET computable = false
        WHERE category = 'Transferencias'
        AND computable = true;
      `);

      console.log(`✅ Updated ${transferUpdateResult.rowCount} Transferencias transactions to be non-computable`);
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
fixNCComputable()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });


