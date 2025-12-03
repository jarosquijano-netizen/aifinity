import pool from '../config/database.js';

/**
 * Verify that balances and transactions are consistent across:
 * - Dashboard (summary)
 * - Budget
 * - Insights/Trends
 * - Accounts
 */

async function verifyPlatformConsistency() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying platform consistency...\n');
    
    const userId = 1;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthDate = currentMonth + '-01';
    
    // 1. Check account filtering (exclude_from_stats)
    console.log('📊 1. Account Filtering:\n');
    const allAccounts = await client.query(
      `SELECT id, name, balance, exclude_from_stats
       FROM bank_accounts
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY name`,
      [userId]
    );
    
    const includedAccounts = allAccounts.rows.filter(a => !a.exclude_from_stats);
    const excludedAccounts = allAccounts.rows.filter(a => a.exclude_from_stats);
    
    console.log(`   Total accounts: ${allAccounts.rows.length}`);
    console.log(`   Included in stats: ${includedAccounts.length}`);
    console.log(`   Excluded from stats: ${excludedAccounts.length}`);
    excludedAccounts.forEach(acc => {
      console.log(`      - ${acc.name} (€${parseFloat(acc.balance || 0).toFixed(2)})`);
    });
    console.log('');
    
    // 2. Check transaction filtering consistency
    console.log('📊 2. Transaction Filtering:\n');
    
    // Standard filter: computable = true, account not excluded
    const standardFilter = `
      t.user_id = $1
      AND t.computable = true
      AND (t.account_id IS NULL OR EXISTS (
        SELECT 1 FROM bank_accounts ba 
        WHERE ba.id = t.account_id 
        AND (ba.exclude_from_stats = false OR ba.exclude_from_stats IS NULL)
      ))
    `;
    
    // Check total transactions
    const totalTransactions = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       WHERE ${standardFilter}`,
      [userId]
    );
    console.log(`   Total computable transactions (not excluded): ${totalTransactions.rows[0].count}`);
    
    // Check current month income (using applicable_month)
    const currentMonthIncome = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions t
       WHERE ${standardFilter}
       AND t.type = 'income'
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
       )`,
      [userId, currentMonth]
    );
    console.log(`   Current month income: €${parseFloat(currentMonthIncome.rows[0].total).toFixed(2)}`);
    
    // Check current month expenses (using date only)
    const currentMonthExpenses = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions t
       WHERE ${standardFilter}
       AND t.type = 'expense'
       AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)`,
      [userId, currentMonthDate]
    );
    console.log(`   Current month expenses: €${parseFloat(currentMonthExpenses.rows[0].total).toFixed(2)}`);
    console.log('');
    
    // 3. Check account balances consistency
    console.log('📊 3. Account Balances:\n');
    const accountBalances = await client.query(
      `SELECT 
        ba.id,
        ba.name,
        ba.balance as stored_balance,
        ba.exclude_from_stats,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as calculated_balance
       FROM bank_accounts ba
       LEFT JOIN transactions t ON ba.id = t.account_id AND t.computable = true
       WHERE ba.user_id = $1 OR ba.user_id IS NULL
       GROUP BY ba.id, ba.name, ba.balance, ba.exclude_from_stats
       ORDER BY ba.name`,
      [userId]
    );
    
    let totalStoredBalance = 0;
    let totalCalculatedBalance = 0;
    
    accountBalances.rows.forEach(acc => {
      const stored = parseFloat(acc.stored_balance || 0);
      const calculated = parseFloat(acc.calculated_balance || 0);
      const diff = stored - calculated;
      
      if (!acc.exclude_from_stats) {
        totalStoredBalance += stored;
        totalCalculatedBalance += calculated;
      }
      
      if (Math.abs(diff) > 1) {
        const status = acc.exclude_from_stats ? '🚫' : '⚠️';
        console.log(`${status} ${acc.name}:`);
        console.log(`   Stored: €${stored.toFixed(2)} | Calculated: €${calculated.toFixed(2)} | Diff: €${diff.toFixed(2)}`);
      }
    });
    
    console.log(`\n   Total stored balance (included accounts): €${totalStoredBalance.toFixed(2)}`);
    console.log(`   Total calculated balance (included accounts): €${totalCalculatedBalance.toFixed(2)}`);
    console.log(`   Difference: €${(totalStoredBalance - totalCalculatedBalance).toFixed(2)}`);
    console.log('');
    
    // 4. Verify all endpoints use same filters
    console.log('📊 4. Endpoint Consistency Check:\n');
    
    // Summary endpoint filter (should match)
    const summaryIncome = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'income'
         AND t.computable = true
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) unique_transactions`,
      [userId, currentMonth]
    );
    
    // Budget endpoint filter (should match)
    const budgetIncome = await client.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'income'
         AND t.computable = true
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.type, t.id
       ) t`,
      [userId, currentMonth]
    );
    
    // Trends endpoint filter (should match)
    const trendsIncome = await client.query(
      `SELECT COALESCE(SUM(t.amount), 0) as total
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         AND t.type = 'income'
         AND (
           (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
           OR
           (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
         )
         ORDER BY t.date, t.description, t.amount, t.type, t.id
       ) t`,
      [userId, currentMonth]
    );
    
    const summaryIncomeVal = parseFloat(summaryIncome.rows[0].total);
    const budgetIncomeVal = parseFloat(budgetIncome.rows[0].total);
    const trendsIncomeVal = parseFloat(trendsIncome.rows[0].total);
    
    console.log(`   Summary endpoint income: €${summaryIncomeVal.toFixed(2)}`);
    console.log(`   Budget endpoint income: €${budgetIncomeVal.toFixed(2)}`);
    console.log(`   Trends endpoint income: €${trendsIncomeVal.toFixed(2)}`);
    
    const allMatch = Math.abs(summaryIncomeVal - budgetIncomeVal) < 0.01 && 
                     Math.abs(summaryIncomeVal - trendsIncomeVal) < 0.01;
    
    if (allMatch) {
      console.log(`   ✅ All endpoints match!`);
    } else {
      console.log(`   ⚠️  Endpoints don't match!`);
      console.log(`   Difference Summary-Budget: €${Math.abs(summaryIncomeVal - budgetIncomeVal).toFixed(2)}`);
      console.log(`   Difference Summary-Trends: €${Math.abs(summaryIncomeVal - trendsIncomeVal).toFixed(2)}`);
    }
    console.log('');
    
    // 5. Check for excluded accounts in transactions
    console.log('📊 5. Excluded Accounts Check:\n');
    const transactionsOnExcludedAccounts = await client.query(
      `SELECT COUNT(*) as count
       FROM transactions t
       INNER JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND ba.exclude_from_stats = true
       AND t.computable = true`,
      [userId]
    );
    
    console.log(`   Transactions on excluded accounts: ${transactionsOnExcludedAccounts.rows[0].count}`);
    if (parseInt(transactionsOnExcludedAccounts.rows[0].count) > 0) {
      console.log(`   ⚠️  These transactions should be excluded from calculations!`);
    } else {
      console.log(`   ✅ No transactions on excluded accounts`);
    }
    console.log('');
    
    console.log('✅ Consistency check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('verify-platform-consistency')) {
  verifyPlatformConsistency()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export default verifyPlatformConsistency;

