import pool from '../config/database.js';

/**
 * Diagnose why transactions are missing
 * Check for transactions filtered out by account_id mismatch
 */

async function diagnoseMissingTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosing missing transactions...\n');
    
    // Get total transactions count
    const totalCount = await client.query(
      `SELECT COUNT(*) as total FROM transactions`
    );
    console.log(`📊 Total transactions in database: ${totalCount.rows[0].total}\n`);
    
    // Check transactions by user_id
    const byUserId = await client.query(
      `SELECT 
        CASE WHEN user_id IS NULL THEN 'NULL (shared)' ELSE 'User ' || user_id::text END as user_type,
        COUNT(*) as count
       FROM transactions
       GROUP BY user_id
       ORDER BY user_id NULLS LAST`
    );
    console.log('📊 Transactions by user_id:');
    byUserId.rows.forEach(row => {
      console.log(`   ${row.user_type}: ${row.count} transactions`);
    });
    console.log('');
    
    // Check transactions with account_id that don't match any account
    const orphanedTransactions = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       WHERE t.account_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM bank_accounts ba WHERE ba.id = t.account_id
       )`
    );
    console.log(`⚠️  Transactions with account_id that don't match any account: ${orphanedTransactions.rows[0].count}`);
    
    if (parseInt(orphanedTransactions.rows[0].count) > 0) {
      console.log('\n🔍 Sample orphaned transactions:');
      const samples = await client.query(
        `SELECT t.id, t.date, t.description, t.account_id, t.user_id
         FROM transactions t
         WHERE t.account_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM bank_accounts ba WHERE ba.id = t.account_id
         )
         LIMIT 10`
      );
      samples.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID: ${row.id} | Date: ${row.date} | Account ID: ${row.account_id} | User: ${row.user_id || 'NULL'}`);
        console.log(`      Description: ${row.description?.substring(0, 60)}...`);
      });
    }
    
    // Check transactions that would be filtered out by current query
    const filteredOut = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.account_id IS NOT NULL
       AND ba.id IS NULL`
    );
    console.log(`\n⚠️  Transactions filtered out by account_id mismatch: ${filteredOut.rows[0].count}`);
    
    // Check for user_id = 1 specifically (common case)
    const user1Total = await client.query(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id = 1`
    );
    console.log(`\n📊 Transactions with user_id = 1: ${user1Total.rows[0].count}`);
    
    const user1Visible = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = 1
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)`
    );
    console.log(`📊 Transactions visible with current query (user_id = 1): ${user1Visible.rows[0].count}`);
    
    const user1Missing = parseInt(user1Total.rows[0].count) - parseInt(user1Visible.rows[0].count);
    if (user1Missing > 0) {
      console.log(`\n❌ MISSING: ${user1Missing} transactions for user_id = 1`);
      
      // Show what's missing
      const missing = await client.query(
        `SELECT t.id, t.date, t.description, t.account_id, t.bank
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = 1
         AND t.account_id IS NOT NULL
         AND ba.id IS NULL
         LIMIT 20`
      );
      console.log('\n🔍 Sample missing transactions:');
      missing.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID: ${row.id} | Date: ${row.date} | Account ID: ${row.account_id} | Bank: ${row.bank}`);
        console.log(`      Description: ${row.description?.substring(0, 60)}...`);
      });
    }
    
    // Check for NULL user_id (shared transactions)
    const nullUserTotal = await client.query(
      `SELECT COUNT(*) as count FROM transactions WHERE user_id IS NULL`
    );
    console.log(`\n📊 Transactions with user_id IS NULL (shared): ${nullUserTotal.rows[0].count}`);
    
    const nullUserVisible = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id IS NULL
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)`
    );
    console.log(`📊 Transactions visible with current query (user_id IS NULL): ${nullUserVisible.rows[0].count}`);
    
    const nullUserMissing = parseInt(nullUserTotal.rows[0].count) - parseInt(nullUserVisible.rows[0].count);
    if (nullUserMissing > 0) {
      console.log(`\n❌ MISSING: ${nullUserMissing} shared transactions`);
    }
    
    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('diagnose-missing-transactions')) {
  diagnoseMissingTransactions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default diagnoseMissingTransactions;

