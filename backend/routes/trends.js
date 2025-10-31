import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get trends data
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Get monthly trends (exclude transfers)
    const trendsResult = await pool.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as month,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
         COUNT(*) as transaction_count
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       AND (computable = true OR computable IS NULL)
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 12`,
      [userId]
    );

    const trends = trendsResult.rows.map(row => ({
      month: row.month,
      income: parseFloat(row.income || 0),
      expenses: parseFloat(row.expenses || 0),
      netBalance: parseFloat(row.income || 0) - parseFloat(row.expenses || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));

    // Get category trends (exclude transfers)
    const categoryTrendsResult = await pool.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as month,
         category,
         SUM(amount) as total,
         type
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       AND (computable = true OR computable IS NULL)
       GROUP BY TO_CHAR(date, 'YYYY-MM'), category, type
       ORDER BY month DESC, total DESC`,
      [userId]
    );

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
    const result = await pool.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as month,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       AND (computable = true OR computable IS NULL)
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY month DESC
       LIMIT 2`,
      [userId]
    );

    const insights = [];

    if (result.rows.length >= 2) {
      const currentMonth = result.rows[0];
      const previousMonth = result.rows[1];

      const expenseChange = ((parseFloat(currentMonth.expenses) - parseFloat(previousMonth.expenses)) / parseFloat(previousMonth.expenses)) * 100;
      const incomeChange = ((parseFloat(currentMonth.income) - parseFloat(previousMonth.income)) / parseFloat(previousMonth.income)) * 100;

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
    }

    // Get top spending category (exclude transfers)
    const topCategoryResult = await pool.query(
      `SELECT category, SUM(amount) as total
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1) 
       AND type = 'expense'
       AND (computable = true OR computable IS NULL)
       GROUP BY category
       ORDER BY total DESC
       LIMIT 1`,
      [userId]
    );

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
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

export default router;








