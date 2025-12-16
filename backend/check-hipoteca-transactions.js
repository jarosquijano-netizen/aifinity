import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkHipotecaTransactions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for Hipoteca-related transactions...\n');
    
    const userId = 1;
    
    // Check for transactions with "Hipoteca" in category name
    const result = await client.query(
      `SELECT DISTINCT category, COUNT(*) as count
       FROM transactions 
       WHERE user_id = $1
       AND category IS NOT NULL
       AND (category ILIKE '%hipoteca%' OR category ILIKE '%mortgage%' OR category ILIKE '%préstamo%')
       AND type = 'expense'
       GROUP BY category
       ORDER BY category`,
      [userId]
    );
    
    console.log('📊 Transactions with Hipoteca-related categories:');
    result.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count} transactions`);
    });
    
    // Also check all expense categories to see if any might be related
    const allCategories = await client.query(
      `SELECT category, COUNT(*) as count
       FROM transactions 
       WHERE user_id = $1
       AND category IS NOT NULL
       AND type = 'expense'
       GROUP BY category
       ORDER BY category`,
      [userId]
    );
    
    console.log(`\n📊 All expense categories (${allCategories.rows.length}):`);
    allCategories.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count} transactions`);
    });
    
    // Check if "Vivienda > Hipoteca" has a budget
    const hipotecaBudget = await client.query(
      `SELECT name, budget_amount 
       FROM categories 
       WHERE (user_id = $1 OR user_id IS NULL)
       AND name = 'Vivienda > Hipoteca'`,
      [userId]
    );
    
    if (hipotecaBudget.rows.length > 0) {
      console.log(`\n💰 Vivienda > Hipoteca budget: €${parseFloat(hipotecaBudget.rows[0].budget_amount || 0).toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHipotecaTransactions();

