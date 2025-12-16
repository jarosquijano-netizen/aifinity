import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function findExcludedCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding which categories should be excluded to get €6,199.40...\n');
    
    const userId = 1;
    const expectedTotal = 6199.40;
    
    const categoriesResult = await client.query(
      `SELECT name, budget_amount 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND budget_amount > 0
       AND name NOT IN ('Finanzas > Transferencias', 'Transferencias', 'NC', 'nc')
       ORDER BY budget_amount DESC`,
      [userId]
    );
    
    const currentTotal = categoriesResult.rows.reduce((sum, cat) => {
      return sum + parseFloat(cat.budget_amount || 0);
    }, 0);
    
    const difference = currentTotal - expectedTotal;
    
    console.log(`Current total: €${currentTotal.toFixed(2)}`);
    console.log(`Expected total: €${expectedTotal.toFixed(2)}`);
    console.log(`Difference: €${difference.toFixed(2)}\n`);
    
    console.log('💡 Categories that would need to be excluded to reach €6,199.40:\n');
    
    // Try to find combinations that sum to the difference
    const amounts = categoriesResult.rows.map(c => ({
      name: c.name,
      amount: parseFloat(c.budget_amount || 0)
    })).sort((a, b) => b.amount - a.amount);
    
    // Find categories that sum close to the difference
    let sum = 0;
    const candidates = [];
    for (const cat of amounts) {
      if (sum + cat.amount <= difference + 10) { // Allow 10€ tolerance
        sum += cat.amount;
        candidates.push(cat);
        if (Math.abs(sum - difference) < 10) {
          break;
        }
      }
    }
    
    if (candidates.length > 0) {
      console.log(`Found ${candidates.length} categories totaling €${sum.toFixed(2)}:\n`);
      candidates.forEach(cat => {
        console.log(`  - ${cat.name}: €${cat.amount.toFixed(2)}`);
      });
    }
    
    // Also show all categories sorted by amount
    console.log('\n📋 All categories sorted by budget amount:\n');
    amounts.forEach((cat, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${cat.name.padEnd(45)} €${cat.amount.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

findExcludedCategories();

