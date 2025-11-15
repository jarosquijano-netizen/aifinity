import pool from '../config/database.js';

/**
 * Cleanup Unused Budget Categories
 * Deletes budget categories that have 0€ budget AND 0€ spent
 */

const CATEGORIES_TO_DELETE = [
  "Alquiler vehículos",
  "Alquiler y compra",
  "Asesores y abogados",
  "Ayuntamiento",
  "Espectáculos",
  "Loterías",
  "Mantenimiento vehículo",
  "Material deportivo",
  "Multas y licencias",
  "Niños y mascotas",
  "Otras compras",
  "Otros ocio",
  "Otros organismos",
  "Otros seguros",
  "Otros servicios",
  "Seguridad Social",
  "Seguro auto",
  "Seguro hogar",
];

// Categories to keep but flag (like Transferencias)
const KEEP_BUT_FLAG = [
  "Transferencias"
];

async function cleanupUnusedBudgetCategories() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting Budget Category Cleanup...');
    console.log('📋 This will delete categories with 0€ budget AND 0€ spent');
    console.log('');

    await client.query('BEGIN');

    const deleted = [];
    const kept = [];
    let totalDeleted = 0;

    // Get current month for spending calculation
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Check each category
    for (const categoryName of CATEGORIES_TO_DELETE) {
      // Check if category exists
      const categoryResult = await client.query(
        `SELECT id, name, budget_amount FROM categories WHERE name = $1`,
        [categoryName]
      );

      if (categoryResult.rows.length === 0) {
        console.log(`   ⏭️  Category "${categoryName}" doesn't exist, skipping...`);
        continue;
      }

      const category = categoryResult.rows[0];
      const budgetAmount = parseFloat(category.budget_amount || 0);

      // Check spending for this category
      const spendingResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) as total_spent
         FROM transactions
         WHERE category = $1
         AND type = 'expense'
         AND computable = true
         AND TO_CHAR(date, 'YYYY-MM') = $2`,
        [categoryName, currentMonth]
      );

      const spent = parseFloat(spendingResult.rows[0].total_spent || 0);

      // Delete if budget = 0 AND spent = 0
      if (budgetAmount === 0 && spent === 0) {
        await client.query(`DELETE FROM categories WHERE id = $1`, [category.id]);
        deleted.push({
          name: categoryName,
          budget: budgetAmount,
          spent: spent
        });
        totalDeleted++;
        console.log(`   ✅ Deleted "${categoryName}" (Budget: €${budgetAmount}, Spent: €${spent})`);
      } else {
        kept.push({
          name: categoryName,
          budget: budgetAmount,
          spent: spent,
          reason: budgetAmount > 0 ? 'Has budget' : 'Has spending'
        });
        console.log(`   ⚠️  Kept "${categoryName}" (Budget: €${budgetAmount}, Spent: €${spent}) - ${budgetAmount > 0 ? 'Has budget' : 'Has spending'}`);
      }
    }

    // Handle categories to keep but flag
    console.log('');
    console.log('📌 Categories to keep but flag as non-expense:');
    for (const categoryName of KEEP_BUT_FLAG) {
      const categoryResult = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [categoryName]
      );
      
      if (categoryResult.rows.length > 0) {
        console.log(`   ℹ️  "${categoryName}" - Keep but mark as transfer/non-expense`);
        // You can add a flag here if needed
      }
    }

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ Cleanup completed successfully!');
    console.log(`📊 Categories deleted: ${totalDeleted}`);
    console.log(`📊 Categories kept: ${kept.length}`);
    
    if (deleted.length > 0) {
      console.log('');
      console.log('🗑️  Deleted categories:');
      deleted.forEach(cat => {
        console.log(`   - ${cat.name}`);
      });
    }
    
    if (kept.length > 0) {
      console.log('');
      console.log('📌 Kept categories (have budget or spending):');
      kept.forEach(cat => {
        console.log(`   - ${cat.name} (${cat.reason})`);
      });
    }
    
    return {
      success: true,
      deleted: totalDeleted,
      kept: kept.length,
      deletedCategories: deleted,
      keptCategories: kept
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run cleanup if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('cleanup-unused-budget-categories.js')) {
  cleanupUnusedBudgetCategories()
    .then(() => {
      console.log('✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupUnusedBudgetCategories;

