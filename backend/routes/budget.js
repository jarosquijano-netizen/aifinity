import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';
import aiInsightService from '../services/aiInsightService.js';
import aiBudgetSuggestionService from '../services/aiBudgetSuggestionService.js';
import { getCategoryBenchmark, getBenchmark } from '../data/benchmarks.js';

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

// Get AI budget suggestions for all transaction categories
router.get('/suggestions', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    
    // Get user profile (family size, income, location, ages)
    let userProfile = {
      familySize: 1,
      monthlyIncome: 3000,
      location: 'Spain',
      ages: [],
      userId: userId
    };
    
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
      }
    }
    
    // Get all transaction categories (for filtering total calculation)
    let transactionCategories;
    if (userId) {
      transactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id = $1
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         AND type = 'expense'
         ORDER BY category ASC`,
        [userId]
      );
    } else {
      transactionCategories = await pool.query(
        `SELECT DISTINCT category 
         FROM transactions 
         WHERE user_id IS NULL
         AND category IS NOT NULL
         AND category != ''
         AND category != 'NC'
         AND category != 'nc'
         AND type = 'expense'
         ORDER BY category ASC`
      );
    }
    
    // Get ALL categories from database (not just transaction categories)
    // This ensures we show ALL categories in the setup budget page
    let allCategories;
    if (userId) {
      allCategories = await pool.query(
        `SELECT name, budget_amount 
         FROM categories 
         WHERE (user_id = $1 OR user_id IS NULL)
         AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
         ORDER BY name ASC`,
        [userId]
      );
    } else {
      allCategories = await pool.query(
        `SELECT name, budget_amount 
         FROM categories 
         WHERE user_id IS NULL
         AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
         ORDER BY name ASC`
      );
    }
    
    // Get current budgets (for total calculation)
    let currentBudgets;
    if (userId) {
      currentBudgets = await pool.query(
        `SELECT name, budget_amount 
         FROM categories 
         WHERE user_id = $1 OR user_id IS NULL`,
        [userId]
      );
    } else {
      currentBudgets = await pool.query(
        `SELECT name, budget_amount 
         FROM categories 
         WHERE user_id IS NULL`
      );
    }
    
    const budgetMap = {};
    currentBudgets.rows.forEach(cat => {
      budgetMap[cat.name] = parseFloat(cat.budget_amount || 0);
    });
    
    // Create set of transaction category names (for filtering total calculation)
    const transactionCategoryNames = new Set(
      transactionCategories.rows.map(row => row.category)
    );
    
    // Helper function to check if a category is a parent of any other category
    // (to avoid double-counting parent + children budgets)
    const isParentCategory = (categoryName, budgetMapToCheck) => {
      // A category is a parent if it matches the group part of any hierarchical category
      // e.g., "Alimentación" is a parent of "Alimentación > Supermercado"
      if (!categoryName || categoryName.includes(' > ')) {
        return false; // Hierarchical categories are not parents
      }
      
      // Check if any category in budgetMap starts with this category name + " > "
      for (const key in budgetMapToCheck) {
        if (key.startsWith(categoryName + ' > ')) {
          return true; // Found a child category
        }
      }
      return false;
    };
    
    // Helper function to check if two categories are duplicates
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
    
    // Combine ALL categories from database with transaction categories
    // This ensures we show ALL categories in the setup budget page
    const allCategoryNamesSet = new Set();
    
    // First, add all categories from database
    allCategories.rows.forEach(cat => {
      allCategoryNamesSet.add(cat.name);
    });
    
    // Then, add transaction categories (may include categories not in database yet)
    transactionCategories.rows.forEach(row => {
      allCategoryNamesSet.add(row.category);
    });
    
    // Convert to array and deduplicate: prefer hierarchical format over old format
    const deduplicatedCategories = [];
    const seenCategories = new Set();
    
    Array.from(allCategoryNamesSet).forEach(categoryName => {
      // Skip if already processed as a duplicate
      if (seenCategories.has(categoryName)) return;
      
      // Check if this category is a duplicate of an already processed category
      let isDuplicate = false;
      let duplicateOf = null;
      
      for (const existing of deduplicatedCategories) {
        if (isDuplicateCategory(categoryName, existing)) {
          isDuplicate = true;
          // Prefer hierarchical format
          if (categoryName.includes(' > ')) {
            // New category is hierarchical, replace old format
            duplicateOf = existing;
            break;
          } else if (existing.includes(' > ')) {
            // Existing is hierarchical, skip this old format
            seenCategories.add(categoryName);
            return;
          }
        }
      }
      
      if (isDuplicate && duplicateOf) {
        // Replace old format with hierarchical format
        const index = deduplicatedCategories.indexOf(duplicateOf);
        deduplicatedCategories[index] = categoryName;
        seenCategories.delete(duplicateOf);
        seenCategories.add(categoryName);
      } else if (!isDuplicate) {
        deduplicatedCategories.push(categoryName);
        seenCategories.add(categoryName);
      }
    });
    
    // Also fix "Ocio > Hotel" to "Ocio > Vacation" if present
    const fixedCategories = deduplicatedCategories.map(cat => {
      if (cat === 'Ocio > Hotel' || cat === 'Hotel') {
        return 'Ocio > Vacation';
      }
      return cat;
    });
    
    // Remove duplicates after fixing Hotel -> Vacation
    const finalCategories = [];
    const finalSeen = new Set();
    fixedCategories.forEach(cat => {
      if (!finalSeen.has(cat)) {
        finalCategories.push(cat);
        finalSeen.add(cat);
      }
    });
    
    // Get historical transactions for AI analysis (last 12 months)
    let historicalTransactions = [];
    if (userId) {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const transactionsResult = await pool.query(
        `SELECT category, amount, date, description, type
         FROM transactions 
         WHERE user_id = $1
         AND type = 'expense'
         AND computable = true
         AND date >= $2
         ORDER BY date DESC`,
        [userId, twelveMonthsAgo.toISOString().split('T')[0]]
      );
      
      historicalTransactions = transactionsResult.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.amount),
        date: row.date,
        description: row.description || '',
        type: row.type
      }));
    } else {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const transactionsResult = await pool.query(
        `SELECT category, amount, date, description, type
         FROM transactions 
         WHERE user_id IS NULL
         AND type = 'expense'
         AND computable = true
         AND date >= $1
         ORDER BY date DESC`,
        [twelveMonthsAgo.toISOString().split('T')[0]]
      );
      
      historicalTransactions = transactionsResult.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.amount),
        date: row.date,
        description: row.description || '',
        type: row.type
      }));
    }
    
    // Use advanced AI-powered budget suggestion service
    try {
      const aiSuggestions = await aiBudgetSuggestionService.generateBudgetSuggestions({
        userId: userId,
        familySize: userProfile.familySize,
        monthlyIncome: userProfile.monthlyIncome,
        location: userProfile.location,
        historicalTransactions: historicalTransactions,
        currentMonth: new Date().toISOString().slice(0, 7),
        userPreferences: {
          ages: userProfile.ages || []
        }
      });
      
      // Map AI suggestions to expected format, merging with existing categories
      const aiSuggestionsMap = {};
      aiSuggestions.suggestions.forEach(suggestion => {
        aiSuggestionsMap[suggestion.name] = suggestion;
      });
      
      // Combine AI suggestions with all categories
      const finalSuggestions = finalCategories.map(categoryName => {
        const aiSuggestion = aiSuggestionsMap[categoryName];
        const benchmark = getBenchmark(categoryName, userProfile.familySize);
        const currentBudget = budgetMap[categoryName] || 0;
        
        if (aiSuggestion) {
          // Use AI-powered suggestion
          // Ensure benchmark ranges are family-size specific (use AI ranges if available, otherwise use family benchmark)
          const familyBenchmark = getBenchmark(categoryName, userProfile.familySize);
          
          return {
            category: categoryName,
            currentBudget: currentBudget,
            suggestedBudget: aiSuggestion.suggestedBudget || 0,
            benchmark: {
              min: aiSuggestion.rangeMin || familyBenchmark.min || 0,
              avg: aiSuggestion.suggestedBudget || familyBenchmark.avg || 0,
              max: aiSuggestion.rangeMax || familyBenchmark.max || 0
            },
            reason: aiSuggestion.reasoning || generateBudgetReason(categoryName, aiSuggestion.suggestedBudget || 0, userProfile, familyBenchmark),
            confidence: aiSuggestion.confidence || 'medium',
            insights: aiSuggestion.insights || [],
            historical: aiSuggestion.historical,
            pattern: aiSuggestion.pattern,
            comparison: aiSuggestion.comparison
          };
        } else {
          // No AI suggestion for this category - calculate from historical data
          const categoryTransactions = historicalTransactions.filter(t => t.category === categoryName);
          let suggestedBudget = benchmark.avg || 0;
          
          if (categoryTransactions.length > 0) {
            // Use average spending from historical data
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const recentTransactions = categoryTransactions.filter(t => new Date(t.date) >= threeMonthsAgo);
            
            if (recentTransactions.length > 0) {
              const recentAmounts = recentTransactions.map(t => Math.abs(t.amount));
              const recentTotal = recentAmounts.reduce((sum, amt) => sum + amt, 0);
              suggestedBudget = recentTotal / 3; // Average per month over last 3 months
            } else {
              const amounts = categoryTransactions.map(t => Math.abs(t.amount));
              const total = amounts.reduce((sum, amt) => sum + amt, 0);
              suggestedBudget = total / categoryTransactions.length;
            }
            
            // Round to nearest 10
            suggestedBudget = Math.round(suggestedBudget / 10) * 10;
          } else {
            // No historical data - use benchmark with income adjustment
            if (userProfile.monthlyIncome > 0) {
              const categoryBenchmark = getCategoryBenchmark(categoryName, userProfile);
              if (categoryBenchmark.includes('%')) {
                const percentMatch = categoryBenchmark.match(/(\d+)%/);
                if (percentMatch) {
                  const percent = parseFloat(percentMatch[1]);
                  suggestedBudget = (userProfile.monthlyIncome * percent) / 100;
                }
              }
            }
            suggestedBudget = Math.round(suggestedBudget / 10) * 10;
          }
          
          // Ensure suggestion doesn't exceed 50% of income for any single category
          if (userProfile.monthlyIncome > 0 && suggestedBudget > userProfile.monthlyIncome * 0.5) {
            suggestedBudget = Math.round(userProfile.monthlyIncome * 0.5 / 10) * 10;
          }
          
          // Calculate months of data available
          const transactionDates = categoryTransactions.map(t => new Date(t.date).toISOString().slice(0, 7));
          const uniqueMonths = new Set(transactionDates);
          const monthsOfData = uniqueMonths.size;
          
          // Calculate confidence based on transaction count and months of data
          const transactionCount = categoryTransactions.length;
          let confidence = 'low';
          if (transactionCount >= 10 && monthsOfData >= 3) confidence = 'high';
          else if (transactionCount >= 5 && monthsOfData >= 2) confidence = 'medium';
          else if (transactionCount >= 3 && monthsOfData >= 1) confidence = 'medium';
          
          // Calculate range based on data quality
          const familyBenchmark = getBenchmark(categoryName, userProfile.familySize);
          let rangeMin = familyBenchmark.min || 0;
          let rangeMax = familyBenchmark.max || 0;
          
          if (categoryTransactions.length >= 3 && monthsOfData >= 1) {
            // Use statistical range
            const amounts = categoryTransactions.map(t => Math.abs(t.amount));
            const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
            const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);
            rangeMin = Math.max(0, Math.round(suggestedBudget - stdDev));
            rangeMax = Math.round(suggestedBudget + stdDev);
            
            // Ensure range makes sense
            if (rangeMin >= rangeMax || rangeMin < 0) {
              rangeMin = Math.round(suggestedBudget * 0.7);
              rangeMax = Math.round(suggestedBudget * 1.3);
            }
          } else {
            // Use percentage-based range
            rangeMin = Math.round(suggestedBudget * 0.7);
            rangeMax = Math.round(suggestedBudget * 1.3);
          }
          
          return {
            category: categoryName,
            currentBudget: currentBudget,
            suggestedBudget: suggestedBudget,
            benchmark: {
              min: rangeMin,
              avg: suggestedBudget,
              max: rangeMax
            },
            reason: categoryTransactions.length > 0 
              ? `Based on your average monthly spending of ${suggestedBudget.toFixed(0)}€ over ${monthsOfData} month${monthsOfData !== 1 ? 's' : ''} (${transactionCount} transactions).`
              : generateBudgetReason(categoryName, suggestedBudget, userProfile, familyBenchmark),
            confidence: confidence
          };
        }
      });
      
      // Sort suggestions alphabetically by category name
      finalSuggestions.sort((a, b) => a.category.localeCompare(b.category));
      
      // Calculate total suggested and scale to match total budget set (if available)
      const totalSuggested = finalSuggestions.reduce((sum, s) => sum + (s.suggestedBudget || 0), 0);
      // Calculate total budget set excluding transfers and NC categories (same logic as Overview)
      // IMPORTANT: Exclude parent categories if they have children (to avoid double-counting)
      const excludedCategories = ['Finanzas > Transferencias', 'Transferencias', 'NC', 'nc'];
      const totalBudgetSet = Object.entries(budgetMap).reduce((sum, [catName, budgetAmount]) => {
        if (excludedCategories.includes(catName)) {
          return sum;
        }
        // Exclude parent categories that have children (to avoid double-counting)
        if (isParentCategory(catName, budgetMap)) {
          return sum; // Skip parent category, count only children
        }
        return sum + parseFloat(budgetAmount || 0);
      }, 0);
      
      // If total suggested is significantly different from total budget set, scale suggestions proportionally
      // But only if total budget set is reasonable (not 0 or too low)
      if (totalBudgetSet > 0 && totalSuggested > 0 && Math.abs(totalSuggested - totalBudgetSet) > totalBudgetSet * 0.1) {
        const scaleFactor = totalBudgetSet / totalSuggested;
        finalSuggestions.forEach(s => {
          s.suggestedBudget = Math.round(s.suggestedBudget * scaleFactor);
          // Also scale benchmark ranges proportionally
          if (s.benchmark) {
            s.benchmark.min = Math.round(s.benchmark.min * scaleFactor);
            s.benchmark.avg = Math.round(s.benchmark.avg * scaleFactor);
            s.benchmark.max = Math.round(s.benchmark.max * scaleFactor);
          }
        });
      }
      
      res.json({
        success: true,
        suggestions: finalSuggestions,
        userProfile: userProfile,
        overallInsights: aiSuggestions.overallInsights || null,
        metadata: aiSuggestions.metadata || null
      });
      
    } catch (error) {
      console.error('Error generating AI budget suggestions, using fallback:', error);
      
      // Fallback: Generate suggestions based on historical spending and benchmarks
      const fallbackSuggestions = finalCategories.map(categoryName => {
        const benchmark = getBenchmark(categoryName, userProfile.familySize);
        const currentBudget = budgetMap[categoryName] || 0;
        
        // Calculate average spending for this category from historical data
        const categoryTransactions = historicalTransactions.filter(t => t.category === categoryName);
        let suggestedBudget = 0;
        
        if (categoryTransactions.length > 0) {
          // Calculate months of data available
          const transactionDates = categoryTransactions.map(t => new Date(t.date).toISOString().slice(0, 7));
          const uniqueMonths = new Set(transactionDates);
          const monthsOfData = Math.max(1, uniqueMonths.size); // At least 1 month
          
          // Calculate total spending
          const amounts = categoryTransactions.map(t => Math.abs(t.amount));
          const total = amounts.reduce((sum, amt) => sum + amt, 0);
          
          // Get last 3 months average
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const recentTransactions = categoryTransactions.filter(t => new Date(t.date) >= threeMonthsAgo);
          
          if (recentTransactions.length > 0) {
            // Calculate unique months in recent period
            const recentDates = recentTransactions.map(t => new Date(t.date).toISOString().slice(0, 7));
            const recentUniqueMonths = new Set(recentDates);
            const recentMonthsCount = Math.max(1, recentUniqueMonths.size); // At least 1 month
            
            const recentAmounts = recentTransactions.map(t => Math.abs(t.amount));
            const recentTotal = recentAmounts.reduce((sum, amt) => sum + amt, 0);
            suggestedBudget = recentTotal / recentMonthsCount; // Average per month over recent months
          } else {
            // Use overall monthly average (total / monthsOfData)
            suggestedBudget = total / monthsOfData;
          }
        } else {
          // No historical data - use benchmark
          suggestedBudget = benchmark.avg || 0;
          
          // Adjust based on income if available
          if (userProfile.monthlyIncome > 0) {
            const categoryBenchmark = getCategoryBenchmark(categoryName, userProfile);
            if (categoryBenchmark.includes('%')) {
              const percentMatch = categoryBenchmark.match(/(\d+)%/);
              if (percentMatch) {
                const percent = parseFloat(percentMatch[1]);
                suggestedBudget = (userProfile.monthlyIncome * percent) / 100;
              }
            }
          }
        }
        
        // Round to nearest 10
        suggestedBudget = Math.round(suggestedBudget / 10) * 10;
        
        // Ensure suggestion doesn't exceed 50% of income for any single category
        if (userProfile.monthlyIncome > 0 && suggestedBudget > userProfile.monthlyIncome * 0.5) {
          suggestedBudget = Math.round(userProfile.monthlyIncome * 0.5 / 10) * 10;
        }
        
        // Calculate months of data available
        const transactionDates = categoryTransactions.map(t => new Date(t.date).toISOString().slice(0, 7));
        const uniqueMonths = new Set(transactionDates);
        const monthsOfData = uniqueMonths.size;
        
        // Calculate confidence based on transaction count and months of data
        const transactionCount = categoryTransactions.length;
        let confidence = 'low';
        if (transactionCount >= 10 && monthsOfData >= 3) confidence = 'high';
        else if (transactionCount >= 5 && monthsOfData >= 2) confidence = 'medium';
        else if (transactionCount >= 3 && monthsOfData >= 1) confidence = 'medium';
        
        // Calculate range based on data quality
        const familyBenchmark = getBenchmark(categoryName, userProfile.familySize);
        let rangeMin = familyBenchmark.min || 0;
        let rangeMax = familyBenchmark.max || 0;
        
        if (categoryTransactions.length >= 3 && monthsOfData >= 1) {
          // Use statistical range
          const amounts = categoryTransactions.map(t => Math.abs(t.amount));
          const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
          const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
          const stdDev = Math.sqrt(variance);
          rangeMin = Math.max(0, Math.round(suggestedBudget - stdDev));
          rangeMax = Math.round(suggestedBudget + stdDev);
          
          // Ensure range makes sense
          if (rangeMin >= rangeMax || rangeMin < 0) {
            rangeMin = Math.round(suggestedBudget * 0.7);
            rangeMax = Math.round(suggestedBudget * 1.3);
          }
        } else {
          // Use percentage-based range
          rangeMin = Math.round(suggestedBudget * 0.7);
          rangeMax = Math.round(suggestedBudget * 1.3);
        }
        
        return {
          category: categoryName,
          currentBudget: currentBudget,
          suggestedBudget: suggestedBudget,
          benchmark: {
            min: rangeMin,
            avg: suggestedBudget,
            max: rangeMax
          },
          reason: categoryTransactions.length > 0 
            ? `Based on your average monthly spending of ${suggestedBudget.toFixed(0)}€ over ${monthsOfData} month${monthsOfData !== 1 ? 's' : ''} (${transactionCount} transactions).`
            : generateBudgetReason(categoryName, suggestedBudget, userProfile, familyBenchmark),
          confidence: confidence
        };
      });
      
      // Calculate total suggested and scale to match total budget set (if available)
      const totalSuggested = fallbackSuggestions.reduce((sum, s) => sum + (s.suggestedBudget || 0), 0);
      // Calculate total budget set excluding transfers and NC categories (same logic as Overview)
      // IMPORTANT: Only count categories that have transactions AND have budgets set
      // This ensures the total matches what's displayed in the UI
      const excludedCategories = ['Finanzas > Transferencias', 'Transferencias', 'NC', 'nc'];
      const totalBudgetSet = Object.entries(budgetMap).reduce((sum, [catName, budgetAmount]) => {
        if (excludedCategories.includes(catName)) {
          return sum;
        }
        // Only count categories that have transactions (same filter as /overview)
        if (!transactionCategoryNames.has(catName)) {
          return sum; // Skip categories without transactions
        }
        // Exclude parent categories that have children (to avoid double-counting)
        if (isParentCategory(catName, budgetMap)) {
          return sum; // Skip parent category, count only children
        }
        return sum + parseFloat(budgetAmount || 0);
      }, 0);
      const maxAllowedBudget = userProfile.monthlyIncome * 0.85;
      
      // Priority 1: Scale to match total budget set if it's reasonable
      if (totalBudgetSet > 0 && totalSuggested > 0 && Math.abs(totalSuggested - totalBudgetSet) > totalBudgetSet * 0.1) {
        const scaleFactor = totalBudgetSet / totalSuggested;
        fallbackSuggestions.forEach(s => {
          s.suggestedBudget = Math.round(s.suggestedBudget * scaleFactor);
          // Also scale benchmark ranges proportionally
          if (s.benchmark) {
            s.benchmark.min = Math.round(s.benchmark.min * scaleFactor);
            s.benchmark.avg = Math.round(s.benchmark.avg * scaleFactor);
            s.benchmark.max = Math.round(s.benchmark.max * scaleFactor);
          }
          s.reason += ` (Scaled to match your total budget set of ${totalBudgetSet.toFixed(0)}€.)`;
        });
      } else if (totalSuggested > maxAllowedBudget && userProfile.monthlyIncome > 0) {
        // Priority 2: Scale to fit within income constraints
        const scaleFactor = maxAllowedBudget / totalSuggested;
        fallbackSuggestions.forEach(s => {
          s.suggestedBudget = Math.round(s.suggestedBudget * scaleFactor);
          // Also scale benchmark ranges proportionally
          if (s.benchmark) {
            s.benchmark.min = Math.round(s.benchmark.min * scaleFactor);
            s.benchmark.avg = Math.round(s.benchmark.avg * scaleFactor);
            s.benchmark.max = Math.round(s.benchmark.max * scaleFactor);
          }
          s.reason += ` (Scaled to fit within income constraints.)`;
        });
      }
      
      fallbackSuggestions.sort((a, b) => a.category.localeCompare(b.category));
      
      res.json({
        success: true,
        suggestions: fallbackSuggestions,
        userProfile: userProfile
      });
    }
  } catch (error) {
    console.error('Error generating budget suggestions:', error);
    res.status(500).json({
      error: 'Failed to generate budget suggestions',
      details: error.message
    });
  }
});

// Helper function to generate budget reason
function generateBudgetReason(categoryName, suggestedBudget, userProfile, benchmark) {
  const parsed = categoryName.includes(' > ') ? categoryName.split(' > ') : [null, categoryName];
  const subcategory = parsed[1] || categoryName;
  
  let reason = '';
  
  if (benchmark.avg > 0) {
    if (userProfile.familySize > 1) {
      reason = `Based on average spending for a family of ${userProfile.familySize} in ${userProfile.location}. `;
    } else {
      reason = `Based on average spending for individuals in ${userProfile.location}. `;
    }
    
    if (suggestedBudget > benchmark.avg * 1.2) {
      reason += `Your suggested budget (${suggestedBudget}€) is above average (${benchmark.avg}€), which may be appropriate for your income level.`;
    } else if (suggestedBudget < benchmark.avg * 0.8) {
      reason += `Your suggested budget (${suggestedBudget}€) is below average (${benchmark.avg}€), helping you save money.`;
    } else {
      reason += `Your suggested budget (${suggestedBudget}€) aligns with the average (${benchmark.avg}€).`;
    }
  } else {
    reason = `Suggested budget based on your income and family size. Adjust based on your spending patterns.`;
  }
  
  // Add age-specific insights if applicable
  if (userProfile.ages && userProfile.ages.length > 0) {
    const children = userProfile.ages.filter(age => age < 18);
    if (children.length > 0 && (subcategory.includes('Ropa') || subcategory.includes('Educación') || subcategory.includes('Ocio'))) {
      const avgChildAge = children.reduce((a, b) => a + b, 0) / children.length;
      if (avgChildAge < 6) {
        reason += ` Note: With ${children.length} young child(ren), expenses may be lower.`;
      } else if (avgChildAge >= 13) {
        reason += ` Note: With ${children.length} teenager(s), expenses may be higher.`;
      }
    }
  }
  
  return reason;
}

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
           WHERE name = $1 AND (user_id = $2 OR user_id IS NULL)`,
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
        // Update existing category (prefer user-specific over shared)
        const existing = checkResult.rows.find(c => c.user_id === userId) || checkResult.rows[0];
        const updateResult = await pool.query(
          `UPDATE categories 
           SET budget_amount = $1
           WHERE id = $2 AND (user_id IS NULL OR user_id = $3)
           RETURNING *`,
          [budget_amount, existing.id, userId]
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
    // IMPORTANT: Only get categories that have transactions in the target month
    // Filter by type = 'expense' to match /suggestions endpoint
    // Include "Finanzas > Transferencias" even if computable = false (for review)
    const targetMonthDate = targetMonth + '-01';
    let allTransactionCategories;
    if (userId) {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT t.category 
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id = $1
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND t.category IS NOT NULL
         AND t.category != ''
         AND t.category != 'NC'
         AND t.category != 'nc'
         AND t.type = 'expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         ORDER BY t.category ASC`,
        [userId, targetMonthDate]
      );
    } else {
      allTransactionCategories = await pool.query(
        `SELECT DISTINCT t.category 
         FROM transactions t
         LEFT JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE t.user_id IS NULL
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND t.category IS NOT NULL
         AND t.category != ''
         AND t.category != 'NC'
         AND t.category != 'nc'
         AND t.type = 'expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $1::date)
         ORDER BY t.category ASC`,
        [targetMonthDate]
      );
    }
    
    // Get categories with budgets
    // IMPORTANT: Get BOTH user-specific AND shared categories (user_id IS NULL)
    let categoriesResult;
    if (userId) {
      // User is logged in - get their categories AND shared categories
      categoriesResult = await pool.query(
        `SELECT * FROM categories 
         WHERE user_id = $1 OR user_id IS NULL
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
    
    // Create a map of budget categories by name
    // IMPORTANT: Deduplicate to avoid double-counting budgets
    // Prefer hierarchical format over old format
    const budgetMap = {};
    
    categoriesResult.rows.forEach(cat => {
      // Check if this category is a duplicate
      let isDuplicate = false;
      let existingKey = null;
      
      for (const key in budgetMap) {
        if (isDuplicateCategory(cat.name, key)) {
          isDuplicate = true;
          // Prefer hierarchical format
          if (cat.name.includes(' > ')) {
            // New category is hierarchical, replace old format
            existingKey = key;
            break;
          } else if (key.includes(' > ')) {
            // Existing category is hierarchical, keep it and merge budget
            existingKey = key;
            break;
          } else {
            // Both are old format, use existing
            existingKey = key;
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        // No duplicate found, add the category
        budgetMap[cat.name] = cat;
      } else if (existingKey && cat.name.includes(' > ')) {
        // Duplicate found and new category is hierarchical - replace old format
        const oldBudget = parseFloat(budgetMap[existingKey]?.budget_amount || 0);
        const newBudget = parseFloat(cat.budget_amount || 0);
        // Merge budgets if both exist
        cat.budget_amount = (oldBudget + newBudget).toString();
        delete budgetMap[existingKey];
        budgetMap[cat.name] = cat;
      } else if (existingKey && existingKey.includes(' > ')) {
        // Duplicate found and existing category is hierarchical - merge budget into existing
        const existingBudget = parseFloat(budgetMap[existingKey]?.budget_amount || 0);
        const newBudget = parseFloat(cat.budget_amount || 0);
        budgetMap[existingKey].budget_amount = (existingBudget + newBudget).toString();
      }
    });
    
    // Merge all transaction categories with budget categories
    // CRITICAL: Start with ALL budget categories first, then add transaction categories
    // This ensures we show ALL categories with budgets, even if they have no transactions
    // Deduplicate: prefer hierarchical format over old format
    const allCategoriesMap = {};
    
    // FIRST: Add all budget categories (ensures categories with budgets but no transactions are included)
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
    
    // SECOND: Add all transaction categories (that don't already exist)
    allTransactionCategories.rows.forEach(row => {
      const categoryName = row.category;
      
      // Check if this category is a duplicate or already exists
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
            // Both are old format, use existing
            existingKey = key;
            break;
          }
        }
      }
      
      if (!existingKey) {
        // No duplicate found, add the category (transaction category without budget)
        allCategoriesMap[categoryName] = {
          name: categoryName,
          hasBudget: false,
          budgetData: null
        };
      } else if (categoryName.includes(' > ')) {
        // Replace old format with hierarchical format
        // Preserve budget data if it exists
        const existingData = allCategoriesMap[existingKey];
        delete allCategoriesMap[existingKey];
        allCategoriesMap[categoryName] = {
          name: categoryName,
          hasBudget: existingData?.hasBudget || false,
          budgetData: existingData?.budgetData || null
        };
      }
      // If existingKey exists and new category is NOT hierarchical, skip it (keep existing)
    });
    
    // Get actual spending for the month (exclude transfers, deduplicate, exclude NC category)
    // IMPORTANT: Use DATE_TRUNC for expenses (same as dashboard/summary) - expenses always use actual date, never applicable_month
    // targetMonthDate is already defined above
    let spendingResult;
    if (userId) {
      // User is logged in - get their spending
      spendingResult = await pool.query(
        `SELECT 
           COALESCE(t.category, 'Otros > Sin categoría') as category,
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
           AND t.type = 'expense'
           AND t.computable = true
           AND t.amount > 0
           AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
           AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY COALESCE(t.category, 'Otros > Sin categoría')`,
        [userId, targetMonthDate]
      );
    } else {
      // Not logged in - get only shared spending
      spendingResult = await pool.query(
        `SELECT 
           COALESCE(t.category, 'Otros > Sin categoría') as category,
           SUM(t.amount) as total_spent,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND t.type = 'expense'
           AND t.computable = true
           AND t.amount > 0
           AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $1::date)
           AND (t.category IS NULL OR (t.category != 'NC' AND t.category != 'nc'))
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY COALESCE(t.category, 'Otros > Sin categoría')`,
        [targetMonthDate]
      );
    }
    
    // Get income for the month (for display purposes)
    // IMPORTANT: Use applicable_month if available (same logic as dashboard/summary)
    let incomeResult;
    if (userId) {
      incomeResult = await pool.query(
        `SELECT 
           COALESCE(t.category, 'Finanzas > Ingresos') as category,
           SUM(t.amount) as total_income,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id = $1
           AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
           AND t.type = 'income'
           AND t.computable = true
           AND t.amount > 0
           AND (
             (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
             OR
             (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
           )
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY COALESCE(t.category, 'Finanzas > Ingresos')`,
        [userId, targetMonth]
      );
    } else {
      incomeResult = await pool.query(
        `SELECT 
           COALESCE(t.category, 'Finanzas > Ingresos') as category,
           SUM(t.amount) as total_income,
           COUNT(*) as transaction_count
         FROM (
           SELECT DISTINCT ON (t.date, t.description, t.amount, t.type) 
             t.category, t.amount
           FROM transactions t
           LEFT JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE t.user_id IS NULL
           AND (t.account_id IS NULL OR ba.id IS NOT NULL)
           AND t.type = 'income'
           AND t.computable = true
           AND t.amount > 0
           AND (
             (t.applicable_month IS NOT NULL AND t.applicable_month = $1)
             OR
             (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $1)
           )
           ORDER BY t.date, t.description, t.amount, t.type, t.id
         ) t
         GROUP BY COALESCE(t.category, 'Finanzas > Ingresos')`,
        [targetMonth]
      );
    }
    
    // Calculate total income
    const totalIncome = incomeResult.rows.reduce((sum, row) => sum + parseFloat(row.total_income || 0), 0);
    
    // Get transfers separately (not counted in total but shown for review)
    // Include both old "Transferencias" and new "Finanzas > Transferencias"
    // Use DATE_TRUNC for consistency with expenses
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
         AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
         AND t.type = 'expense'
         AND (t.computable = false OR t.category IN ('Transferencias', 'Finanzas > Transferencias'))
         AND t.category IN ('Transferencias', 'Finanzas > Transferencias')`,
        [userId, targetMonthDate]
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
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $1::date)
         AND t.type = 'expense'
         AND (t.computable = false OR t.category IN ('Transferencias', 'Finanzas > Transferencias'))
         AND t.category IN ('Transferencias', 'Finanzas > Transferencias')`,
        [targetMonthDate]
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
    // CRITICAL: Ensure we match spending correctly even after deduplication
    const overview = Object.values(allCategoriesMap).map(categoryInfo => {
      const categoryName = categoryInfo.name;
      
      // Find spending for this category - check exact match first, then duplicates
      let spending = spendingMap[categoryName] || { spent: 0, count: 0 };
      
      // If no exact match found, check for duplicate category names in spendingMap
      if ((spending.spent === 0 && spending.count === 0) || !spendingMap[categoryName]) {
        for (const key in spendingMap) {
          if (isDuplicateCategory(categoryName, key)) {
            // Found matching spending data
            spending = {
              spent: spendingMap[key].spent || 0,
              count: spendingMap[key].count || 0
            };
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
    // CRITICAL: Calculate totals directly from spendingMap and budgetMap to avoid double-counting
    // Total Budget = sum of all budget amounts from categories table
    // IMPORTANT: Exclude parent categories if they have children (to avoid double-counting)
    
    // Helper function to check if a category is a parent of any other category
    const isParentCategory = (categoryName) => {
      // A category is a parent if it matches the group part of any hierarchical category
      // e.g., "Alimentación" is a parent of "Alimentación > Supermercado"
      if (!categoryName || categoryName.includes(' > ')) {
        return false; // Hierarchical categories are not parents
      }
      
      // Check if any category in budgetMap starts with this category name + " > "
      for (const key in budgetMap) {
        if (key.startsWith(categoryName + ' > ')) {
          return true; // Found a child category
        }
      }
      return false;
    };
    
    // Debug: Log all categories in budgetMap
    const allCategoryNames = Object.keys(budgetMap).sort();
    console.log('🔍 Backend Budget Overview - All categories:', allCategoryNames.length);
    console.log('🔍 Backend Budget Overview - Category names:', allCategoryNames);
    
    // Log raw categories from database BEFORE deduplication
    console.log('🔍 Backend Budget Overview - Raw categories from DB:', categoriesResult.rows.length);
    const rawCategoryNames = categoriesResult.rows.map(c => c.name).sort();
    console.log('🔍 Backend Budget Overview - Raw category names:', rawCategoryNames);
    
    const excludedParents = [];
    const excludedNoTransactions = [];
    const totalBeforeExclusion = Object.values(budgetMap).reduce((sum, cat) => {
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    
    // Also calculate total from raw categories (before deduplication)
    // Get list of transaction category names (same filter as /suggestions endpoint)
    // IMPORTANT: Normalize transaction category names to match budget category names
    // This handles cases where transactions use old format (e.g., "Hogar") 
    // but budgets use hierarchical format (e.g., "Vivienda > Hogar")
    const transactionCategoryNames = new Set(
      allTransactionCategories.rows.map(row => row.category)
    );
    
    // Create a normalized map: for each transaction category, find its matching budget category
    // This handles deduplication: "Hogar" -> "Vivienda > Hogar"
    const normalizedTransactionCategories = new Set();
    transactionCategoryNames.forEach(transCat => {
      // Check if this transaction category matches any budget category (handles deduplication)
      let matched = false;
      for (const budgetCatName in budgetMap) {
        if (isDuplicateCategory(transCat, budgetCatName)) {
          // Found a match - use the budget category name (prefer hierarchical format)
          normalizedTransactionCategories.add(budgetCatName);
          matched = true;
          break;
        }
      }
      // If no match found, use the transaction category name as-is
      if (!matched) {
        normalizedTransactionCategories.add(transCat);
      }
    });
    
    console.log('🔍 Backend Budget Overview - Transaction categories:', transactionCategoryNames.size);
    console.log('🔍 Backend Budget Overview - Normalized transaction categories:', normalizedTransactionCategories.size);
    
    const rawTotal = categoriesResult.rows.reduce((sum, cat) => {
      if (cat.name === 'Finanzas > Transferencias' || cat.name === 'Transferencias' || 
          cat.name === 'NC' || cat.name === 'nc') {
        return sum;
      }
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    console.log('🔍 Backend Budget Overview - Raw total (before deduplication): €' + rawTotal.toFixed(2));
    
    // Calculate total budget ONLY from categories that have transactions
    // This matches what's shown in the UI (from /suggestions endpoint)
    const totalBudget = Object.values(budgetMap).reduce((sum, cat) => {
      // Exclude transfers and non-computable categories
      if (cat.name === 'Finanzas > Transferencias' || cat.name === 'Transferencias' || 
          cat.name === 'NC' || cat.name === 'nc') {
        return sum;
      }
      
      // IMPORTANT: Only count categories that have transactions (same as /suggestions)
      // Use normalized transaction categories to handle old-format vs hierarchical format matching
      // This ensures the total matches what's displayed in the UI
      if (!normalizedTransactionCategories.has(cat.name)) {
        excludedNoTransactions.push({ name: cat.name, amount: parseFloat(cat.budget_amount || 0) });
        console.log(`🚫 Backend: Excluding category without transactions: ${cat.name} (€${parseFloat(cat.budget_amount || 0)})`);
        return sum; // Skip categories without transactions
      }
      
      // Exclude parent categories that have children (to avoid double-counting)
      // Only count child categories (hierarchical format) or standalone categories without children
      if (isParentCategory(cat.name)) {
        excludedParents.push({ name: cat.name, amount: parseFloat(cat.budget_amount || 0) });
        console.log(`🚫 Backend: Excluding parent category: ${cat.name} (€${parseFloat(cat.budget_amount || 0)})`);
        return sum; // Skip parent category, count only children
      }
      
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    
    console.log('📊 Backend Budget Overview calculation:');
    console.log('  - Total before exclusion: €' + totalBeforeExclusion.toFixed(2));
    console.log('  - Excluded categories without transactions:', excludedNoTransactions.length, excludedNoTransactions);
    console.log('  - Excluded parent categories:', excludedParents.length, excludedParents);
    console.log('  - Total after exclusion: €' + totalBudget.toFixed(2));
    console.log('  - Difference: €' + (totalBeforeExclusion - totalBudget).toFixed(2));
    
    // Total Spent = sum of all spending from spendingMap (already deduplicated)
    const totalSpent = Object.values(spendingMap).reduce((sum, spending) => {
      return sum + (spending.spent || 0);
    }, 0);
    
    const totalRemaining = totalBudget - totalSpent;
    
    res.json({
      month: targetMonth,
      categories: overview,
      totals: {
        budget: totalBudget,
        spent: totalSpent,
        remaining: totalRemaining,
        percentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
        income: totalIncome
      },
      income: totalIncome
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
      detail: error.detail || error.hint || 'Check server logs'
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
         WHERE user_id = $1 OR user_id IS NULL
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
           AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
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
           AND (t.category IS NULL OR (t.category != 'NC' && t.category != 'nc'))
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
        spent: parseFloat(row.total_spent),
        count: parseInt(row.transaction_count)
      };
    });
    
    // Generate insights for each category
    const insightsPromises = allTransactionCategories.rows.map(async (row) => {
      const categoryName = row.category;
      const budgetData = budgetMap[categoryName];
      const spending = spendingMap[categoryName] || { spent: 0, count: 0 };
      
      const categoryData = {
        category: categoryName,
        budget: budgetData ? parseFloat(budgetData.budget_amount) : 0,
        spent: spending.spent,
        percentage: budgetData && budgetData.budget_amount > 0 
          ? (spending.spent / parseFloat(budgetData.budget_amount)) * 100 
          : 0,
        transactionCount: spending.count,
        previousMonth: 0 // Could be enhanced to get previous month
      };
      
      const insight = await aiInsightService.generateInsight(categoryData, userProfile, useAI === 'true');
      
      return {
        category: categoryName,
        insight: insight,
        priority: categoryData.percentage >= 100 ? 1 : categoryData.percentage >= 90 ? 2 : 3
      };
    });
    
    const insights = await Promise.all(insightsPromises);
    const validInsights = insights.filter(i => i.insight && i.insight.trim().length > 0);
    
    res.json({
      success: true,
      insights: validInsights,
      month: targetMonth
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      details: error.message
    });
  }
});

export default router;
