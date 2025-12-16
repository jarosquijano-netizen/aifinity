import pool from '../config/database.js';

/**
 * Remove duplicate transactions
 * Keeps the oldest transaction (lowest ID) and deletes the rest
 * Duplicates are identified by: date, description, amount, account_id, user_id
 */
async function removeDuplicateTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding and removing duplicate transactions...\n');
    
    await client.query('BEGIN');

    // Find all duplicate groups
    // A duplicate is defined as: same date, description, amount, account_id, and user_id
    const duplicatesQuery = await client.query(`
      SELECT 
        date,
        description,
        amount,
        account_id,
        user_id,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id ASC) as transaction_ids
      FROM transactions
      GROUP BY date, description, amount, account_id, user_id
      HAVING COUNT(*) > 1
      ORDER BY date DESC
    `);

    console.log(`📊 Found ${duplicatesQuery.rows.length} sets of duplicate transactions\n`);

    if (duplicatesQuery.rows.length === 0) {
      console.log('✅ No duplicates found!');
      await client.query('COMMIT');
      return;
    }

    let totalDuplicatesToDelete = 0;
    const duplicatesToDelete = [];

    // For each duplicate group, keep the first (oldest) transaction and mark others for deletion
    duplicatesQuery.rows.forEach((dup, idx) => {
      const transactionIds = dup.transaction_ids;
      const keepId = transactionIds[0]; // Keep the oldest (first) transaction
      const deleteIds = transactionIds.slice(1); // Delete the rest

      console.log(`${idx + 1}. Date: ${dup.date}, Amount: €${dup.amount}, Count: ${dup.count}`);
      console.log(`   Description: ${dup.description?.substring(0, 60)}...`);
      console.log(`   Keeping ID: ${keepId}, Deleting IDs: ${deleteIds.join(', ')}`);
      console.log('');

      duplicatesToDelete.push(...deleteIds);
      totalDuplicatesToDelete += deleteIds.length;
    });

    console.log(`\n🗑️  Total transactions to delete: ${totalDuplicatesToDelete}`);

    if (duplicatesToDelete.length === 0) {
      console.log('✅ No duplicates to delete');
      await client.query('COMMIT');
      return;
    }

    // Delete duplicate transactions
    const deleteResult = await client.query(`
      DELETE FROM transactions 
      WHERE id = ANY($1::int[])
      RETURNING id, date, description, amount
    `, [duplicatesToDelete]);

    console.log(`\n✅ Successfully deleted ${deleteResult.rowCount} duplicate transaction(s)`);

    // Show sample of deleted transactions
    if (deleteResult.rows.length > 0) {
      console.log('\n📋 Sample of deleted transactions:');
      deleteResult.rows.slice(0, 5).forEach((t, idx) => {
        console.log(`   ${idx + 1}. [${t.date}] ${t.description?.substring(0, 50)}... - €${t.amount}`);
      });
      if (deleteResult.rows.length > 5) {
        console.log(`   ... and ${deleteResult.rows.length - 5} more`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
removeDuplicateTransactions()
  .then(() => {
    console.log('\n✅ Duplicate removal completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Duplicate removal failed:', error);
    process.exit(1);
  });






