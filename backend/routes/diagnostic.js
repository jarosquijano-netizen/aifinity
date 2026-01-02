import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Diagnostic endpoint to check dashboard calculations
router.get('/dashboard', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthDate = currentMonth + '-01';
    
    const diagnostic = {
      userId,
      currentMonth,
      currentMonthDate,
      timestamp: new Date().toISOString(),
      income: {},
      expenses: {},
      accounts: {}
    };
    
    // Get all income transactions for debugging
    const allIncome = await pool.query(
      `SELECT 
        id, date, description, amount, applicable_month, computable,
        TO_CHAR(date, 'YYYY-MM') as transaction_month,
        account_id,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = t.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = t.account_id) as account_name
      FROM transactions t
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
      AND t.type = 'income'
      ORDER BY date DESC
      LIMIT 50`,
      [userId]
    );
    
    diagnostic.income.allTransactions = allIncome.rows.map(row => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount || 0),
      applicable_month: row.applicable_month,
      transaction_month: row.transaction_month,
      computable: row.computable !== false,
      account_id: row.account_id,
      account_name: row.account_name,
      account_excluded: row.account_excluded || false,
      belongsToCurrentMonth: row.applicable_month === currentMonth || 
                            (row.applicable_month === null && row.transaction_month === currentMonth)
    }));
    
    // Calculate income using same logic as summary endpoint
    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
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
    
    diagnostic.income.calculated = parseFloat(incomeResult.rows[0]?.actual_income || 0);
    diagnostic.income.count = allIncome.rows.length;
    diagnostic.income.currentMonthCount = diagnostic.income.allTransactions.filter(t => t.belongsToCurrentMonth).length;
    
    // Get all expense transactions for debugging
    const allExpenses = await pool.query(
      `SELECT 
        id, date, description, amount, computable,
        TO_CHAR(date, 'YYYY-MM') as transaction_month,
        account_id,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = t.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = t.account_id) as account_name
      FROM transactions t
      WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
      AND t.type = 'expense'
      AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
      ORDER BY date DESC
      LIMIT 50`,
      [userId, currentMonthDate]
    );
    
    diagnostic.expenses.allTransactions = allExpenses.rows.map(row => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: parseFloat(row.amount || 0),
      transaction_month: row.transaction_month,
      computable: row.computable !== false,
      account_id: row.account_id,
      account_name: row.account_name,
      account_excluded: row.account_excluded || false
    }));
    
    // Calculate expenses using same logic as summary endpoint
    const expensesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_expenses
       FROM (
         SELECT DISTINCT ON (t.date, t.description, t.amount) t.amount
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND t.computable = true
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         AND t.amount > 0
         ORDER BY t.date, t.description, t.amount, t.id
       ) unique_transactions`,
      [userId, currentMonthDate]
    );
    
    diagnostic.expenses.calculated = parseFloat(expensesResult.rows[0]?.actual_expenses || 0);
    diagnostic.expenses.count = allExpenses.rows.length;
    
    // Get accounts info
    const accounts = await pool.query(
      `SELECT id, name, account_type, exclude_from_stats, balance
       FROM bank_accounts
       WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
       ORDER BY name`,
      [userId]
    );
    
    diagnostic.accounts.all = accounts.rows.map(row => ({
      id: row.id,
      name: row.name,
      account_type: row.account_type,
      exclude_from_stats: row.exclude_from_stats || false,
      balance: parseFloat(row.balance || 0)
    }));
    
    diagnostic.accounts.excludedCount = diagnostic.accounts.all.filter(a => a.exclude_from_stats).length;
    
    res.json(diagnostic);
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
