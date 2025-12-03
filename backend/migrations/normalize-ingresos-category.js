import pool from '../config/database.js';

/**
 * Migration: Normalize "Ingresos" to "Finanzas > Ingresos"
 * Updates all transactions and categories from "Ingresos" to "Finanzas > Ingresos"
 */

async function normalizeIngresosCategory() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Normalizing "Ingresos" category to "Finanzas > Ingresos"...\n');
    
    // Update transactions
    const transactionResult = await client.query(
      `UPDATE transactions 
       SET category = 'Finanzas > Ingresos' 
       WHERE category = 'Ingresos' 
       RETURNING id`
    );
    console.log(`✅ Updated ${transactionResult.rowCount} transactions: "Ingresos" → "Finanzas > Ingresos"`);
    
    // Update categories table
    const categoryResult = await client.query(
      `UPDATE categories 
       SET name = 'Finanzas > Ingresos' 
       WHERE name = 'Ingresos' 
       RETURNING id`
    );
    console.log(`✅ Updated ${categoryResult.rowCount} budget categories: "Ingresos" → "Finanzas > Ingresos"`);
    
    // Also update "Salary" if present
    const salaryTransactionResult = await client.query(
      `UPDATE transactions 
       SET category = 'Finanzas > Ingresos' 
       WHERE category = 'Salary' 
       RETURNING id`
    );
    console.log(`✅ Updated ${salaryTransactionResult.rowCount} transactions: "Salary" → "Finanzas > Ingresos"`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully normalized "Ingresos" category');
    console.log(`   - Transactions updated: ${transactionResult.rowCount + salaryTransactionResult.rowCount}`);
    console.log(`   - Budget categories updated: ${categoryResult.rowCount}`);
    
    return {
      transactionsUpdated: transactionResult.rowCount + salaryTransactionResult.rowCount,
      categoriesUpdated: categoryResult.rowCount
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error normalizing Ingresos category:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('normalize-ingresos-category.js');

if (isMainModule || process.argv[1]?.includes('normalize-ingresos-category')) {
  normalizeIngresosCategory()
    .then(() => {
      console.log('\n✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      console.error('Error details:', error.stack);
      process.exit(1);
    });
}

export default normalizeIngresosCategory;

