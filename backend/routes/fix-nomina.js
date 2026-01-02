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
    
    // Primero, buscar todas las nóminas FREIGHTOS para diagnóstico
    const allFreightos = await client.query(
      `SELECT 
        id, date, description, amount, applicable_month, computable,
        account_id,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = transactions.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = transactions.account_id) as account_name
      FROM transactions
      WHERE description ILIKE '%FREIGHTOS%'
      AND date >= '2025-12-20'
      AND date <= '2025-12-31'
      AND type = 'income'
      AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
      ORDER BY date DESC`,
      [userId]
    );
    
    console.log(`📊 Encontradas ${allFreightos.rows.length} nómina(s) FREIGHTOS`);
    
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
       RETURNING id, date, description, amount, applicable_month, computable, account_id`,
      [userId]
    );
    
    // Verificar si hay cuentas excluidas
    const excludedAccounts = [];
    for (const row of updateResult.rows) {
      if (row.account_id) {
        const accountCheck = await client.query(
          `SELECT id, name, exclude_from_stats FROM bank_accounts WHERE id = $1`,
          [row.account_id]
        );
        if (accountCheck.rows.length > 0 && accountCheck.rows[0].exclude_from_stats) {
          excludedAccounts.push({
            accountId: row.account_id,
            accountName: accountCheck.rows[0].name,
            transactionId: row.id
          });
        }
      }
    }
    
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
    
    // Verificar específicamente las nóminas FREIGHTOS en el cálculo
    const freightosInCalculation = await client.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.description ILIKE '%FREIGHTOS%'
       AND (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
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
    
    const freightosCount = parseInt(freightosInCalculation.rows[0]?.count || 0);
    const freightosTotal = parseFloat(freightosInCalculation.rows[0]?.total || 0);
    
    res.json({
      success: true,
      updated: updateResult.rows.length,
      transactions: updateResult.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        applicable_month: row.applicable_month,
        computable: row.computable,
        account_id: row.account_id
      })),
      allFreightos: allFreightos.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        applicable_month: row.applicable_month,
        computable: row.computable,
        account_excluded: row.account_excluded || false,
        account_name: row.account_name
      })),
      excludedAccounts: excludedAccounts,
      calculatedIncome: calculatedIncome,
      freightosInCalculation: {
        count: freightosCount,
        total: freightosTotal
      },
      message: `✅ ${updateResult.rows.length} nómina(s) corregida(s). Ingreso calculado: €${calculatedIncome.toFixed(2)}. FREIGHTOS en cálculo: ${freightosCount} (€${freightosTotal.toFixed(2)})`
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
