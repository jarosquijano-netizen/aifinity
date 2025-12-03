import pool from '../config/database.js';

/**
 * Check transaction visibility for debugging
 * Shows what transactions exist vs what would be visible
 */

async function checkTransactionVisibility() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking transaction visibility...\n');
    
    // Get all transactions
    const allTransactions = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(date) as oldest_date,
        MAX(date) as newest_date
       FROM transactions`
    );
    
    const stats = allTransactions.rows[0];
    console.log('📊 Database Statistics:');
    console.log(`   Total transactions: ${stats.total}`);
    console.log(`   Transactions with user_id IS NULL: ${stats.null_user}`);
    console.log(`   Transactions with user_id: ${stats.with_user}`);
    console.log(`   Unique user_ids: ${stats.unique_users}`);
    console.log(`   Date range: ${stats.oldest_date} to ${stats.newest_date}\n`);
    
    // Check by user_id
    const byUser = await client.query(
      `SELECT 
        COALESCE(user_id::text, 'NULL') as user_id,
        COUNT(*) as count,
        MIN(date) as oldest,
        MAX(date) as newest
       FROM transactions
       GROUP BY user_id
       ORDER BY user_id NULLS LAST`
    );
    
    console.log('📊 Transactions by user_id:');
    byUser.rows.forEach(row => {
      console.log(`   User ID: ${row.user_id} | Count: ${row.count} | Range: ${row.oldest} to ${row.newest}`);
    });
    console.log('');
    
    // Check what would be visible for user_id = 1 (logged in)
    const user1Visible = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = 1
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)`
    );
    console.log(`✅ Transactions visible for user_id = 1 (logged in): ${user1Visible.rows[0].count}`);
    
    // Check what would be visible for user_id IS NULL (not logged in)
    const nullUserVisible = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id IS NULL
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)`
    );
    console.log(`✅ Transactions visible for user_id IS NULL (not logged in): ${nullUserVisible.rows[0].count}\n`);
    
    // Check for transactions with computable = false (these should still be visible in list)
    const nonComputable = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE computable = false`
    );
    console.log(`📊 Transactions with computable = false: ${nonComputable.rows[0].count}`);
    console.log(`   (These should still be visible in the transactions list, just excluded from calculations)\n`);
    
    // Check recent transactions
    console.log('📋 Most recent 10 transactions:');
    const recent = await client.query(
      `SELECT id, date, description, category, type, amount, user_id, account_id, computable
       FROM transactions
       ORDER BY date DESC, id DESC
       LIMIT 10`
    );
    recent.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. [${row.date}] ${row.description?.substring(0, 50)}...`);
      console.log(`      Category: ${row.category} | Type: ${row.type} | Amount: €${row.amount}`);
      console.log(`      User ID: ${row.user_id || 'NULL'} | Account ID: ${row.account_id || 'NULL'} | Computable: ${row.computable}`);
    });
    
    console.log('\n✅ Visibility check complete!');
    console.log('\n💡 Tips:');
    console.log('   - If you see fewer transactions in the UI, check:');
    console.log('     1. Are you logged in? (Check user_id matches)');
    console.log('     2. Are filters applied? (Month, Category, Search, Type)');
    console.log('     3. Check browser console for errors');
    console.log('     4. Try clearing all filters');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('check-transaction-visibility')) {
  checkTransactionVisibility()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default checkTransactionVisibility;

