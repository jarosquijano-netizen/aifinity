import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function find420Difference() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding the €420 difference...\n');
    
    const userId = 1;
    const currentTotal = 6619.40;
    const expectedTotal = 6199.40;
    const difference = currentTotal - expectedTotal;
    
    console.log(`Current total: €${currentTotal.toFixed(2)}`);
    console.log(`Expected total: €${expectedTotal.toFixed(2)}`);
    console.log(`Difference: €${difference.toFixed(2)}\n`);
    
    // Get all categories with budgets
    const categoriesResult = await client.query(
      `SELECT name, budget_amount 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
       ORDER BY budget_amount DESC`,
      [userId]
    );
    
    // Get transaction categories
    const transactionCategories = await client.query(
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
    
    const transactionCategoryNames = new Set(
      transactionCategories.rows.map(row => row.category)
    );
    
    // Helper function to check if two categories are duplicates
    const isDuplicateCategory = (name1, name2) => {
      if (name1 === name2) return true;
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
    
    // Create normalized transaction categories
    const normalizedTransactionCategories = new Set();
    transactionCategoryNames.forEach(transCat => {
      let matched = false;
      categoriesResult.rows.forEach(budgetCat => {
        if (isDuplicateCategory(transCat, budgetCat.name)) {
          normalizedTransactionCategories.add(budgetCat.name);
          matched = true;
        }
      });
      if (!matched) {
        normalizedTransactionCategories.add(transCat);
      }
    });
    
    // Find categories that are included but shouldn't be (or vice versa)
    const includedCategories = [];
    const excludedCategories = [];
    
    categoriesResult.rows.forEach(cat => {
      const budgetAmount = parseFloat(cat.budget_amount || 0);
      const isIncluded = normalizedTransactionCategories.has(cat.name);
      
      if (isIncluded) {
        includedCategories.push({ name: cat.name, amount: budgetAmount });
      } else {
        excludedCategories.push({ name: cat.name, amount: budgetAmount });
      }
    });
    
    const includedTotal = includedCategories.reduce((sum, cat) => sum + cat.amount, 0);
    const excludedTotal = excludedCategories.reduce((sum, cat) => sum + cat.amount, 0);
    
    console.log(`📊 Included categories (${includedCategories.length}): €${includedTotal.toFixed(2)}`);
    console.log(`📊 Excluded categories (${excludedCategories.length}): €${excludedTotal.toFixed(2)}`);
    console.log(`📊 Total: €${(includedTotal + excludedTotal).toFixed(2)}\n`);
    
    // Find which excluded categories should be included to reach expected total
    console.log(`💡 To reach €${expectedTotal.toFixed(2)}, we need to include €${difference.toFixed(2)} more.\n`);
    console.log(`🚫 Currently excluded categories:`);
    excludedCategories.forEach(cat => {
      console.log(`  - ${cat.name}: €${cat.amount.toFixed(2)}`);
    });
    
    // Try to find combination that sums to difference
    const candidates = [];
    let sum = 0;
    for (const cat of excludedCategories.sort((a, b) => b.amount - a.amount)) {
      if (sum + cat.amount <= difference + 10) {
        sum += cat.amount;
        candidates.push(cat);
        if (Math.abs(sum - difference) < 10) {
          break;
        }
      }
    }
    
    if (candidates.length > 0) {
      console.log(`\n💡 Categories that would need to be included (totaling €${sum.toFixed(2)}):`);
      candidates.forEach(cat => {
        console.log(`  - ${cat.name}: €${cat.amount.toFixed(2)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

find420Difference();






