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
    let categoriesResult;
    if (userId) {
      // User is logged in - get their categories
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id = $1
         ORDER BY name ASC`,
        [userId]
      );
    } else {
      // Not logged in - get only shared categories
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id IS NULL
         ORDER BY name ASC`
      );
    }
    
    // Get actual spending for the month (exclude transfers, deduplicate, exclude NC category)
    let spendingResult;
    if (userId) {
      // User is logged in - get their spending
      spendingResult = await pool.query(
        `SELECT 
           t.category,
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND TO_CHAR(t.date, 'YYYY-MM') = $2
           AND t.type = 'expense'
           AND t.computable = true
           AND t.amount > 0
           AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY t.category`,
        [userId, targetMonth]
      );
    } else {
      // Not logged in - get only shared spending
      spendingResult = await pool.query(
        `SELECT 
           t.category,
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND TO_CHAR(t.date, 'YYYY-MM') = $1
           AND t.type = 'expense'
           AND t.computable = true
           AND t.amount > 0
           AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY t.category`,
        [targetMonth]
      );
    }
    
    // Get transfers separately (not counted in total but shown for review)
    let transfersResult;
    if (userId) {
      // User is logged in - get their transfers
      transfersResult = await pool.query(
        `SELECT 
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND TO_CHAR(t.date, 'YYYY-MM') = $2
         AND t.type = 'expense'
         AND t.computable = false
         AND t.category = 'Transferencias'`,
        [userId, targetMonth]
      );
    } else {
      // Not logged in - get only shared transfers
      transfersResult = await pool.query(
        `SELECT 
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NOT NULL)
         AND TO_CHAR(t.date, 'YYYY-MM') = $1
         AND t.type = 'expense'
         AND t.computable = false
         AND t.category = 'Transferencias'`,
        [targetMonth]
      );
    }
    
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
    }).sort((a, b) => {
      // Sort by status priority: over > warning > ok > no_budget
      const statusPriority = { 'over': 0, 'warning': 1, 'ok': 2, 'no_budget': 3, 'transfer': 4 };
      const priorityA = statusPriority[a.status] ?? 5;
      const priorityB = statusPriority[b.status] ?? 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same status and 'over', sort by how much over (most over first)
      if (a.status === 'over' && b.status === 'over') {
        return (b.spent - b.budget) - (a.spent - a.budget);
      }
      
      // If same status and 'warning', sort by percentage (highest first)
      if (a.status === 'warning' && b.status === 'warning') {
        return b.percentage - a.percentage;
      }
      
      // Otherwise, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    // Add transfers as a separate entry (not counted in totals)
    const transfersData = transfersResult.rows[0];
    const transfersSpent = parseFloat(transfersData?.total_spent || 0);
    const transfersCount = parseInt(transfersData?.transaction_count || 0);
    
    if (transfersCount > 0) {
      overview.push({
        id: 'transfers',
        name: 'Transferencias',
        budget: 0,
        spent: transfersSpent,
        remaining: -transfersSpent,
        percentage: 0,
        transactionCount: transfersCount,
        status: 'transfer',
        isTransfer: true,
        note: 'No incluidas en el total (revisar si son gastos reales)'
      });
    }
    
    // Calculate totals (excluding transfers and NC category)
    // Total Spent = sum of all "Spent" values shown in the Budget table
    const totalBudget = overview
      .filter(cat => !cat.isTransfer && cat.name !== 'NC' && cat.name !== 'nc')
      .reduce((sum, cat) => sum + cat.budget, 0);
    const totalSpent = overview
      .filter(cat => !cat.isTransfer && cat.name !== 'NC' && cat.name !== 'nc')
      .reduce((sum, cat) => sum + cat.spent, 0);
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Failed to fetch budget overview',
      message: error.message,
      details: error.detail || error.hint || 'Check server logs'
    });
  }
});

export default router;







