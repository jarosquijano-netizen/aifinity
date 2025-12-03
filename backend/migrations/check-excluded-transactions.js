import pool from '../config/database.js';

async function checkExcludedTransactions() {
  const client = await pool.connect();
  
  try {
    const userId = 1;
    
    // Find transactions on excluded accounts
    const excludedTransactions = await client.query(
      `SELECT 
        t.id, t.date, t.description, t.type, t.amount, t.category,
        ba.name as account_name, ba.exclude_from_stats
       FROM transactions t
       INNER JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND ba.exclude_from_stats = true
       AND t.computable = true
       ORDER BY t.date DESC`,
      [userId]
    );
    
    console.log(`📊 Transactions on excluded accounts: ${excludedTransactions.rows.length}\n`);
    
    if (excludedTransactions.rows.length > 0) {
      excludedTransactions.rows.forEach(t => {
        console.log(`   [${t.date.toISOString().slice(0, 10)}] ${t.type}: €${parseFloat(t.amount).toFixed(2)}`);
        console.log(`      Account: ${t.account_name} | Category: ${t.category}`);
        console.log(`      Description: ${t.description?.substring(0, 60)}...`);
        console.log('');
      });
      
      const totalAmount = excludedTransactions.rows.reduce((sum, t) => {
        return sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
      }, 0);
      
      console.log(`   Total impact if included: €${totalAmount.toFixed(2)}\n`);
    }
    
    // Verify they're excluded from summary calculations
    const summaryWithExcluded = await client.query(
      `SELECT 
        SUM(CASE WHEN t.type = 'income' AND t.computable = true THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'expense' AND t.computable = true THEN t.amount ELSE 0 END) as total_expenses
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND (t.account_id IS NULL OR ba.id IS NOT NULL)`,
      [userId]
    );
    
    const summaryWithoutExcluded = await client.query(
      `SELECT 
        SUM(CASE WHEN t.type = 'income' AND t.computable = true THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'expense' AND t.computable = true THEN t.amount ELSE 0 END) as total_expenses
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.user_id = $1
       AND (t.account_id IS NULL OR (ba.id IS NOT NULL AND (ba.exclude_from_stats = false OR ba.exclude_from_stats IS NULL)))`,
      [userId]
    );
    
    const incomeWith = parseFloat(summaryWithExcluded.rows[0].total_income || 0);
    const incomeWithout = parseFloat(summaryWithoutExcluded.rows[0].total_income || 0);
    const expensesWith = parseFloat(summaryWithExcluded.rows[0].total_expenses || 0);
    const expensesWithout = parseFloat(summaryWithoutExcluded.rows[0].total_expenses || 0);
    
    console.log('📊 Summary Comparison:\n');
    console.log(`   Income WITH excluded accounts: €${incomeWith.toFixed(2)}`);
    console.log(`   Income WITHOUT excluded accounts: €${incomeWithout.toFixed(2)}`);
    console.log(`   Difference: €${(incomeWith - incomeWithout).toFixed(2)}\n`);
    console.log(`   Expenses WITH excluded accounts: €${expensesWith.toFixed(2)}`);
    console.log(`   Expenses WITHOUT excluded accounts: €${expensesWithout.toFixed(2)}`);
    console.log(`   Difference: €${(expensesWith - expensesWithout).toFixed(2)}\n`);
    
    if (Math.abs(incomeWith - incomeWithout) < 0.01 && Math.abs(expensesWith - expensesWithout) < 0.01) {
      console.log('✅ Filters are working correctly - excluded accounts are not included!');
    } else {
      console.log('⚠️  Filters need adjustment - excluded accounts are still being counted!');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkExcludedTransactions().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });

