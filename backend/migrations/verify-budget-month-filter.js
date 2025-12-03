import pool from '../config/database.js';

/**
 * Verify that budget only accounts for current month spending
 */

async function verifyBudgetMonthFilter() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying budget month filtering...\n');
    
    const userId = 1;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthDate = currentMonth + '-01';
    
    console.log(`📅 Current month: ${currentMonth}\n`);
    
    // Check total spending for current month
    const currentMonthSpending = await client.query(
      `SELECT 
        COALESCE(SUM(t.amount), 0) as total_spent
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.amount
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
       ) t`,
      [userId, currentMonthDate]
    );
    
    console.log(`💰 Current month (${currentMonth}) spending: €${parseFloat(currentMonthSpending.rows[0].total_spent).toFixed(2)}\n`);
    
    // Check spending by month
    const spendingByMonth = await client.query(
      `SELECT 
        TO_CHAR(t.date, 'YYYY-MM') as month,
        COALESCE(SUM(t.amount), 0) as total_spent,
        COUNT(*) as transaction_count
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.date, t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND t.type = 'expense'
         AND t.computable = true
         AND t.amount > 0
         AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
         ORDER BY t.date, t.description, t.amount, t.type, t.id
       ) t
       GROUP BY TO_CHAR(t.date, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 6`,
      [userId]
    );
    
    console.log('📊 Spending by month (last 6 months):');
    spendingByMonth.rows.forEach(row => {
      const isCurrent = row.month === currentMonth;
      const marker = isCurrent ? '✅ CURRENT' : '  ';
      console.log(`   ${marker} ${row.month}: €${parseFloat(row.total_spent).toFixed(2)} (${row.transaction_count} transactions)`);
    });
    console.log('');
    
    // Check if budget overview is using correct month filter
    console.log('🔍 Checking budget overview query...\n');
    
    const budgetSpending = await client.query(
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
       ORDER BY total_spent DESC
       LIMIT 10`,
      [userId, currentMonthDate]
    );
    
    console.log(`📊 Top spending categories for ${currentMonth}:`);
    budgetSpending.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.category}: €${parseFloat(row.total_spent).toFixed(2)} (${row.transaction_count} transactions)`);
    });
    
    const totalBudgetSpending = budgetSpending.rows.reduce((sum, r) => sum + parseFloat(r.total_spent), 0);
    console.log(`\n   Total: €${totalBudgetSpending.toFixed(2)}`);
    
    // Verify it matches current month spending
    const matches = Math.abs(totalBudgetSpending - parseFloat(currentMonthSpending.rows[0].total_spent)) < 0.01;
    if (matches) {
      console.log(`\n✅ Budget spending matches current month spending!`);
    } else {
      console.log(`\n⚠️  Budget spending doesn't match!`);
      console.log(`   Budget query total: €${totalBudgetSpending.toFixed(2)}`);
      console.log(`   Current month total: €${parseFloat(currentMonthSpending.rows[0].total_spent).toFixed(2)}`);
      console.log(`   Difference: €${Math.abs(totalBudgetSpending - parseFloat(currentMonthSpending.rows[0].total_spent)).toFixed(2)}`);
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('verify-budget-month-filter')) {
  verifyBudgetMonthFilter()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default verifyBudgetMonthFilter;

