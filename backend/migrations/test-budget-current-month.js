import pool from '../config/database.js';

/**
 * Test budget endpoint to verify it only returns current month data
 */

async function testBudgetCurrentMonth() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing budget endpoint for current month filtering...\n');
    
    const userId = 1;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const targetMonthDate = currentMonth + '-01';
    
    console.log(`📅 Testing for month: ${currentMonth}\n`);
    
    // Simulate the budget overview query
    const allTransactionCategories = await client.query(
      `SELECT DISTINCT t.category 
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.category IS NOT NULL
       AND t.category != ''
       AND t.category != 'NC'
       AND t.category != 'nc'
       AND t.type = 'expense'
       AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
       ORDER BY t.category ASC`,
      [userId, targetMonthDate]
    );
    
    console.log(`📊 Categories with transactions in ${currentMonth}: ${allTransactionCategories.rows.length}`);
    allTransactionCategories.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.category}`);
    });
    console.log('');
    
    // Get spending for current month
    const spendingResult = await client.query(
      `SELECT 
         COALESCE(t.category, 'Otros > Sin categoría') as category,
         SUM(t.amount) as total_spent,
         COUNT(*) as transaction_count
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
           t.category, t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND t.type = 'expense'
         AND t.computable = true
         AND t.amount > 0
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
         ORDER BY t.date, t.description, t.amount, t.type, t.id
       ) t
       GROUP BY COALESCE(t.category, 'Otros > Sin categoría')
       ORDER BY total_spent DESC`,
      [userId, targetMonthDate]
    );
    
    console.log(`💰 Spending by category for ${currentMonth}:`);
    spendingResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.category}: €${parseFloat(row.total_spent).toFixed(2)} (${row.transaction_count} transactions)`);
    });
    
    const totalSpent = spendingResult.rows.reduce((sum, r) => sum + parseFloat(r.total_spent), 0);
    console.log(`\n   Total: €${totalSpent.toFixed(2)}\n`);
    
    // Check if any transactions from other months are included
    const otherMonthsCheck = await client.query(
      `SELECT 
        TO_CHAR(t.date, 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(t.amount) as total
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'expense'
       AND t.computable = true
       AND t.amount > 0
       AND DATE_TRUNC('month', t.date) != DATE_TRUNC('month', $2::date)
       AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
       GROUP BY TO_CHAR(t.date, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 3`,
      [userId, targetMonthDate]
    );
    
    console.log(`🔍 Checking for transactions from other months (should be 0 in results):`);
    if (otherMonthsCheck.rows.length === 0) {
      console.log(`   ✅ No transactions from other months found in query results`);
    } else {
      console.log(`   ⚠️  Found transactions from other months:`);
      otherMonthsCheck.rows.forEach(row => {
        console.log(`      ${row.month}: ${row.count} transactions, €${parseFloat(row.total).toFixed(2)}`);
      });
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('test-budget-current-month')) {
  testBudgetCurrentMonth()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default testBudgetCurrentMonth;






