import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get summary statistics
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Get overall totals (only computable transactions)
    const totalsResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
         COUNT(*) as transaction_count,
         MIN(date) as oldest_transaction_date,
         MAX(date) as newest_transaction_date
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)`,
      [userId]
    );

    const totals = totalsResult.rows[0];
    const netBalance = parseFloat(totals.total_income || 0) - parseFloat(totals.total_expenses || 0);

    // Get actual income AND expenses for current month (using applicable_month if available)
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get actual income for current month - sum all income transactions, not just one
    // Use applicable_month if available, otherwise use date
    const actualIncomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM transactions
       WHERE type = 'income'
       AND computable = true
       AND (user_id IS NULL OR user_id = $1)
       AND (
         (applicable_month IS NOT NULL AND applicable_month = $2)
         OR
         (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
       )
       AND amount > 0`,
      [userId, currentMonth]
    );
    const actualIncome = parseFloat(actualIncomeResult.rows[0]?.actual_income || 0);

    // Get actual expenses for current month (only use actual date, not applicable_month)
    // Use DATE_TRUNC to ensure we're comparing dates correctly, ignoring time components
    // Explicitly ignore applicable_month for expenses - expenses should always use actual transaction date
    const currentMonthDate = currentMonth + '-01';
    const actualExpensesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_expenses
       FROM transactions
       WHERE type = 'expense'
       AND computable = true
       AND (user_id IS NULL OR user_id = $1)
       AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
       AND amount > 0`,
      [userId, currentMonthDate]
    );
    const actualExpenses = parseFloat(actualExpensesResult.rows[0]?.actual_expenses || 0);

    // Get category breakdown for current month (only computable transactions)
    // For expenses, use actual date only (never applicable_month); for income, use applicable_month if available
    const categoriesResult = await pool.query(
      `SELECT 
         category,
         SUM(amount) as total,
         COUNT(*) as count,
         type
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1) 
       AND computable = true
       AND (
         (type = 'income' AND (
           (applicable_month IS NOT NULL AND applicable_month = $2)
           OR
           (applicable_month IS NULL AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $3::date))
         ))
         OR
         (type = 'expense' AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $3::date))
       )
       GROUP BY category, type
       ORDER BY total DESC`,
      [userId, currentMonth, currentMonthDate]
    );

    // Get recent transactions
    const recentResult = await pool.query(
      `SELECT * FROM transactions
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY date DESC
       LIMIT 10`,
      [userId]
    );

    // Calculate actual net balance for current month
    const actualNetBalance = actualIncome - actualExpenses;

    res.json({
      totalIncome: parseFloat(totals.total_income || 0),
      totalExpenses: parseFloat(totals.total_expenses || 0),
      netBalance: netBalance,
      transactionCount: parseInt(totals.transaction_count || 0),
      oldestTransactionDate: totals.oldest_transaction_date,
      newestTransactionDate: totals.newest_transaction_date,
      actualIncome: actualIncome,
      actualExpenses: actualExpenses,
      actualNetBalance: actualNetBalance,
      currentMonth: currentMonth,
      categories: categoriesResult.rows,
      recentTransactions: recentResult.rows
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;



