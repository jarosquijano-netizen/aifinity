import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all categories with budgets
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    const result = await pool.query(
      `SELECT * FROM categories 
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY name ASC`,
      [userId]
    );

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Update category budget
router.put('/categories/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;
    const { budget_amount } = req.body;

    const result = await pool.query(
      `UPDATE categories 
       SET budget_amount = $1
       WHERE id = $2 AND (user_id IS NULL OR user_id = $3)
       RETURNING *`,
      [budget_amount, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ 
      message: 'Budget updated successfully',
      category: result.rows[0] 
    });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Get budget vs actual spending
router.get('/overview', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { month } = req.query; // Format: YYYY-MM
    
    // Get current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    // Get categories with budgets
    const categoriesResult = await pool.query(
      `SELECT * FROM categories 
       WHERE user_id IS NULL OR user_id = $1
       ORDER BY name ASC`,
      [userId]
    );
    
    // Get actual spending for the month (exclude transfers)
    const spendingResult = await pool.query(
      `SELECT 
         category,
         SUM(amount) as total_spent,
         COUNT(*) as transaction_count
       FROM transactions
       WHERE (user_id IS NULL OR user_id = $1)
       AND TO_CHAR(date, 'YYYY-MM') = $2
       AND type = 'expense'
       AND (computable = true OR computable IS NULL)
       GROUP BY category`,
      [userId, targetMonth]
    );
    
    // Create a map of actual spending
    const spendingMap = {};
    spendingResult.rows.forEach(row => {
      spendingMap[row.category] = {
        spent: parseFloat(row.total_spent),
        count: parseInt(row.transaction_count)
      };
    });
    
    // Combine budgets with actual spending
    const overview = categoriesResult.rows.map(category => {
      const spent = spendingMap[category.name]?.spent || 0;
      const budget = parseFloat(category.budget_amount);
      const remaining = budget - spent;
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      
      return {
        id: category.id,
        name: category.name,
        budget: budget,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        transactionCount: spendingMap[category.name]?.count || 0,
        status: budget === 0 ? 'no_budget' : 
                spent > budget ? 'over' : 
                percentage > 90 ? 'warning' : 
                'ok'
      };
    });
    
    // Calculate totals
    const totalBudget = overview.reduce((sum, cat) => sum + cat.budget, 0);
    const totalSpent = overview.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    res.json({
      month: targetMonth,
      categories: overview,
      totals: {
        budget: totalBudget,
        spent: totalSpent,
        remaining: totalRemaining,
        percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Budget overview error:', error);
    res.status(500).json({ error: 'Failed to fetch budget overview' });
  }
});

export default router;







