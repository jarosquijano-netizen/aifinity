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
    const hasAuthHeader = req.headers['authorization'];
    const { month } = req.query; // Format: YYYY-MM
    
    // Get current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    // TEMPORARY FIX: If Authorization header is present, return ALL data (even if userId is null)
    // Get categories with budgets
    let categoriesResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        categoriesResult = await pool.query(
          `SELECT * FROM categories 
           WHERE user_id IS NULL OR user_id = $1
           ORDER BY name ASC`,
          [userId]
        );
      } else {
        categoriesResult = await pool.query(
          `SELECT * FROM categories 
           ORDER BY name ASC`
        );
      }
    } else {
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id IS NULL
         ORDER BY name ASC`
      );
    }
    
    // Get actual spending for the month (exclude transfers)
    let spendingResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        spendingResult = await pool.query(
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
      } else {
        // Filter by account_ids when userId is null
        const userAccountsResult = await pool.query(
          `SELECT id FROM bank_accounts ORDER BY created_at DESC`
        );
        const accountIds = userAccountsResult.rows.map(a => a.id);
        
        if (accountIds.length > 0) {
          spendingResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total_spent,
               COUNT(*) as transaction_count
             FROM transactions
             WHERE (account_id = ANY($2::int[]) OR user_id IS NULL)
             AND TO_CHAR(date, 'YYYY-MM') = $1
             AND type = 'expense'
             AND (computable = true OR computable IS NULL)
             GROUP BY category`,
            [targetMonth, accountIds]
          );
        } else {
          spendingResult = await pool.query(
            `SELECT 
               category,
               SUM(amount) as total_spent,
               COUNT(*) as transaction_count
             FROM transactions
             WHERE user_id IS NULL
             AND TO_CHAR(date, 'YYYY-MM') = $1
             AND type = 'expense'
             AND (computable = true OR computable IS NULL)
             GROUP BY category`,
            [targetMonth]
          );
        }
      }
    } else {
      spendingResult = await pool.query(
        `SELECT 
           category,
           SUM(amount) as total_spent,
           COUNT(*) as transaction_count
         FROM transactions
         WHERE user_id IS NULL
         AND TO_CHAR(date, 'YYYY-MM') = $1
         AND type = 'expense'
         AND (computable = true OR computable IS NULL)
         GROUP BY category`,
        [targetMonth]
      );
    }
    
    // Get transfers separately (not counted in total but shown for review)
    let transfersResult;
    if (userId || hasAuthHeader) {
      if (userId) {
        transfersResult = await pool.query(
          `SELECT 
             SUM(amount) as total_spent,
             COUNT(*) as transaction_count
           FROM transactions
           WHERE (user_id IS NULL OR user_id = $1)
           AND TO_CHAR(date, 'YYYY-MM') = $2
           AND type = 'expense'
           AND computable = false
           AND category = 'Transferencias'`,
          [userId, targetMonth]
        );
      } else {
        transfersResult = await pool.query(
          `SELECT 
             SUM(amount) as total_spent,
             COUNT(*) as transaction_count
           FROM transactions
           WHERE TO_CHAR(date, 'YYYY-MM') = $1
           AND type = 'expense'
           AND computable = false
           AND category = 'Transferencias'`,
          [targetMonth]
        );
      }
    } else {
      transfersResult = await pool.query(
        `SELECT 
           SUM(amount) as total_spent,
           COUNT(*) as transaction_count
         FROM transactions
         WHERE user_id IS NULL
         AND TO_CHAR(date, 'YYYY-MM') = $1
         AND type = 'expense'
         AND computable = false
         AND category = 'Transferencias'`,
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
    
    // Calculate totals (excluding transfers)
    const totalBudget = overview
      .filter(cat => !cat.isTransfer)
      .reduce((sum, cat) => sum + cat.budget, 0);
    const totalSpent = overview
      .filter(cat => !cat.isTransfer)
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
    res.status(500).json({ error: 'Failed to fetch budget overview' });
  }
});

export default router;







