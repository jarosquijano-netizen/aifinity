import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkBudgetTotal() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Budget Total Calculation...\n');
    
    const userId = 1; // Your user ID
    
    // Get ALL categories (both user-specific and shared)
    const categoriesResult = await client.query(
      `SELECT id, name, budget_amount, user_id 
       FROM categories 
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY name ASC`,
      [userId]
    );
    
    console.log(`📊 Total categories in database: ${categoriesResult.rows.length}\n`);
    
    // Group by name to find duplicates
    const categoriesByName = {};
    categoriesResult.rows.forEach(cat => {
      if (!categoriesByName[cat.name]) {
        categoriesByName[cat.name] = [];
      }
      categoriesByName[cat.name].push(cat);
    });
    
    // Find duplicates (same name, different user_id)
    const duplicates = [];
    Object.entries(categoriesByName).forEach(([name, cats]) => {
      if (cats.length > 1) {
        duplicates.push({ name, categories: cats });
      }
    });
    
    if (duplicates.length > 0) {
      console.log('⚠️  DUPLICATE CATEGORIES FOUND:\n');
      duplicates.forEach(({ name, categories }) => {
        console.log(`  ${name}:`);
        categories.forEach(cat => {
          console.log(`    - ID: ${cat.id}, User ID: ${cat.user_id || 'NULL'}, Budget: €${parseFloat(cat.budget_amount || 0).toFixed(2)}`);
        });
        const total = categories.reduce((sum, c) => sum + parseFloat(c.budget_amount || 0), 0);
        console.log(`    Total for this category: €${total.toFixed(2)}\n`);
      });
    } else {
      console.log('✅ No duplicate categories found\n');
    }
    
    // Calculate totals
    const excludedCategories = ['Finanzas > Transferencias', 'Transferencias', 'NC', 'nc'];
    
    // Raw total (all categories, no exclusions)
    const rawTotal = categoriesResult.rows.reduce((sum, cat) => {
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    
    // Total excluding transfers/NC
    const totalExcludingTransfers = categoriesResult.rows.reduce((sum, cat) => {
      if (excludedCategories.includes(cat.name)) {
        return sum;
      }
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    
    // Deduplicated total (prefer hierarchical, merge budgets)
    const deduplicatedMap = {};
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
    
    categoriesResult.rows.forEach(cat => {
      if (excludedCategories.includes(cat.name)) {
        return;
      }
      
      let isDuplicate = false;
      let existingKey = null;
      
      for (const key in deduplicatedMap) {
        if (isDuplicateCategory(cat.name, key)) {
          isDuplicate = true;
          if (cat.name.includes(' > ')) {
            existingKey = key;
            break;
          } else if (key.includes(' > ')) {
            existingKey = key;
            break;
          } else {
            existingKey = key;
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        deduplicatedMap[cat.name] = parseFloat(cat.budget_amount || 0);
      } else if (existingKey && cat.name.includes(' > ')) {
        const oldBudget = deduplicatedMap[existingKey] || 0;
        const newBudget = parseFloat(cat.budget_amount || 0);
        delete deduplicatedMap[existingKey];
        deduplicatedMap[cat.name] = oldBudget + newBudget;
      } else if (existingKey && existingKey.includes(' > ')) {
        const existingBudget = deduplicatedMap[existingKey] || 0;
        const newBudget = parseFloat(cat.budget_amount || 0);
        deduplicatedMap[existingKey] = existingBudget + newBudget;
      }
    });
    
    const deduplicatedTotal = Object.values(deduplicatedMap).reduce((sum, b) => sum + b, 0);
    
    // Check for parent categories
    const isParentCategory = (categoryName, budgetsMap) => {
      if (!categoryName || categoryName.includes(' > ')) {
        return false;
      }
      for (const key in budgetsMap) {
        if (key.startsWith(categoryName + ' > ')) {
          return true;
        }
      }
      return false;
    };
    
    const finalMap = {};
    const excludedParents = [];
    for (const [catName, budgetAmount] of Object.entries(deduplicatedMap)) {
      if (isParentCategory(catName, deduplicatedMap)) {
        excludedParents.push({ name: catName, amount: budgetAmount });
        continue;
      }
      finalMap[catName] = budgetAmount;
    }
    
    const finalTotal = Object.values(finalMap).reduce((sum, b) => sum + b, 0);
    
    console.log('📊 CALCULATION RESULTS:\n');
    console.log(`  Raw total (all categories):              €${rawTotal.toFixed(2)}`);
    console.log(`  Excluding transfers/NC:                   €${totalExcludingTransfers.toFixed(2)}`);
    console.log(`  After deduplication:                      €${deduplicatedTotal.toFixed(2)}`);
    console.log(`  Excluded parent categories:                ${excludedParents.length}`);
    if (excludedParents.length > 0) {
      excludedParents.forEach(p => {
        console.log(`    - ${p.name}: €${p.amount.toFixed(2)}`);
      });
    }
    console.log(`  Final total (after parent exclusion):     €${finalTotal.toFixed(2)}\n`);
    
    console.log(`💡 Expected total: €6,199.40`);
    console.log(`💡 Current total:  €${finalTotal.toFixed(2)}`);
    console.log(`💡 Difference:     €${(finalTotal - 6199.40).toFixed(2)}\n`);
    
    // Show all categories with budgets
    console.log('📋 All categories with budgets:\n');
    Object.entries(finalMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, amount]) => {
        console.log(`  ${name.padEnd(40)} €${amount.toFixed(2)}`);
      });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBudgetTotal();






