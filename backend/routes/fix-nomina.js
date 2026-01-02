import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Endpoint para corregir nóminas automáticamente (días 20-31, monto €2000-10000)
router.post('/freightos', optionalAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id || req.user?.userId || null;
    console.log('🔧 Corrigiendo nóminas del 20-31 de diciembre (detección automática)...');
    
    await client.query('BEGIN');
    
    // Primero, buscar todas las nóminas potenciales del 20-31 de diciembre para diagnóstico
    const allPotentialNominas = await client.query(
      `SELECT 
        id, date, description, amount, applicable_month, computable,
        account_id,
        EXTRACT(DAY FROM date) as day_of_month,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = transactions.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = transactions.account_id) as account_name
      FROM transactions
      WHERE date >= '2025-12-20'
      AND date <= '2025-12-31'
      AND type = 'income'
      AND EXTRACT(DAY FROM date) >= 20
      AND EXTRACT(DAY FROM date) <= 31
      AND (
        -- Monto típico de nómina
        (ABS(amount) >= 2000 AND ABS(amount) <= 10000)
        OR
        -- Palabras clave
        (description ILIKE '%nómina%' OR description ILIKE '%nomina%' 
         OR description ILIKE '%salary%' OR description ILIKE '%payroll%'
         OR description ILIKE '%salario%' OR description ILIKE '%sueldo%')
      )
      AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
      ORDER BY date DESC`,
      [userId]
    );
    
    console.log(`📊 Encontradas ${allPotentialNominas.rows.length} nómina(s) potencial(es) del 20-31 de diciembre`);
    
    // Buscar y actualizar TODAS las nóminas del 20-31 de diciembre que cumplan criterios
    // Criterios: día 20-31 Y (monto €2000-10000 O palabras clave de nómina)
    const updateResult = await client.query(
      `UPDATE transactions
       SET applicable_month = '2026-01',
           computable = true
       WHERE date >= '2025-12-20'
       AND date <= '2025-12-31'
       AND type = 'income'
       AND EXTRACT(DAY FROM date) >= 20
       AND EXTRACT(DAY FROM date) <= 31
       AND (
         -- Monto típico de nómina (€2000 - €10000)
         (ABS(amount) >= 2000 AND ABS(amount) <= 10000)
         OR
         -- Palabras clave de nómina
         (description ILIKE '%nómina%' OR description ILIKE '%nomina%' 
          OR description ILIKE '%salary%' OR description ILIKE '%payroll%'
          OR description ILIKE '%salario%' OR description ILIKE '%sueldo%')
       )
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
    
    // Verificar específicamente las nóminas del 20-31 dic en el cálculo de enero
    const nominasInCalculation = await client.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.date >= '2025-12-20'
       AND t.date <= '2025-12-31'
       AND EXTRACT(DAY FROM t.date) >= 20
       AND EXTRACT(DAY FROM t.date) <= 31
       AND (
         (ABS(t.amount) >= 2000 AND ABS(t.amount) <= 10000)
         OR
         (t.description ILIKE '%nómina%' OR t.description ILIKE '%nomina%' 
          OR t.description ILIKE '%salary%' OR t.description ILIKE '%payroll%'
          OR t.description ILIKE '%salario%' OR t.description ILIKE '%sueldo%')
       )
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
    
    const nominasCount = parseInt(nominasInCalculation.rows[0]?.count || 0);
    const nominasTotal = parseFloat(nominasInCalculation.rows[0]?.total || 0);
    
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
      allPotentialNominas: allPotentialNominas.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        day_of_month: row.day_of_month,
        applicable_month: row.applicable_month,
        computable: row.computable,
        account_excluded: row.account_excluded || false,
        account_name: row.account_name
      })),
      excludedAccounts: excludedAccounts,
      calculatedIncome: calculatedIncome,
      nominasInCalculation: {
        count: nominasCount,
        total: nominasTotal
      },
      message: `✅ ${updateResult.rows.length} nómina(s) corregida(s). Ingreso calculado: €${calculatedIncome.toFixed(2)}. Nóminas del 20-31 dic en cálculo: ${nominasCount} (€${nominasTotal.toFixed(2)})`
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
