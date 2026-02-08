import express from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Configuración de detección de nóminas
const NOMINA_CONFIG = {
  // Días del mes para detectar nóminas (típicamente se paga entre el 25 y el 31)
  MIN_DAY: 25,
  MAX_DAY: 31,
  // Rango de montos típicos de nómina (en euros)
  MIN_AMOUNT: 1200,  // Salario mínimo aproximado
  MAX_AMOUNT: 15000, // Salarios altos
  // Palabras clave que indican nómina/salario
  KEYWORDS: [
    'nómina', 'nomina', 'salary', 'payroll', 'salario', 'sueldo',
    'paga extra', 'paga extraordinaria', 'mensualidad', 'retribución',
    'retribucion', 'honorarios', 'freelance', 'factura', 'ingreso recurrente'
  ],
  // Palabras clave a excluir (transferencias, etc.)
  EXCLUDE_KEYWORDS: [
    'remesa', 'traspaso', 'transferencia', 'transfer', 'bizum',
    'envío', 'envio', 'devolución', 'devolucion', 'reembolso'
  ]
};

/**
 * Calcula el mes siguiente dado un mes en formato YYYY-MM
 */
function getNextMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Obtiene el primer y último día del mes para un mes dado
 */
function getMonthDateRange(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-${String(NOMINA_CONFIG.MIN_DAY).padStart(2, '0')}`;
  const lastDay = new Date(year, month, 0).getDate(); // Último día del mes
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

/**
 * Construye la condición SQL para palabras clave
 */
function buildKeywordCondition(keywords, column = 'description', include = true) {
  const conditions = keywords.map(kw => `${column} ILIKE '%${kw}%'`);
  const joined = conditions.join(' OR ');
  return include ? `(${joined})` : `NOT (${joined})`;
}

// Endpoint para corregir nóminas automáticamente (días 25-31, detección mejorada)
// Acepta parámetro ?month=YYYY-MM para especificar el mes (por defecto: mes anterior)
router.post('/freightos', optionalAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Determinar el mes a procesar (por defecto: mes anterior al actual)
    let targetMonth = req.query.month || req.body.month;
    if (!targetMonth) {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      targetMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    const nextMonth = getNextMonth(targetMonth);
    const { startDate, endDate } = getMonthDateRange(targetMonth);

    console.log(`🔧 Corrigiendo nóminas del ${NOMINA_CONFIG.MIN_DAY}-${NOMINA_CONFIG.MAX_DAY} de ${targetMonth} → ${nextMonth}`);

    await client.query('BEGIN');

    // Primero, buscar todas las nóminas potenciales para diagnóstico
    const allPotentialNominas = await client.query(
      `SELECT
        id, date, description, amount, applicable_month, computable,
        account_id,
        EXTRACT(DAY FROM date) as day_of_month,
        (SELECT exclude_from_stats FROM bank_accounts WHERE id = transactions.account_id) as account_excluded,
        (SELECT name FROM bank_accounts WHERE id = transactions.account_id) as account_name
      FROM transactions
      WHERE date >= $2
      AND date <= $3
      AND type = 'income'
      AND EXTRACT(DAY FROM date) >= $4
      AND EXTRACT(DAY FROM date) <= $5
      AND (
        -- Monto típico de nómina
        (ABS(amount) >= $6 AND ABS(amount) <= $7)
        OR
        -- Palabras clave
        ${buildKeywordCondition(NOMINA_CONFIG.KEYWORDS)}
      )
      AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
      ORDER BY date DESC`,
      [userId, startDate, endDate, NOMINA_CONFIG.MIN_DAY, NOMINA_CONFIG.MAX_DAY, NOMINA_CONFIG.MIN_AMOUNT, NOMINA_CONFIG.MAX_AMOUNT]
    );

    console.log(`📊 Encontradas ${allPotentialNominas.rows.length} nómina(s) potencial(es) del ${NOMINA_CONFIG.MIN_DAY}-${NOMINA_CONFIG.MAX_DAY} de ${targetMonth}`);

    // Buscar y actualizar TODAS las nóminas que cumplan criterios
    // Criterios: día 25-31 Y (monto típico O palabras clave de nómina)
    const updateResult = await client.query(
      `UPDATE transactions
       SET applicable_month = $2,
           computable = true
       WHERE date >= $3
       AND date <= $4
       AND type = 'income'
       AND EXTRACT(DAY FROM date) >= $5
       AND EXTRACT(DAY FROM date) <= $6
      AND (
        -- Monto típico de nómina
        (ABS(amount) >= $7 AND ABS(amount) <= $8)
        OR
        -- Palabras clave de nómina
        ${buildKeywordCondition(NOMINA_CONFIG.KEYWORDS)}
      )
      -- EXCLUIR remesas, traspasos y transferencias
      AND ${buildKeywordCondition(NOMINA_CONFIG.EXCLUDE_KEYWORDS, 'description', false)}
       AND (applicable_month IS NULL OR applicable_month != $2 OR computable = false)
       AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
       RETURNING id, date, description, amount, applicable_month, computable, account_id`,
      [userId, nextMonth, startDate, endDate, NOMINA_CONFIG.MIN_DAY, NOMINA_CONFIG.MAX_DAY, NOMINA_CONFIG.MIN_AMOUNT, NOMINA_CONFIG.MAX_AMOUNT]
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
         (t.applicable_month IS NOT NULL AND t.applicable_month = $2)
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $2)
       )
       AND t.amount > 0`,
      [userId, nextMonth]
    );

    const calculatedIncome = parseFloat(incomeResult.rows[0]?.actual_income || 0);

    // Verificar específicamente las nóminas en el cálculo del mes siguiente
    const nominasInCalculation = await client.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions t
       LEFT JOIN bank_accounts ba ON t.account_id = ba.id
       WHERE t.date >= $2
       AND t.date <= $3
       AND EXTRACT(DAY FROM t.date) >= $4
       AND EXTRACT(DAY FROM t.date) <= $5
       AND (
         (ABS(t.amount) >= $6 AND ABS(t.amount) <= $7)
         OR
         ${buildKeywordCondition(NOMINA_CONFIG.KEYWORDS, 't.description')}
       )
       AND (t.user_id = $1 OR (t.user_id IS NULL AND $1 IS NULL))
       AND (t.account_id IS NULL OR ba.id IS NULL OR ba.exclude_from_stats IS NULL OR ba.exclude_from_stats = false)
       AND t.type = 'income'
       AND t.computable = true
       AND (
         (t.applicable_month IS NOT NULL AND t.applicable_month = $8)
         OR
         (t.applicable_month IS NULL AND TO_CHAR(t.date, 'YYYY-MM') = $8)
       )
       AND t.amount > 0`,
      [userId, startDate, endDate, NOMINA_CONFIG.MIN_DAY, NOMINA_CONFIG.MAX_DAY, NOMINA_CONFIG.MIN_AMOUNT, NOMINA_CONFIG.MAX_AMOUNT, nextMonth]
    );

    const nominasCount = parseInt(nominasInCalculation.rows[0]?.count || 0);
    const nominasTotal = parseFloat(nominasInCalculation.rows[0]?.total || 0);

    res.json({
      success: true,
      updated: updateResult.rows.length,
      sourceMonth: targetMonth,
      targetMonth: nextMonth,
      config: {
        dayRange: `${NOMINA_CONFIG.MIN_DAY}-${NOMINA_CONFIG.MAX_DAY}`,
        amountRange: `€${NOMINA_CONFIG.MIN_AMOUNT}-€${NOMINA_CONFIG.MAX_AMOUNT}`,
        keywords: NOMINA_CONFIG.KEYWORDS.slice(0, 5).join(', ') + '...'
      },
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
      message: `✅ ${updateResult.rows.length} nómina(s) corregida(s) de ${targetMonth} → ${nextMonth}. Ingreso calculado para ${nextMonth}: €${calculatedIncome.toFixed(2)}. Nóminas del ${NOMINA_CONFIG.MIN_DAY}-${NOMINA_CONFIG.MAX_DAY} en cálculo: ${nominasCount} (€${nominasTotal.toFixed(2)})`
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

// Endpoint para obtener la configuración actual de detección de nóminas
router.get('/config', optionalAuth, (req, res) => {
  res.json({
    config: NOMINA_CONFIG,
    description: {
      dayRange: `Días ${NOMINA_CONFIG.MIN_DAY}-${NOMINA_CONFIG.MAX_DAY} del mes`,
      amountRange: `€${NOMINA_CONFIG.MIN_AMOUNT} - €${NOMINA_CONFIG.MAX_AMOUNT}`,
      keywords: NOMINA_CONFIG.KEYWORDS,
      excludeKeywords: NOMINA_CONFIG.EXCLUDE_KEYWORDS
    }
  });
});

// Endpoint para previsualizar qué nóminas se detectarían sin aplicar cambios
router.get('/preview', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || null;

    // Determinar el mes a procesar
    let targetMonth = req.query.month;
    if (!targetMonth) {
      const now = new Date();
      const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      targetMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    const nextMonth = getNextMonth(targetMonth);
    const { startDate, endDate } = getMonthDateRange(targetMonth);

    const potentialNominas = await pool.query(
      `SELECT
        id, date, description, amount, applicable_month, computable,
        account_id,
        EXTRACT(DAY FROM date) as day_of_month,
        (SELECT name FROM bank_accounts WHERE id = transactions.account_id) as account_name
      FROM transactions
      WHERE date >= $2
      AND date <= $3
      AND type = 'income'
      AND EXTRACT(DAY FROM date) >= $4
      AND EXTRACT(DAY FROM date) <= $5
      AND (
        (ABS(amount) >= $6 AND ABS(amount) <= $7)
        OR
        ${buildKeywordCondition(NOMINA_CONFIG.KEYWORDS)}
      )
      AND ${buildKeywordCondition(NOMINA_CONFIG.EXCLUDE_KEYWORDS, 'description', false)}
      AND (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
      ORDER BY date DESC`,
      [userId, startDate, endDate, NOMINA_CONFIG.MIN_DAY, NOMINA_CONFIG.MAX_DAY, NOMINA_CONFIG.MIN_AMOUNT, NOMINA_CONFIG.MAX_AMOUNT]
    );

    const wouldBeUpdated = potentialNominas.rows.filter(row =>
      row.applicable_month !== nextMonth || row.computable === false
    );

    res.json({
      sourceMonth: targetMonth,
      targetMonth: nextMonth,
      totalFound: potentialNominas.rows.length,
      wouldBeUpdated: wouldBeUpdated.length,
      transactions: potentialNominas.rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount || 0),
        day_of_month: row.day_of_month,
        current_applicable_month: row.applicable_month,
        new_applicable_month: nextMonth,
        computable: row.computable,
        account_name: row.account_name,
        needs_update: row.applicable_month !== nextMonth || row.computable === false
      }))
    });
  } catch (error) {
    console.error('❌ Error en preview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
