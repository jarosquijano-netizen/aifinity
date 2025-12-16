import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function testBudgetCalculation() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Budget Calculation Logic...\n');
    
    const userId = 1;
    
    // Get transaction categories (same as /overview endpoint)
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
    
    console.log(`📊 Transaction categories: ${transactionCategoryNames.size}`);
    console.log('Transaction categories:', Array.from(transactionCategoryNames).sort());
    
    // Get all categories with budgets
    const categoriesResult = await client.query(
      `SELECT name, budget_amount 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
       ORDER BY name ASC`,
      [userId]
    );
    
    console.log(`\n📊 Categories with budgets: ${categoriesResult.rows.length}`);
    
    // Calculate total
    const excludedCategories = ['Finanzas > Transferencias', 'Transferencias', 'NC', 'nc'];
    const excludedNoTransactions = [];
    let total = 0;
    let included = 0;
    
    // Helper function to check if two categories are duplicates (same as backend)
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
    
    // Create normalized transaction categories (match budget categories)
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
    
    console.log(`\n📊 Normalized transaction categories: ${normalizedTransactionCategories.size}`);
    
    categoriesResult.rows.forEach(cat => {
      const budgetAmount = parseFloat(cat.budget_amount || 0);
      
      if (excludedCategories.includes(cat.name)) {
        console.log(`🚫 Excluded (transfer/NC): ${cat.name} (€${budgetAmount.toFixed(2)})`);
        return;
      }
      
      if (!normalizedTransactionCategories.has(cat.name)) {
        excludedNoTransactions.push({ name: cat.name, amount: budgetAmount });
        console.log(`🚫 Excluded (no transactions): ${cat.name} (€${budgetAmount.toFixed(2)})`);
        return;
      }
      
      total += budgetAmount;
      included++;
      console.log(`✅ Included: ${cat.name} (€${budgetAmount.toFixed(2)})`);
    });
    
    console.log(`\n📊 Results:`);
    console.log(`  - Total included: €${total.toFixed(2)}`);
    console.log(`  - Categories included: ${included}`);
    console.log(`  - Categories excluded (no transactions): ${excludedNoTransactions.length}`);
    console.log(`  - Expected total: €6,199.40`);
    console.log(`  - Difference: €${(total - 6199.40).toFixed(2)}`);
    
    if (excludedNoTransactions.length > 0) {
      console.log(`\n🚫 Excluded categories (no transactions):`);
      excludedNoTransactions.forEach(cat => {
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

testBudgetCalculation();

