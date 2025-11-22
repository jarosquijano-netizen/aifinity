import pool from '../config/database.js';

async function checkRestauranteDuplicates() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for duplicate restaurante categories...\n');
    
    // Get all unique restaurante-related categories from transactions
    const result = await client.query(`
      SELECT 
        category,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        MIN(date) as first_transaction,
        MAX(date) as last_transaction
      FROM transactions
      WHERE (
        LOWER(category) LIKE '%restaurante%'
        OR LOWER(category) LIKE '%restaurant%'
        OR category = 'Food & Dining'
        OR category LIKE '%Food & Dining%'
      )
      GROUP BY category
      ORDER BY transaction_count DESC;
    `);

    console.log(`📊 Found ${result.rows.length} different restaurante category variations:\n`);
    
    if (result.rows.length === 0) {
      console.log('ℹ️  No restaurante categories found in transactions');
      return;
    }

    // Display all variations
    result.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Category: "${row.category}"`);
      console.log(`   Transactions: ${row.transaction_count}`);
      console.log(`   Total Amount: €${parseFloat(row.total_amount || 0).toFixed(2)}`);
      console.log(`   Date Range: ${row.first_transaction} to ${row.last_transaction}`);
      console.log('');
    });

    // Check if there are duplicates (more than one variation)
    if (result.rows.length > 1) {
      console.log('⚠️  DUPLICATES FOUND! Multiple restaurante category variations exist.\n');
      console.log('💡 Recommended action: Merge all to "Alimentación > Restaurante"\n');
      
      // Show which ones should be merged
      const targetCategory = 'Alimentación > Restaurante';
      const variationsToMerge = result.rows.filter(r => r.category !== targetCategory);
      
      if (variationsToMerge.length > 0) {
        console.log(`📋 Categories to merge to "${targetCategory}":`);
        variationsToMerge.forEach((row, idx) => {
          console.log(`   ${idx + 1}. "${row.category}" (${row.transaction_count} transactions)`);
        });
      }
    } else {
      console.log('✅ No duplicates found - all restaurante transactions use the same category');
    }

    // Also check budget categories
    console.log('\n📊 Checking budget categories...\n');
    const budgetResult = await client.query(`
      SELECT 
        category,
        COUNT(*) as budget_count,
        SUM(amount) as total_budget
      FROM budgets
      WHERE (
        LOWER(category) LIKE '%restaurante%'
        OR LOWER(category) LIKE '%restaurant%'
        OR category = 'Food & Dining'
        OR category LIKE '%Food & Dining%'
      )
      GROUP BY category
      ORDER BY budget_count DESC;
    `);

    if (budgetResult.rows.length > 0) {
      console.log(`Found ${budgetResult.rows.length} restaurante budget category variations:\n`);
      budgetResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. Category: "${row.category}"`);
        console.log(`   Budgets: ${row.budget_count}`);
        console.log(`   Total Budget: €${parseFloat(row.total_budget || 0).toFixed(2)}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No restaurante budgets found');
    }
    
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run check
checkRestauranteDuplicates()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

