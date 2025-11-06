import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user settings
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const hasAuthHeader = req.headers['authorization'];
    
    // TEMPORARY FIX: If Authorization header is present, return ALL settings (even if userId is null)
    let result;
    if (userId || hasAuthHeader) {
      if (userId) {
        result = await pool.query(
          'SELECT * FROM user_settings WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id DESC LIMIT 1',
          [userId]
        );
      } else {
        // userId is null but has auth header - return ALL settings (prefer non-null user_id)
        result = await pool.query(
          'SELECT * FROM user_settings ORDER BY user_id DESC NULLS LAST LIMIT 1'
        );
        console.log('⚠️ TEMPORARY: Returning ALL settings (userId is null but auth header present)');
      }
    } else {
      // If not logged in, get only shared settings (user_id IS NULL)
      result = await pool.query(
        'SELECT * FROM user_settings WHERE user_id IS NULL'
      );
    }
    
    // If no settings exist, return defaults
    if (result.rows.length === 0) {
      return res.json({
        expectedMonthlyIncome: 0
      });
    }
    
    res.json({
      expectedMonthlyIncome: parseFloat(result.rows[0].expected_monthly_income || 0)
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.post('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || 0;
    const { expectedMonthlyIncome } = req.body;
    
    if (expectedMonthlyIncome === undefined || expectedMonthlyIncome < 0) {
      return res.status(400).json({ error: 'Invalid expected monthly income' });
    }
    
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, expected_monthly_income, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET expected_monthly_income = $2, updated_at = NOW()
       RETURNING *`,
      [userId, expectedMonthlyIncome]
    );
    
    res.json({
      message: 'Settings updated successfully',
      expectedMonthlyIncome: parseFloat(result.rows[0].expected_monthly_income)
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get actual income for a specific month
router.get('/actual-income/:month', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { month } = req.params; // Format: 'YYYY-MM'
    
    // Calculate actual income using applicable_month if available, else use date
    const result = await pool.query(
      `SELECT SUM(amount) as actual_income
       FROM transactions
       WHERE type = 'income'
       AND computable = true
       AND (user_id IS NULL OR user_id = $1)
       AND (
         (applicable_month IS NOT NULL AND applicable_month = $2)
         OR
         (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $2)
       )`,
      [userId, month]
    );
    
    const actualIncome = parseFloat(result.rows[0]?.actual_income || 0);
    
    res.json({
      month,
      actualIncome
    });
  } catch (error) {
    console.error('Get actual income error:', error);
    res.status(500).json({ error: 'Failed to calculate actual income' });
  }
});

// Calculate expected income based on last 3 months average
router.get('/calculate-expected-income', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get last 3 months of actual income
    const result = await pool.query(
      `WITH monthly_income AS (
        SELECT 
          COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM')) as month,
          SUM(amount) as income
        FROM transactions
        WHERE type = 'income'
        AND computable = true
        AND (user_id IS NULL OR user_id = $1)
        AND date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM'))
        ORDER BY month DESC
        LIMIT 3
      )
      SELECT 
        AVG(income) as avg_income,
        COUNT(*) as month_count,
        ARRAY_AGG(month ORDER BY month DESC) as months,
        ARRAY_AGG(income ORDER BY month DESC) as incomes
      FROM monthly_income`,
      [userId]
    );
    
    const avgIncome = parseFloat(result.rows[0]?.avg_income || 0);
    const monthCount = parseInt(result.rows[0]?.month_count || 0);
    const months = result.rows[0]?.months || [];
    const incomes = result.rows[0]?.incomes || [];
    
    res.json({
      suggestedExpectedIncome: avgIncome,
      basedOnMonths: monthCount,
      monthsData: months.map((month, i) => ({
        month,
        income: parseFloat(incomes[i])
      }))
    });
  } catch (error) {
    console.error('Calculate expected income error:', error);
    res.status(500).json({ error: 'Failed to calculate expected income' });
  }
});

// Update expected income with calculated average
router.post('/update-expected-from-actual', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || 0;
    
    // Calculate average from last 3 months
    const calcResult = await pool.query(
      `WITH monthly_income AS (
        SELECT 
          COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM')) as month,
          SUM(amount) as income
        FROM transactions
        WHERE type = 'income'
        AND computable = true
        AND (user_id IS NULL OR user_id = $1)
        AND date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM'))
        ORDER BY month DESC
        LIMIT 3
      )
      SELECT AVG(income) as avg_income
      FROM monthly_income`,
      [userId === 0 ? null : userId]
    );
    
    const avgIncome = parseFloat(calcResult.rows[0]?.avg_income || 0);
    
    if (avgIncome <= 0) {
      return res.status(400).json({ 
        error: 'No income data available for last 3 months' 
      });
    }
    
    // Update expected income
    const updateResult = await pool.query(
      `INSERT INTO user_settings (user_id, expected_monthly_income, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET expected_monthly_income = $2, updated_at = NOW()
       RETURNING *`,
      [userId, avgIncome]
    );
    
    res.json({
      message: 'Expected income updated successfully',
      expectedMonthlyIncome: parseFloat(updateResult.rows[0].expected_monthly_income),
      calculatedFrom: 'last 3 months average'
    });
  } catch (error) {
    console.error('Update expected from actual error:', error);
    res.status(500).json({ error: 'Failed to update expected income' });
  }
});

export default router;

