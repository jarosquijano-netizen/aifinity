import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user settings
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get settings for the current user
    let result;
    if (userId) {
      // User is logged in - get their settings
      result = await pool.query(
        'SELECT * FROM user_settings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [userId]
      );
    } else {
      // If not logged in, get only shared settings (user_id IS NULL)
      result = await pool.query(
        'SELECT * FROM user_settings WHERE user_id IS NULL'
      );
    }
    
    // If no settings exist, return defaults
    if (result.rows.length === 0) {
      return res.json({
        expectedMonthlyIncome: 0,
        familySize: 1,
        location: 'Spain',
        ages: []
      });
    }
    
    const settings = result.rows[0];
    const ages = settings.ages || [];
    
    res.json({
      expectedMonthlyIncome: parseFloat(settings.expected_monthly_income || 0),
      familySize: parseInt(settings.family_size || 1),
      location: settings.location || 'Spain',
      ages: Array.isArray(ages) ? ages : (typeof ages === 'string' ? JSON.parse(ages) : [])
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
    const { expectedMonthlyIncome, familySize, location, ages } = req.body;
    
    // Validate inputs
    if (expectedMonthlyIncome !== undefined && expectedMonthlyIncome < 0) {
      return res.status(400).json({ error: 'Invalid expected monthly income' });
    }
    
    if (familySize !== undefined && (familySize < 1 || familySize > 20)) {
      return res.status(400).json({ error: 'Family size must be between 1 and 20' });
    }
    
    if (location !== undefined && (!location || location.trim().length === 0)) {
      return res.status(400).json({ error: 'Location cannot be empty' });
    }
    
    // Validate ages array
    if (ages !== undefined) {
      if (!Array.isArray(ages)) {
        return res.status(400).json({ error: 'Ages must be an array' });
      }
      if (ages.length > 20) {
        return res.status(400).json({ error: 'Maximum 20 family members' });
      }
      for (const age of ages) {
        if (typeof age !== 'number' || age < 0 || age > 120) {
          return res.status(400).json({ error: 'Each age must be a number between 0 and 120' });
        }
      }
    }
    
    // Get current settings to preserve values not being updated
    const currentSettings = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );
    
    const current = currentSettings.rows[0] || {};
    
    // Use provided values or keep current values
    const finalExpectedIncome = expectedMonthlyIncome !== undefined ? parseFloat(expectedMonthlyIncome) : (parseFloat(current.expected_monthly_income) || 0);
    const finalFamilySize = familySize !== undefined ? parseInt(familySize) : (parseInt(current.family_size) || 1);
    const finalLocation = location !== undefined ? location.trim() : (current.location || 'Spain');
    const finalAges = ages !== undefined ? JSON.stringify(ages) : (current.ages ? JSON.stringify(current.ages) : '[]');
    
    // Check if columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name IN ('family_size', 'location', 'ages')
    `);
    
    const hasFamilySize = columnCheck.rows.some(r => r.column_name === 'family_size');
    const hasLocation = columnCheck.rows.some(r => r.column_name === 'location');
    const hasAges = columnCheck.rows.some(r => r.column_name === 'ages');
    
    // Add missing columns
    if (!hasFamilySize) {
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS family_size INTEGER DEFAULT 1`);
    }
    if (!hasLocation) {
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Spain'`);
    }
    if (!hasAges) {
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ages JSONB DEFAULT '[]'::jsonb`);
    }
    
    // Build query with all columns
    const query = `INSERT INTO user_settings (user_id, expected_monthly_income, family_size, location, ages, updated_at)
                   VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
                   ON CONFLICT (user_id) 
                   DO UPDATE SET 
                     expected_monthly_income = $2,
                     family_size = $3,
                     location = $4,
                     ages = $5::jsonb,
                     updated_at = NOW()
                   RETURNING *`;
    const params = [userId, finalExpectedIncome, finalFamilySize, finalLocation, finalAges];
    
    const result = await pool.query(query, params);
    
    const savedAges = result.rows[0].ages || [];
    
    res.json({
      message: 'Settings updated successfully',
      expectedMonthlyIncome: parseFloat(result.rows[0].expected_monthly_income || 0),
      familySize: parseInt(result.rows[0].family_size || 1),
      location: result.rows[0].location || 'Spain',
      ages: Array.isArray(savedAges) ? savedAges : (typeof savedAges === 'string' ? JSON.parse(savedAges) : [])
    });
  } catch (error) {
    console.error('Update settings error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to update settings',
      details: error.message,
      code: error.code
    });
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
       AND user_id = $1
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
        AND user_id = $1
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
        AND user_id = $1
        AND date >= CURRENT_DATE - INTERVAL '4 months'
        GROUP BY COALESCE(applicable_month, TO_CHAR(date, 'YYYY-MM'))
        ORDER BY month DESC
        LIMIT 3
      )
      SELECT AVG(income) as avg_income
      FROM monthly_income`,
      [userId]
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

