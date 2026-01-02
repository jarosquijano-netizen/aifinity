import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get summary statistics
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get overall totals (only computable transactions)
    let totalsResult;
    try {
      if (userId) {
        // User is logged in - get their transactions
        totalsResult = await pool.query(
          `SELECT 
             SUM(CASE WHEN t.type = 'income' AND t.computable = true THEN t.amount ELSE 0 END) as total_income,
             SUM(CASE WHEN t.type = 'expense' AND t.computable = true THEN t.amount ELSE 0 END) as total_expenses,
             COUNT(*) as transaction_count,
             MIN(t.date) as oldest_transaction_date,
             MAX(t.date) as newest_transaction_date
           FROM (
             SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
               t.date, t.description, t.amount, t.type, t.computable
             FROM transactions t
             LEFT JOIN bank_accounts ba ON t.account_id = ba.id
             WHERE t.user_id = $1
             AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
             ORDER BY t.date, t.description, t.amount, t.type, t.id
           ) t`,
          [userId]
        );
      } else {
        // Not logged in - get only shared transactions
        totalsResult = await pool.query(
          `SELECT 
             SUM(CASE WHEN t.type = 'income' AND t.computable = true THEN t.amount ELSE 0 END) as total_income,
             SUM(CASE WHEN t.type = 'expense' AND t.computable = true THEN t.amount ELSE 0 END) as total_expenses,
             COUNT(*) as transaction_count,
             MIN(t.date) as oldest_transaction_date,
             MAX(t.date) as newest_transaction_date
           FROM (
             SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
               t.date, t.description, t.amount, t.type, t.computable
             FROM transactions t
             LEFT JOIN bank_accounts ba ON t.account_id = ba.id
             WHERE t.user_id IS NULL
             AND (t.account_id IS NULL OR ba.id IS NOT NULL)
             ORDER BY t.date, t.description, t.amount, t.type, t.id
           ) t`
        );
      }
    } catch (err) {
      console.error('❌ Error in totals query:', err);
      throw err;
    }

    const totals = totalsResult.rows[0];
    const netBalance = parseFloat(totals.total_income || 0) - parseFloat(totals.total_expenses || 0);

    // Get actual income AND expenses for current month (using applicable_month if available)
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    console.log(`📊 Summary - Calculating for month: ${currentMonth}, userId: ${userId}`);
    
    // Get actual income for current month - sum all income transactions, not just one
    // Use applicable_month if available, otherwise use date
    let actualIncomeResult;
    try {
      if (userId) {
        // First, let's see what income transactions exist for debugging
        const debugIncome = await pool.query(
          `SELECT 
            id, date, description, amount, applicable_month, computable,
            TO_CHAR(date, 'YYYY-MM') as transaction_month,
            account_id,
            (SELECT exclude_from_stats FROM bank_accounts WHERE id = t.account_id) as account_excluded
          FROM transactions t
          WHERE t.user_id = $1
          AND t.type = 'income'
          ORDER BY date DESC
          LIMIT 20`,
          [userId]
        );
        
        console.log(`📊 Summary - Found ${debugIncome.rows.length} income transactions (last 20):`);
        debugIncome.rows.forEach((row, idx) => {
          const applicableInfo = row.applicable_month ? `[→ ${row.applicable_month}]` : '';
          const excluded = row.account_excluded ? '❌ EXCLUIDA' : '✅';
          console.log(`   ${excluded} ${idx + 1}. [${row.date.toISOString().slice(0, 10)}] ${row.description?.substring(0, 40)}...`);
          console.log(`      €${parseFloat(row.amount || 0).toFixed(2)} | Mes: ${row.transaction_month} ${applicableInfo} | Computable: ${row.computable !== false}`);
        });
        
        // User is logged in - get their income
        // IMPORTANT: Remove DISTINCT ON to ensure all transactions are counted
        // The DISTINCT ON was incorrectly filtering out legitimate transactions
        actualIncomeResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as actual_income
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
           AND t.type = 'income'
           AND t.computable = true
           AND (
             (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
             OR
             (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
           )
           AND t.amount > 0`,
          [userId, currentMonth]
        );
      } else {
        // Not logged in - get only shared income
        // IMPORTANT: Remove DISTINCT ON to ensure all transactions are counted
        actualIncomeResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as actual_income
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND t.type = 'income'
           AND t.computable = true
           AND (
             (t.applicable_month IS NOT NULL AND t.applicable_month = $1)
             OR
             (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $1)
           )
           AND t.amount > 0`,
          [currentMonth]
        );
      }
    } catch (err) {
      console.error('❌ Error in actualIncome query:', err);
      throw err;
    }
    const actualIncome = parseFloat(actualIncomeResult.rows[0]?.actual_income || 0);
    console.log(`💰 Summary - Calculated actualIncome: €${actualIncome.toFixed(2)}`);

    // Get actual expenses for current month (only use actual date, not applicable_month)
    const currentMonthDate = currentMonth + '-01';
    let actualExpensesResult;
    if (userId) {
      // User is logged in - get their expenses
      // IMPORTANT: Remove DISTINCT ON to ensure all transactions are counted
      actualExpensesResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as actual_expenses
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND t.computable = true
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         AND t.amount > 0`,
        [userId, currentMonthDate]
      );
    } else {
      // Not logged in - get only shared expenses
      // IMPORTANT: Remove DISTINCT ON to ensure all transactions are counted
      actualExpensesResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as actual_expenses
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND t.computable = true
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $1::date)
         AND t.amount > 0`,
        [currentMonthDate]
      );
    }
    const actualExpenses = parseFloat(actualExpensesResult.rows[0]?.actual_expenses || 0);
    console.log(`💸 Summary - Calculated actualExpenses: €${actualExpenses.toFixed(2)}`);

    // Get category breakdown for current month (only computable transactions)
    // For expenses, use actual date only (never applicable_month); for income, use applicable_month if available
    let categoriesResult;
    if (userId) {
      // User is logged in - get their categories
      categoriesResult = await pool.query(
        `SELECT 
           t.category,
           SUM(t.amount) as total,
           COUNT(*) as count,
           t.type
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount, t.type, t.date, t.applicable_month
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND t.computable = true
           AND (
             (t.type = 'income' AND (
               (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
               OR
               (t.applicable_month IS NULL AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $3::date))
             ))
             OR
             (t.type = 'expense' AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $3::date))
           )
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY t.category, t.type
         ORDER BY total DESC`,
        [userId, currentMonth, currentMonthDate]
      );
    } else {
      // Not logged in - get only shared categories
      categoriesResult = await pool.query(
        `SELECT 
           t.category,
           SUM(t.amount) as total,
           COUNT(*) as count,
           t.type
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount, t.type, t.date, t.applicable_month
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND t.computable = true
           AND (
             (t.type = 'income' AND (
               (t.applicable_month IS NOT NULL AND t.applicable_month = $1)
               OR
               (t.applicable_month IS NULL AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date))
             ))
             OR
             (t.type = 'expense' AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date))
           )
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY t.category, t.type
         ORDER BY total DESC`,
        [currentMonth, currentMonthDate]
      );
    }

    // Get recent transactions
    let recentResult;
    if (userId) {
      // User is logged in - get their recent transactions
      recentResult = await pool.query(
        `SELECT t.*
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.*
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           ORDER BY t.date DESC, t.description, t.amount, t.type, t.id DESC
         ) t
         ORDER BY t.date DESC
         LIMIT 10`,
        [userId]
      );
    } else {
      // Not logged in - get only shared recent transactions
      recentResult = await pool.query(
        `SELECT t.*
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) t.*
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           ORDER BY t.date DESC, t.description, t.amount, t.type, t.id DESC
         ) t
         ORDER BY t.date DESC
         LIMIT 10`
      );
    }

    // Calculate actual net balance for current month (from transactions)
    const actualNetBalance = actualIncome - actualExpenses;
    
    // Calculate total balance from accounts (excluding accounts marked as exclude_from_stats)
    let accountsBalanceResult;
    if (userId) {
      accountsBalanceResult = await pool.query(
        `SELECT COALESCE(SUM(balance), 0) as total_balance
         FROM bank_accounts
         WHERE user_id = $1
         AND (exclude_from_stats IS NULL OR exclude_from_stats = false)`,
        [userId]
      );
    } else {
      accountsBalanceResult = await pool.query(
        `SELECT COALESCE(SUM(balance), 0) as total_balance
         FROM bank_accounts
         WHERE user_id IS NULL
         AND (exclude_from_stats IS NULL OR exclude_from_stats = false)`
      );
    }
    
    const accountsBalance = parseFloat(accountsBalanceResult.rows[0]?.total_balance || 0);
    
    // Use accounts balance as the primary balance (more accurate)
    // actualNetBalance is kept for reference but accountsBalance is the real balance
    const finalBalance = accountsBalance;

    res.json({
      totalIncome: parseFloat(totals.total_income || 0),
      totalExpenses: parseFloat(totals.total_expenses || 0),
      netBalance: netBalance,
      transactionCount: parseInt(totals.transaction_count || 0),
      oldestTransactionDate: totals.oldest_transaction_date,
      newestTransactionDate: totals.newest_transaction_date,
      actualIncome: actualIncome,
      actualExpenses: actualExpenses,
      actualNetBalance: actualNetBalance, // From transactions (for reference)
      accountsBalance: finalBalance, // From accounts (primary balance)
      currentMonth: currentMonth,
      categories: categoriesResult.rows,
      recentTransactions: recentResult.rows
    });
  } catch (error) {
    console.error('❌ Summary error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    res.status(500).json({ 
      error: 'Failed to fetch summary',
      message: error.message,
      details: error.detail || error.hint || 'Check server logs'
    });
  }
});

export default router;
