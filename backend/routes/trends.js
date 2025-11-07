import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get trends data
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Get monthly trends (exclude transfers, use applicable_month if available)
    let trendsResult;
    if (userId) {
      // User is logged in - get their trends
      trendsResult = await pool.query(
        `SELECT 
           COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')) as month,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses,
           COUNT(*) as transaction_count
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM'))
         ORDER BY month DESC
         LIMIT 12`,
        [userId]
      );
    } else {
      // Not logged in - get only shared trends
      trendsResult = await pool.query(
        `SELECT 
           COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')) as month,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses,
           COUNT(*) as transaction_count
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM'))
         ORDER BY month DESC
         LIMIT 12`
      );
    }

    const trends = trendsResult.rows.map(row => ({
      month: row.month,
      income: parseFloat(row.income || 0),
      expenses: parseFloat(row.expenses || 0),
      netBalance: parseFloat(row.income || 0) - parseFloat(row.expenses || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    // Get category trends (exclude transfers, use applicable_month if available)
    let categoryTrendsResult;
    if (userId) {
      // User is logged in - get their category trends
      categoryTrendsResult = await pool.query(
        `SELECT 
           COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')) as month,
           t.category,
           SUM(t.amount) as total,
           t.type
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')), t.category, t.type
         ORDER BY month DESC, total DESC`,
        [userId]
      );
    } else {
      // Not logged in - get only shared category trends
      categoryTrendsResult = await pool.query(
        `SELECT 
           COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')) as month,
           t.category,
           SUM(t.amount) as total,
           t.type
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY COALESCE(t.applicable_month, TO_CHAR(t.date, 'YYYY-MM')), t.category, t.type
         ORDER BY month DESC, total DESC`
      );
    }

    res.json({
      monthlyTrends: trends.reverse(),
      categoryTrends: categoryTrendsResult.rows
    });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Get insights
router.get('/insights', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Get last 2 months for comparison (exclude transfers)
    let result;
    if (userId) {
      // User is logged in - get their insights
      result = await pool.query(
        `SELECT 
           TO_CHAR(t.date, 'YYYY-MM') as month,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY TO_CHAR(t.date, 'YYYY-MM')
         ORDER BY month DESC
         LIMIT 2`,
        [userId]
      );
    } else {
      // Not logged in - get only shared insights
      result = await pool.query(
        `SELECT 
           TO_CHAR(t.date, 'YYYY-MM') as month,
           SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
           SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY TO_CHAR(t.date, 'YYYY-MM')
         ORDER BY month DESC
         LIMIT 2`
      );
    }

    const insights = [];

    if (result.rows.length >= 2) {
      const currentMonth = result.rows[0];
      const previousMonth = result.rows[1];

      const currentExpenses = parseFloat(currentMonth.expenses || 0);
      const previousExpenses = parseFloat(previousMonth.expenses || 0);
      const currentIncome = parseFloat(currentMonth.income || 0);
      const previousIncome = parseFloat(previousMonth.income || 0);

      // Only calculate percentage changes if previous month has data
      if (previousExpenses > 0) {
        const expenseChange = ((currentExpenses - previousExpenses) / previousExpenses) * 100;
        if (expenseChange > 0) {
          insights.push({
            type: 'warning',
            message: `Your spending increased by ${Math.abs(expenseChange).toFixed(1)}% this month compared to last month.`
          });
        } else if (expenseChange < 0) {
          insights.push({
            type: 'success',
            message: `Great! Your spending decreased by ${Math.abs(expenseChange).toFixed(1)}% this month.`
          });
        }
      } else if (currentExpenses > 0) {
        insights.push({
          type: 'info',
          message: `You spent €${currentExpenses.toFixed(2)} this month.`
        });
      }

      if (previousIncome > 0) {
        const incomeChange = ((currentIncome - previousIncome) / previousIncome) * 100;
        if (incomeChange > 0) {
          insights.push({
            type: 'success',
            message: `Your income increased by ${Math.abs(incomeChange).toFixed(1)}% this month.`
          });
        } else if (incomeChange < 0) {
          insights.push({
            type: 'info',
            message: `Your income decreased by ${Math.abs(incomeChange).toFixed(1)}% this month.`
          });
        }
      } else if (currentIncome > 0) {
        insights.push({
          type: 'info',
          message: `You earned €${currentIncome.toFixed(2)} this month.`
        });
      }
    } else if (result.rows.length === 1) {
      // Only one month of data
      const currentMonth = result.rows[0];
      const currentExpenses = parseFloat(currentMonth.expenses || 0);
      const currentIncome = parseFloat(currentMonth.income || 0);
      
      if (currentExpenses > 0) {
        insights.push({
          type: 'info',
          message: `You spent €${currentExpenses.toFixed(2)} this month.`
        });
      }
      
      if (currentIncome > 0) {
        insights.push({
          type: 'info',
          message: `You earned €${currentIncome.toFixed(2)} this month.`
        });
      }
    }

    // Get top spending category (exclude transfers)
    let topCategoryResult;
    if (userId) {
      // User is logged in - get their top category
      topCategoryResult = await pool.query(
        `SELECT t.category, SUM(t.amount) as total
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY t.category
         ORDER BY total DESC
         LIMIT 1`,
        [userId]
      );
    } else {
      // Not logged in - get only shared top category
      topCategoryResult = await pool.query(
        `SELECT t.category, SUM(t.amount) as total
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND t.type = 'expense'
         AND (t.computable = true OR t.computable IS NULL)
         GROUP BY t.category
         ORDER BY total DESC
         LIMIT 1`
      );
    }

    if (topCategoryResult.rows.length > 0) {
      const topCategory = topCategoryResult.rows[0];
      insights.push({
        type: 'info',
        message: `Your highest spending category is "${topCategory.category}" with €${parseFloat(topCategory.total).toFixed(2)}.`
      });
    }

    res.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: error.message,
      details: error.detail || error.hint || 'Check server logs'
    });
  }
});

export default router;








