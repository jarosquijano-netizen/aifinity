import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Endpoint para corregir nómina FREIGHTOS automáticamente
router.post('/freightos', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    console.log('🔧 Corrigiendo nómina FREIGHTOS...');
    
    await client.query('BEGIN');
    
    // Buscar y actualizar nóminas FREIGHTOS del 20-31 de diciembre
    const updateResult = await client.query(
      `UPDATE transactions
       SET applicable_month = '2026-01',
           computable = true
       WHERE description ILIKE '%FREIGHTOS%'
       AND date >= '2025-12-20'
       AND date <= '2025-12-31'
       AND type = 'income'
       AND (applicable_month IS NULL OR applicable_month != '2026-01' OR computable = false)
       AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
       RETURNING id, date, description, amount, applicable_month, computable`,
      [userId]
    );
    
    await client.query('COMMIT');
    
    // Verificar cálculo después de la corrección
    const incomeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as actual_income
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = '2026-01')
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = '2026-01')
       )
       AND t.amount > 0`,
      [userId]
    );
    
    const calculatedIncome = parseFloat(incomeResult.rows[0]?.actual_income || 0);
    
    res.json({
      success: true,
      updated: updateResult.rows.length,
      transactions: updateResult.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        applicable_month: row.applicable_month,
        computable: row.computable
      })),
      calculatedIncome: calculatedIncome,
      message: `✅ ${updateResult.rows.length} nómina(s) corregida(s). Ingreso calculado: €${calculatedIncome.toFixed(2)}`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error corrigiendo nómina:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;
