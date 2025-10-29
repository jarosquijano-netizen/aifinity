import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * Clean duplicate categories in the database
 * GET /api/cleanup/categories
 */
router.get('/categories', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Starting category cleanup...');
    
    // Mapping of old categories to new canonical categories
    const categoryMapping = {
      'Alimentación': 'Supermercado',
      'Groceries': 'Supermercado',
      'Vivienda': 'Hogar',
      'Salud': 'Médico',
      'Servicios públicos': 'Otros servicios',
      'Educación': 'Estudios',
      'Transporte': 'Transportes',
      'Transferencia': 'Transferencias',
      'Restaurantes': 'Restaurante',
      'Servicios y productos': 'Servicios y productos online',
      'Transferencia entre cuentas': 'Transferencias',
    };
    
    await client.query('BEGIN');
    
    const updates = [];
    
    // Update each duplicate category in transactions
    for (const [oldCategory, newCategory] of Object.entries(categoryMapping)) {
      const result = await client.query(
        `UPDATE transactions 
         SET category = $1 
         WHERE category = $2 
         RETURNING id`,
        [newCategory, oldCategory]
      );
      
      if (result.rowCount > 0) {
        updates.push({
          table: 'transactions',
          oldCategory,
          newCategory,
          count: result.rowCount
        });
        console.log(`✅ Updated ${result.rowCount} transactions: "${oldCategory}" → "${newCategory}"`);
      }
    }
    
    // Also update budget items if the table exists
    const budgetTableCheck = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'budgets'
      )`
    );
    
    if (budgetTableCheck.rows[0].exists) {
      for (const [oldCategory, newCategory] of Object.entries(categoryMapping)) {
        const result = await client.query(
          `UPDATE budgets 
           SET category = $1 
           WHERE category = $2 
           RETURNING id`,
          [newCategory, oldCategory]
        );
        
        if (result.rowCount > 0) {
          updates.push({
            table: 'budgets',
            oldCategory,
            newCategory,
            count: result.rowCount
          });
          console.log(`✅ Updated ${result.rowCount} budget items: "${oldCategory}" → "${newCategory}"`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Get category distribution after cleanup
    const categoriesResult = await client.query(
      `SELECT category, COUNT(*) as count 
       FROM transactions 
       WHERE category IS NOT NULL 
       GROUP BY category 
       ORDER BY count DESC 
       LIMIT 30`
    );
    
    res.json({
      success: true,
      message: 'Categories cleaned successfully',
      updates,
      topCategories: categoriesResult.rows
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during category cleanup:', error);
    res.status(500).json({ 
      error: 'Failed to clean categories',
      details: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;

