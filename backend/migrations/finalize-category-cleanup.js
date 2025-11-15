import dotenv from 'dotenv';
dotenv.config();
import pool from '../config/database.js';

/**
 * Finalize Category Cleanup Migration
 * Handles:
 * 1. Remove "Fraccionar" and move to "Compras > Ropa"
 * 2. Fix duplicate "Ropa" issue
 * 3. Add missing budgets
 * 4. Handle "Compras > Compras" budget
 * 5. Delete unused/invalid categories
 * 6. Mark non-expense categories
 */

const CATEGORIES_TO_DELETE = [
  'Fraccionar',
  'Digital Payments',
  'Reembolsos',
  'Ocio > Espectáculos',
  'Ocio > Loterías',
  'Organismos > Ayuntamiento',
  'Organismos > Multas y licencias',
  'Organismos > Otros organismos',
  'Organismos > Seguridad Social',
  'Personal > Niños y mascotas',
  'Profesionales > Asesores y abogados',
  'Salud > Óptica y dentista',
  'Seguros > Otros seguros',
  'Seguros > Seguro auto',
  'Seguros > Seguro hogar',
  'Transporte > Alquiler vehículos',
  'Vivienda > Alquiler y compra',
  'Vivienda > Otros vivienda'
];

const NON_EXPENSE_CATEGORIES = [
  'Finanzas > Ingresos',
  'Finanzas > Transferencias'
];

const BUDGETS_TO_ADD_OR_UPDATE = {
  'Compras > Ropa': 450.00,
  'Ocio > Hotel': 500.00,
  'Educación > Librería': 20.00,
  'Servicios > Cargos bancarios': 15.00,
  'Otros > Otros': 100.00,
  'Compras > Compras': 1000.00
};

async function finalizeCategoryCleanup() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Final Category Cleanup Migration...');
    console.log('');

    await client.query('BEGIN');

    const results = {
      transactionsMoved: 0,
      categoriesDeleted: 0,
      budgetsUpdated: 0,
      budgetsCreated: 0
    };

    // ========================================
    // STEP 1: Move "Fraccionar" to "Compras > Ropa"
    // ========================================
    console.log('📝 Step 1: Moving "Fraccionar" transactions to "Compras > Ropa"...');
    const fraccionarResult = await client.query(
      `UPDATE transactions 
       SET category = 'Compras > Ropa' 
       WHERE category = 'Fraccionar'
       RETURNING id`
    );
    results.transactionsMoved += fraccionarResult.rowCount;
    console.log(`   ✅ Moved ${fraccionarResult.rowCount} transactions from "Fraccionar" to "Compras > Ropa"`);

    // Also move any old "Ropa" (non-hierarchical) to "Compras > Ropa"
    const ropaResult = await client.query(
      `UPDATE transactions 
       SET category = 'Compras > Ropa' 
       WHERE category = 'Ropa' AND category != 'Compras > Ropa'
       RETURNING id`
    );
    if (ropaResult.rowCount > 0) {
      results.transactionsMoved += ropaResult.rowCount;
      console.log(`   ✅ Moved ${ropaResult.rowCount} transactions from "Ropa" to "Compras > Ropa"`);
    }

    // ========================================
    // STEP 2: Delete categories from categories table
    // ========================================
    console.log('');
    console.log('📝 Step 2: Deleting unused/invalid categories...');
    for (const categoryName of CATEGORIES_TO_DELETE) {
      // First check if category exists
      const checkResult = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [categoryName]
      );

      if (checkResult.rows.length > 0) {
        // Check if there are any transactions with this category
        const transactionCheck = await client.query(
          `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
          [categoryName]
        );
        const transactionCount = parseInt(transactionCheck.rows[0].count);

        if (transactionCount === 0) {
          await client.query(`DELETE FROM categories WHERE name = $1`, [categoryName]);
          results.categoriesDeleted++;
          console.log(`   ✅ Deleted category: "${categoryName}"`);
        } else {
          console.log(`   ⚠️  Skipped "${categoryName}" - still has ${transactionCount} transactions`);
        }
      }
    }

    // ========================================
    // STEP 3: Add or update budgets
    // ========================================
    console.log('');
    console.log('📝 Step 3: Adding/updating budgets...');
    for (const [categoryName, budgetAmount] of Object.entries(BUDGETS_TO_ADD_OR_UPDATE)) {
      // Check if category exists in categories table
      const categoryCheck = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [categoryName]
      );

      if (categoryCheck.rows.length > 0) {
        // Update existing budget
        await client.query(
          `UPDATE categories SET budget_amount = $1 WHERE name = $2`,
          [budgetAmount, categoryName]
        );
        results.budgetsUpdated++;
        console.log(`   ✅ Updated budget for "${categoryName}": €${budgetAmount.toFixed(2)}`);
      } else {
        // Create new budget category
        // Check if there are transactions with this category
        const transactionCheck = await client.query(
          `SELECT COUNT(*) as count FROM transactions WHERE category = $1`,
          [categoryName]
        );
        const transactionCount = parseInt(transactionCheck.rows[0].count);

        if (transactionCount > 0) {
          // Get user_id from transactions (use NULL for shared)
          const userCheck = await client.query(
            `SELECT DISTINCT user_id FROM transactions WHERE category = $1 LIMIT 1`,
            [categoryName]
          );
          const userId = userCheck.rows[0]?.user_id || null;

          await client.query(
            `INSERT INTO categories (name, budget_amount, user_id)
             VALUES ($1, $2, $3)`,
            [categoryName, budgetAmount, userId]
          );
          results.budgetsCreated++;
          console.log(`   ✅ Created budget for "${categoryName}": €${budgetAmount.toFixed(2)}`);
        } else {
          console.log(`   ⏭️  Skipped "${categoryName}" - no transactions found`);
        }
      }
    }

    // ========================================
    // STEP 4: Mark non-expense categories (set computable = false)
    // ========================================
    console.log('');
    console.log('📝 Step 4: Marking non-expense categories...');
    for (const categoryName of NON_EXPENSE_CATEGORIES) {
      const updateResult = await client.query(
        `UPDATE transactions 
         SET computable = false 
         WHERE category = $1 AND computable = true
         RETURNING id`,
        [categoryName]
      );
      if (updateResult.rowCount > 0) {
        console.log(`   ✅ Marked ${updateResult.rowCount} transactions in "${categoryName}" as non-computable`);
      }
    }

    // ========================================
    // STEP 5: Delete "Fraccionar" from categories if it still exists
    // ========================================
    console.log('');
    console.log('📝 Step 5: Final cleanup...');
    const fraccionarDelete = await client.query(
      `DELETE FROM categories WHERE name = 'Fraccionar'`
    );
    if (fraccionarDelete.rowCount > 0) {
      results.categoriesDeleted++;
      console.log(`   ✅ Deleted "Fraccionar" from categories table`);
    }

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ Final Category Cleanup completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Transactions moved: ${results.transactionsMoved}`);
    console.log(`   - Categories deleted: ${results.categoriesDeleted}`);
    console.log(`   - Budgets updated: ${results.budgetsUpdated}`);
    console.log(`   - Budgets created: ${results.budgetsCreated}`);
    
    return {
      success: true,
      ...results
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Final cleanup failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run cleanup if called directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('finalize-category-cleanup.js')) {
  finalizeCategoryCleanup()
    .then(() => {
      console.log('✅ Final cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Final cleanup script failed:', error);
      process.exit(1);
    });
}

export default finalizeCategoryCleanup;

