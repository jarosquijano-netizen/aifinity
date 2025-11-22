import pool from '../config/database.js';

async function fixRestauranteDuplicate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Fixing restaurante category duplicates...\n');
    
    await client.query('BEGIN');

    // Check what needs to be fixed
    const checkResult = await client.query(`
      SELECT category, COUNT(*) as count
      FROM transactions
      WHERE category = 'Restaurante'
      GROUP BY category;
    `);

    const countToFix = parseInt(checkResult.rows[0]?.count || 0);
    console.log(`📊 Found ${countToFix} transactions with category "Restaurante"`);

    if (countToFix > 0) {
      // Update all "Restaurante" to "Alimentación > Restaurante"
      const updateResult = await client.query(`
        UPDATE transactions
        SET category = 'Alimentación > Restaurante'
        WHERE category = 'Restaurante';
      `);

      console.log(`✅ Updated ${updateResult.rowCount} transactions from "Restaurante" to "Alimentación > Restaurante"`);

      // Show updated transactions
      const updatedTransactions = await client.query(`
        SELECT id, date, description, amount
        FROM transactions
        WHERE category = 'Alimentación > Restaurante'
        ORDER BY date DESC
        LIMIT 5;
      `);

      if (updatedTransactions.rows.length > 0) {
        console.log('\n📋 Sample of updated transactions:');
        updatedTransactions.rows.forEach((t, idx) => {
          console.log(`   ${idx + 1}. [${t.date}] ${t.description.substring(0, 50)}... - €${t.amount}`);
        });
      }
    } else {
      console.log('ℹ️  No "Restaurante" transactions found to fix');
    }

    // Also check and fix budget categories
    const budgetCheck = await client.query(`
      SELECT category, COUNT(*) as count
      FROM budgets
      WHERE category = 'Restaurante'
      GROUP BY category;
    `);

    const budgetCountToFix = parseInt(budgetCheck.rows[0]?.count || 0);
    console.log(`\n📊 Found ${budgetCountToFix} budgets with category "Restaurante"`);

    if (budgetCountToFix > 0) {
      // Check if target category already exists
      const targetBudgetCheck = await client.query(`
        SELECT id, amount, user_id
        FROM budgets
        WHERE category = 'Alimentación > Restaurante'
        LIMIT 1;
      `);

      if (targetBudgetCheck.rows.length > 0) {
        // Target exists - merge amounts
        const targetBudget = targetBudgetCheck.rows[0];
        const oldBudgets = await client.query(`
          SELECT user_id, SUM(amount) as total_amount
          FROM budgets
          WHERE category = 'Restaurante'
          GROUP BY user_id;
        `);

        for (const oldBudget of oldBudgets.rows) {
          if (oldBudget.user_id === targetBudget.user_id) {
            // Same user - merge amounts
            await client.query(`
              UPDATE budgets
              SET amount = amount + $1
              WHERE category = 'Alimentación > Restaurante' AND user_id = $2;
            `, [oldBudget.total_amount, oldBudget.user_id]);
            console.log(`✅ Merged budget amount €${oldBudget.total_amount} for user ${oldBudget.user_id}`);
          } else {
            // Different user - create new budget
            await client.query(`
              INSERT INTO budgets (user_id, category, amount)
              VALUES ($1, 'Alimentación > Restaurante', $2)
              ON CONFLICT (user_id, category) DO UPDATE
              SET amount = budgets.amount + EXCLUDED.amount;
            `, [oldBudget.user_id, oldBudget.total_amount]);
            console.log(`✅ Created budget €${oldBudget.total_amount} for user ${oldBudget.user_id}`);
          }
        }

        // Delete old budgets
        await client.query(`DELETE FROM budgets WHERE category = 'Restaurante'`);
        console.log(`✅ Deleted old "Restaurante" budgets`);
      } else {
        // Target doesn't exist - just rename
        const updateBudgetResult = await client.query(`
          UPDATE budgets
          SET category = 'Alimentación > Restaurante'
          WHERE category = 'Restaurante';
        `);
        console.log(`✅ Updated ${updateBudgetResult.rowCount} budgets from "Restaurante" to "Alimentación > Restaurante"`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
fixRestauranteDuplicate()
  .then(() => {
    console.log('✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

