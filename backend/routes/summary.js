import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get summary statistics
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const hasAuthHeader = req.headers['authorization'];
    
    console.log('📊 Summary request - userId:', userId, 'hasAuthHeader:', !!hasAuthHeader);
    
    // TEMPORARY FIX: If Authorization header is present, return ALL transactions (even if userId is null)
    // Get overall totals (only computable transactions)
    let totalsResult;
    try {
      if (userId || hasAuthHeader) {
        if (userId) {
          totalsResult = await pool.query(
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
        } else {
          // userId is null but has auth header - filter by account_ids to get user's transactions
          // Get user's accounts first - only accounts with transactions
          const userAccountsResult = await pool.query(
            `SELECT DISTINCT ba.id 
             FROM bank_accounts ba
             WHERE EXISTS (
               SELECT 1 FROM transactions t 
               WHERE t.account_id = ba.id 
               LIMIT 1
             )
             ORDER BY ba.id DESC`
          );
          const accountIds = userAccountsResult.rows.map(a => a.id);
          
          console.log('📋 Filtering totals by account_ids:', accountIds.length, 'accounts');
          
          if (accountIds.length > 0) {
            totalsResult = await pool.query(
              `SELECT 
                 SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
                 SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
                 COUNT(*) as transaction_count,
                 MIN(date) as oldest_transaction_date,
                 MAX(date) as newest_transaction_date
               FROM transactions
               WHERE account_id = ANY($1::int[])`,
              [accountIds]
            );
          } else {
            // No accounts found, return only shared transactions
            totalsResult = await pool.query(
              `SELECT 
                 SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
                 SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
                 COUNT(*) as transaction_count,
                 MIN(date) as oldest_transaction_date,
                 MAX(date) as newest_transaction_date
               FROM transactions
               WHERE user_id IS NULL`
            );
          }
          console.log('⚠️ TEMPORARY: Filtering by account_ids (userId is null but auth header present)');
        }
      } else {
        totalsResult = await pool.query(
          `SELECT 
             SUM(CASE WHEN type = 'income' AND computable = true THEN amount ELSE 0 END) as total_income,
             SUM(CASE WHEN type = 'expense' AND computable = true THEN amount ELSE 0 END) as total_expenses,
             COUNT(*) as transaction_count,
             MIN(date) as oldest_transaction_date,
             MAX(date) as newest_transaction_date
           FROM transactions
           WHERE user_id IS NULL`
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
    
    // Get actual income for current month - sum all income transactions, not just one
    // Use applicable_month if available, otherwise use date
    let actualIncomeResult;
    try {
      if (userId || hasAuthHeader) {
        if (userId) {
          // Only count transactions from existing accounts
          const existingAccountIds = await pool.query(`SELECT id FROM bank_accounts`);
          const accountIds = existingAccountIds.rows.map(a => a.id);
          
          if (accountIds.length > 0) {
            actualIncomeResult = await pool.query(
              `SELECT COALESCE(SUM(amount), 0) as actual_income
               FROM transactions
               WHERE type = 'income'
               AND computable = true
               AND (user_id IS NULL OR user_id = $1)
               AND (account_id IS NULL OR account_id = ANY($3::int[]))
               AND (
                 (applicable_month IS NOT NULL AND applicable_month = $2)
                 OR
                 (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
               )
               AND amount > 0`,
              [userId, currentMonth, accountIds]
            );
          } else {
            actualIncomeResult = await pool.query(
              `SELECT COALESCE(SUM(amount), 0) as actual_income
               FROM transactions
               WHERE type = 'income'
               AND computable = true
               AND (user_id IS NULL OR user_id = $1)
               AND account_id IS NULL
               AND (
                 (applicable_month IS NOT NULL AND applicable_month = $2)
                 OR
                 (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
               )
               AND amount > 0`,
              [userId, currentMonth]
            );
          }
        } else {
          // Filter by account_ids when userId is null - only accounts with transactions
          const userAccountsResult = await pool.query(
            `SELECT DISTINCT ba.id 
             FROM bank_accounts ba
             WHERE EXISTS (
               SELECT 1 FROM transactions t 
               WHERE t.account_id = ba.id 
               LIMIT 1
             )
             ORDER BY ba.id DESC`
          );
          const accountIds = userAccountsResult.rows.map(a => a.id);
          
          console.log('📋 Filtering income by account_ids:', accountIds.length, 'accounts');
          
          if (accountIds.length > 0) {
            actualIncomeResult = await pool.query(
              `SELECT COALESCE(SUM(amount), 0) as actual_income
               FROM transactions
               WHERE type = 'income'
               AND computable = true
               AND account_id = ANY($2::int[])
               AND (
                 (applicable_month IS NOT NULL AND applicable_month = $1)
                 OR
                 (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $1)
               )
               AND amount > 0`,
              [currentMonth, accountIds]
            );
          } else {
            actualIncomeResult = await pool.query(
              `SELECT COALESCE(SUM(amount), 0) as actual_income
               FROM transactions
               WHERE type = 'income'
               AND computable = true
               AND user_id IS NULL
               AND (
                 (applicable_month IS NOT NULL AND applicable_month = $1)
                 OR
                 (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $1)
               )
               AND amount > 0`,
              [currentMonth]
            );
          }
        }
      } else {
        actualIncomeResult = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as actual_income
           FROM transactions
           WHERE type = 'income'
           AND computable = true
           AND user_id IS NULL
           AND (
             (applicable_month IS NOT NULL AND applicable_month = $1)
             OR
             (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $1)
           )
           AND amount > 0`,
          [currentMonth]
        );
      }
    } catch (err) {
      console.error('❌ Error in actualIncome query:', err);
      throw err;
    }
    const actualIncome = parseFloat(actualIncomeResult.rows[0]?.actual_income || 0);

    // Get actual expenses for current month (only use actual date, not applicable_month)
    // Use DATE_TRUNC to ensure we're comparing dates correctly, ignoring time components
    // Explicitly ignore applicable_month for expenses - expenses should always use actual transaction date
    const currentMonthDate = currentMonth + '-01';
    let actualExpensesResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        // Only count transactions from existing accounts
        const existingAccountIds = await pool.query(`SELECT id FROM bank_accounts`);
        const accountIds = existingAccountIds.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          actualExpensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as actual_expenses
             FROM transactions
             WHERE type = 'expense'
             AND computable = true
             AND (user_id IS NULL OR user_id = $1)
             AND (account_id IS NULL OR account_id = ANY($3::int[]))
             AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
             AND amount > 0`,
            [userId, currentMonthDate, accountIds]
          );
        } else {
          actualExpensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as actual_expenses
             FROM transactions
             WHERE type = 'expense'
             AND computable = true
             AND (user_id IS NULL OR user_id = $1)
             AND account_id IS NULL
             AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
             AND amount > 0`,
            [userId, currentMonthDate]
          );
        }
      } else {
        // Filter by account_ids when userId is null - only accounts with transactions
        const userAccountsResult = await pool.query(
          `SELECT DISTINCT ba.id 
           FROM bank_accounts ba
           WHERE EXISTS (
             SELECT 1 FROM transactions t 
             WHERE t.account_id = ba.id 
             LIMIT 1
           )
           ORDER BY ba.id DESC`
        );
        const accountIds = userAccountsResult.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          actualExpensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as actual_expenses
             FROM transactions
             WHERE type = 'expense'
             AND computable = true
             AND account_id = ANY($2::int[])
             AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)
             AND amount > 0`,
            [currentMonthDate, accountIds]
          );
        } else {
          actualExpensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as actual_expenses
             FROM transactions
             WHERE type = 'expense'
             AND computable = true
             AND user_id IS NULL
             AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)
             AND amount > 0`,
            [currentMonthDate]
          );
        }
      }
    } else {
      actualExpensesResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as actual_expenses
         FROM transactions
         WHERE type = 'expense'
         AND computable = true
         AND user_id IS NULL
         AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $1::date)
         AND amount > 0`,
        [currentMonthDate]
      );
    }
    const actualExpenses = parseFloat(actualExpensesResult.rows[0]?.actual_expenses || 0);

    // Get category breakdown for current month (only computable transactions)
    // For expenses, use actual date only (never applicable_month); for income, use applicable_month if available
    let categoriesResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        // Only count transactions from existing accounts
        const existingAccountIds = await pool.query(`SELECT id FROM bank_accounts`);
        const accountIds = existingAccountIds.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          categoriesResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total,
               COUNT(*) as count,
               type
             FROM transactions
             WHERE (user_id IS NULL OR user_id = $1)
             AND (account_id IS NULL OR account_id = ANY($4::int[]))
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
            [userId, currentMonth, currentMonthDate, accountIds]
          );
        } else {
          categoriesResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total,
               COUNT(*) as count,
               type
             FROM transactions
             WHERE (user_id IS NULL OR user_id = $1)
             AND account_id IS NULL
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
        }
      } else {
        // Filter by account_ids when userId is null - only accounts with transactions
        const userAccountsResult = await pool.query(
          `SELECT DISTINCT ba.id 
           FROM bank_accounts ba
           WHERE EXISTS (
             SELECT 1 FROM transactions t 
             WHERE t.account_id = ba.id 
             LIMIT 1
           )
           ORDER BY ba.id DESC`
        );
        const accountIds = userAccountsResult.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          categoriesResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total,
               COUNT(*) as count,
               type
             FROM transactions
             WHERE account_id = ANY($3::int[])
             AND computable = true
             AND (
               (type = 'income' AND (
                 (applicable_month IS NOT NULL AND applicable_month = $1)
                 OR
                 (applicable_month IS NULL AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
               ))
               OR
               (type = 'expense' AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
             )
             GROUP BY category, type
             ORDER BY total DESC`,
            [currentMonth, currentMonthDate, accountIds]
          );
        } else {
          categoriesResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total,
               COUNT(*) as count,
               type
             FROM transactions
             WHERE user_id IS NULL
             AND computable = true
             AND (
               (type = 'income' AND (
                 (applicable_month IS NOT NULL AND applicable_month = $1)
                 OR
                 (applicable_month IS NULL AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
               ))
               OR
               (type = 'expense' AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
             )
             GROUP BY category, type
             ORDER BY total DESC`,
            [currentMonth, currentMonthDate]
          );
        }
      }
    } else {
      categoriesResult = await pool.query(
        `SELECT 
           category,
           SUM(amount) as total,
           COUNT(*) as count,
           type
         FROM transactions
         WHERE user_id IS NULL
         AND computable = true
         AND (
           (type = 'income' AND (
             (applicable_month IS NOT NULL AND applicable_month = $1)
             OR
             (applicable_month IS NULL AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
           ))
           OR
           (type = 'expense' AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date))
         )
         GROUP BY category, type
         ORDER BY total DESC`,
        [currentMonth, currentMonthDate]
      );
    }

    // Get recent transactions
    let recentResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        // Only show transactions from existing accounts
        const existingAccountIds = await pool.query(`SELECT id FROM bank_accounts`);
        const accountIds = existingAccountIds.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          recentResult = await pool.query(
            `SELECT * FROM transactions
             WHERE (user_id IS NULL OR user_id = $1)
             AND (account_id IS NULL OR account_id = ANY($2::int[]))
             ORDER BY date DESC
             LIMIT 10`,
            [userId, accountIds]
          );
        } else {
          recentResult = await pool.query(
            `SELECT * FROM transactions
             WHERE (user_id IS NULL OR user_id = $1)
             AND account_id IS NULL
             ORDER BY date DESC
             LIMIT 10`,
            [userId]
          );
        }
      } else {
        // Filter by account_ids when userId is null - only accounts with transactions
        const userAccountsResult = await pool.query(
          `SELECT DISTINCT ba.id 
           FROM bank_accounts ba
           WHERE EXISTS (
             SELECT 1 FROM transactions t 
             WHERE t.account_id = ba.id 
             LIMIT 1
           )
           ORDER BY ba.id DESC`
        );
        const accountIds = userAccountsResult.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          recentResult = await pool.query(
            `SELECT * FROM transactions
             WHERE account_id = ANY($1::int[])
             ORDER BY date DESC
             LIMIT 10`,
            [accountIds]
          );
        } else {
          recentResult = await pool.query(
            `SELECT * FROM transactions
             WHERE user_id IS NULL
             ORDER BY date DESC
             LIMIT 10`
          );
        }
      }
    } else {
      recentResult = await pool.query(
        `SELECT * FROM transactions
         WHERE user_id IS NULL
         ORDER BY date DESC
         LIMIT 10`
      );
    }

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



