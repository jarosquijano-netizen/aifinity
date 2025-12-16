import pool from '../config/database.js';

/**
 * Check for category mismatches between budget calculations and transaction filtering
 * Find categories that have both hierarchical and non-hierarchical versions
 */
async function checkCategoryMismatches() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for category mismatches...\n');
    
    const userId = 1; // Adjust if needed
    const targetMonth = new Date().toISOString().slice(0, 7); // Current month
    
    // Get all transaction categories
    const transactionCategories = await client.query(`
      SELECT DISTINCT category
      FROM transactions
      WHERE (user_id IS NULL OR user_id = $1)
        AND category IS NOT NULL
        AND category != ''
        AND category != 'NC'
        AND category != 'nc'
      ORDER BY category ASC
    `, [userId]);
    
    // Get all budget categories
    const budgetCategories = await client.query(`
      SELECT DISTINCT name as category
      FROM categories
      WHERE (user_id IS NULL OR user_id = $1)
      ORDER BY name ASC
    `, [userId]);
    
    console.log(`📊 Found ${transactionCategories.rows.length} transaction categories`);
    console.log(`📊 Found ${budgetCategories.rows.length} budget categories\n`);
    
    // Helper function to check if two categories are duplicates (same as backend)
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
    
    // Find categories that have both hierarchical and non-hierarchical versions
    const allCategories = [...transactionCategories.rows.map(r => r.category), ...budgetCategories.rows.map(r => r.category)];
    const categoryGroups = new Map();
    
    allCategories.forEach(cat => {
      let foundGroup = false;
      for (const [key, group] of categoryGroups.entries()) {
        if (isDuplicateCategory(cat, key)) {
          group.push(cat);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        categoryGroups.set(cat, [cat]);
      }
    });
    
    // Find groups with multiple variations
    const duplicateGroups = [];
    categoryGroups.forEach((group, key) => {
      if (group.length > 1) {
        duplicateGroups.push({
          base: key,
          variations: group
        });
      }
    });
    
    console.log(`⚠️  Found ${duplicateGroups.length} category groups with multiple variations:\n`);
    
    // Check spending for each duplicate group
    console.log(`\n💳 Spending in ${targetMonth} for duplicate groups:\n`);
    for (const group of duplicateGroups) {
      console.log(`${duplicateGroups.indexOf(group) + 1}. Base: "${group.base}"`);
      console.log(`   Variations: ${group.variations.map(v => `"${v}"`).join(', ')}`);
      
      // Check spending for each variation
      const spendingPromises = group.variations.map(async (variation) => {
        const result = await client.query(`
          SELECT 
            COUNT(*) as count,
            SUM(amount) as total
          FROM transactions
          WHERE (user_id IS NULL OR user_id = $1)
            AND category = $2
            AND type = 'expense'
            AND computable = true
            AND amount > 0
            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $3::date)
        `, [userId, variation, targetMonth + '-01']);
        
        return {
          category: variation,
          count: parseInt(result.rows[0].count),
          total: parseFloat(result.rows[0].total || 0)
        };
      });
      
      const spending = await Promise.all(spendingPromises);
      console.log(`   Spending:`);
      spending.forEach(s => {
        if (s.count > 0 || s.total > 0) {
          console.log(`      "${s.category}": ${s.count} transactions, €${s.total.toFixed(2)}`);
        }
      });
      const totalCount = spending.reduce((sum, s) => sum + s.count, 0);
      const totalAmount = spending.reduce((sum, s) => sum + s.total, 0);
      if (totalCount > 0 || totalAmount > 0) {
        console.log(`   TOTAL: ${totalCount} transactions, €${totalAmount.toFixed(2)}`);
      }
      console.log('');
    }
    
    // Check budget for each duplicate group
    console.log('\n💰 Budget amounts for duplicate groups:\n');
    for (const group of duplicateGroups) {
      const budgetPromises = group.variations.map(async (variation) => {
        const result = await client.query(`
          SELECT budget_amount
          FROM categories
          WHERE (user_id IS NULL OR user_id = $1)
            AND name = $2
          LIMIT 1
        `, [userId, variation]);
        
        return {
          category: variation,
          budget: result.rows.length > 0 ? parseFloat(result.rows[0].budget_amount || 0) : 0
        };
      });
      
      const budgets = await Promise.all(budgetPromises);
      console.log(`   Group: "${group.base}"`);
      budgets.forEach(b => {
        if (b.budget > 0) {
          console.log(`      "${b.category}": €${b.budget.toFixed(2)}`);
        }
      });
      const totalBudget = budgets.reduce((sum, b) => sum + b.budget, 0);
      if (totalBudget > 0) {
        console.log(`   TOTAL BUDGET: €${totalBudget.toFixed(2)}`);
      }
      console.log('');
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`   - Total categories with variations: ${duplicateGroups.length}`);
    console.log(`   - These categories may show incorrect counts in Transactions tab`);
    console.log(`   - Budget calculation should handle them correctly (merges variations)`);
    console.log(`   - Transaction filter now handles them correctly (matches variations)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run check
checkCategoryMismatches()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });

