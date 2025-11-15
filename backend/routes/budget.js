import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';
import aiInsightService from '../services/aiInsightService.js';

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

// Update or create category budget
router.put('/categories/:id', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { id } = req.params;
    const { budget_amount, category_name } = req.body;

    // If id is null or 'new', create a new category budget
    if (!id || id === 'new' || id === 'null') {
      if (!category_name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      // Check if category already exists
      let checkResult;
      if (userId) {
        checkResult = await pool.query(
          `SELECT * FROM categories 
           WHERE name = $1 AND user_id = $2`,
          [category_name, userId]
        );
      } else {
        checkResult = await pool.query(
          `SELECT * FROM categories 
           WHERE name = $1 AND user_id IS NULL`,
          [category_name]
        );
      }

      if (checkResult.rows.length > 0) {
        // Update existing category
        const updateResult = await pool.query(
          `UPDATE categories 
           SET budget_amount = $1
           WHERE id = $2 AND (user_id IS NULL OR user_id = $3)
           RETURNING *`,
          [budget_amount, checkResult.rows[0].id, userId]
        );
        return res.json({ 
          message: 'Budget updated successfully',
          category: updateResult.rows[0] 
        });
      } else {
        // Create new category budget
        const createResult = await pool.query(
          `INSERT INTO categories (name, budget_amount, user_id)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [category_name, budget_amount, userId || null]
        );
        return res.json({ 
          message: 'Budget created successfully',
          category: createResult.rows[0] 
        });
      }
    }

    // Update existing category budget
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
    
    // Get ALL transaction categories (not just budget categories)
    // Include "Finanzas > Transferencias" even if computable = false (for review)
    let allTransactionCategories;
    if (userId) {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id = $1
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         ORDER BY category ASC`,
        [userId]
      );
    } else {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id IS NULL
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         ORDER BY category ASC`
      );
    }
    
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
    
    // Create a map of budget categories by name
    const budgetMap = {};
    categoriesResult.rows.forEach(cat => {
      budgetMap[cat.name] = cat;
    });
    
    // Helper function to check if two categories are duplicates
    // (e.g., "Mantenimiento hogar" and "Vivienda > Mantenimiento hogar")
    const isDuplicateCategory = (name1, name2) => {
      if (name1 === name2) return true;
      
      // Check if one is hierarchical and the other is the subcategory
      if (name1.includes(' > ')) {
        const subcategory = name1.split(' > ')[1];
        if (subcategory === name2) return true;
      }
      if (name2.includes(' > ')) {
        const subcategory = name2.split(' > ')[1];
        if (subcategory === name1) return true;
      }
      
      return false;
    };
    
    // Merge all transaction categories with budget categories
    // This ensures we show ALL transaction categories, even if they don't have budgets
    // Deduplicate: prefer hierarchical format over old format
    const allCategoriesMap = {};
    
    // Add all transaction categories
    allTransactionCategories.rows.forEach(row => {
      const categoryName = row.category;
      
      // Check if this category is a duplicate of an existing one
      let existingKey = null;
      
      for (const key in allCategoriesMap) {
        if (isDuplicateCategory(categoryName, key)) {
          // Found a duplicate - prefer hierarchical format
          if (categoryName.includes(' > ')) {
            // New category is hierarchical, replace old format
            existingKey = key;
            break;
          } else if (key.includes(' > ')) {
            // Existing category is hierarchical, skip adding this one
            existingKey = key;
            break;
          } else {
            // Both are old format, use first one encountered
            existingKey = key;
            break;
          }
        }
      }
      
      if (!existingKey) {
        // No duplicate found, add the category
        allCategoriesMap[categoryName] = {
          name: categoryName,
          hasBudget: false,
          budgetData: null
        };
      } else if (categoryName.includes(' > ')) {
        // Replace old format with hierarchical format
        delete allCategoriesMap[existingKey];
        allCategoriesMap[categoryName] = {
          name: categoryName,
          hasBudget: false,
          budgetData: null
        };
      }
      // If existingKey exists and new category is NOT hierarchical, skip it (keep existing)
    });
    
    // Add/update with budget data if exists
    categoriesResult.rows.forEach(cat => {
      // Check if this category is a duplicate
      let existingKey = null;
      
      for (const key in allCategoriesMap) {
        if (isDuplicateCategory(cat.name, key)) {
          // Found a duplicate - prefer hierarchical format
          if (cat.name.includes(' > ')) {
            // Budget category is hierarchical, replace old format
            existingKey = key;
            break;
          } else if (key.includes(' > ')) {
            // Existing category is hierarchical, update budget on existing
            existingKey = key;
            break;
          } else {
            // Both are old format, use existing key
            existingKey = key;
            break;
          }
        }
      }
      
      if (!existingKey) {
        // No duplicate found, add or update the category
        if (!allCategoriesMap[cat.name]) {
          allCategoriesMap[cat.name] = {
            name: cat.name,
            hasBudget: true,
            budgetData: cat
          };
        } else {
          allCategoriesMap[cat.name].hasBudget = true;
          allCategoriesMap[cat.name].budgetData = cat;
        }
      } else {
        // Found duplicate - prefer hierarchical format
        if (cat.name.includes(' > ')) {
          // Budget category is hierarchical, replace old format
          if (allCategoriesMap[existingKey]) {
            allCategoriesMap[cat.name] = {
              ...allCategoriesMap[existingKey],
              name: cat.name,
              hasBudget: true,
              budgetData: cat
            };
            delete allCategoriesMap[existingKey];
          } else {
            allCategoriesMap[cat.name] = {
              name: cat.name,
              hasBudget: true,
              budgetData: cat
            };
          }
        } else {
          // Budget category is old format, update existing hierarchical format
          if (allCategoriesMap[existingKey]) {
            allCategoriesMap[existingKey].hasBudget = true;
            allCategoriesMap[existingKey].budgetData = cat;
          }
        }
      }
    });
    
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
    // Include both old "Transferencias" and new "Finanzas > Transferencias"
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
         AND (t.computable = false OR t.category IN ('Transferencias', 'Finanzas > Transferencias'))
         AND t.category IN ('Transferencias', 'Finanzas > Transferencias')`,
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
         AND (t.computable = false OR t.category IN ('Transferencias', 'Finanzas > Transferencias'))
         AND t.category IN ('Transferencias', 'Finanzas > Transferencias')`,
        [targetMonth]
      );
    }
    
    // Create a map of actual spending
    // Merge spending for duplicate categories (old format + hierarchical format)
    const spendingMap = {};
    spendingResult.rows.forEach(row => {
      const categoryName = row.category;
      const spending = {
        spent: parseFloat(row.total_spent),
        count: parseInt(row.transaction_count)
      };
      
      // Check if this category is a duplicate of an existing one in spendingMap
      let merged = false;
      for (const key in spendingMap) {
        if (isDuplicateCategory(categoryName, key)) {
          // Merge spending: prefer hierarchical format
          if (categoryName.includes(' > ')) {
            // Replace old format with hierarchical
            spendingMap[categoryName] = {
              spent: spendingMap[key].spent + spending.spent,
              count: spendingMap[key].count + spending.count
            };
            delete spendingMap[key];
          } else if (key.includes(' > ')) {
            // Add to existing hierarchical format
            spendingMap[key].spent += spending.spent;
            spendingMap[key].count += spending.count;
          } else {
            // Both are old format, just add
            spendingMap[key].spent += spending.spent;
            spendingMap[key].count += spending.count;
          }
          merged = true;
          break;
        }
      }
      
      if (!merged) {
        spendingMap[categoryName] = spending;
      }
    });
    
    // Combine ALL categories (transaction + budget) with actual spending
    const overview = Object.values(allCategoriesMap).map(categoryInfo => {
      const categoryName = categoryInfo.name;
      
      // Find spending for this category or its duplicate
      let spending = spendingMap[categoryName] || { spent: 0, count: 0 };
      
      // If no spending found, check for duplicate category names
      if (spending.spent === 0 && spending.count === 0) {
        for (const key in spendingMap) {
          if (isDuplicateCategory(categoryName, key)) {
            spending = spendingMap[key];
            break;
          }
        }
      }
      
      const spent = spending.spent || 0;
      const budget = categoryInfo.hasBudget ? parseFloat(categoryInfo.budgetData.budget_amount) : 0;
      const remaining = budget - spent;
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      
      return {
        id: categoryInfo.hasBudget ? categoryInfo.budgetData.id : null,
        name: categoryName,
        budget: budget,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        transactionCount: spending.count || 0,
        status: budget === 0 ? 'no_budget' : 
                spent > budget ? 'over' : 
                percentage > 90 ? 'warning' : 
                'ok',
        hasBudget: categoryInfo.hasBudget
      };
    }).sort((a, b) => {
      // Categories that should always go to the bottom
      const bottomCategories = [
        'Finanzas > Transferencias',
        'Transferencias',
        'Servicios > Cargos bancarios',
        'Cargos bancarios',
        'Otros > Sin categoría',
        'Sin categoría',
        'Uncategorized'
      ].map(c => c.toLowerCase());
      
      const isABottom = bottomCategories.includes(a.name.toLowerCase());
      const isBBottom = bottomCategories.includes(b.name.toLowerCase());
      
      // If one is bottom category and the other isn't, bottom goes last
      if (isABottom && !isBBottom) return 1;
      if (!isABottom && isBBottom) return -1;
      
      // If both are bottom categories, sort alphabetically
      if (isABottom && isBBottom) {
        return a.name.localeCompare(b.name);
      }
      
      // For non-bottom categories, apply priority sorting
      // Priority order: over > warning > ok > no_budget
      const statusPriority = { 'over': 0, 'warning': 1, 'ok': 2, 'no_budget': 3, 'transfer': 4 };
      const priorityA = statusPriority[a.status] ?? 5;
      const priorityB = statusPriority[b.status] ?? 5;
      
      // First, sort by status priority
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
    // Check for both old "Transferencias" and new "Finanzas > Transferencias"
    const transfersData = transfersResult.rows[0];
    const transfersSpent = parseFloat(transfersData?.total_spent || 0);
    const transfersCount = parseInt(transfersData?.transaction_count || 0);
    
    // Also check for "Finanzas > Transferencias" in spending
    const finanzasTransferenciasSpent = spendingMap['Finanzas > Transferencias']?.spent || 0;
    const finanzasTransferenciasCount = spendingMap['Finanzas > Transferencias']?.count || 0;
    
    const totalTransfersSpent = transfersSpent + finanzasTransferenciasSpent;
    const totalTransfersCount = transfersCount + finanzasTransferenciasCount;
    
    if (totalTransfersCount > 0) {
      overview.push({
        id: 'transfers',
        name: 'Finanzas > Transferencias',
        budget: 0,
        spent: totalTransfersSpent,
        remaining: -totalTransfersSpent,
        percentage: 0,
        transactionCount: totalTransfersCount,
        status: 'transfer',
        isTransfer: true,
        hasBudget: false,
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

// Get AI insights for budget categories
router.get('/insights', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const { month, useAI = 'true' } = req.query;
    
    // Get current month if not specified
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    
    // Get user profile (family size, income, location)
    let userProfile = {
      familySize: 1,
      monthlyIncome: 3000,
      location: 'Spain',
      userId: userId
    };
    
    // Try to get user settings if logged in
    if (userId) {
      try {
        const settingsResult = await pool.query(
          `SELECT family_size, expected_monthly_income, location, ages 
           FROM user_settings 
           WHERE user_id = $1 
           LIMIT 1`,
          [userId]
        );
        
        if (settingsResult.rows.length > 0) {
          const settings = settingsResult.rows[0];
          userProfile.familySize = settings.family_size || 1;
          userProfile.monthlyIncome = settings.expected_monthly_income || 3000;
          userProfile.location = settings.location || 'Spain';
          const ages = settings.ages || [];
          userProfile.ages = Array.isArray(ages) ? ages : (typeof ages === 'string' ? JSON.parse(ages) : []);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
        // Continue with defaults - settings table might not exist yet
      }
    }
    
    // Get budget categories data (reuse overview logic)
    // Get ALL transaction categories
    let allTransactionCategories;
    if (userId) {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id = $1
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         ORDER BY category ASC`,
        [userId]
      );
    } else {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id IS NULL
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         ORDER BY category ASC`
      );
    }
    
    // Get categories with budgets
    let categoriesResult;
    if (userId) {
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id = $1
         ORDER BY name ASC`,
        [userId]
      );
    } else {
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id IS NULL
         ORDER BY name ASC`
      );
    }
    
    // Create budget map
    const budgetMap = {};
    categoriesResult.rows.forEach(cat => {
      budgetMap[cat.name] = cat;
    });
    
    // Get spending for the month
    let spendingResult;
    if (userId) {
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
    
    // Create spending map
    const spendingMap = {};
    spendingResult.rows.forEach(row => {
      spendingMap[row.category] = {
        spent: parseFloat(row.total_spent) || 0,
        transactionCount: parseInt(row.transaction_count) || 0
      };
    });
    
    // Build categories list for insights
    const categories = [];
    allTransactionCategories.rows.forEach(row => {
      const categoryName = row.category;
      const budget = budgetMap[categoryName]?.budget_amount || 0;
      const spending = spendingMap[categoryName] || { spent: 0, transactionCount: 0 };
      
      categories.push({
        name: categoryName,
        budget: budget,
        spent: spending.spent,
        percentage: budget > 0 ? (spending.spent / budget) * 100 : 0,
        transactionCount: spending.transactionCount
      });
    });
    
    // Generate insights for each category
    const insightsPromises = categories.map(async (category) => {
      try {
        const categoryData = {
          category: category.name,
          budget: category.budget || 0,
          spent: category.spent || 0,
          percentage: category.percentage || 0,
          transactionCount: category.transactionCount || 0,
          previousMonth: 0 // Could be enhanced later
        };
        
        const insight = await aiInsightService.generateInsight(
          categoryData,
          userProfile,
          useAI === 'true'
        );
        
        return {
          category: category.name,
          insight: insight,
          priority: categoryData.percentage >= 100 ? 1 : 
                    categoryData.percentage >= 90 ? 2 : 
                    categoryData.percentage >= 75 ? 3 : 4
        };
      } catch (error) {
        console.error(`Error generating insight for ${category.name}:`, error);
        return {
          category: category.name,
          insight: null,
          priority: 5,
          error: error.message
        };
      }
    });
    
    const insights = await Promise.all(insightsPromises);
    
    // Filter out null insights and sort by priority
    const validInsights = insights
      .filter(i => i.insight !== null)
      .sort((a, b) => a.priority - b.priority);
    
    res.json({
      success: true,
      insights: validInsights,
      month: targetMonth
    });
    
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: error.message 
    });
  }
});

export default router;







